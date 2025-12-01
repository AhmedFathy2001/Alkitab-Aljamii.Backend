import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TokenService } from './token.service.js';
import type { LoginDto } from '../dto/login.dto.js';
import { User } from '@prisma/client/index-browser';
import type {
  AuthResponseDto,
  TokensResponseDto,
} from '../dto/auth-response.dto.js';
import type {
  SwitchContextDto,
  SwitchContextResponseDto,
} from '../dto/switch-context.dto.js';
import type { JwtPayload } from '../strategies/jwt.strategy.js';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly i18n: I18nService,
  ) {}

  async login(dto: LoginDto, deviceInfo?: string): Promise<AuthResponseDto> {
    const user = await this.validateCredentials(dto.email, dto.password);

    const facultyRoles = await this.prisma.userFacultyRole.findMany({
      where: { userId: user.id },
      include: {
        faculty: {
          select: {
            id: true,
            name: true,
            nameAr: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    let initialContext: { activeView?: string; facultyId?: string } = {};

    if (user.isSuperAdmin) {
      // تعيين view خاص للـ Super Admin
      initialContext.activeView = 'super_admin';
    } else if (facultyRoles.length > 0) {
      // Use priority order: faculty_admin > professor > student
      const priorityOrder = ['faculty_admin', 'professor', 'student'] as const;
      const sortedRoles = [...facultyRoles].sort((a, b) => {
        const aIndex = priorityOrder.indexOf(a.role as (typeof priorityOrder)[number]);
        const bIndex = priorityOrder.indexOf(b.role as (typeof priorityOrder)[number]);
        return aIndex - bIndex;
      });
      const primaryRole = sortedRoles[0]!;
      initialContext = {
        activeView: primaryRole.role,
        facultyId: primaryRole.facultyId,
      };
      this.logger.log(
        `Login context for ${user.email}: roles=${facultyRoles
          .map((r) => `${r.role}@${r.faculty.name}`)
          .join(', ')}, selected=${primaryRole.role}@${primaryRole.faculty.name}`,
      );
    }

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.isSuperAdmin,
      initialContext,
    );

    await this.tokenService.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      deviceInfo,
    );

    await this.updateLastLogin(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperAdmin: user.isSuperAdmin,
        facultyRoles: facultyRoles.map((fr) => ({
          facultyId: fr.facultyId,
          name: fr.faculty.name,
          nameAr: fr.faculty.nameAr ?? undefined,
          role: fr.role,
        })),
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
    };
  }

  async refresh(refreshToken: string): Promise<TokensResponseDto> {
    const storedToken =
      await this.tokenService.findAndValidateRefreshToken(refreshToken);

    if (!storedToken) {
      throw new UnauthorizedException(
        await this.i18n.translate('auth.INVALID_REFRESH_TOKEN'),
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { id: storedToken.userId, isActive: true, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException(
        await this.i18n.translate('auth.USER_NOT_FOUND_OR_INACTIVE'),
      );
    }

    await this.tokenService.revokeRefreshToken(storedToken.id);

    const tokens = await this.tokenService.generateTokens(
      user.id,
      user.email,
      user.isSuperAdmin,
    );

    await this.tokenService.saveRefreshToken(
      user.id,
      tokens.refreshToken,
      storedToken.deviceInfo,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
    };
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const storedToken = await this.tokenService.validateRefreshToken(
      userId,
      refreshToken,
    );

    if (storedToken) {
      await this.tokenService.revokeRefreshToken(storedToken.id);
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId);
  }

  async switchContext(
    currentUser: JwtPayload,
    dto: SwitchContextDto,
  ): Promise<SwitchContextResponseDto> {
    const userId = currentUser.sub;

    if (currentUser.isSuperAdmin) {
      throw new ForbiddenException(
        await this.i18n.translate('auth.SUPER_ADMIN_NO_SWITCH'),
      );
    }

    const facultyRole = await this.prisma.userFacultyRole.findFirst({
      where: {
        userId,
        role: dto.activeView as 'faculty_admin' | 'professor' | 'student',
        facultyId: dto.facultyId,
      },
    });

    if (!facultyRole) {
      throw new ForbiddenException(
        await this.i18n.translate('auth.NO_ACCESS_IN_FACULTY', {
          args: { role: dto.activeView },
        }),
      );
    }

    const faculty = await this.prisma.faculty.findFirst({
      where: { id: dto.facultyId, isActive: true, deletedAt: null },
    });
    if (!faculty) {
      throw new ForbiddenException(
        await this.i18n.translate('auth.FACULTY_NOT_ACTIVE'),
      );
    }

    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, isActive: true, deletedAt: null },
      select: { id: true, email: true, isSuperAdmin: true },
    });

    const context = {
      activeView: dto.activeView,
      facultyId: dto.facultyId,
    };

    const { accessToken, expiresIn } =
      await this.tokenService.generateAccessTokenOnly(
        user.id,
        user.email,
        user.isSuperAdmin,
        context,
      );

    return {
      accessToken,
      expiresIn,
      activeView: dto.activeView,
      facultyId: dto.facultyId,
    };
  }

  private async validateCredentials(
    email: string,
    password: string,
  ): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        isActive: true,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        await this.i18n.translate('auth.INVALID_CREDENTIALS'),
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        await this.i18n.translate('auth.INVALID_CREDENTIALS'),
      );
    }

    return user;
  }

  private async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }
}

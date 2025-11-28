import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TokenService } from './token.service.js';
import type { User } from '@prisma/client';
import type { LoginDto } from '../dto/login.dto.js';
import type {
  AuthResponseDto,
  TokensResponseDto,
} from '../dto/auth-response.dto.js';
import type {
  SwitchContextDto,
  SwitchContextResponseDto,
} from '../dto/switch-context.dto.js';
import type { JwtPayload } from '../strategies/jwt.strategy.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto, deviceInfo?: string): Promise<AuthResponseDto> {
    const user = await this.validateCredentials(dto.email, dto.password);

    // Get user's faculty roles for initial context
    const facultyRoles = await this.prisma.userFacultyRole.findMany({
      where: { userId: user.id },
      include: { faculty: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Determine initial context
    let initialContext: { activeView?: string; facultyId?: string } = {};
    if (!user.isSuperAdmin && facultyRoles.length > 0) {
      // Set initial context to first role
      const firstRole = facultyRoles[0]!;
      initialContext = {
        activeView: firstRole.role,
        facultyId: firstRole.facultyId,
      };
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
          facultyName: fr.faculty.name,
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
    // Find the token and its owner without relying on JWT
    const storedToken =
      await this.tokenService.findAndValidateRefreshToken(refreshToken);

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: storedToken.userId, isActive: true, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
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

    // Super admin cannot switch context
    if (currentUser.isSuperAdmin) {
      throw new ForbiddenException(
        'Super admin does not use context switching',
      );
    }

    // Validate user has this role in the specified faculty
    const facultyRole = await this.prisma.userFacultyRole.findFirst({
      where: {
        userId,
        role: dto.activeView as 'faculty_admin' | 'professor' | 'student',
        facultyId: dto.facultyId,
      },
    });

    if (!facultyRole) {
      throw new ForbiddenException(
        `You do not have ${dto.activeView} access in this faculty`,
      );
    }

    // Check faculty is active
    const faculty = await this.prisma.faculty.findFirst({
      where: { id: dto.facultyId, isActive: true, deletedAt: null },
    });
    if (!faculty) {
      throw new ForbiddenException('Faculty is not active');
    }

    // Get user details for token
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, isActive: true, deletedAt: null },
      select: { id: true, email: true, isSuperAdmin: true },
    });

    // Generate new access token with context
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
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
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

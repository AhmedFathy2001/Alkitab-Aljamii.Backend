import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import type { PaginatedResult } from '../../common/pagination/pagination.dto.js';
import type { CreateUserDto } from '../dto/create-user.dto.js';
import type {
  UpdateUserDto,
  UpdatePasswordDto,
} from '../dto/update-user.dto.js';
import type { QueryUserDto } from '../dto/query-user.dto.js';
import type { UserResponseDto } from '../dto/user-response.dto.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { UserAccessService } from './user-access.service.js';
import {
  toUserResponseDto,
  toBasicUserResponseDto,
} from '../utils/user-mapper.js';
import {
  getUserAssociationsData,
  getMyFacultiesData,
  getAvailableViewsData,
} from '../utils/user-associations.js';
import type {
  UserFacultyDto,
  UserAssociationsDto,
  AvailableViewsDto,
  EmailCheckResultDto,
} from '../dto/user-associations.dto.js';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: UserAccessService,
  ) {}

  async create(
    dto: CreateUserDto,
    currentUser: JwtPayload,
  ): Promise<UserResponseDto> {
    await this.accessService.validateWriteAccess(currentUser);
    const normalizedEmail = dto.email.toLowerCase().trim();
    await this.ensureEmailUnique(normalizedEmail);

    if (dto.isSuperAdmin && !currentUser.isSuperAdmin) {
      throw new ConflictException('Only super admins can create super admins');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        isSuperAdmin: dto.isSuperAdmin ?? false,
      },
    });

    return toBasicUserResponseDto(user);
  }

  async findAll(
    query: QueryUserDto,
    currentUser: JwtPayload,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      facultyId,
      subjectId,
      isSuperAdmin,
    } = query;
    const skip = (page - 1) * limit;

    const roleFilter = await this.accessService.buildRoleFilter(
      currentUser,
      facultyId,
      subjectId,
    );
    const where = this.buildWhereClause(
      roleFilter,
      search,
      role,
      isActive,
      isSuperAdmin,
      facultyId,
    );

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          facultyRoles: { include: { faculty: { select: { name: true } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items: users.map(toUserResponseDto),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: string, currentUser: JwtPayload): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        facultyRoles: { include: { faculty: { select: { name: true } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    await this.accessService.validateReadAccess(currentUser, user);
    return toUserResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
    });
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUser: JwtPayload,
  ): Promise<UserResponseDto> {
    await this.findUserOrThrow(id);
    await this.accessService.validateWriteAccess(currentUser, id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        facultyRoles: { include: { faculty: { select: { name: true } } } },
      },
    });

    return toUserResponseDto(updated);
  }

  async updatePassword(
    id: string,
    dto: UpdatePasswordDto,
    currentUser: JwtPayload,
  ): Promise<void> {
    await this.findUserOrThrow(id);
    await this.accessService.validateWriteAccess(currentUser, id);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(dto.password, 10) },
    });
  }

  async softDelete(id: string, currentUser: JwtPayload): Promise<void> {
    await this.findUserOrThrow(id);
    await this.accessService.validateWriteAccess(currentUser, id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string, currentUser: JwtPayload): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.deletedAt) throw new ConflictException('User is not deleted');

    await this.accessService.validateWriteAccess(currentUser, id);
    const restored = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        facultyRoles: { include: { faculty: { select: { name: true } } } },
      },
    });
    return toUserResponseDto(restored);
  }

  async getUserAssociations(
    userId: string,
    currentUser: JwtPayload,
  ): Promise<UserAssociationsDto> {
    if (!currentUser.isSuperAdmin) {
      throw new NotFoundException('User not found');
    }
    await this.findUserOrThrow(userId);
    return getUserAssociationsData(this.prisma, userId);
  }

  async getMyFaculties(
    currentUser: JwtPayload,
    activeView?: string,
  ): Promise<UserFacultyDto[]> {
    return getMyFacultiesData(this.prisma, currentUser, activeView);
  }

  async getAvailableViews(currentUser: JwtPayload): Promise<AvailableViewsDto> {
    return getAvailableViewsData(this.prisma, currentUser);
  }

  async checkEmailExists(email: string): Promise<EmailCheckResultDto> {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, isSuperAdmin: true },
    });

    if (!user) return { exists: false };

    return {
      exists: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperAdmin: user.isSuperAdmin,
      },
    };
  }

  private async findUserOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async ensureEmailUnique(email: string): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException('Email already exists');
  }

  private buildWhereClause(
    roleFilter: Prisma.UserWhereInput,
    search?: string,
    role?: string,
    isActive?: boolean,
    isSuperAdmin?: boolean,
    facultyId?: string,
  ): Prisma.UserWhereInput {
    const searchFilter: Prisma.UserWhereInput | undefined = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const facultyRoleFilter: Prisma.UserWhereInput | undefined = role
      ? {
          facultyRoles: {
            some: {
              role: role as 'faculty_admin' | 'professor' | 'student',
              ...(facultyId ? { facultyId } : {}),
            },
          },
        }
      : undefined;

    return {
      AND: [
        { deletedAt: null },
        roleFilter,
        ...(searchFilter ? [searchFilter] : []),
        ...(facultyRoleFilter ? [facultyRoleFilter] : []),
        ...(isActive !== undefined ? [{ isActive }] : []),
        ...(isSuperAdmin !== undefined ? [{ isSuperAdmin }] : []),
      ],
    };
  }
}

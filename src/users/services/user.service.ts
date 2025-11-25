import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { User, UserRole, Prisma } from '@prisma/client';
import type { PaginatedResult } from '../../common/pagination/pagination.dto.js';
import type { CreateUserDto } from '../dto/create-user.dto.js';
import type { UpdateUserDto, UpdatePasswordDto } from '../dto/update-user.dto.js';
import type { QueryUserDto } from '../dto/query-user.dto.js';
import type { UserResponseDto } from '../dto/user-response.dto.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, currentUser: JwtPayload): Promise<UserResponseDto> {
    await this.validateWriteAccess(currentUser, dto.role);

    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
      },
    });

    return this.toResponseDto(user);
  }

  async findAll(
    query: QueryUserDto,
    currentUser: JwtPayload,
  ): Promise<PaginatedResult<UserResponseDto>> {
    const { page = 1, limit = 10, search, role, isActive, facultyId, subjectId } = query;
    const skip = (page - 1) * limit;

    const roleFilter = await this.buildRoleFilter(currentUser, facultyId, subjectId);

    // Build search filter
    const searchFilter: Prisma.UserWhereInput | undefined = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    // Combine all filters with AND logic
    const where: Prisma.UserWhereInput = {
      AND: [
        { deletedAt: null },
        roleFilter,
        ...(searchFilter ? [searchFilter] : []),
        ...(role ? [{ role }] : []),
        ...(isActive !== undefined ? [{ isActive }] : []),
      ],
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: users.map((user) => this.toResponseDto(user)),
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
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.validateReadAccess(currentUser, user);

    return this.toResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUser: JwtPayload,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.validateWriteAccess(currentUser, user.role, id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.role && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return this.toResponseDto(updated);
  }

  async updatePassword(
    id: string,
    dto: UpdatePasswordDto,
    currentUser: JwtPayload,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.validateWriteAccess(currentUser, user.role, id);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(dto.password, 10) },
    });
  }

  async softDelete(id: string, currentUser: JwtPayload): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.validateWriteAccess(currentUser, user.role, id);

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string, currentUser: JwtPayload): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.deletedAt) {
      throw new ConflictException('User is not deleted');
    }

    await this.validateWriteAccess(currentUser, user.role, id);

    const restored = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
    });

    return this.toResponseDto(restored);
  }

  private async buildRoleFilter(
    currentUser: JwtPayload,
    facultyId?: string,
    subjectId?: string,
  ): Promise<Prisma.UserWhereInput> {
    const role = currentUser.role as UserRole;

    // Super admin sees all users, with optional faculty/subject filter
    if (role === UserRole.super_admin) {
      if (facultyId) {
        return {
          OR: [
            { facultyProfessors: { some: { facultyId } } },
            { facultyStudents: { some: { facultyId } } },
            { facultiesAsAdmin: { some: { id: facultyId } } },
          ],
        };
      }
      if (subjectId) {
        return {
          subjectAssignments: { some: { subjectId } },
        };
      }
      return {};
    }

    // Faculty admin sees users in their faculties
    if (role === UserRole.faculty_admin) {
      const adminFaculties = await this.prisma.faculty.findMany({
        where: { adminId: currentUser.sub, deletedAt: null },
        select: { id: true },
      });
      const allowedFacultyIds = adminFaculties.map((f) => f.id);

      // If facultyId filter provided, validate it's in admin's faculties
      if (facultyId) {
        if (!allowedFacultyIds.includes(facultyId)) {
          return { id: 'none' }; // Return no results if trying to access other faculty
        }
        return {
          OR: [
            { facultyProfessors: { some: { facultyId } } },
            { facultyStudents: { some: { facultyId } } },
          ],
        };
      }

      // If subjectId filter provided, validate subject is in admin's faculties
      if (subjectId) {
        const subject = await this.prisma.subject.findFirst({
          where: { id: subjectId, facultyId: { in: allowedFacultyIds } },
        });
        if (!subject) {
          return { id: 'none' }; // Subject not in admin's faculties
        }
        return {
          subjectAssignments: { some: { subjectId } },
        };
      }

      return {
        OR: [
          { id: currentUser.sub },
          { facultyProfessors: { some: { facultyId: { in: allowedFacultyIds } } } },
          { facultyStudents: { some: { facultyId: { in: allowedFacultyIds } } } },
        ],
      };
    }

    // Professor sees users in their subjects (read-only access)
    if (role === UserRole.professor) {
      const professorSubjects = await this.prisma.userSubjectAssignment.findMany({
        where: { userId: currentUser.sub },
        select: { subjectId: true },
      });
      const allowedSubjectIds = professorSubjects.map((s) => s.subjectId);

      // If subjectId filter provided, validate professor teaches that subject
      if (subjectId) {
        if (!allowedSubjectIds.includes(subjectId)) {
          return { id: 'none' }; // Professor doesn't teach this subject
        }
        return {
          OR: [
            { id: currentUser.sub },
            { subjectAssignments: { some: { subjectId } } },
          ],
        };
      }

      // Faculty filter not applicable for professors
      if (facultyId) {
        return { id: 'none' }; // Professors can't filter by faculty
      }

      return {
        OR: [
          { id: currentUser.sub },
          { subjectAssignments: { some: { subjectId: { in: allowedSubjectIds } } } },
        ],
      };
    }

    // Students can only see themselves
    return { id: currentUser.sub };
  }

  private async validateReadAccess(
    currentUser: JwtPayload,
    targetUser: User,
  ): Promise<void> {
    const role = currentUser.role as UserRole;

    // Can always view self
    if (currentUser.sub === targetUser.id) return;

    // Super admin can view anyone
    if (role === UserRole.super_admin) return;

    // Faculty admin can view users in their faculties
    if (role === UserRole.faculty_admin) {
      const canAccess = await this.canFacultyAdminAccessUser(
        currentUser.sub,
        targetUser.id,
      );
      if (canAccess) return;
    }

    // Professor can view users in their subjects
    if (role === UserRole.professor) {
      const canAccess = await this.canProfessorAccessUser(
        currentUser.sub,
        targetUser.id,
      );
      if (canAccess) return;
    }

    throw new ForbiddenException('You do not have access to view this user');
  }

  private async validateWriteAccess(
    currentUser: JwtPayload,
    targetRole: UserRole | string,
    targetId?: string,
  ): Promise<void> {
    const role = currentUser.role as UserRole;

    // Prevent self-modification (use /me endpoints for profile updates)
    if (targetId && targetId === currentUser.sub) {
      throw new ForbiddenException('Cannot modify your own account via this endpoint');
    }

    // Prevent creating users with same role as yourself
    if (!targetId && targetRole === role) {
      throw new ForbiddenException('Cannot create a user with the same role as yourself');
    }

    // Super admin restrictions
    if (role === UserRole.super_admin) {
      // Cannot create/modify other super admins
      if (targetRole === UserRole.super_admin) {
        throw new ForbiddenException('Cannot create or modify super admin accounts');
      }
      return;
    }

    // Faculty admin restrictions
    if (role === UserRole.faculty_admin) {
      // Cannot create/modify super_admin or faculty_admin
      if (
        targetRole === UserRole.super_admin ||
        targetRole === UserRole.faculty_admin
      ) {
        throw new ForbiddenException('Insufficient permissions for this role');
      }

      // If modifying existing user, check faculty membership
      if (targetId) {
        const canAccess = await this.canFacultyAdminAccessUser(
          currentUser.sub,
          targetId,
        );
        if (!canAccess) {
          throw new ForbiddenException('User is not in your faculty');
        }
      }
      return;
    }

    // Professors have read-only access
    throw new ForbiddenException('You do not have write access');
  }

  private async canFacultyAdminAccessUser(
    adminId: string,
    userId: string,
  ): Promise<boolean> {
    const adminFaculties = await this.prisma.faculty.findMany({
      where: { adminId, deletedAt: null },
      select: { id: true },
    });
    const facultyIds = adminFaculties.map((f) => f.id);

    if (facultyIds.length === 0) return false;

    const userInFaculty = await this.prisma.user.findFirst({
      where: {
        id: userId,
        OR: [
          { facultyProfessors: { some: { facultyId: { in: facultyIds } } } },
          { facultyStudents: { some: { facultyId: { in: facultyIds } } } },
        ],
      },
    });

    return !!userInFaculty;
  }

  private async canProfessorAccessUser(
    professorId: string,
    userId: string,
  ): Promise<boolean> {
    const professorSubjects = await this.prisma.userSubjectAssignment.findMany({
      where: { userId: professorId },
      select: { subjectId: true },
    });
    const subjectIds = professorSubjects.map((s) => s.subjectId);

    if (subjectIds.length === 0) return false;

    const userInSubject = await this.prisma.user.findFirst({
      where: {
        id: userId,
        subjectAssignments: { some: { subjectId: { in: subjectIds } } },
      },
    });

    return !!userInSubject;
  }

  private toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

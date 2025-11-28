import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type { PaginatedResult } from '../../common/pagination/pagination.dto.js';
import type { QueryMembersDto } from '../dto/query-members.dto.js';
import {
  findUserByEmail,
  findUserById,
  validateUserCanBeRole,
  validateUserNotFound,
} from '../utils/member-validation.js';
import {
  queryFacultyMembers,
  mapToFacultyMemberDto,
} from '../utils/member-queries.js';

export interface CreateMemberDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface FacultyMemberDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  assignedAt: Date;
}

@Injectable()
export class FacultyMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfessor(
    facultyId: string,
    dto: CreateMemberDto,
    currentUser: JwtPayload,
  ): Promise<FacultyMemberDto> {
    await this.validateFacultyWriteAccess(currentUser, facultyId);
    return this.createMember(facultyId, dto, 'professor');
  }

  async createStudent(
    facultyId: string,
    dto: CreateMemberDto,
    currentUser: JwtPayload,
  ): Promise<FacultyMemberDto> {
    await this.validateFacultyWriteAccess(currentUser, facultyId);
    return this.createMember(facultyId, dto, 'student');
  }

  private async createMember(
    facultyId: string,
    dto: CreateMemberDto,
    role: 'professor' | 'student',
  ): Promise<FacultyMemberDto> {
    const existingUser = await findUserByEmail(this.prisma, dto.email);

    if (existingUser) {
      await validateUserCanBeRole(this.prisma, existingUser, role, facultyId);

      // Students can only belong to one faculty
      if (role === 'student') {
        const existingStudentRole = await this.prisma.userFacultyRole.findFirst(
          {
            where: { userId: existingUser.id, role: 'student' },
          },
        );
        if (existingStudentRole) {
          throw new ConflictException(
            'This student is already assigned to a faculty',
          );
        }
      }

      const roleRecord = await this.prisma.userFacultyRole.create({
        data: { userId: existingUser.id, facultyId, role },
      });

      return mapToFacultyMemberDto(existingUser, roleRecord.createdAt);
    }

    // Create new user
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const result = await this.prisma.$transaction(async (tx: { user: { create: (arg0: { data: { email: string; firstName: string; lastName: string; passwordHash: string; isActive: boolean; }; }) => any; }; userFacultyRole: { create: (arg0: { data: { userId: any; facultyId: string; role: "professor" | "student"; }; }) => any; }; }) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          isActive: true,
        },
      });

      const roleRecord = await tx.userFacultyRole.create({
        data: { userId: user.id, facultyId, role },
      });

      return { user, roleRecord };
    });

    return mapToFacultyMemberDto(result.user, result.roleRecord.createdAt);
  }

  async addProfessor(
    facultyId: string,
    professorId: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    await this.validateFacultyWriteAccess(currentUser, facultyId);
    await this.addMemberRole(facultyId, professorId, 'professor');
  }

  async removeProfessor(
    facultyId: string,
    professorId: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    await this.validateFacultyWriteAccess(currentUser, facultyId);
    await this.removeMemberRole(facultyId, professorId, 'professor');
  }

  async addStudent(
    facultyId: string,
    studentId: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    await this.validateFacultyWriteAccess(currentUser, facultyId);

    const user = await findUserById(this.prisma, studentId);
    validateUserNotFound(user);
    await validateUserCanBeRole(this.prisma, user, 'student', facultyId);

    // Students can only belong to one faculty
    const existingStudentRole = await this.prisma.userFacultyRole.findFirst({
      where: { userId: studentId, role: 'student' },
    });
    if (existingStudentRole) {
      throw new ConflictException('Student is already assigned to a faculty');
    }

    await this.prisma.userFacultyRole.create({
      data: { userId: studentId, facultyId, role: 'student' },
    });
  }

  async removeStudent(
    facultyId: string,
    studentId: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    await this.validateFacultyWriteAccess(currentUser, facultyId);
    await this.removeMemberRole(facultyId, studentId, 'student');
  }

  private async addMemberRole(
    facultyId: string,
    userId: string,
    role: 'professor' | 'faculty_admin',
  ): Promise<void> {
    const user = await findUserById(this.prisma, userId);
    validateUserNotFound(user);
    await validateUserCanBeRole(this.prisma, user, role, facultyId);

    await this.prisma.userFacultyRole.create({
      data: { userId, facultyId, role },
    });
  }

  private async removeMemberRole(
    facultyId: string,
    userId: string,
    role: 'professor' | 'student' | 'faculty_admin',
  ): Promise<void> {
    const roleRecord = await this.prisma.userFacultyRole.findFirst({
      where: { userId, facultyId, role },
    });

    if (!roleRecord) {
      throw new NotFoundException(`${role} not assigned to this faculty`);
    }

    await this.prisma.userFacultyRole.delete({ where: { id: roleRecord.id } });
  }

  // Faculty Admin management
  async getFacultyAdmins(
    facultyId: string,
    currentUser: JwtPayload,
  ): Promise<FacultyMemberDto[]> {
    await this.validateFacultyReadAccess(currentUser, facultyId);

    const roles = await this.prisma.userFacultyRole.findMany({
      where: { facultyId, role: 'faculty_admin', user: { deletedAt: null } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return roles.map((r: { user: { id: string; email: string; firstName: string; lastName: string; isActive: boolean; }; createdAt: Date; }) => mapToFacultyMemberDto(r.user, r.createdAt));
  }

  async addFacultyAdmin(
    facultyId: string,
    userId: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    if (!currentUser.isSuperAdmin) {
      throw new ForbiddenException(
        'Only super admins can assign faculty admins',
      );
    }
    await this.addMemberRole(facultyId, userId, 'faculty_admin');
  }

  async removeFacultyAdmin(
    facultyId: string,
    userId: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    if (!currentUser.isSuperAdmin) {
      throw new ForbiddenException(
        'Only super admins can remove faculty admins',
      );
    }
    await this.removeMemberRole(facultyId, userId, 'faculty_admin');
  }

  async getProfessors(
    facultyId: string,
    query: QueryMembersDto,
    currentUser: JwtPayload,
  ): Promise<PaginatedResult<FacultyMemberDto>> {
    await this.validateFacultyReadAccess(currentUser, facultyId);
    return queryFacultyMembers(this.prisma, {
      facultyId,
      role: 'professor',
      ...query,
    });
  }

  async getStudents(
    facultyId: string,
    query: QueryMembersDto,
    currentUser: JwtPayload,
  ): Promise<PaginatedResult<FacultyMemberDto>> {
    await this.validateFacultyReadAccess(currentUser, facultyId);
    return queryFacultyMembers(this.prisma, {
      facultyId,
      role: 'student',
      ...query,
    });
  }

  async validateFacultyWriteAccess(
    currentUser: JwtPayload,
    facultyId: string,
  ): Promise<void> {
    if (currentUser.isSuperAdmin) return;

    const isFacultyAdmin = await this.prisma.userFacultyRole.findFirst({
      where: { userId: currentUser.sub, facultyId, role: 'faculty_admin' },
    });

    if (!isFacultyAdmin) {
      throw new ForbiddenException(
        'You do not have write access to this faculty',
      );
    }
  }

  async validateFacultyReadAccess(
    currentUser: JwtPayload,
    facultyId: string,
  ): Promise<void> {
    if (currentUser.isSuperAdmin) return;

    const hasRole = await this.prisma.userFacultyRole.findFirst({
      where: { userId: currentUser.sub, facultyId },
    });

    if (!hasRole) {
      throw new ForbiddenException(
        'You do not have read access to this faculty',
      );
    }
  }
}

import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserRole, Prisma } from '@prisma/client';
import type { Faculty } from '@prisma/client';
import type { PaginatedResult } from '../../common/pagination/pagination.dto.js';
import type { CreateFacultyDto } from '../dto/create-faculty.dto.js';
import type { UpdateFacultyDto } from '../dto/update-faculty.dto.js';
import type { QueryFacultyDto } from '../dto/query-faculty.dto.js';
import type { FacultyResponseDto } from '../dto/faculty-response.dto.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class FacultyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateFacultyDto, currentUser: JwtPayload): Promise<FacultyResponseDto> {
    this.validateSuperAdminAccess(currentUser);

    const existing = await this.prisma.faculty.findFirst({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Faculty code already exists');
    }

    if (dto.adminId) {
      await this.validateAdminUser(dto.adminId);
    }

    const faculty = await this.prisma.faculty.create({
      data: {
        name: dto.name,
        code: dto.code,
        ...(dto.description && { description: dto.description }),
        ...(dto.adminId && { adminId: dto.adminId }),
      },
      include: { admin: true },
    });

    return this.toResponseDto(faculty);
  }

  async findAll(
    query: QueryFacultyDto,
    currentUser: JwtPayload,
  ): Promise<PaginatedResult<FacultyResponseDto>> {
    const { page = 1, limit = 10, search, isActive } = query;
    const skip = (page - 1) * limit;

    const roleFilter = await this.buildRoleFilter(currentUser);

    const searchFilter: Prisma.FacultyWhereInput | undefined = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { code: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    const where: Prisma.FacultyWhereInput = {
      AND: [
        { deletedAt: null },
        roleFilter,
        ...(searchFilter ? [searchFilter] : []),
        ...(isActive !== undefined ? [{ isActive }] : []),
      ],
    };

    const [faculties, total] = await Promise.all([
      this.prisma.faculty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { admin: true },
      }),
      this.prisma.faculty.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: faculties.map((f) => this.toResponseDto(f)),
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

  async findOne(id: string, currentUser: JwtPayload): Promise<FacultyResponseDto> {
    const faculty = await this.prisma.faculty.findFirst({
      where: { id, deletedAt: null },
      include: { admin: true },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty not found');
    }

    await this.validateReadAccess(currentUser, faculty);

    return this.toResponseDto(faculty);
  }

  async update(
    id: string,
    dto: UpdateFacultyDto,
    currentUser: JwtPayload,
  ): Promise<FacultyResponseDto> {
    this.validateSuperAdminAccess(currentUser);

    const faculty = await this.prisma.faculty.findFirst({
      where: { id, deletedAt: null },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty not found');
    }

    if (dto.code && dto.code !== faculty.code) {
      const existing = await this.prisma.faculty.findFirst({
        where: { code: dto.code, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Faculty code already exists');
      }
    }

    if (dto.adminId) {
      await this.validateAdminUser(dto.adminId);
    }

    const updated = await this.prisma.faculty.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.code && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.adminId !== undefined && { adminId: dto.adminId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { admin: true },
    });

    return this.toResponseDto(updated);
  }

  async softDelete(id: string, currentUser: JwtPayload): Promise<void> {
    this.validateSuperAdminAccess(currentUser);

    const faculty = await this.prisma.faculty.findFirst({
      where: { id, deletedAt: null },
    });

    if (!faculty) {
      throw new NotFoundException('Faculty not found');
    }

    await this.prisma.faculty.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string, currentUser: JwtPayload): Promise<FacultyResponseDto> {
    this.validateSuperAdminAccess(currentUser);

    const faculty = await this.prisma.faculty.findUnique({ where: { id } });

    if (!faculty) {
      throw new NotFoundException('Faculty not found');
    }

    if (!faculty.deletedAt) {
      throw new ConflictException('Faculty is not deleted');
    }

    const restored = await this.prisma.faculty.update({
      where: { id },
      data: { deletedAt: null },
      include: { admin: true },
    });

    return this.toResponseDto(restored);
  }

  async addProfessor(
    facultyId: string,
    professorId: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    await this.validateFacultyWriteAccess(currentUser, facultyId);

    const professor = await this.prisma.user.findFirst({
      where: { id: professorId, role: UserRole.professor, deletedAt: null },
    });

    if (!professor) {
      throw new NotFoundException('Professor not found');
    }

    const existing = await this.prisma.facultyProfessor.findUnique({
      where: { facultyId_professorId: { facultyId, professorId } },
    });

    if (existing) {
      throw new ConflictException('Professor already assigned to this faculty');
    }

    await this.prisma.facultyProfessor.create({
      data: { facultyId, professorId },
    });
  }

  async removeProfessor(
    facultyId: string,
    professorId: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    await this.validateFacultyWriteAccess(currentUser, facultyId);

    const assignment = await this.prisma.facultyProfessor.findUnique({
      where: { facultyId_professorId: { facultyId, professorId } },
    });

    if (!assignment) {
      throw new NotFoundException('Professor not assigned to this faculty');
    }

    await this.prisma.facultyProfessor.delete({
      where: { facultyId_professorId: { facultyId, professorId } },
    });
  }

  async addStudent(
    facultyId: string,
    studentId: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    await this.validateFacultyWriteAccess(currentUser, facultyId);

    const student = await this.prisma.user.findFirst({
      where: { id: studentId, role: UserRole.student, deletedAt: null },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const existing = await this.prisma.facultyStudent.findUnique({
      where: { facultyId_studentId: { facultyId, studentId } },
    });

    if (existing) {
      throw new ConflictException('Student already assigned to this faculty');
    }

    await this.prisma.facultyStudent.create({
      data: { facultyId, studentId },
    });
  }

  async removeStudent(
    facultyId: string,
    studentId: string,
    currentUser: JwtPayload,
  ): Promise<void> {
    await this.validateFacultyWriteAccess(currentUser, facultyId);

    const assignment = await this.prisma.facultyStudent.findUnique({
      where: { facultyId_studentId: { facultyId, studentId } },
    });

    if (!assignment) {
      throw new NotFoundException('Student not assigned to this faculty');
    }

    await this.prisma.facultyStudent.delete({
      where: { facultyId_studentId: { facultyId, studentId } },
    });
  }

  private async buildRoleFilter(currentUser: JwtPayload): Promise<Prisma.FacultyWhereInput> {
    const role = currentUser.role as UserRole;

    if (role === UserRole.super_admin) {
      return {};
    }

    if (role === UserRole.faculty_admin) {
      return { adminId: currentUser.sub };
    }

    if (role === UserRole.professor) {
      return {
        professors: { some: { professorId: currentUser.sub } },
      };
    }

    if (role === UserRole.student) {
      return {
        students: { some: { studentId: currentUser.sub } },
      };
    }

    return { id: 'none' };
  }

  private async validateReadAccess(
    currentUser: JwtPayload,
    faculty: Faculty,
  ): Promise<void> {
    const role = currentUser.role as UserRole;

    if (role === UserRole.super_admin) return;

    if (role === UserRole.faculty_admin && faculty.adminId === currentUser.sub) {
      return;
    }

    if (role === UserRole.professor) {
      const assignment = await this.prisma.facultyProfessor.findUnique({
        where: { facultyId_professorId: { facultyId: faculty.id, professorId: currentUser.sub } },
      });
      if (assignment) return;
    }

    if (role === UserRole.student) {
      const assignment = await this.prisma.facultyStudent.findUnique({
        where: { facultyId_studentId: { facultyId: faculty.id, studentId: currentUser.sub } },
      });
      if (assignment) return;
    }

    throw new ForbiddenException('You do not have access to this faculty');
  }

  private validateSuperAdminAccess(currentUser: JwtPayload): void {
    if (currentUser.role !== UserRole.super_admin) {
      throw new ForbiddenException('Only super admins can perform this action');
    }
  }

  private async validateFacultyWriteAccess(
    currentUser: JwtPayload,
    facultyId: string,
  ): Promise<void> {
    const role = currentUser.role as UserRole;

    if (role === UserRole.super_admin) return;

    if (role === UserRole.faculty_admin) {
      const faculty = await this.prisma.faculty.findFirst({
        where: { id: facultyId, adminId: currentUser.sub, deletedAt: null },
      });
      if (faculty) return;
    }

    throw new ForbiddenException('You do not have write access to this faculty');
  }

  private async validateAdminUser(adminId: string): Promise<void> {
    const admin = await this.prisma.user.findFirst({
      where: { id: adminId, role: UserRole.faculty_admin, deletedAt: null },
    });

    if (!admin) {
      throw new NotFoundException('Admin user not found or not a faculty admin');
    }
  }

  private toResponseDto(
    faculty: Faculty & { admin?: { id: string; email: string; firstName: string; lastName: string } | null },
  ): FacultyResponseDto {
    return {
      id: faculty.id,
      name: faculty.name,
      code: faculty.code,
      description: faculty.description,
      admin: faculty.admin
        ? {
            id: faculty.admin.id,
            email: faculty.admin.email,
            firstName: faculty.admin.firstName,
            lastName: faculty.admin.lastName,
          }
        : null,
      isActive: faculty.isActive,
      createdAt: faculty.createdAt,
      updatedAt: faculty.updatedAt,
    };
  }
}

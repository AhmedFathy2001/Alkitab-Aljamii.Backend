import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type { PaginatedResult } from '../../common/pagination/pagination.dto.js';
import type { CreateSubjectDto } from '../dto/create-subject.dto.js';
import type { UpdateSubjectDto } from '../dto/update-subject.dto.js';
import type { QuerySubjectDto } from '../dto/query-subject.dto.js';
import type { SubjectResponseDto } from '../dto/subject-response.dto.js';

@Injectable()
export class SubjectService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateSubjectDto,
    user: JwtPayload,
  ): Promise<SubjectResponseDto> {
    await this.validateFacultyAccess(user, dto.facultyId);
    await this.ensureCodeUnique(dto.facultyId, dto.code);

    const subject = await this.prisma.subject.create({
      data: {
        name: dto.name,
        code: dto.code,
        facultyId: dto.facultyId,
        description: dto.description ?? null,
      },
      include: { faculty: { select: { name: true } } },
    });
    return this.toResponse(subject);
  }

  async findAll(
    query: QuerySubjectDto,
    user: JwtPayload,
  ): Promise<PaginatedResult<SubjectResponseDto>> {
    const { page = 1, limit = 10, facultyId, search, isActive } = query;
    const skip = (page - 1) * limit;
    const where = await this.buildWhereClause(
      user,
      facultyId,
      search,
      isActive,
    );

    const [subjects, total] = await Promise.all([
      this.prisma.subject.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          faculty: { select: { name: true } },
          _count: { select: { assignments: true } },
        },
      }),
      this.prisma.subject.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items: subjects.map((s) => this.toResponse(s)),
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

  async findOne(id: string, user: JwtPayload): Promise<SubjectResponseDto> {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        faculty: { select: { name: true } },
        _count: { select: { assignments: true } },
      },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    await this.validateSubjectAccess(user, subject.facultyId);
    return this.toResponse(subject);
  }

  async update(
    id: string,
    dto: UpdateSubjectDto,
    user: JwtPayload,
  ): Promise<SubjectResponseDto> {
    const subject = await this.findSubjectOrThrow(id);
    await this.validateFacultyAccess(user, subject.facultyId);
    if (dto.code && dto.code !== subject.code)
      await this.ensureCodeUnique(subject.facultyId, dto.code);

    const updated = await this.prisma.subject.update({
      where: { id },
      data: { ...dto },
      include: { faculty: { select: { name: true } } },
    });
    return this.toResponse(updated);
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const subject = await this.findSubjectOrThrow(id);
    await this.validateFacultyAccess(user, subject.facultyId);
    await this.prisma.subject.delete({ where: { id } });
  }

  private async findSubjectOrThrow(id: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  private async ensureCodeUnique(
    facultyId: string,
    code: string,
  ): Promise<void> {
    const existing = await this.prisma.subject.findUnique({
      where: { facultyId_code: { facultyId, code } },
    });
    if (existing)
      throw new ConflictException(
        'Subject code already exists in this faculty',
      );
  }

  private async validateFacultyAccess(
    user: JwtPayload,
    facultyId: string,
  ): Promise<void> {
    // Super admin can access all
    if (user.isSuperAdmin) return;

    const activeView = user.activeView;

    // Faculty admin can access their faculties
    if (activeView === 'faculty_admin') {
      const adminRole = await this.prisma.userFacultyRole.findFirst({
        where: { userId: user.sub, facultyId, role: 'faculty_admin' },
      });
      if (adminRole) return;
    }

    throw new ForbiddenException('No access to this faculty');
  }

  private async validateSubjectAccess(
    user: JwtPayload,
    facultyId: string,
  ): Promise<void> {
    // Super admin can access all
    if (user.isSuperAdmin) return;

    const activeView = user.activeView;

    // Faculty admin can access all subjects in their faculties
    if (activeView === 'faculty_admin') {
      const adminRole = await this.prisma.userFacultyRole.findFirst({
        where: { userId: user.sub, facultyId, role: 'faculty_admin' },
      });
      if (adminRole) return;
      // Also check if assigned as professor to subjects in this faculty
      const assignment = await this.prisma.userSubjectAssignment.findFirst({
        where: { userId: user.sub, subject: { facultyId } },
      });
      if (assignment) return;
    }

    // Professor/student can access subjects they're assigned to
    if (activeView === 'professor' || activeView === 'student') {
      const assignment = await this.prisma.userSubjectAssignment.findFirst({
        where: { userId: user.sub, subject: { facultyId } },
      });
      if (assignment) return;
    }

    throw new ForbiddenException('No access to this subject');
  }

  private async buildWhereClause(
    user: JwtPayload,
    facultyId?: string,
    search?: string,
    isActive?: boolean,
  ) {
    const where: Record<string, unknown> = {};

    // Use JWT context facultyId if set, otherwise fall back to query param
    const effectiveFacultyId = user.facultyId ?? facultyId;
    // Use activeView from JWT context
    const effectiveRole = user.activeView;

    if (effectiveFacultyId) where['facultyId'] = effectiveFacultyId;
    if (isActive !== undefined) where['isActive'] = isActive;
    if (search) {
      where['OR'] = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    // If super_admin, no additional filtering needed (unless facultyId is set)
    if (user.isSuperAdmin) {
      return where;
    }

    // If facultyId is already set from JWT context, we just filter by that faculty
    // and verify user has access to it
    if (effectiveFacultyId) {
      // For faculty_admin viewing as admin, show all subjects in that faculty
      if (effectiveRole === 'faculty_admin') {
        return where;
      }
      // For professor/student, only show subjects they're assigned to in that faculty
      const assignments = await this.prisma.userSubjectAssignment.findMany({
        where: {
          userId: user.sub,
          subject: { facultyId: effectiveFacultyId },
        },
        select: { subjectId: true },
      });
      where['id'] = { in: assignments.map((a) => a.subjectId) };
      return where;
    }

    // No faculty context set - show all accessible subjects (legacy behavior)
    if (effectiveRole === 'faculty_admin') {
      // Get faculties they admin
      const adminRoles = await this.prisma.userFacultyRole.findMany({
        where: { userId: user.sub, role: 'faculty_admin' },
        select: { facultyId: true },
      });
      // Also get subjects they're assigned to as professor (deans can teach)
      const assignments = await this.prisma.userSubjectAssignment.findMany({
        where: { userId: user.sub },
        select: { subjectId: true },
      });
      // Combine: subjects in their faculties OR subjects they're assigned to
      where['OR'] = [
        { facultyId: { in: adminRoles.map((r) => r.facultyId) } },
        { id: { in: assignments.map((a) => a.subjectId) } },
      ];
    } else if (effectiveRole === 'professor' || effectiveRole === 'student') {
      const assignments = await this.prisma.userSubjectAssignment.findMany({
        where: { userId: user.sub },
        select: { subjectId: true },
      });
      where['id'] = { in: assignments.map((a) => a.subjectId) };
    }
    return where;
  }

  private toResponse(subject: {
    id: string;
    name: string;
    code: string;
    facultyId: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    faculty?: { name: string };
    _count?: { assignments: number };
  }): SubjectResponseDto {
    return {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      facultyId: subject.facultyId,
      facultyName: subject.faculty?.name,
      description: subject.description ?? undefined,
      isActive: subject.isActive,
      professorCount: subject._count?.assignments,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    };
  }
}

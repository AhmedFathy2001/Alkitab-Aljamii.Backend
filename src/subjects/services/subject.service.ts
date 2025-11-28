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

  // ========================= CREATE =============================
  async create(dto: CreateSubjectDto, user: JwtPayload): Promise<SubjectResponseDto> {
    await this.validateFacultyAccess(user, dto.facultyId);
    await this.ensureCodeUnique(dto.facultyId, dto.code);

    const subject = await this.prisma.subject.create({
      data: {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        code: dto.code,
        facultyId: dto.facultyId,
        descriptionEn: dto.descriptionEn ?? null,
        descriptionAr: dto.descriptionAr ?? null,
      },
      include: { faculty: { select: { nameEn: true, nameAr: true } } },
    });

    return this.toResponse(subject);
  }

  // ========================= FIND ALL =============================
  async findAll(
    query: QuerySubjectDto,
    user: JwtPayload,
  ): Promise<PaginatedResult<SubjectResponseDto>> {
    const { page = 1, limit = 10, facultyId, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where = await this.buildWhereClause(user, facultyId, search, isActive);

    const [subjects, total] = await Promise.all([
      this.prisma.subject.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          faculty: { select: { nameEn: true, nameAr: true } },
          _count: { select: { assignments: true } },
        },
      }),
      this.prisma.subject.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: subjects.map((s: any) => this.toResponse(s)),
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

  // ========================= FIND ONE =============================
  async findOne(id: string, user: JwtPayload): Promise<SubjectResponseDto> {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        faculty: { select: { nameEn: true, nameAr: true } },
        _count: { select: { assignments: true } },
      },
    });

    if (!subject) throw new NotFoundException('Subject not found');

    await this.validateSubjectAccess(user, subject.facultyId);

    return this.toResponse(subject);
  }

  // ========================= UPDATE =============================
  async update(
    id: string,
    dto: UpdateSubjectDto,
    user: JwtPayload,
  ): Promise<SubjectResponseDto> {
    const subject = await this.findSubjectOrThrow(id);

    await this.validateFacultyAccess(user, subject.facultyId);

    if (dto.code && dto.code !== subject.code) {
      await this.ensureCodeUnique(subject.facultyId, dto.code);
    }

    const updated = await this.prisma.subject.update({
      where: { id },
      data: {
        nameEn: dto.nameEn ?? subject.nameEn,
        nameAr: dto.nameAr ?? subject.nameAr,
        code: dto.code ?? subject.code,
        descriptionEn: dto.descriptionEn ?? subject.descriptionEn,
        descriptionAr: dto.descriptionAr ?? subject.descriptionAr,
        isActive: dto.isActive ?? subject.isActive,
      },
      include: {
        faculty: { select: { nameEn: true, nameAr: true } },
      },
    });

    return this.toResponse(updated);
  }

  // ========================= DELETE =============================
  async remove(id: string, user: JwtPayload): Promise<void> {
    const subject = await this.findSubjectOrThrow(id);
    await this.validateFacultyAccess(user, subject.facultyId);
    await this.prisma.subject.delete({ where: { id } });
  }

  // ========================= HELPERS =============================
  private async findSubjectOrThrow(id: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  private async ensureCodeUnique(facultyId: string, code: string): Promise<void> {
    const existing = await this.prisma.subject.findUnique({
      where: { facultyId_code: { facultyId, code } },
    });

    if (existing) {
      throw new ConflictException('Subject code already exists in this faculty');
    }
  }

  // ========================= ACCESS CHECKS =============================
  private async validateFacultyAccess(user: JwtPayload, facultyId: string) {
    if (user.isSuperAdmin) return;

    if (user.activeView === 'faculty_admin') {
      const role = await this.prisma.userFacultyRole.findFirst({
        where: { userId: user.sub, facultyId, role: 'faculty_admin' },
      });
      if (role) return;
    }

    throw new ForbiddenException('No access to this faculty');
  }

  private async validateSubjectAccess(user: JwtPayload, facultyId: string) {
    if (user.isSuperAdmin) return;

    if (user.activeView === 'faculty_admin') {
      const role = await this.prisma.userFacultyRole.findFirst({
        where: { userId: user.sub, facultyId, role: 'faculty_admin' },
      });
      if (role) return;
    }

    const assignment = await this.prisma.userSubjectAssignment.findFirst({
      where: { userId: user.sub, subject: { facultyId } },
    });

    if (assignment) return;

    throw new ForbiddenException('No access to this subject');
  }

  // ========================= WHERE CLAUSE =============================
  private async buildWhereClause(
    user: JwtPayload,
    facultyId?: string,
    search?: string,
    isActive?: boolean,
  ) {
    const where: Record<string, any> = {};

    const effectiveFacultyId = user.facultyId ?? facultyId;
    const effectiveRole = user.activeView;

    if (effectiveFacultyId) where['facultyId'] = effectiveFacultyId;
    if (isActive !== undefined) where['isActive'] = isActive;

    if (search) {
      where['OR'] = [
        { nameEn: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (user.isSuperAdmin) return where;

    // Faculty ID known
    if (effectiveFacultyId) {
      if (effectiveRole === 'faculty_admin') return where;

      const assignments = await this.prisma.userSubjectAssignment.findMany({
        where: {
          userId: user.sub,
          subject: { facultyId: effectiveFacultyId },
        },
        select: { subjectId: true },
      });

      where['id'] = { in: assignments.map((a: { subjectId: any; }) => a.subjectId) };
      return where;
    }

    // Faculty admin with no faculty chosen
    if (effectiveRole === 'faculty_admin') {
      const adminRoles = await this.prisma.userFacultyRole.findMany({
        where: { userId: user.sub, role: 'faculty_admin' },
        select: { facultyId: true },
      });

      const assignments = await this.prisma.userSubjectAssignment.findMany({
        where: { userId: user.sub },
        select: { subjectId: true },
      });

      where['OR'] = [
        { facultyId: { in: adminRoles.map((r: { facultyId: any; }) => r.facultyId) } },
        { id: { in: assignments.map((a: { subjectId: any; }) => a.subjectId) } },
      ];

      return where;
    }

    // Professor / Student (no faculty selected)
    if (effectiveRole === 'professor' || effectiveRole === 'student') {
      const assignments = await this.prisma.userSubjectAssignment.findMany({
        where: { userId: user.sub },
        select: { subjectId: true },
      });

      where['id'] = { in: assignments.map((a: { subjectId: any; }) => a.subjectId) };
    }

    return where;
  }

  // ========================= RESPONSE MAPPER =============================
  private toResponse(subject: any): SubjectResponseDto {
    return {
      id: subject.id,
      nameEn: subject.nameEn,
      nameAr: subject.nameAr,
      code: subject.code,
      facultyId: subject.facultyId,
      facultyName: subject.faculty?.nameEn,
      descriptionEn: subject.descriptionEn ?? undefined,
      descriptionAr: subject.descriptionAr ?? undefined,
      isActive: subject.isActive,
      professorCount: subject._count?.assignments,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    };
  }
}

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma, Faculty } from '@prisma/client/index-browser';
import type { PaginatedResult } from '../../common/pagination/pagination.dto.js';
import type { CreateFacultyDto } from '../dto/create-faculty.dto.js';
import type { UpdateFacultyDto } from '../dto/update-faculty.dto.js';
import type { QueryFacultyDto } from '../dto/query-faculty.dto.js';
import type { FacultyResponseDto } from '../dto/faculty-response.dto.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { FacultyAccessService } from './faculty-access.service.js';
import { toFacultyResponseDto } from '../utils/faculty-mapper.js';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class FacultyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: FacultyAccessService,
    private readonly i18n: I18nService, // i18n service
  ) {}

  async create(
    dto: CreateFacultyDto,
    currentUser: JwtPayload,
  ): Promise<FacultyResponseDto> {
    this.accessService.validateSuperAdminAccess(currentUser);

    const existing = await this.prisma.faculty.findFirst({
      where: { code: dto.code },
    });

    if (existing) {
      const message = await this.i18n.translate('faculty.CODE_EXISTS');
      throw new ConflictException(message);
    }

    const faculty = await this.prisma.faculty.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        code: dto.code,
        ...(dto.description && { description: dto.description }),
        ...(dto.descriptionAr && { descriptionAr: dto.descriptionAr }),
      },
    });

    return toFacultyResponseDto(faculty);
  }

  async findAll(
    query: QueryFacultyDto,
    currentUser: JwtPayload,
  ): Promise<PaginatedResult<FacultyResponseDto>> {
    const { page = 1, limit = 10, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where = await this.buildWhereClause(currentUser, search, isActive);

    const [faculties, total] = await Promise.all([
      this.prisma.faculty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              facultyRoles: true,
            },
          },
          facultyRoles: {
            select: {
              role: true,
            },
            where: {
              user: { deletedAt: null },
            },
          },
        },
      }),
      this.prisma.faculty.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Map faculties with counts
    const items = faculties.map((f) => {
      const professorsCount = f.facultyRoles.filter(
        (r) => r.role === 'professor',
      ).length;
      const studentsCount = f.facultyRoles.filter(
        (r) => r.role === 'student',
      ).length;
      const adminsCount = f.facultyRoles.filter(
        (r) => r.role === 'faculty_admin',
      ).length;

      return toFacultyResponseDto({
        ...f,
        professorsCount,
        studentsCount,
        adminsCount,
      });
    });

    return {
      items,
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

  async findOne(
    id: string,
    currentUser: JwtPayload,
  ): Promise<FacultyResponseDto> {
    const faculty = await this.prisma.faculty.findFirst({
      where: { id, deletedAt: null },
    });

    if (!faculty) {
      const message = await this.i18n.translate('faculty.NOT_FOUND');
      throw new NotFoundException(message);
    }

    await this.accessService.validateReadAccess(currentUser, faculty);

    // Get member counts
    const [professorsCount, studentsCount, adminsCount] = await Promise.all([
      this.prisma.userFacultyRole.count({
        where: { facultyId: id, role: 'professor', user: { deletedAt: null } },
      }),
      this.prisma.userFacultyRole.count({
        where: { facultyId: id, role: 'student', user: { deletedAt: null } },
      }),
      this.prisma.userFacultyRole.count({
        where: {
          facultyId: id,
          role: 'faculty_admin',
          user: { deletedAt: null },
        },
      }),
    ]);

    return toFacultyResponseDto({
      ...faculty,
      professorsCount,
      studentsCount,
      adminsCount,
    });
  }

  async update(
    id: string,
    dto: UpdateFacultyDto,
    currentUser: JwtPayload,
  ): Promise<FacultyResponseDto> {
    this.accessService.validateSuperAdminAccess(currentUser);

    const faculty = await this.prisma.faculty.findFirst({
      where: { id, deletedAt: null },
    });

    if (!faculty) {
      const message = await this.i18n.translate('faculty.NOT_FOUND');
      throw new NotFoundException(message);
    }

    if (dto.code && dto.code !== faculty.code) {
      await this.ensureCodeUnique(dto.code, id);
    }

    const updated = await this.prisma.faculty.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.nameAr && { nameAr: dto.nameAr }),
        ...(dto.code && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.descriptionAr !== undefined && {
          descriptionAr: dto.descriptionAr,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return toFacultyResponseDto(updated);
  }

  async softDelete(id: string, currentUser: JwtPayload): Promise<void> {
    this.accessService.validateSuperAdminAccess(currentUser);
    await this.findFacultyOrThrow(id);
    await this.prisma.faculty.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(
    id: string,
    currentUser: JwtPayload,
  ): Promise<FacultyResponseDto> {
    this.accessService.validateSuperAdminAccess(currentUser);

    const faculty = await this.prisma.faculty.findUnique({ where: { id } });
    if (!faculty) {
      const message = await this.i18n.translate('faculty.NOT_FOUND');
      throw new NotFoundException(message);
    }
    if (!faculty.deletedAt) {
      const message = await this.i18n.translate('faculty.NOT_DELETED');
      throw new ConflictException(message);
    }

    const restored = await this.prisma.faculty.update({
      where: { id },
      data: { deletedAt: null },
    });

    return toFacultyResponseDto(restored);
  }

  private async buildWhereClause(
    currentUser: JwtPayload,
    search?: string,
    isActive?: boolean,
  ): Promise<Prisma.FacultyWhereInput> {
    const roleFilter = await this.accessService.buildRoleFilter(currentUser);

    const searchFilter: Prisma.FacultyWhereInput | undefined = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { nameAr: { contains: search, mode: 'insensitive' as const } },
            { code: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

    return {
      AND: [
        { deletedAt: null },
        roleFilter,
        ...(searchFilter ? [searchFilter] : []),
        ...(isActive !== undefined ? [{ isActive }] : []),
      ],
    };
  }

  private async findFacultyOrThrow(id: string): Promise<Faculty> {
    const faculty = await this.prisma.faculty.findFirst({
      where: { id, deletedAt: null },
    });
    if (!faculty) {
      const message = await this.i18n.translate('faculty.NOT_FOUND');
      throw new NotFoundException(message);
    }
    return faculty;
  }

  private async ensureCodeUnique(
    code: string,
    excludeId: string,
  ): Promise<void> {
    const existing = await this.prisma.faculty.findFirst({
      where: { code, id: { not: excludeId } },
    });
    if (existing) {
      const message = await this.i18n.translate('faculty.CODE_EXISTS');
      throw new ConflictException(message);
    }
  }
}

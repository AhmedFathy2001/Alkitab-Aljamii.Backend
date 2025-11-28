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

@Injectable()
export class FacultyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: FacultyAccessService,
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
      throw new ConflictException('Faculty code already exists');
    }

    const faculty = await this.prisma.faculty.create({
      data: {
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        code: dto.code,
        ...(dto.descriptionEn && { descriptionEn: dto.descriptionEn }),
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
      }),
      this.prisma.faculty.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: faculties.map((f: { description: string | null; id: string; name: string; isActive: boolean; createdAt: Date; updatedAt: Date; deletedAt: Date | null; code: string; }) => toFacultyResponseDto(f)),
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
      throw new NotFoundException('Faculty not found');
    }

    await this.accessService.validateReadAccess(currentUser, faculty);
    return toFacultyResponseDto(faculty);
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
      throw new NotFoundException('Faculty not found');
    }

    if (dto.code && dto.code !== faculty.code) {
      await this.ensureCodeUnique(dto.code, id);
    }

    const updated = await this.prisma.faculty.update({
      where: { id },
      data: {
        ...(dto.nameEn && { nameEn: dto.nameEn }),
        ...(dto.nameAr && { nameAr: dto.nameAr }),
        ...(dto.code && { code: dto.code }),
        ...(dto.descriptionEn !== undefined && { descriptionEn: dto.descriptionEn }),
        ...(dto.descriptionAr !== undefined && { descriptionAr: dto.descriptionAr }),
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
      throw new NotFoundException('Faculty not found');
    }
    if (!faculty.deletedAt) {
      throw new ConflictException('Faculty is not deleted');
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
            { nameEn: { contains: search, mode: 'insensitive' as const } },
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
      throw new NotFoundException('Faculty not found');
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
      throw new ConflictException('Faculty code already exists');
    }
  }
}


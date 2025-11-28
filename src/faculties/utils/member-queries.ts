import type { PrismaService } from '../../prisma/prisma.service.js';
import type { FacultyRole } from '@prisma/client/index-browser';
import type { PaginatedResult } from '../../common/pagination/pagination.dto.js';
import type { FacultyMemberDto } from '../services/faculty-members.service.js';

export interface QueryMembersParams {
  facultyId: string;
  role: FacultyRole;
  page?: number;
  limit?: number;
  search?: string;
}

export async function queryFacultyMembers(
  prisma: PrismaService,
  params: QueryMembersParams,
): Promise<PaginatedResult<FacultyMemberDto>> {
  const { facultyId, role, page = 1, limit = 10, search } = params;
  const skip = (page - 1) * limit;

  const searchFilter = search
    ? {
        user: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      }
    : {};

  const where = {
    facultyId,
    role,
    user: { deletedAt: null },
    ...searchFilter,
  };

  const [roles, total] = await Promise.all([
    prisma.userFacultyRole.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
    }),
    prisma.userFacultyRole.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items: roles.map((r: { user: { id: any; email: any; firstName: any; lastName: any; isActive: any; }; createdAt: any; }) => ({
      id: r.user.id,
      email: r.user.email,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      isActive: r.user.isActive,
      assignedAt: r.createdAt,
    })),
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

export function mapToFacultyMemberDto(
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  },
  assignedAt: Date,
): FacultyMemberDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    assignedAt,
  };
}

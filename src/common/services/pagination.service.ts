import { PaginationQueryDto, PaginatedResult } from '../pagination/pagination.dto';
import { Injectable } from '@nestjs/common';
@Injectable()
export class PaginationService {
  async paginate<T>(
    findManyFn: (args: any) => Promise<T[]>,
    countFn: (args: any) => Promise<number>,
    query: PaginationQueryDto,
    extraWhere: any = {},
    searchableFields: string[] = [],
  ): Promise<PaginatedResult<T>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where = {
      ...extraWhere,
      ...(query.search && searchableFields.length
        ? {
            OR: searchableFields.map((field) => ({
              [field]: { contains: query.search, mode: 'insensitive' },
            })),
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      findManyFn({
        skip,
        take: limit,
        where,
        orderBy: query.sortBy
          ? { [query.sortBy]: query.sortOrder?.toLowerCase() }
          : undefined,
      }),
      countFn({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

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
}
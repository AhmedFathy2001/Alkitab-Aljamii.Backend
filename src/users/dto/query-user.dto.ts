import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto.js';

export class QueryUserDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['faculty_admin', 'professor', 'student'],
    description: 'Filter by faculty role',
  })
  @IsIn(['faculty_admin', 'professor', 'student'])
  @IsOptional()
  role?: 'faculty_admin' | 'professor' | 'student';

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by active status',
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by faculty ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  facultyId?: string;

  @ApiPropertyOptional({
    description:
      'Filter by subject ID (for professors viewing their course students)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter for super admins only',
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isSuperAdmin?: boolean;
}

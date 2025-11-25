import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto.js';
import { UserRole } from '@prisma/client';

export class QueryUserDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserRole, description: 'Filter by user role' })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ example: true, description: 'Filter by active status' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by faculty ID (super_admin and faculty_admin only)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  facultyId?: string;

  @ApiPropertyOptional({
    description: 'Filter by subject ID (for professors viewing their course students)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  subjectId?: string;
}

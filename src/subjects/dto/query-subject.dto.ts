import { IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto.js';

export class QuerySubjectDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by faculty Name' })
  @IsOptional()
  @IsUUID()
  facultyName?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
}

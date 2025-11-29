import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsOptional,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class UpdateFacultyDto {
  @ApiPropertyOptional({
    example: 'Faculty of Engineering',
    description: 'Faculty name in English',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'كلية الهندسة',
    description: 'Faculty name in Arabic',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  nameAr?: string;

  @ApiPropertyOptional({ example: 'ENG', description: 'Unique faculty code' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string;

  @ApiPropertyOptional({
    example: 'Engineering and Technology faculty',
    description: 'Faculty description in English',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: 'كلية الهندسة والتكنولوجيا',
    description: 'Faculty description in Arabic',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  descriptionAr?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Faculty admin user ID',
  })
  @IsUUID()
  @IsOptional()
  adminId?: string;

  @ApiPropertyOptional({ example: true, description: 'Faculty active status' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

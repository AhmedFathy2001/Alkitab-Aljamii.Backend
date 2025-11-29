import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';

export class UpdateContentDto {
  // Titles
  @ApiPropertyOptional({ description: 'Content title in English', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Content title in Arabic', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleAr?: string;

  // Descriptions
  @ApiPropertyOptional({ description: 'Content description in English', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Content description in Arabic', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionAr?: string;

  // Status (fixed enum)
  @ApiPropertyOptional({ description: 'Content status', enum: ['pending', 'approved', 'rejected'] })
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected'])
  status?: 'pending' | 'approved' | 'rejected';
}


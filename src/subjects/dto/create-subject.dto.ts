import {
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ description: 'Subject name in English' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Subject name in Arabic' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nameAr!: string;

  @ApiProperty({ description: 'Subject code (unique within faculty)' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code!: string;

  @ApiProperty({ description: 'Faculty ID this subject belongs to' })
  @IsUUID()
  facultyId!: string;

  @ApiPropertyOptional({ description: 'Subject description in English' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Subject description in Arabic' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionAr?: string;
}

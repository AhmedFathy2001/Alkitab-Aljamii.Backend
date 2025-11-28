import {
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ description: 'Subject name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Subject code (unique within faculty)' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  code!: string;

  @ApiProperty({ description: 'Faculty ID this subject belongs to' })
  @IsUUID()
  facultyId!: string;

  @ApiPropertyOptional({ description: 'Subject description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

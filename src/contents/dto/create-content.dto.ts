import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  MaxLength,
} from 'class-validator';

export class CreateContentDto {
  @ApiProperty({ description: 'Content title', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ description: 'Content description', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Subject ID' })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({
    description: 'Content type',
    enum: ['textbook', 'reference', 'notes', 'guide', 'other'],
  })
  @IsEnum(['textbook', 'reference', 'notes', 'guide', 'other'])
  contentType!: string;
}

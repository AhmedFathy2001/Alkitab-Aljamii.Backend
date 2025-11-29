import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateFacultyDto {
  @ApiProperty({
    example: 'Faculty of Engineering',
    description: 'Faculty name in English',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'كلية الهندسة',
    description: 'Faculty name in Arabic',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameAr!: string;

  @ApiProperty({ example: 'ENG', description: 'Unique faculty code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;

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
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateFacultyDto {
  @ApiProperty({
    example: 'Faculty of Engineering',
    description: 'Faculty name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'ENG', description: 'Unique faculty code' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code!: string;

  @ApiPropertyOptional({
    example: 'Engineering and Technology faculty',
    description: 'Faculty description',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

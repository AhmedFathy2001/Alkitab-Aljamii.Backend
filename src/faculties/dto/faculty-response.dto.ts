import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FacultyResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Faculty of Engineering' })
  nameEn!: string;

  @ApiProperty({ example: 'كلية الهندسة' })
  nameAr!: string;

  @ApiProperty({ example: 'ENG' })
  code!: string;

  @ApiPropertyOptional({ example: 'Engineering and Technology faculty' })
  descriptionEn?: string | null;

  @ApiPropertyOptional({ example: 'كلية الهندسة والتكنولوجيا' })
  descriptionAr?: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  updatedAt!: Date;
}

export class PaginatedFacultyResponseDto {
  @ApiProperty({ type: [FacultyResponseDto] })
  items!: FacultyResponseDto[];

  @ApiProperty({
    example: {
      total: 10,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  })
  meta!: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

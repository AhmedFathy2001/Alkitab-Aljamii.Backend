import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubjectResponseDto {
  @ApiProperty() 
  id!: string;

  @ApiProperty({ example: 'Mathematics', description: 'Subject name in English' })
  nameEn!: string;

  @ApiProperty({ example: 'الرياضيات', description: 'Subject name in Arabic' })
  nameAr!: string;

  @ApiProperty({ example: 'MATH101', description: 'Subject code' })
  code!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  facultyId!: string;

  @ApiPropertyOptional({ example: 'Faculty of Engineering' })
  facultyName?: string | undefined;

  @ApiPropertyOptional({ example: 'Description in English' })
  descriptionEn?: string | undefined;

  @ApiPropertyOptional({ example: 'الوصف بالعربية' })
  descriptionAr?: string | undefined;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ example: 5 })
  professorCount?: number | undefined;

  @ApiPropertyOptional({ example: 120 })
  studentCount?: number | undefined;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  updatedAt!: Date;
}

export class SubjectAssignmentDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() email!: string;
  @ApiProperty() roleInSubject!: string;
  @ApiProperty() assignedAt!: Date;
}

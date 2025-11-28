import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubjectResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() code!: string;
  @ApiProperty() facultyId!: string;
  @ApiPropertyOptional() facultyName?: string | undefined;
  @ApiPropertyOptional() description?: string | undefined;
  @ApiProperty() isActive!: boolean;
  @ApiPropertyOptional() professorCount?: number | undefined;
  @ApiPropertyOptional() studentCount?: number | undefined;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
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

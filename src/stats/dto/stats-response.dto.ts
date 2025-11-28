import { ApiProperty } from '@nestjs/swagger';

export class SuperAdminStatsDto {
  @ApiProperty() totalUsers!: number;
  @ApiProperty() totalFaculties!: number;
  @ApiProperty() totalSubjects!: number;
  @ApiProperty() totalContent!: number;
  @ApiProperty() pendingContent!: number;
}

export class FacultyAdminStatsDto {
  @ApiProperty() totalProfessors!: number;
  @ApiProperty() totalStudents!: number;
  @ApiProperty() totalSubjects!: number;
  @ApiProperty() totalContent!: number;
  @ApiProperty() pendingContent!: number;
  @ApiProperty() approvedContent!: number;
}

export class ProfessorStatsDto {
  @ApiProperty() totalContent!: number;
  @ApiProperty() approvedContent!: number;
  @ApiProperty() pendingContent!: number;
  @ApiProperty() rejectedContent!: number;
  @ApiProperty() totalSubjects!: number;
}

export class StudentStatsDto {
  @ApiProperty() availableContent!: number;
  @ApiProperty() totalSubjects!: number;
}

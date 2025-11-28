import { FacultyRole } from '@prisma/client/index-browser';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserFacultyRoleDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  facultyId!: string;

  @ApiProperty({ example: 'Faculty of Engineering' })
  facultyNameEn!: string;

  @ApiProperty({ example: 'كلية الهندسة' })
  facultyNameAr!: string;

  @ApiProperty({ enum: FacultyRole, example: 'professor' })
  role!: FacultyRole;
}

export class UserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'John' })
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  lastName!: string;

  @ApiProperty({ example: false })
  isSuperAdmin!: boolean;

  @ApiPropertyOptional({ type: [UserFacultyRoleDto] })
  facultyRoles?: UserFacultyRoleDto[] | undefined;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({
    example: '2025-01-15T10:30:00.000Z',
    nullable: true,
  })
  lastLogin!: Date | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  updatedAt!: Date;
}

export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  users!: UserResponseDto[];
}

export class PaginatedUserResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  items!: UserResponseDto[];

  @ApiProperty({
    example: {
      total: 100,
      page: 1,
      limit: 10,
      totalPages: 10,
      hasNextPage: true,
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

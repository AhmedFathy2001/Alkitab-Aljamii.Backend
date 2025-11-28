import type { Faculty } from '@prisma/client';
import type { FacultyResponseDto } from '../dto/faculty-response.dto.js';

export function toFacultyResponseDto(faculty: Faculty): FacultyResponseDto {
  return {
    id: faculty.id,
    name: faculty.name,
    code: faculty.code,
    description: faculty.description,
    isActive: faculty.isActive,
    createdAt: faculty.createdAt,
    updatedAt: faculty.updatedAt,
  };
}

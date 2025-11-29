
import type { FacultyResponseDto } from '../dto/faculty-response.dto.js';

export function toFacultyResponseDto(faculty: any): FacultyResponseDto {
  return {
    id: faculty.id,
    name: faculty.name,
    nameAr: faculty.nameAr ?? null,
    description: faculty.description ?? null,
    descriptionAr: faculty.descriptionAr ?? null,
    code: faculty.code,
    isActive: faculty.isActive,
    createdAt: faculty.createdAt,
    updatedAt: faculty.updatedAt,
  };
}

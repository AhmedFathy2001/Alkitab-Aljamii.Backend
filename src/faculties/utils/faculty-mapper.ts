
import { Faculty } from '@prisma/client/index-browser';
import type { FacultyResponseDto } from '../dto/faculty-response.dto.js';

export function toFacultyResponseDto(faculty: Faculty): FacultyResponseDto {
  return {
    id: faculty.id,
    nameEn: faculty.name ?? '',
    nameAr: faculty.name ?? '',
    code: faculty.code,
    descriptionEn: faculty.description ?? '',
    descriptionAr: faculty.description ?? '',
    isActive: faculty.isActive,
    createdAt: faculty.createdAt,
    updatedAt: faculty.updatedAt,
  };
}


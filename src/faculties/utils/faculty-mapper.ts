
import { Faculty } from '@prisma/client/index-browser';
import type { FacultyResponseDto } from '../dto/faculty-response.dto.js';

export function toFacultyResponseDto(faculty: Faculty): FacultyResponseDto {
  return {
    id: faculty.id,
    nameEn: faculty.nameEn ?? '',
    nameAr: faculty.nameAr ?? '',
    code: faculty.code,
    descriptionEn: faculty.descriptionEn ?? '',
    descriptionAr: faculty.descriptionAr ?? '',
    isActive: faculty.isActive,
    createdAt: faculty.createdAt,
    updatedAt: faculty.updatedAt,
  };
}


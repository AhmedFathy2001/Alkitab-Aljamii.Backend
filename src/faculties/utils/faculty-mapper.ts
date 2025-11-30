
import type { FacultyResponseDto } from '../dto/faculty-response.dto.js';

interface FacultyWithCounts {
  id: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  code: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  professorsCount?: number;
  studentsCount?: number;
  adminsCount?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function toFacultyResponseDto(faculty: FacultyWithCounts): FacultyResponseDto {
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
    ...(faculty.professorsCount !== undefined && { professorsCount: faculty.professorsCount }),
    ...(faculty.studentsCount !== undefined && { studentsCount: faculty.studentsCount }),
    ...(faculty.adminsCount !== undefined && { adminsCount: faculty.adminsCount }),
  };
}

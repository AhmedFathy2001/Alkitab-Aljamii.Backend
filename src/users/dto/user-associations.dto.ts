// ======================= FACULTY & SUBJECT DTOs =======================

export interface UserFacultyDto {
  id: string;
  nameEn: string;
  nameAr: string;
  code: string;
  role: 'faculty_admin' | 'professor' | 'student';
}

export interface UserSubjectDto {
  id: string;
  nameEn: string;
  nameAr: string;
  code: string;
  facultyNameEn: string;
  facultyNameAr: string;
}

export interface UserAssociationsDto {
  faculties: UserFacultyDto[];
  subjects: UserSubjectDto[];
}

// ======================= VIEW ROLES =======================

export type ViewRole =
  | 'super_admin'
  | 'faculty_admin'
  | 'professor'
  | 'student';

export interface AvailableView {
  role: ViewRole;
  facultyId?: string;
  facultyNameEn?: string;
  facultyNameAr?: string;
}

export interface AvailableViewsDto {
  primaryRole: ViewRole;
  primaryFacultyId?: string;
  primaryFacultyNameEn?: string;
  primaryFacultyNameAr?: string;
  availableViews: AvailableView[];
}

// ======================= EMAIL CHECK =======================

export interface EmailCheckResultDto {
  exists: boolean;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    isSuperAdmin: boolean;
  };
}

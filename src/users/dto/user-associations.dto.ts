// ======================= FACULTY & SUBJECT DTOs =======================

export interface UserFacultyDto {
  id: string;
  name: string;
  nameAr: string;
  code: string;
  role: 'faculty_admin' | 'professor' | 'student';
}

export interface UserSubjectDto {
  id: string;
  name: string;
  nameAr: string;
  code: string;
  facultyName: string;
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
  facultyName?: string;
  facultyNameAr?: string | undefined;
}

export interface AvailableViewsDto {
  primaryRole: ViewRole;
  primaryFacultyId?: string | undefined;
  primaryFacultyName?: string | undefined;
  primaryFacultyNameAr?: string | undefined;
  availableViews: AvailableView[];
  // Current active context from JWT token
  currentView?: ViewRole | undefined;
  currentFacultyId?: string | undefined;
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

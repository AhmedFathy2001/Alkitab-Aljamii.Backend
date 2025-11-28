export interface UserFacultyDto {
  id: string;
  name: string;
  code: string;
  role: 'faculty_admin' | 'professor' | 'student';
}

export interface UserSubjectDto {
  id: string;
  name: string;
  code: string;
  facultyName: string;
}

export interface UserAssociationsDto {
  faculties: UserFacultyDto[];
  subjects: UserSubjectDto[];
}

export type ViewRole =
  | 'super_admin'
  | 'faculty_admin'
  | 'professor'
  | 'student';

export interface AvailableView {
  role: ViewRole;
  facultyId?: string;
  facultyName?: string;
}

export interface AvailableViewsDto {
  primaryRole: ViewRole;
  primaryFacultyId?: string;
  availableViews: AvailableView[];
}

export interface EmailCheckResultDto {
  exists: boolean;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    isSuperAdmin: boolean;
  };
}

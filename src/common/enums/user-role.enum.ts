// Faculty-scoped roles (matches Prisma FacultyRole enum)
export enum FacultyRole {
  FACULTY_ADMIN = 'faculty_admin',
  PROFESSOR = 'professor',
  STUDENT = 'student',
}

// Legacy alias for backwards compatibility during migration
// TODO: Remove after all usages are updated
export const UserRole = {
  SUPER_ADMIN: 'super_admin',
  FACULTY_ADMIN: 'faculty_admin',
  PROFESSOR: 'professor',
  STUDENT: 'student',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

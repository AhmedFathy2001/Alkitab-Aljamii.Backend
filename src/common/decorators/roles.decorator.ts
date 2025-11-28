import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Role values that can be used with @Roles decorator
// - 'super_admin' - System super admin (checked via isSuperAdmin)
// - 'faculty_admin' - Faculty administrator
// - 'professor' - Faculty professor
// - 'student' - Faculty student
export type RoleValue =
  | 'super_admin'
  | 'faculty_admin'
  | 'professor'
  | 'student';

export const Roles = (...roles: RoleValue[]) => SetMetadata(ROLES_KEY, roles);

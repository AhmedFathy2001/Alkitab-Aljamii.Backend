import { User, UserFacultyRole } from '@prisma/client';
import type { UserResponseDto } from '../dto/user-response.dto.js';

export type UserWithFacultyRoles = User & {
  facultyRoles?: (UserFacultyRole & {
    faculty: { nameEn: string; nameAr: string };
  })[];
};

export function toUserResponseDto(user: UserWithFacultyRoles): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isSuperAdmin: user.isSuperAdmin,

    facultyRoles: user.facultyRoles
      ? user.facultyRoles.map((fr) => ({
          facultyId: fr.facultyId,
          facultyNameEn: fr.faculty.nameEn,
          facultyNameAr: fr.faculty.nameAr,
          role: fr.role,
        }))
      : undefined,

    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toBasicUserResponseDto(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isSuperAdmin: user.isSuperAdmin,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

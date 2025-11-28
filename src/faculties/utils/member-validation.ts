import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { FacultyRole } from '@prisma/client';

export interface UserWithRoles {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
}

export async function findUserByEmail(
  prisma: PrismaService,
  email: string,
): Promise<UserWithRoles | null> {
  return prisma.user.findFirst({
    where: {
      email: { equals: email.toLowerCase().trim(), mode: 'insensitive' },
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      isSuperAdmin: true,
    },
  });
}

export async function findUserById(
  prisma: PrismaService,
  userId: string,
): Promise<UserWithRoles | null> {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      isSuperAdmin: true,
    },
  });
}

export async function validateUserCanBeRole(
  prisma: PrismaService,
  user: UserWithRoles,
  targetRole: FacultyRole,
  facultyId: string,
): Promise<void> {
  if (user.isSuperAdmin) {
    throw new ConflictException(`Super admins cannot be ${targetRole}s`);
  }

  // Check existing role in this faculty
  const existingRole = await prisma.userFacultyRole.findFirst({
    where: { userId: user.id, facultyId, role: targetRole },
  });

  if (existingRole) {
    throw new ConflictException(
      `User is already a ${targetRole} in this faculty`,
    );
  }

  // Role-specific constraints
  if (targetRole === 'professor' || targetRole === 'faculty_admin') {
    const isStudent = await prisma.userFacultyRole.findFirst({
      where: { userId: user.id, role: 'student' },
    });
    if (isStudent) {
      throw new ConflictException(`Students cannot be ${targetRole}s`);
    }
  }

  if (targetRole === 'student') {
    // Students can't have other roles
    const hasOtherRoles = await prisma.userFacultyRole.findFirst({
      where: { userId: user.id },
    });
    if (hasOtherRoles) {
      throw new ConflictException('Users with other roles cannot be students');
    }
  }
}

export function validateUserNotFound(
  user: UserWithRoles | null,
): asserts user is UserWithRoles {
  if (!user) {
    throw new NotFoundException('User not found');
  }
}

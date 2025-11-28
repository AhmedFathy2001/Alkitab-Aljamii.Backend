import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '@prisma/client/extension';
import type { User } from '@prisma/client/index-browser';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import {
  buildSuperAdminFilter,
  buildFacultyAdminFilterForFaculty,
  buildFacultyAdminDefaultFilter,
  buildProfessorFilterForSubject,
  buildProfessorDefaultFilter,
} from '../utils/user-filters.js';

@Injectable()
export class UserAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async buildRoleFilter(
    currentUser: JwtPayload,
    facultyId?: string,
    subjectId?: string,
  ): Promise<Prisma.UserWhereInput> {
    // Super admin sees all
    if (currentUser.isSuperAdmin) {
      return buildSuperAdminFilter(facultyId, subjectId);
    }

    // Use activeView from JWT context if available
    const activeView = currentUser.activeView;

    if (activeView === 'faculty_admin') {
      return this.buildFacultyAdminFilter(
        currentUser.sub,
        facultyId,
        subjectId,
      );
    }
    if (activeView === 'professor') {
      return this.buildProfessorFilter(currentUser.sub, facultyId, subjectId);
    }
    // Students can only see themselves
    return { id: currentUser.sub };
  }

  private async buildFacultyAdminFilter(
    adminId: string,
    facultyId?: string,
    subjectId?: string,
  ): Promise<Prisma.UserWhereInput> {
    const allowedFacultyIds = await this.getAdminFacultyIds(adminId);

    if (facultyId) {
      return buildFacultyAdminFilterForFaculty(facultyId, allowedFacultyIds);
    }
    if (subjectId) {
      const subject = await this.prisma.subject.findFirst({
        where: { id: subjectId, facultyId: { in: allowedFacultyIds } },
      });
      if (!subject) return { id: 'none' };
      return { subjectAssignments: { some: { subjectId } } };
    }
    return buildFacultyAdminDefaultFilter(adminId, allowedFacultyIds);
  }

  private async buildProfessorFilter(
    professorId: string,
    facultyId?: string,
    subjectId?: string,
  ): Promise<Prisma.UserWhereInput> {
    const allowedSubjectIds = await this.getProfessorSubjectIds(professorId);

    if (subjectId) {
      if (!allowedSubjectIds.includes(subjectId)) return { id: 'none' };
      return buildProfessorFilterForSubject(professorId, subjectId);
    }
    if (facultyId) return { id: 'none' };
    return buildProfessorDefaultFilter(professorId, allowedSubjectIds);
  }

  async validateReadAccess(
    currentUser: JwtPayload,
    targetUser: User,
  ): Promise<void> {
    // Can always read own profile
    if (currentUser.sub === targetUser.id) return;

    // Super admin can read all
    if (currentUser.isSuperAdmin) return;

    const activeView = currentUser.activeView;

    if (activeView === 'faculty_admin') {
      if (await this.canFacultyAdminAccessUser(currentUser.sub, targetUser.id))
        return;
    }
    if (activeView === 'professor') {
      if (await this.canProfessorAccessUser(currentUser.sub, targetUser.id))
        return;
    }
    throw new ForbiddenException('You do not have access to view this user');
  }

  async validateWriteAccess(
    currentUser: JwtPayload,
    targetId?: string,
  ): Promise<void> {
    // Super admins can write to any user except other super admins
    if (currentUser.isSuperAdmin) {
      if (targetId) {
        const targetUser = await this.prisma.user.findUnique({
          where: { id: targetId },
          select: { isSuperAdmin: true },
        });
        if (targetUser?.isSuperAdmin) {
          throw new ForbiddenException(
            'Cannot modify other super admin accounts',
          );
        }
      }
      return;
    }

    // Can't modify your own account via this endpoint
    if (targetId && targetId === currentUser.sub) {
      throw new ForbiddenException(
        'Cannot modify your own account via this endpoint',
      );
    }

    const activeView = currentUser.activeView;

    if (activeView === 'faculty_admin') {
      if (
        targetId &&
        !(await this.canFacultyAdminAccessUser(currentUser.sub, targetId))
      ) {
        throw new ForbiddenException('User is not in your faculty');
      }
      return;
    }

    throw new ForbiddenException('You do not have write access');
  }

  async canFacultyAdminAccessUser(
    adminId: string,
    userId: string,
  ): Promise<boolean> {
    const facultyIds = await this.getAdminFacultyIds(adminId);
    if (facultyIds.length === 0) return false;

    const userInFaculty = await this.prisma.user.findFirst({
      where: {
        id: userId,
        facultyRoles: { some: { facultyId: { in: facultyIds } } },
      },
    });
    return !!userInFaculty;
  }

  async canProfessorAccessUser(
    professorId: string,
    userId: string,
  ): Promise<boolean> {
    // Professors can always view themselves
    if (professorId === userId) return true;

    const subjectIds = await this.getProfessorSubjectIds(professorId);
    if (subjectIds.length === 0) return false;

    // Only allow access to students in professor's subjects
    const studentInSubject = await this.prisma.user.findFirst({
      where: {
        id: userId,
        subjectAssignments: {
          some: {
            subjectId: { in: subjectIds },
            roleInSubject: 'student',
          },
        },
      },
    });
    return !!studentInSubject;
  }

  private async getAdminFacultyIds(adminId: string): Promise<string[]> {
    const roles = await this.prisma.userFacultyRole.findMany({
      where: { userId: adminId, role: 'faculty_admin' },
      select: { facultyId: true },
    });
    return roles.map((r) => r.facultyId);
  }

  private async getProfessorSubjectIds(professorId: string): Promise<string[]> {
    const assignments = await this.prisma.userSubjectAssignment.findMany({
      where: { userId: professorId },
      select: { subjectId: true },
    });
    return assignments.map((s) => s.subjectId);
  }
}

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import {
  buildSuperAdminFilter,
  buildFacultyAdminFilterForFaculty,
  buildFacultyAdminDefaultFilter,
  buildProfessorFilterForSubject,
  buildProfessorDefaultFilter,
} from '../utils/user-filters.js';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class UserAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async buildRoleFilter(
    currentUser: JwtPayload,
    facultyId?: string,
    subjectId?: string,
  ): Promise<Prisma.UserWhereInput> {
    if (currentUser.isSuperAdmin)
      return buildSuperAdminFilter(facultyId, subjectId);

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

      if (!subject) return { AND: [{ id: { equals: '' } }] };

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
      if (!allowedSubjectIds.includes(subjectId))
        return { AND: [{ id: { equals: '' } }] };

      return buildProfessorFilterForSubject(professorId, subjectId);
    }

    if (facultyId) return { AND: [{ id: { equals: '' } }] };

    return buildProfessorDefaultFilter(professorId, allowedSubjectIds);
  }

  async validateReadAccess(
    currentUser: JwtPayload,
    targetUser: User,
  ): Promise<void> {
    if (currentUser.sub === targetUser.id) return;
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

    throw new ForbiddenException(this.i18n.t('errors.user.noReadAccess'));
  }

  async validateWriteAccess(
    currentUser: JwtPayload,
    targetId?: string,
  ): Promise<void> {
    if (currentUser.isSuperAdmin) {
      if (targetId) {
        const targetUser = await this.prisma.user.findUnique({
          where: { id: targetId },
          select: { isSuperAdmin: true },
        });

        if (targetUser?.isSuperAdmin)
          throw new ForbiddenException(
            this.i18n.t('errors.user.modifySuperAdmin'),
          );
      }
      return;
    }

    if (targetId && targetId === currentUser.sub)
      throw new ForbiddenException(this.i18n.t('errors.user.modifySelf'));

    const activeView = currentUser.activeView;

    if (activeView === 'faculty_admin') {
      if (
        targetId &&
        !(await this.canFacultyAdminAccessUser(currentUser.sub, targetId))
      ) {
        throw new ForbiddenException(this.i18n.t('errors.user.notInFaculty'));
      }
      return;
    }

    throw new ForbiddenException(this.i18n.t('errors.user.noWriteAccess'));
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
    if (professorId === userId) return true;

    const subjectIds = await this.getProfessorSubjectIds(professorId);
    if (subjectIds.length === 0) return false;

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

    return roles.map((r: { facultyId: string }) => r.facultyId);
  }

  private async getProfessorSubjectIds(professorId: string): Promise<string[]> {
    const assignments = await this.prisma.userSubjectAssignment.findMany({
      where: { userId: professorId },
      select: { subjectId: true },
    });

    return assignments.map((s: { subjectId: string }) => s.subjectId);
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type { PaginatedResult } from '../../common/pagination/pagination.dto.js';
import type { SubjectAssignmentDto } from '../dto/subject-response.dto.js';
import type { UserSubjectAssignment } from '@prisma/client';

@Injectable()
export class SubjectAssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssignments(
    subjectId: string,
    user: JwtPayload,
  ): Promise<PaginatedResult<SubjectAssignmentDto>> {
    await this.validateSubjectAccess(user, subjectId);

    const assignments = await this.prisma.userSubjectAssignment.findMany({
      where: { subjectId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    type AssignmentWithUser = UserSubjectAssignment & {
      user: { id: string; firstName: string; lastName: string; email: string };
    };

    const items: SubjectAssignmentDto[] = assignments.map(
      (a: AssignmentWithUser) => ({
        id: a.id,
        userId: a.user.id,
        firstName: a.user.firstName,
        lastName: a.user.lastName,
        email: a.user.email,
        roleInSubject: a.roleInSubject,
        assignedAt: a.createdAt,
      }),
    );

    return {
      items,
      meta: {
        total: items.length,
        page: 1,
        limit: items.length,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  async assignUser(
    subjectId: string,
    userId: string,
    roleInSubject: string,
    user: JwtPayload,
  ): Promise<void> {
    await this.validateWriteAccess(user, subjectId);

    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const targetUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new NotFoundException('User not found');

    if (roleInSubject === 'professor') {
      const hasProfessorRole = await this.prisma.userFacultyRole.findFirst({
        where: {
          userId,
          facultyId: subject.facultyId,
          role: { in: ['professor', 'faculty_admin'] },
        },
      });
      if (!hasProfessorRole) {
        throw new BadRequestException(
          'User must have professor or faculty admin role in this faculty',
        );
      }
    }

    if (roleInSubject === 'student') {
      const hasStudentRole = await this.prisma.userFacultyRole.findFirst({
        where: { userId, facultyId: subject.facultyId, role: 'student' },
      });
      if (!hasStudentRole) {
        throw new BadRequestException('User must have student role in this faculty');
      }
    }

    const existing = await this.prisma.userSubjectAssignment.findUnique({
      where: { userId_subjectId: { userId, subjectId } },
    });
    if (existing) throw new ConflictException('User already assigned to this subject');

    await this.prisma.userSubjectAssignment.create({
      data: { userId, subjectId, roleInSubject },
    });
  }

  async removeUser(subjectId: string, userId: string, user: JwtPayload): Promise<void> {
    await this.validateWriteAccess(user, subjectId);

    const assignment = await this.prisma.userSubjectAssignment.findUnique({
      where: { userId_subjectId: { userId, subjectId } },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    await this.prisma.userSubjectAssignment.delete({
      where: { userId_subjectId: { userId, subjectId } },
    });
  }

  private async validateSubjectAccess(user: JwtPayload, subjectId: string): Promise<void> {
    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException('Subject not found');

    if (user.isSuperAdmin) return;

    const activeView = user.activeView;

    if (activeView === 'faculty_admin') {
      const adminRole = await this.prisma.userFacultyRole.findFirst({
        where: { userId: user.sub, facultyId: subject.facultyId, role: 'faculty_admin' },
      });
      if (adminRole) return;
    }

    if (activeView === 'professor') {
      const assignment = await this.prisma.userSubjectAssignment.findFirst({
        where: { userId: user.sub, subjectId },
      });
      if (assignment) return;
    }

    throw new ForbiddenException('No access to this subject');
  }

  private async validateWriteAccess(user: JwtPayload, subjectId: string): Promise<void> {
    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new NotFoundException('Subject not found');

    if (user.isSuperAdmin) return;

    const activeView = user.activeView;

    if (activeView === 'faculty_admin') {
      const adminRole = await this.prisma.userFacultyRole.findFirst({
        where: { userId: user.sub, facultyId: subject.facultyId, role: 'faculty_admin' },
      });
      if (adminRole) return;
    }

    throw new ForbiddenException('No write access to this subject');
  }
}

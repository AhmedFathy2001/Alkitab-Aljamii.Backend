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

    const items = assignments.map((a) => ({
      id: a.id,
      userId: a.user.id,
      firstName: a.user.firstName,
      lastName: a.user.lastName,
      email: a.user.email,
      roleInSubject: a.roleInSubject,
      assignedAt: a.createdAt,
    }));

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

    // Get the subject to know its faculty
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!targetUser) throw new NotFoundException('User not found');

    // Validate user has appropriate faculty role
    // Allow faculty_admin or professor to be assigned as professor
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
        throw new BadRequestException(
          'User must have student role in this faculty',
        );
      }
    }

    const existing = await this.prisma.userSubjectAssignment.findUnique({
      where: { userId_subjectId: { userId, subjectId } },
    });
    if (existing)
      throw new ConflictException('User already assigned to this subject');

    await this.prisma.userSubjectAssignment.create({
      data: { userId, subjectId, roleInSubject },
    });
  }

  async removeUser(
    subjectId: string,
    userId: string,
    user: JwtPayload,
  ): Promise<void> {
    await this.validateWriteAccess(user, subjectId);
    const assignment = await this.prisma.userSubjectAssignment.findUnique({
      where: { userId_subjectId: { userId, subjectId } },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.prisma.userSubjectAssignment.delete({
      where: { userId_subjectId: { userId, subjectId } },
    });
  }

  private async validateSubjectAccess(
    user: JwtPayload,
    subjectId: string,
  ): Promise<void> {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    // Super admin can access all
    if (user.isSuperAdmin) return;

    const activeView = user.activeView;

    // Faculty admin can access subjects in their faculties
    if (activeView === 'faculty_admin') {
      const adminRole = await this.prisma.userFacultyRole.findFirst({
        where: {
          userId: user.sub,
          facultyId: subject.facultyId,
          role: 'faculty_admin',
        },
      });
      if (adminRole) return;
    }

    // Professor can access subjects they're assigned to
    if (activeView === 'professor') {
      const assignment = await this.prisma.userSubjectAssignment.findFirst({
        where: { userId: user.sub, subjectId },
      });
      if (assignment) return;
    }

    throw new ForbiddenException('No access to this subject');
  }

  private async validateWriteAccess(
    user: JwtPayload,
    subjectId: string,
  ): Promise<void> {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    // Super admin can write to all
    if (user.isSuperAdmin) return;

    const activeView = user.activeView;

    // Faculty admin can write to subjects in their faculties
    if (activeView === 'faculty_admin') {
      const adminRole = await this.prisma.userFacultyRole.findFirst({
        where: {
          userId: user.sub,
          facultyId: subject.facultyId,
          role: 'faculty_admin',
        },
      });
      if (adminRole) return;
    }

    throw new ForbiddenException('No write access to this subject');
  }
}

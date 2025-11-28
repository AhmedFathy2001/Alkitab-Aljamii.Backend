import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import {
  SuperAdminStatsDto,
  FacultyAdminStatsDto,
  ProfessorStatsDto,
  StudentStatsDto,
} from '../dto/stats-response.dto.js';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuperAdminStats(): Promise<SuperAdminStatsDto> {
    const [
      totalUsers,
      totalFaculties,
      totalSubjects,
      totalContent,
      pendingContent,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.faculty.count(),
      this.prisma.subject.count(),
      this.prisma.content.count(),
      this.prisma.content.count({ where: { status: 'pending' } }),
    ]);

    return {
      totalUsers,
      totalFaculties,
      totalSubjects,
      totalContent,
      pendingContent,
    };
  }

  async getFacultyAdminStats(
    user: JwtPayload,
    facultyId?: string,
  ): Promise<FacultyAdminStatsDto> {
    // If facultyId provided, verify user is admin of that faculty
    // Otherwise, fall back to finding a faculty where user is admin
    let targetFacultyId: string | undefined;

    if (facultyId) {
      // Verify user is admin of this faculty
      const adminRole = await this.prisma.userFacultyRole.findFirst({
        where: { userId: user.sub, facultyId, role: 'faculty_admin' },
      });
      if (adminRole) targetFacultyId = facultyId;
    } else {
      // Find first faculty where user is admin
      const adminRole = await this.prisma.userFacultyRole.findFirst({
        where: { userId: user.sub, role: 'faculty_admin' },
      });
      if (adminRole) targetFacultyId = adminRole.facultyId;
    }

    if (!targetFacultyId) {
      return {
        totalProfessors: 0,
        totalStudents: 0,
        totalSubjects: 0,
        totalContent: 0,
        pendingContent: 0,
        approvedContent: 0,
      };
    }

    const subjectIds = await this.prisma.subject
      .findMany({ where: { facultyId: targetFacultyId }, select: { id: true } })
      .then((s) => s.map((x) => x.id));

    const [
      professors,
      students,
      totalContent,
      pendingContent,
      approvedContent,
    ] = await Promise.all([
      this.prisma.userFacultyRole.count({
        where: { facultyId: targetFacultyId, role: 'professor' },
      }),
      this.prisma.userFacultyRole.count({
        where: { facultyId: targetFacultyId, role: 'student' },
      }),
      this.prisma.content.count({ where: { subjectId: { in: subjectIds } } }),
      this.prisma.content.count({
        where: { subjectId: { in: subjectIds }, status: 'pending' },
      }),
      this.prisma.content.count({
        where: { subjectId: { in: subjectIds }, status: 'approved' },
      }),
    ]);

    return {
      totalProfessors: professors,
      totalStudents: students,
      totalSubjects: subjectIds.length,
      totalContent,
      pendingContent,
      approvedContent,
    };
  }

  async getProfessorStats(
    user: JwtPayload,
    facultyId?: string,
  ): Promise<ProfessorStatsDto> {
    // Get subject IDs for filtering - either from specific faculty or all assigned
    let subjectIds: string[] | undefined;
    if (facultyId) {
      // Get subjects in this faculty that the professor is assigned to
      const assignments = await this.prisma.userSubjectAssignment.findMany({
        where: { userId: user.sub },
        include: { subject: true },
      });
      subjectIds = assignments
        .filter((a) => a.subject.facultyId === facultyId)
        .map((a) => a.subjectId);
    }

    const contentWhere = {
      uploadedById: user.sub,
      ...(subjectIds && { subjectId: { in: subjectIds } }),
    };

    const [
      totalContent,
      approvedContent,
      pendingContent,
      rejectedContent,
      totalSubjects,
    ] = await Promise.all([
      this.prisma.content.count({ where: contentWhere }),
      this.prisma.content.count({
        where: { ...contentWhere, status: 'approved' },
      }),
      this.prisma.content.count({
        where: { ...contentWhere, status: 'pending' },
      }),
      this.prisma.content.count({
        where: { ...contentWhere, status: 'rejected' },
      }),
      facultyId
        ? Promise.resolve(subjectIds?.length ?? 0)
        : this.prisma.userSubjectAssignment.count({
            where: { userId: user.sub },
          }),
    ]);

    return {
      totalContent,
      approvedContent,
      pendingContent,
      rejectedContent,
      totalSubjects,
    };
  }

  async getStudentStats(
    user: JwtPayload,
    facultyId?: string,
  ): Promise<StudentStatsDto> {
    // Get subject assignments, optionally filtered by faculty
    let subjectIds: string[];
    if (facultyId) {
      const assignments = await this.prisma.userSubjectAssignment.findMany({
        where: { userId: user.sub },
        include: { subject: true },
      });
      subjectIds = assignments
        .filter((a) => a.subject.facultyId === facultyId)
        .map((a) => a.subjectId);
    } else {
      subjectIds = await this.prisma.userSubjectAssignment
        .findMany({ where: { userId: user.sub }, select: { subjectId: true } })
        .then((s) => s.map((x) => x.subjectId));
    }

    const availableContent = await this.prisma.content.count({
      where: { subjectId: { in: subjectIds }, status: 'approved' },
    });

    return { availableContent, totalSubjects: subjectIds.length };
  }
}

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async canAccessSubject(userId: string, subjectId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });

    if (!user) return false;

    // Super admins can access everything
    if (user.isSuperAdmin) return true;

    // Check if user is assigned to the subject
    const assignment = await this.prisma.userSubjectAssignment.findUnique({
      where: { userId_subjectId: { userId, subjectId } },
    });

    if (assignment) return true;

    // Check if faculty admin of the subject's faculty
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { facultyId: true },
    });

    if (!subject) return false;

    // Check if user is faculty_admin for this faculty
    const isFacultyAdmin = await this.prisma.userFacultyRole.findFirst({
      where: { userId, facultyId: subject.facultyId, role: 'faculty_admin' },
    });

    return !!isFacultyAdmin;
  }

  async canUploadToSubject(
    userId: string,
    subjectId: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });

    if (!user) return false;

    // Super admins can upload anywhere
    if (user.isSuperAdmin) return true;

    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { facultyId: true },
    });

    if (!subject) return false;

    // Faculty admins can upload to subjects in their faculty
    const isFacultyAdmin = await this.prisma.userFacultyRole.findFirst({
      where: { userId, facultyId: subject.facultyId, role: 'faculty_admin' },
    });

    if (isFacultyAdmin) return true;

    // Professors can upload to their assigned subjects
    const isProfessorInFaculty = await this.prisma.userFacultyRole.findFirst({
      where: { userId, facultyId: subject.facultyId, role: 'professor' },
    });

    if (!isProfessorInFaculty) return false;

    // Must also be assigned to the subject
    const assignment = await this.prisma.userSubjectAssignment.findUnique({
      where: { userId_subjectId: { userId, subjectId } },
    });

    return !!assignment;
  }

  async assertCanAccessSubject(
    userId: string,
    subjectId: string,
  ): Promise<void> {
    const canAccess = await this.canAccessSubject(userId, subjectId);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this subject');
    }
  }

  async assertCanUploadToSubject(
    userId: string,
    subjectId: string,
  ): Promise<void> {
    const canUpload = await this.canUploadToSubject(userId, subjectId);
    if (!canUpload) {
      throw new ForbiddenException('You cannot upload to this subject');
    }
  }

  async canAccessContent(userId: string, contentId: string): Promise<boolean> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { subjectId: true, status: true, uploadedById: true },
    });

    if (!content) return false;

    // Owner can always access their content
    if (content.uploadedById === userId) return true;

    // Others can only access approved content if they have subject access
    if (content.status !== 'approved') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { isSuperAdmin: true },
      });

      // Check if super admin
      if (user?.isSuperAdmin) {
        return this.canAccessSubject(userId, content.subjectId);
      }

      // Check if faculty admin of this subject's faculty
      const subject = await this.prisma.subject.findUnique({
        where: { id: content.subjectId },
        select: { facultyId: true },
      });

      if (subject) {
        const isFacultyAdmin = await this.prisma.userFacultyRole.findFirst({
          where: {
            userId,
            facultyId: subject.facultyId,
            role: 'faculty_admin',
          },
        });

        if (!isFacultyAdmin) return false;
      } else {
        return false;
      }
    }

    return this.canAccessSubject(userId, content.subjectId);
  }

  async assertCanAccessContent(
    userId: string,
    contentId: string,
  ): Promise<void> {
    const canAccess = await this.canAccessContent(userId, contentId);
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this content');
    }
  }
}

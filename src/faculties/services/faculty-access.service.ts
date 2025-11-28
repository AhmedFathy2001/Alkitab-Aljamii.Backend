import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '@prisma/client/index-browser';
import type { Faculty } from '@prisma/client/index-browser';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class FacultyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async buildRoleFilter(
    currentUser: JwtPayload,
  ): Promise<Prisma.FacultyWhereInput> {
    // Super admin sees all faculties
    if (currentUser.isSuperAdmin) return {};

    // For non-super-admins, filter to faculties they have roles in
    const userFacultyRoles = await this.prisma.userFacultyRole.findMany({
      where: { userId: currentUser.sub },
      select: { facultyId: true },
    });

    const facultyIds = userFacultyRoles.map((r: { facultyId: any; }) => r.facultyId);

    if (facultyIds.length === 0) {
      return { id: 'none' }; // No access to any faculty
    }

    return { id: { in: facultyIds } };
  }

  async validateReadAccess(
    currentUser: JwtPayload,
    faculty: Faculty,
  ): Promise<void> {
    // Super admin can access everything
    if (currentUser.isSuperAdmin) return;

    // Check if user has any role in this faculty
    const hasRole = await this.prisma.userFacultyRole.findFirst({
      where: {
        userId: currentUser.sub,
        facultyId: faculty.id,
      },
    });

    if (hasRole) return;

    throw new ForbiddenException('You do not have access to this faculty');
  }

  validateSuperAdminAccess(currentUser: JwtPayload): void {
    if (!currentUser.isSuperAdmin) {
      throw new ForbiddenException('Only super admins can perform this action');
    }
  }

  async validateAdminUser(adminId: string): Promise<void> {
    // Validate user exists and is not a super admin (super admins can't be faculty admins)
    const user = await this.prisma.user.findFirst({
      where: { id: adminId, deletedAt: null, isSuperAdmin: false },
    });

    if (!user) {
      throw new NotFoundException(
        'User not found or cannot be a faculty admin',
      );
    }
  }

  async validateWriteAccess(
    currentUser: JwtPayload,
    facultyId: string,
  ): Promise<void> {
    // Super admin can write to any faculty
    if (currentUser.isSuperAdmin) return;

    // Check if user is faculty_admin for this faculty
    const isFacultyAdmin = await this.prisma.userFacultyRole.findFirst({
      where: {
        userId: currentUser.sub,
        facultyId,
        role: 'faculty_admin',
      },
    });

    if (!isFacultyAdmin) {
      throw new ForbiddenException(
        'Only faculty admins can perform this action',
      );
    }
  }
}

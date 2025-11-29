import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '@prisma/client/index-browser';
import type { Faculty } from '@prisma/client/index-browser';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class FacultyAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly i18n: I18nService,
  ) {}

  async buildRoleFilter(
    currentUser: JwtPayload,
  ): Promise<Prisma.FacultyWhereInput> {
    if (currentUser.isSuperAdmin) return {};

    const userFacultyRoles = await this.prisma.userFacultyRole.findMany({
      where: { userId: currentUser.sub },
      select: { facultyId: true },
    });

    const facultyIds = userFacultyRoles.map((r: { facultyId: string }) => r.facultyId);

    if (facultyIds.length === 0) {
      // لن يتمكن من الوصول لأي كلية
      return { id: 'none' };
    }

    return { id: { in: facultyIds } };
  }

  async validateReadAccess(
    currentUser: JwtPayload,
    faculty: Faculty,
    lang?: string,
  ): Promise<void> {
    if (currentUser.isSuperAdmin) return;

    const hasRole = await this.prisma.userFacultyRole.findFirst({
      where: {
        userId: currentUser.sub,
        facultyId: faculty.id,
      },
    });

    if (!hasRole) {
      const message = await this.i18n.translate('faculty.NO_ACCESS', {
        lang: lang ?? 'en',
      });
      throw new ForbiddenException(message);
    }
  }

  validateSuperAdminAccess(currentUser: JwtPayload, lang?: string): void {
    if (!currentUser.isSuperAdmin) {
      throw new ForbiddenException(
        this.i18n.translate('faculty.ONLY_SUPER_ADMIN', { lang: lang ?? 'en' }),
      );
    }
  }

  async validateAdminUser(adminId: string, lang?: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: adminId, deletedAt: null, isSuperAdmin: false },
    });

    if (!user) {
      const message = await this.i18n.translate('faculty.USER_NOT_FOUND', {
        lang: lang ?? 'en',
      });
      throw new NotFoundException(message);
    }
  }

  async validateWriteAccess(
    currentUser: JwtPayload,
    facultyId: string,
    lang?: string,
  ): Promise<void> {
    if (currentUser.isSuperAdmin) return;

    const isFacultyAdmin = await this.prisma.userFacultyRole.findFirst({
      where: {
        userId: currentUser.sub,
        facultyId,
        role: 'faculty_admin',
      },
    });

    if (!isFacultyAdmin) {
      const message = await this.i18n.translate('faculty.ONLY_FACULTY_ADMIN', {
        lang: lang ?? 'en',
      });
      throw new ForbiddenException(message);
    }
  }
}

import type { PrismaService } from '../../prisma/prisma.service.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import type {
  UserFacultyDto,
  UserAssociationsDto,
  AvailableViewsDto,
  AvailableView,
  ViewRole,
} from '../dto/user-associations.dto.js';

export async function getUserAssociationsData(
  prisma: PrismaService,
  userId: string,
): Promise<UserAssociationsDto> {
  const facultyRoles = await prisma.userFacultyRole.findMany({
    where: { userId },
    include: {
      faculty: { select: { id: true, nameEn: true, nameAr: true, code: true } },
    },
    orderBy: { faculty: { nameEn: 'asc' } },
  });

  const subjectAssignments = await prisma.userSubjectAssignment.findMany({
    where: { userId, subject: { isActive: true } },
    include: {
      subject: {
        select: {
          id: true,
          nameEn: true,
          nameAr: true,
          code: true,
          faculty: { select: { nameEn: true, nameAr: true } },
        },
      },
    },
  });

  return {
    faculties: facultyRoles.map((fr: { faculty: { id: any; nameEn: any; nameAr: any; code: any; }; role: any; }) => ({
      id: fr.faculty.id,
      nameEn: fr.faculty.nameEn,
      nameAr: fr.faculty.nameAr,
      code: fr.faculty.code,
      role: fr.role,
    })),
    subjects: subjectAssignments.map((sa: { subject: { id: any; nameEn: any; nameAr: any; code: any; faculty: { nameEn: any; nameAr: any; }; }; }) => ({
      id: sa.subject.id,
      nameEn: sa.subject.nameEn,
      nameAr: sa.subject.nameAr,
      code: sa.subject.code,
      facultyNameEn: sa.subject.faculty.nameEn,
      facultyNameAr: sa.subject.faculty.nameAr,
    })),
  };
}

export async function getMyFacultiesData(
  prisma: PrismaService,
  currentUser: JwtPayload,
  activeView?: string,
): Promise<UserFacultyDto[]> {
  const userId = currentUser.sub;

  if (currentUser.isSuperAdmin) {
    const allFaculties = await prisma.faculty.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, nameEn: true, nameAr: true, code: true },
      orderBy: { nameEn: 'asc' },
    });
    return allFaculties.map((f: any) => ({
      ...f,
      role: 'faculty_admin' as const,
    }));
  }

  const facultyRoles = await prisma.userFacultyRole.findMany({
    where: {
      userId,
      ...(activeView
        ? { role: activeView as 'faculty_admin' | 'professor' | 'student' }
        : {}),
      faculty: { deletedAt: null, isActive: true },
    },
    include: {
      faculty: { select: { id: true, nameEn: true, nameAr: true, code: true } },
    },
    orderBy: { faculty: { nameEn: 'asc' } },
  });

  return facultyRoles.map((fr: { faculty: { id: any; nameEn: any; nameAr: any; code: any; }; role: any; }) => ({
    id: fr.faculty.id,
    nameEn: fr.faculty.nameEn,
    nameAr: fr.faculty.nameAr,
    code: fr.faculty.code,
    role: fr.role,
  }));
}

export async function getAvailableViewsData(
  prisma: PrismaService,
  currentUser: JwtPayload,
): Promise<AvailableViewsDto> {
  const userId = currentUser.sub;

  if (currentUser.isSuperAdmin) {
    return {
      primaryRole: 'super_admin',
      availableViews: [{ role: 'super_admin' }],
    };
  }

  const facultyRoles = await prisma.userFacultyRole.findMany({
    where: { userId, faculty: { deletedAt: null, isActive: true } },
    include: { faculty: { select: { id: true, nameEn: true, nameAr: true } } },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });

  const availableViews: AvailableView[] = facultyRoles.map((fr: { role: string; facultyId: any; faculty: { nameEn: any; nameAr: any; }; }) => ({
    role: fr.role as ViewRole,
    facultyId: fr.facultyId,
    facultyNameEn: fr.faculty.nameEn,
    facultyNameAr: fr.faculty.nameAr,
  }));

  let primaryRole: ViewRole = 'student';
  let primaryFacultyId: string | undefined;

  const firstFacultyAdmin = facultyRoles.find(
    (fr: { role: string; }) => fr.role === 'faculty_admin',
  );
  const firstProfessor = facultyRoles.find((fr: { role: string; }) => fr.role === 'professor');
  const firstStudent = facultyRoles.find((fr: { role: string; }) => fr.role === 'student');

  if (firstFacultyAdmin) {
    primaryRole = 'faculty_admin';
    primaryFacultyId = firstFacultyAdmin.facultyId;
  } else if (firstProfessor) {
    primaryRole = 'professor';
    primaryFacultyId = firstProfessor.facultyId;
  } else if (firstStudent) {
    primaryRole = 'student';
    primaryFacultyId = firstStudent.facultyId;
  }

  const result: AvailableViewsDto = { primaryRole, availableViews };
  if (primaryFacultyId) {
    result.primaryFacultyId = primaryFacultyId;
  }
  return result;
}

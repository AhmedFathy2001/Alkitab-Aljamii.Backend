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
      faculty: { select: { id: true, name: true, nameAr: true, code: true } },
    },
    orderBy: { faculty: { name: 'asc' } },
  });

  const subjectAssignments = await prisma.userSubjectAssignment.findMany({
    where: { userId, subject: { isActive: true } },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          nameAr: true,
          code: true,
          faculty: { select: { name: true, nameAr: true } },
        },
      },
    },
  });

  return {
    faculties: facultyRoles.map((fr) => ({
      id: fr.faculty.id,
      name: fr.faculty.name,
      nameAr: fr.faculty.nameAr ?? '',
      code: fr.faculty.code,
      role: fr.role,
    })),
    subjects: subjectAssignments.map((sa) => ({
      id: sa.subject.id,
      name: sa.subject.name,
      nameAr: sa.subject.nameAr ?? '',
      code: sa.subject.code,
      facultyName: sa.subject.faculty.name,
      facultyNameAr: sa.subject.faculty.nameAr ?? '',
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
      select: { id: true, name: true, nameAr: true, code: true },
      orderBy: { name: 'asc' },
    });
    return allFaculties.map((f) => ({
      id: f.id,
      name: f.name,
      nameAr: f.nameAr ?? '',
      code: f.code,
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
      faculty: { select: { id: true, name: true, nameAr: true, code: true } },
    },
    orderBy: { faculty: { name: 'asc' } },
  });

  return facultyRoles.map((fr) => ({
    id: fr.faculty.id,
    name: fr.faculty.name,
    nameAr: fr.faculty.nameAr ?? '',
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
      currentView: 'super_admin',
      currentFacultyId: undefined,
    };
  }

  const facultyRoles = await prisma.userFacultyRole.findMany({
    where: { userId, faculty: { deletedAt: null, isActive: true } },
    include: { faculty: { select: { id: true, name: true, nameAr: true } } },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });

  const availableViews: AvailableView[] = facultyRoles.map((fr) => ({
    role: fr.role as ViewRole,
    facultyId: fr.facultyId,
    facultyName: fr.faculty.name,
    facultyNameAr: fr.faculty.nameAr ?? undefined,
  }));

  let primaryRole: ViewRole = 'student';
  let primaryFacultyId: string | undefined;

  const firstFacultyAdmin = facultyRoles.find(
    (fr) => fr.role === 'faculty_admin',
  );
  const firstProfessor = facultyRoles.find((fr) => fr.role === 'professor');
  const firstStudent = facultyRoles.find((fr) => fr.role === 'student');

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

  const result: AvailableViewsDto = {
    primaryRole,
    availableViews,
    // Include current context from JWT token
    currentView: currentUser.activeView as ViewRole | undefined,
    currentFacultyId: currentUser.facultyId,
  };
  if (primaryFacultyId) {
    result.primaryFacultyId = primaryFacultyId;
  }
  return result;
}

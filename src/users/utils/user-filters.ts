import { Prisma } from '@prisma/client';

export function buildSuperAdminFilter(
  facultyId?: string,
  subjectId?: string,
): Prisma.UserWhereInput {
  if (facultyId) {
    return { facultyRoles: { some: { facultyId } } };
  }
  if (subjectId) {
    return { subjectAssignments: { some: { subjectId } } };
  }
  return {};
}

export function buildFacultyAdminFilterForFaculty(
  facultyId: string,
  allowedFacultyIds: string[],
): Prisma.UserWhereInput {
  if (!allowedFacultyIds.includes(facultyId)) {
    return { AND: [{ id: { equals: '' } }] }; // بديل عن 'none'
  }
  return { facultyRoles: { some: { facultyId } } };
}

export function buildFacultyAdminDefaultFilter(
  adminId: string,
  allowedFacultyIds: string[],
): Prisma.UserWhereInput {
  return {
    OR: [
      { id: adminId },
      { facultyRoles: { some: { facultyId: { in: allowedFacultyIds } } } },
    ],
  };
}

export function buildProfessorFilterForSubject(
  professorId: string,
  subjectId: string,
): Prisma.UserWhereInput {
  return {
    OR: [
      { id: professorId },
      {
        subjectAssignments: {
          some: { subjectId, roleInSubject: 'student' },
        },
      },
    ],
  };
}

export function buildProfessorDefaultFilter(
  professorId: string,
  allowedSubjectIds: string[],
): Prisma.UserWhereInput {
  return {
    OR: [
      { id: professorId },
      {
        subjectAssignments: {
          some: {
            subjectId: { in: allowedSubjectIds },
            roleInSubject: 'student',
          },
        },
      },
    ],
  };
}

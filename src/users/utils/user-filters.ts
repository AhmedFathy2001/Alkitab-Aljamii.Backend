import { Prisma } from "@prisma/client/extension";

export function buildSuperAdminFilter(
  facultyId?: string,
  subjectId?: string,
): Prisma.UserWhereInput {
  if (facultyId) {
    return {
      facultyRoles: { some: { facultyId } },
    };
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
    return { id: 'none' };
  }
  return {
    facultyRoles: { some: { facultyId } },
  };
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
        // Only show students enrolled in this subject
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
        // Only show students enrolled in professor's subjects
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

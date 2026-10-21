export type ActionType = 'read' | 'write';
export type Department = 'secular' | 'theology' | 'both';
export type ClassType = 'circular' | 'theology';

export const CANONICAL_ACCOUNT_ROLES = [
  'Administrator',
  'Head Teacher',
  'DOS Secular',
  'DOS Theology',
  'Class Teacher',
] as const;

export type CanonicalAccountRole = (typeof CANONICAL_ACCOUNT_ROLES)[number];

export function normalizeAccountRole(
  role?: string | null,
  subject?: string | null
): CanonicalAccountRole {
  const r = (role ?? '').trim();
  const rl = r.toLowerCase();
  const s = (subject ?? '').trim().toLowerCase();

  if (rl === 'administrator' || rl === 'admin') return 'Administrator';
  if (
    rl === 'head teacher' ||
    rl === 'headteacher' ||
    rl === 'deputy head teacher' ||
    rl === 'deputy headteacher' ||
    rl === 'hm' ||
    rl === 'principal'
  ) {
    return 'Head Teacher';
  }
  if (
    rl === 'dos theology' ||
    rl === 'dos_theology' ||
    (rl.includes('dos') && (rl.includes('theology') || s.includes('theology')))
  ) {
    return 'DOS Theology';
  }
  if (rl === 'dos secular' || rl === 'dos_secular' || rl.includes('dos')) {
    return 'DOS Secular';
  }
  return 'Class Teacher';
}

export function resolveRoleDepartment(
  role?: string | null,
  subject?: string | null,
  classAssignments?: ClassAssignment[]
): Department {
  const rl = (role ?? '').trim().toLowerCase();
  const s = (subject ?? '').trim().toLowerCase();

  if (rl === 'administrator' || rl === 'admin' || rl.includes('head')) {
    return 'both';
  }
  if (rl === 'dos theology' || (rl.includes('dos') && (rl.includes('theology') || s === 'theology'))) {
    return 'theology';
  }
  if (rl === 'dos secular' || (rl.includes('dos') && (rl.includes('secular') || s === 'secular'))) {
    return 'secular';
  }
  if (rl.includes('dos') && ['both', 'all'].includes(s)) {
    return 'both';
  }

  const hasCircularAssigned = (classAssignments ?? []).some((a) => a.classType === 'circular');
  const hasTheologyAssigned = (classAssignments ?? []).some((a) => a.classType === 'theology');
  if (hasCircularAssigned && hasTheologyAssigned) {
    return 'both';
  }

  if (
    rl === 'theology instructor' ||
    rl === 'class teacher theology' ||
    rl === 'teacher theology' ||
    rl === 'theology teacher' ||
    s === 'theology'
  ) {
    return hasCircularAssigned ? 'both' : 'theology';
  }

  if (
    rl === 'class teacher secular' ||
    rl === 'teacher secular' ||
    rl === 'secular teacher' ||
    s === 'secular'
  ) {
    return hasTheologyAssigned ? 'both' : 'secular';
  }

  return 'both';
}

export interface ClassAssignment {
  classId: string;
  classType: ClassType;
}

export interface TeacherProfile {
  id: string;
  auth_user_id?: string | null;
  role: string | null;
  subject?: string | null;
  status?: string | null;
  classes?: unknown;
  permissions?: string[] | null;
}

export interface AuthAccessResult {
  isAuthorized: boolean;
  message?: string;
  filterByDepartment?: Department;
  filterByClasses?: string[];
  classAssignments?: ClassAssignment[];
  role?: string;
  canonicalRole?: CanonicalAccountRole;
  teacherId?: string;
  specialPermissions?: string[];
}

export type RosterClassFilter = {
  column: 'circular_class_id' | 'theology_class_id';
  classIds: string[];
};

export function isAdministratorRole(role?: string | null): boolean {
  const rl = (role ?? '').trim().toLowerCase();
  return rl === 'administrator' || rl === 'admin';
}

export function accessDeniedForLookupError(
  error: unknown,
  message: string
): AuthAccessResult | null {
  return error === null || error === undefined
    ? null
    : { isAuthorized: false, message };
}

export function canHardDeleteStudent(access: AuthAccessResult): boolean {
  return access.isAuthorized && isAdministratorRole(access.role);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function resolveTeacherProfile(
  profiles: TeacherProfile[],
  authUserId: string
): TeacherProfile | null {
  const matches = profiles.filter(
    (profile) => profile.auth_user_id === authUserId || profile.id === authUserId
  );
  return matches.length === 1 ? matches[0] : null;
}

const RECOGNIZED_TEACHER_ROLES = new Set([
  'class teacher',
  'class teacher secular',
  'class teacher theology',
  'teacher secular',
  'teacher theology',
  'secular teacher',
  'theology teacher',
  'theology instructor',
  'teacher',
]);

export function isTeacherLevelRole(role?: string | null): boolean {
  const rl = (role ?? '').trim().toLowerCase();
  return RECOGNIZED_TEACHER_ROLES.has(rl);
}

export function authorizeTeacherProfile(
  profile: TeacherProfile,
  classAssignments: ClassAssignment[],
  action: ActionType,
  targetClass?: string | null,
  targetDepartment?: Department | null
): AuthAccessResult {
  const status = profile.status ? profile.status.trim().toLowerCase() : 'active';
  if (['inactive', 'suspended', 'deactivated', 'banned'].includes(status)) {
    return { isAuthorized: false, message: 'Account is suspended or inactive.' };
  }

  const role = profile.role?.trim() ?? '';
  const rl = role.toLowerCase();
  const teacherId = profile.id;
  const specialPermissions = Array.isArray(profile.permissions) ? profile.permissions : [];

  if (isAdministratorRole(role)) {
    return {
      isAuthorized: true,
      role,
      canonicalRole: 'Administrator',
      filterByDepartment: 'both',
      teacherId,
      specialPermissions,
    };
  }

  if (
    rl === 'head teacher' ||
    rl === 'headteacher' ||
    rl === 'deputy head teacher' ||
    rl === 'deputy headteacher' ||
    rl === 'hm'
  ) {
    if (action === 'write' && !specialPermissions.includes('write_marks')) {
      return { isAuthorized: false, message: 'Unauthorized: Read-only access across departments.' };
    }
    return {
      isAuthorized: true,
      role,
      canonicalRole: 'Head Teacher',
      filterByDepartment: 'both',
      teacherId,
      specialPermissions,
    };
  }

  if (rl === 'support staff') {
    return { isAuthorized: false, message: 'Unauthorized: Support Staff do not have access to academic records.' };
  }

  let department: Department | null = null;
  const subject = profile.subject?.trim().toLowerCase() ?? '';

  if (rl === 'dos theology' || (rl === 'dos' && subject === 'theology')) {
    department = 'theology';
  } else if (rl === 'dos secular' || (rl === 'dos' && subject === 'secular')) {
    department = 'secular';
  } else if (rl === 'dos' && ['both', 'all'].includes(subject)) {
    department = 'both';
  } else if (rl === 'dos') {
    department = 'secular';
  }

  if (department) {
    if (targetDepartment && department !== 'both' && targetDepartment !== department) {
      return { isAuthorized: false, message: `Unauthorized: You only have access to the ${department} department.` };
    }
    return {
      isAuthorized: true,
      role,
      canonicalRole: department === 'theology' ? 'DOS Theology' : 'DOS Secular',
      filterByDepartment: department,
      teacherId,
      specialPermissions,
    };
  }

  if (isTeacherLevelRole(role)) {
    const teacherDepartment: Department =
      rl === 'class teacher'
        ? 'both'
        : rl === 'theology instructor' ||
            rl === 'class teacher theology' ||
            rl === 'teacher theology' ||
            rl === 'theology teacher' ||
            subject.includes('theology')
          ? 'theology'
          : 'secular';

    const allowedAssignments = classAssignments.filter(
      (assignment) =>
        teacherDepartment === 'both' ||
        (teacherDepartment === 'theology' && assignment.classType === 'theology') ||
        (teacherDepartment === 'secular' && assignment.classType === 'circular') ||
        specialPermissions.includes('cross_department_access')
    );

    if (
      targetDepartment &&
      teacherDepartment !== 'both' &&
      targetDepartment !== teacherDepartment &&
      !specialPermissions.includes('cross_department_access')
    ) {
      return { isAuthorized: false, message: `Unauthorized: You only have access to the ${teacherDepartment} department.` };
    }
    if (targetClass && !allowedAssignments.some((assignment) => assignment.classId === targetClass)) {
      return { isAuthorized: false, message: `Unauthorized: You do not have access to class ${targetClass}.` };
    }

    return {
      isAuthorized: true,
      role,
      canonicalRole: 'Class Teacher',
      filterByDepartment: teacherDepartment,
      filterByClasses: [...new Set(allowedAssignments.map((assignment) => assignment.classId))],
      classAssignments: allowedAssignments,
      teacherId,
      specialPermissions,
    };
  }

  return { isAuthorized: false, message: `Unauthorized: Unrecognized role '${role}'.` };
}

export function canAccessClass(
  access: AuthAccessResult,
  classType: ClassType,
  classId: string | null | undefined,
  cohortCircularClassId?: string | null
): boolean {
  if (!access.isAuthorized || !classId) return false;

  if (access.classAssignments) {
    const directlyAssigned = access.classAssignments.some(
      (assignment) => assignment.classType === classType && assignment.classId === classId
    );
    if (directlyAssigned) return true;
    const rl = (access.role ?? '').trim().toLowerCase();
    return (
      classType === 'theology' &&
      (rl === 'class teacher' || access.filterByDepartment === 'both') &&
      Boolean(cohortCircularClassId) &&
      access.classAssignments.some(
        (assignment) => assignment.classType === 'circular' && assignment.classId === cohortCircularClassId
      )
    );
  }

  if (access.filterByDepartment === 'both' || !access.filterByDepartment) return true;
  return (
    (access.filterByDepartment === 'secular' && classType === 'circular') ||
    access.filterByDepartment === classType
  );
}

export function canAccessEnrollment(
  access: AuthAccessResult,
  enrollment: { circular_class_id: string | null; theology_class_id: string | null }
): boolean {
  return (
    canAccessClass(access, 'circular', enrollment.circular_class_id) ||
    canAccessClass(
      access,
      'theology',
      enrollment.theology_class_id,
      enrollment.circular_class_id
    )
  );
}

export function canAssignEnrollmentClasses(
  access: AuthAccessResult,
  circularClassId: string | null | undefined,
  theologyClassId: string | null | undefined
): boolean {
  return (
    canAccessClass(access, 'circular', circularClassId) &&
    (!theologyClassId || canAccessClass(access, 'theology', theologyClassId, circularClassId))
  );
}

export function subjectMatchesClassScope(
  classScope: string | number | null | undefined,
  subjectScope: string | number | null | undefined
): boolean {
  return (
    classScope !== null &&
    classScope !== undefined &&
    subjectScope !== null &&
    subjectScope !== undefined &&
    String(classScope) === String(subjectScope)
  );
}

export function rosterClassFilters(access: AuthAccessResult): RosterClassFilter[] {
  const circularIds = (classIdsForType(access, 'circular') ?? []).filter(isUuid);
  const theologyIds = (classIdsForType(access, 'theology') ?? []).filter(isUuid);

  return [
    ...(circularIds.length ? [{ column: 'circular_class_id' as const, classIds: circularIds }] : []),
    ...(theologyIds.length ? [{ column: 'theology_class_id' as const, classIds: theologyIds }] : []),
  ];
}

export function enrollmentMatchesRosterFilters(
  enrollment: { circular_class_id: string | null; theology_class_id: string | null },
  filters: RosterClassFilter[]
): boolean {
  return filters.some(({ column, classIds }) => {
    const classId = enrollment[column];
    return typeof classId === 'string' && classIds.includes(classId);
  });
}

export function classIdsForType(
  access: AuthAccessResult,
  classType: ClassType
): string[] | null {
  if (access.classAssignments) {
    return [
      ...new Set(
        access.classAssignments
          .filter((assignment) => assignment.classType === classType)
          .map((assignment) => assignment.classId)
      ),
    ];
  }

  if (access.filterByDepartment === 'both' || !access.filterByDepartment) return null;
  const departmentMatchesClass =
    (access.filterByDepartment === 'secular' && classType === 'circular') ||
    access.filterByDepartment === classType;
  return departmentMatchesClass ? null : [];
}

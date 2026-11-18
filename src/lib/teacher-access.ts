export type ActionType = 'read' | 'write';
export type Department = 'secular' | 'theology' | 'both';
export type ClassType = 'circular' | 'theology';

export const CANONICAL_ACCOUNT_ROLES = [
  'Administrator',
  'Principal',
  'Head Teacher',
  'DOS Secular',
  'DOS Theology',
  'Secretary',
  'Class Teacher',
] as const;

export type CanonicalAccountRole = (typeof CANONICAL_ACCOUNT_ROLES)[number];

export const ALL_STAFF_ROLES = [
  'Administrator',
  'Principal',
  'Head Teacher',
  'Deputy Head Teacher',
  'DOS Secular',
  'DOS Theology',
  'Secretary',
  'Class Teacher',
  'Theology Instructor',
  'Support Staff',
] as const;

export type StaffRoleName = (typeof ALL_STAFF_ROLES)[number];

export const PERMISSION_KEYS = [
  'read_students',
  'write_students',
  'read_marks',
  'write_marks',
  'edit_class_teacher_remarks',
  'edit_head_teacher_remarks',
  'read_reports',
  'lock_marks',
  'view_activity_logs',
  'view_staff',
  'manage_settings',
  'manage_users',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_METADATA: Record<
  PermissionKey,
  { label: string; category: 'Read' | 'Review & Approve' | 'Write' | 'Administration'; enforcedAt: string }
> = {
  read_students: {
    label: 'Read Student Registry & Rosters',
    category: 'Read',
    enforcedAt: 'GET /api/students, GET /api/enrollments, /admin/students',
  },
  write_students: {
    label: 'Register & Edit Student Profiles',
    category: 'Write',
    enforcedAt: 'POST /api/students, PUT/PATCH /api/students/[id], POST /api/enrollments',
  },
  read_marks: {
    label: 'Read Marks & Hub Broadsheets',
    category: 'Read',
    enforcedAt: 'GET /api/marks, GET /api/secular-hub, GET /api/theology-hub',
  },
  write_marks: {
    label: 'Enter & Save Marks',
    category: 'Write',
    enforcedAt: 'POST /api/marks, POST /api/circular-marks, POST /api/theology-marks',
  },
  edit_class_teacher_remarks: {
    label: 'Edit Class Teacher Comments & Conduct',
    category: 'Write',
    enforcedAt: 'src/lib/access-scope.ts (canEditClassTeacherRemarks), /admin/reports',
  },
  edit_head_teacher_remarks: {
    label: 'Review & Approve Head Teacher Remarks',
    category: 'Review & Approve',
    enforcedAt: 'src/lib/access-scope.ts (canEditHeadTeacherRemarks), /admin/reports',
  },
  read_reports: {
    label: 'Generate & Print Report Cards',
    category: 'Read',
    enforcedAt: 'GET /api/report, POST /api/report/batch, /admin/reports',
  },
  lock_marks: {
    label: 'Approve & Lock Exam Sets (BOT/MOT/EOT)',
    category: 'Review & Approve',
    enforcedAt: 'PATCH /api/settings/school (marks_locks)',
  },
  view_activity_logs: {
    label: 'View Activity & Audit Logs',
    category: 'Read',
    enforcedAt: 'GET /api/activity, /admin/activity',
  },
  view_staff: {
    label: 'View Staff Directory',
    category: 'Read',
    enforcedAt: 'GET /api/teachers',
  },
  manage_settings: {
    label: 'Manage School Settings, Terms & Signatures',
    category: 'Administration',
    enforcedAt: '/api/settings/school, /api/settings/terms/active, /api/signatures/upload',
  },
  manage_users: {
    label: 'Manage Users, Roles & Permissions',
    category: 'Administration',
    enforcedAt: '/admin/teachers, /api/admin/teachers/*, /api/admin/permissions, /api/admin/reset-password',
  },
};

export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRoleName, PermissionKey[]> = {
  Administrator: [...PERMISSION_KEYS],
  Principal: [
    'read_students',
    'write_students',
    'read_marks',
    'edit_head_teacher_remarks',
    'read_reports',
    'lock_marks',
    'view_activity_logs',
    'view_staff',
  ],
  'Head Teacher': [
    'read_students',
    'write_students',
    'read_marks',
    'edit_head_teacher_remarks',
    'read_reports',
    'lock_marks',
    'view_activity_logs',
  ],
  'Deputy Head Teacher': [
    'read_students',
    'write_students',
    'read_marks',
    'edit_head_teacher_remarks',
    'read_reports',
    'lock_marks',
    'view_activity_logs',
  ],
  'DOS Secular': [
    'read_students',
    'write_students',
    'read_marks',
    'write_marks',
    'edit_class_teacher_remarks',
    'read_reports',
    'view_activity_logs',
  ],
  'DOS Theology': [
    'read_students',
    'write_students',
    'read_marks',
    'write_marks',
    'edit_class_teacher_remarks',
    'read_reports',
    'view_activity_logs',
  ],
  'Class Teacher': [
    'read_students',
    'write_students',
    'read_marks',
    'write_marks',
    'edit_class_teacher_remarks',
    'read_reports',
  ],
  'Theology Instructor': [
    'read_students',
    'write_students',
    'read_marks',
    'write_marks',
    'edit_class_teacher_remarks',
    'read_reports',
  ],
  Secretary: [
    'read_students',
    'read_marks',
    'read_reports',
  ],
  'Support Staff': [],
};

export function resolveStaffRoleKey(
  role?: string | null,
  subject?: string | null
): StaffRoleName {
  const rl = (role ?? '').trim().toLowerCase();
  const s = (subject ?? '').trim().toLowerCase();

  if (rl === 'administrator' || rl === 'admin') return 'Administrator';
  if (rl === 'principal') return 'Principal';
  if (rl === 'deputy head teacher' || rl === 'deputy headteacher') return 'Deputy Head Teacher';
  if (rl === 'head teacher' || rl === 'headteacher' || rl === 'hm') return 'Head Teacher';
  if (rl === 'dos theology' || rl === 'dos_theology' || (rl.includes('dos') && (rl.includes('theology') || s.includes('theology')))) {
    return 'DOS Theology';
  }
  if (rl === 'dos secular' || rl === 'dos_secular' || rl.includes('dos')) {
    return 'DOS Secular';
  }
  if (rl === 'secretary' || rl === 'school secretary' || rl === 'print secretary') return 'Secretary';
  if (rl === 'theology instructor' || rl === 'theology teacher' || rl === 'teacher theology') {
    return 'Theology Instructor';
  }
  if (rl === 'support staff') return 'Support Staff';
  return 'Class Teacher';
}

export function resolveEffectivePermissions(
  role?: string | null,
  subject?: string | null,
  userOverrides?: string[] | null,
  rolePermissionsMap?: Record<string, string[]> | null
): PermissionKey[] {
  const staffKey = resolveStaffRoleKey(role, subject);
  if (staffKey === 'Support Staff') return [];

  const validSet = new Set<string>(PERMISSION_KEYS);
  const baseList =
    rolePermissionsMap && Array.isArray(rolePermissionsMap[staffKey])
      ? rolePermissionsMap[staffKey]
      : DEFAULT_ROLE_PERMISSIONS[staffKey] ?? [];

  const effective = new Set<PermissionKey>(
    baseList.filter((k): k is PermissionKey => validSet.has(k))
  );

  if (Array.isArray(userOverrides) && userOverrides.length > 0) {
    for (const raw of userOverrides) {
      if (typeof raw !== 'string') continue;
      if (raw.startsWith('-') && validSet.has(raw.slice(1))) {
        effective.delete(raw.slice(1) as PermissionKey);
      } else if (validSet.has(raw)) {
        effective.add(raw as PermissionKey);
      }
    }
  }

  if (staffKey === 'Administrator') {
    for (const k of PERMISSION_KEYS) effective.add(k);
  }

  return Array.from(effective);
}

export function normalizeAccountRole(
  role?: string | null,
  subject?: string | null
): CanonicalAccountRole {
  const r = (role ?? '').trim();
  const rl = r.toLowerCase();
  const s = (subject ?? '').trim().toLowerCase();

  if (rl === 'administrator' || rl === 'admin') return 'Administrator';
  if (rl === 'principal') return 'Principal';
  if (
    rl === 'head teacher' ||
    rl === 'headteacher' ||
    rl === 'deputy head teacher' ||
    rl === 'deputy headteacher' ||
    rl === 'hm'
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
  if (rl === 'secretary' || rl === 'school secretary' || rl === 'print secretary') {
    return 'Secretary';
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

  if (
    rl === 'administrator' ||
    rl === 'admin' ||
    rl === 'principal' ||
    rl.includes('head') ||
    rl === 'secretary' ||
    rl === 'school secretary' ||
    rl === 'print secretary'
  ) {
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
    rl === 'subject teacher theology' ||
    rl === 'teacher theology' ||
    rl === 'theology teacher' ||
    (s.includes('theology') && !s.includes('secular'))
  ) {
    return hasCircularAssigned ? 'both' : 'theology';
  }

  if (
    rl === 'class teacher secular' ||
    rl === 'subject teacher secular' ||
    rl === 'teacher secular' ||
    rl === 'secular teacher' ||
    (s.includes('secular') && !s.includes('theology'))
  ) {
    return hasTheologyAssigned ? 'both' : 'secular';
  }

  if (hasCircularAssigned && !hasTheologyAssigned && rl !== 'class teacher') {
    return 'secular';
  }
  if (hasTheologyAssigned && !hasCircularAssigned && rl !== 'class teacher') {
    return 'theology';
  }

  return 'both';
}

export interface ClassAssignment {
  classId: string;
  classType: ClassType;
  subjectId?: string | null;
  subjectName?: string | null;
  isHomeroom?: boolean;
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
  homeroomClassIds?: string[];
  subject?: string | null;
  role?: string;
  canonicalRole?: CanonicalAccountRole;
  teacherId?: string;
  specialPermissions?: string[];
  effectivePermissions?: PermissionKey[];
}

export type RosterClassFilter = {
  column: 'circular_class_id' | 'theology_class_id';
  classIds: string[];
};

export function isAdministratorRole(role?: string | null): boolean {
  const rl = (role ?? '').trim().toLowerCase();
  return rl === 'administrator' || rl === 'admin';
}

export function isPrincipalRole(role?: string | null): boolean {
  const rl = (role ?? '').trim().toLowerCase();
  return rl === 'principal';
}

export function hasPermission(
  access: AuthAccessResult | null | undefined,
  key: PermissionKey
): boolean {
  if (!access || !access.isAuthorized) return false;
  if (isAdministratorRole(access.role)) return true;
  if (Array.isArray(access.effectivePermissions)) {
    return access.effectivePermissions.includes(key);
  }
  const fallback = resolveEffectivePermissions(
    access.role,
    access.subject,
    access.specialPermissions
  );
  return fallback.includes(key);
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
  'subject teacher',
  'subject teacher secular',
  'subject teacher theology',
  'muraqib',
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
  targetDepartment?: Department | null,
  rolePermissionsMap?: Record<string, string[]> | null
): AuthAccessResult {
  const status = profile.status ? profile.status.trim().toLowerCase() : 'active';
  if (['inactive', 'suspended', 'deactivated', 'banned'].includes(status)) {
    return { isAuthorized: false, message: 'Account is suspended or inactive.' };
  }

  const role = profile.role?.trim() ?? '';
  const rl = role.toLowerCase();
  const teacherId = profile.id;
  const specialPermissions = Array.isArray(profile.permissions) ? profile.permissions : [];
  const effectivePermissions = resolveEffectivePermissions(
    role,
    profile.subject,
    specialPermissions,
    rolePermissionsMap
  );

  if (isAdministratorRole(role)) {
    return {
      isAuthorized: true,
      role,
      canonicalRole: 'Administrator',
      filterByDepartment: 'both',
      teacherId,
      specialPermissions,
      effectivePermissions,
    };
  }

  if (isPrincipalRole(role)) {
    if (action === 'write' && !effectivePermissions.includes('write_marks')) {
      return {
        isAuthorized: false,
        message: 'Unauthorized: Read-only access across departments.',
        role,
        canonicalRole: 'Principal',
        filterByDepartment: 'both',
        teacherId,
        specialPermissions,
        effectivePermissions,
      };
    }
    return {
      isAuthorized: true,
      role,
      canonicalRole: 'Principal',
      filterByDepartment: 'both',
      teacherId,
      specialPermissions,
      effectivePermissions,
    };
  }

  if (
    rl === 'head teacher' ||
    rl === 'headteacher' ||
    rl === 'deputy head teacher' ||
    rl === 'deputy headteacher' ||
    rl === 'hm'
  ) {
    if (action === 'write' && !effectivePermissions.includes('write_marks')) {
      return {
        isAuthorized: false,
        message: 'Unauthorized: Read-only access across departments.',
        role,
        canonicalRole: 'Head Teacher',
        filterByDepartment: 'both',
        teacherId,
        specialPermissions,
        effectivePermissions,
      };
    }
    return {
      isAuthorized: true,
      role,
      canonicalRole: 'Head Teacher',
      filterByDepartment: 'both',
      teacherId,
      specialPermissions,
      effectivePermissions,
    };
  }

  if (rl === 'support staff') {
    return {
      isAuthorized: false,
      role,
      message: 'Unauthorized: Support Staff do not have access to academic records.',
    };
  }

  if (rl === 'secretary' || rl === 'school secretary' || rl === 'print secretary') {
    if (action === 'write' && !effectivePermissions.includes('write_marks')) {
      return {
        isAuthorized: false,
        message: 'Unauthorized: Secretary has read-only QA & print access across departments.',
        role,
        canonicalRole: 'Secretary',
        filterByDepartment: 'both',
        teacherId,
        specialPermissions,
        effectivePermissions,
      };
    }
    return {
      isAuthorized: true,
      role,
      canonicalRole: 'Secretary',
      filterByDepartment: 'both',
      teacherId,
      specialPermissions,
      effectivePermissions,
    };
  }

  let department: Department | null = null;
  const subject = profile.subject?.trim().toLowerCase() ?? '';

  if (rl === 'dos theology' || (rl === 'dos' && subject === 'theology')) {
    department = 'theology';
  } else if (rl === 'dos secular' || (rl === 'dos' && subject === 'secular')) {
    department = 'secular';
  } else if (rl === 'dos') {
    department = 'both';
  }

  if (department) {
    if (action === 'write' && !effectivePermissions.includes('write_marks')) {
      return { isAuthorized: false, message: 'Unauthorized: Marks write permission is disabled for your role.' };
    }
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
      effectivePermissions,
    };
  }

  if (isTeacherLevelRole(role)) {
    if (action === 'write' && !effectivePermissions.includes('write_marks')) {
      return { isAuthorized: false, message: 'Unauthorized: Marks write permission is disabled for your account.' };
    }

    const teacherDepartment: Department =
      rl === 'class teacher' || subject === 'both' || subject === 'all'
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
        (teacherDepartment === 'secular' && assignment.classType === 'circular')
    );

    if (
      targetDepartment &&
      teacherDepartment !== 'both' &&
      targetDepartment !== teacherDepartment
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
      homeroomClassIds: allowedAssignments.filter((a) => a.isHomeroom).map((a) => a.classId),
      subject: profile.subject ?? null,
      teacherId,
      specialPermissions,
      effectivePermissions,
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
  if (isAdministratorRole(access.role)) return true;

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

export function resolveEnrollmentClassUpdate(
  access: AuthAccessResult,
  current: { circular_class_id: string | null; theology_class_id: string | null },
  requested: { circular_class_id?: string | null; theology_class_id?: string | null }
): { circular_class_id: string | null; theology_class_id: string | null } | null {
  const currentCircularClass = current.circular_class_id ?? null;
  const currentTheologyClass = current.theology_class_id ?? null;
  if (!access.isAuthorized) return null;

  if (isAdministratorRole(access.role)) {
    return {
      circular_class_id: requested.circular_class_id === undefined
        ? currentCircularClass
        : requested.circular_class_id || null,
      theology_class_id: requested.theology_class_id === undefined
        ? currentTheologyClass
        : requested.theology_class_id || null,
    };
  }

  const canManageCircular = canAccessClass(access, 'circular', currentCircularClass);
  const canManageTheology = canAccessClass(
    access,
    'theology',
    currentTheologyClass,
    currentCircularClass
  );

  const requestedCircularClass = requested.circular_class_id || null;
  const requestedTheologyClass = requested.theology_class_id || null;
  const circularClassId = requestedCircularClass ?? (
    canManageCircular ? null : currentCircularClass
  );
  const theologyClassId = requestedTheologyClass ?? (
    canManageTheology ? null : currentTheologyClass
  );

  const circularAllowed = canManageCircular
    ? canAccessClass(access, 'circular', circularClassId)
    : circularClassId === currentCircularClass;
  const theologyAllowed = canManageTheology
    ? !theologyClassId || canAccessClass(access, 'theology', theologyClassId, circularClassId)
    : theologyClassId === currentTheologyClass;

  return circularAllowed && theologyAllowed
    ? { circular_class_id: circularClassId, theology_class_id: theologyClassId }
    : null;
}

export function canAssignEnrollmentClasses(
  access: AuthAccessResult,
  circularClassId: string | null | undefined,
  theologyClassId: string | null | undefined
): boolean {
  if (!access.isAuthorized) return false;
  if (isAdministratorRole(access.role)) return true;
  if (access.filterByDepartment === 'theology') {
    return Boolean(
      theologyClassId && canAccessClass(access, 'theology', theologyClassId, circularClassId)
    );
  }
  return (
    Boolean(circularClassId && canAccessClass(access, 'circular', circularClassId)) &&
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
  if (!access.isAuthorized) return [];
  if (isAdministratorRole(access.role)) return null;

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

export async function resolveAssignedClassDisplayForTeacher(
  supabaseAdmin: any,
  canonicalRole: string,
  staffRole: string,
  teacherRow: any
): Promise<{
  assignedClasses: string[];
  rawClassTokensResolved: Array<{ token: string; resolved_name: string | null; table: string | null }>;
}> {
  const [{ data: circularClasses }, { data: theologyClasses }, { data: assignments }] = await Promise.all([
    supabaseAdmin.from('circular_classes').select('id, name, class_name, class_teacher_id'),
    supabaseAdmin.from('theology_classes').select('id, class_name_english, class_name_arabic'),
    teacherRow?.id
      ? supabaseAdmin
        .from('teacher_class_assignments')
        .select('class_id, class_type')
        .eq('teacher_id', teacherRow.id)
      : Promise.resolve({ data: [] }),
  ]);

  const circularMap = new Map<string, string>();
  for (const c of circularClasses || []) {
    const label = c?.class_name || c?.name;
    if (c?.id && label) circularMap.set(String(c.id), String(label));
  }
  const theologyMap = new Map<string, string>();
  for (const c of theologyClasses || []) {
    const label = c?.class_name_english || c?.class_name_arabic;
    if (c?.id && label) theologyMap.set(String(c.id), String(label));
  }

  const rawTokens: string[] = Array.isArray(teacherRow?.classes)
    ? teacherRow.classes.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
    : [];

  const rawClassTokensResolved = rawTokens.map((token) => {
    const trimmed = token.trim();
    if (circularMap.has(trimmed)) {
      return { token: trimmed, resolved_name: circularMap.get(trimmed) || null, table: 'circular_classes' };
    }
    if (theologyMap.has(trimmed)) {
      return { token: trimmed, resolved_name: `${theologyMap.get(trimmed)} (Theology)`, table: 'theology_classes' };
    }
    return {
      token: trimmed,
      resolved_name: isUuid(trimmed) ? null : trimmed,
      table: isUuid(trimmed) ? 'unmatched_uuid' : 'literal_name',
    };
  });

  if (canonicalRole === 'Administrator' || staffRole === 'Administrator') {
    return { assignedClasses: ['All classes'], rawClassTokensResolved };
  }
  if (
    canonicalRole === 'Principal' ||
    staffRole === 'Principal' ||
    canonicalRole === 'Head Teacher' ||
    staffRole === 'Head Teacher' ||
    staffRole === 'Deputy Head Teacher'
  ) {
    return { assignedClasses: ['All School Classes'], rawClassTokensResolved };
  }
  if (canonicalRole === 'DOS Secular' || staffRole === 'DOS Secular') {
    return { assignedClasses: ['All Secular Classes'], rawClassTokensResolved };
  }
  if (canonicalRole === 'DOS Theology' || staffRole === 'DOS Theology') {
    return { assignedClasses: ['All Theology Classes'], rawClassTokensResolved };
  }

  const resolvedSet = new Set<string>();
  for (const a of assignments || []) {
    const cid = String(a.class_id || '');
    if (!cid) continue;
    if (a.class_type === 'theology' && theologyMap.has(cid)) {
      resolvedSet.add(`${theologyMap.get(cid)} (Theology)`);
    } else if (circularMap.has(cid)) {
      resolvedSet.add(circularMap.get(cid)!);
    } else if (theologyMap.has(cid)) {
      resolvedSet.add(`${theologyMap.get(cid)} (Theology)`);
    }
  }

  if (teacherRow?.id) {
    for (const c of circularClasses || []) {
      const label = c?.class_name || c?.name;
      if (c?.class_teacher_id === teacherRow.id && label) {
        resolvedSet.add(String(label));
      }
    }
  }

  for (const item of rawClassTokensResolved) {
    if (item.resolved_name) {
      resolvedSet.add(item.resolved_name);
    }
  }

  return {
    assignedClasses: Array.from(resolvedSet),
    rawClassTokensResolved,
  };
}

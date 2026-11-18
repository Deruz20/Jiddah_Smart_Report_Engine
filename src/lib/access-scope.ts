import {
  normalizeAccountRole,
  resolveRoleDepartment,
  resolveEffectivePermissions,
  isAdministratorRole,
  isPrincipalRole,
  isTeacherLevelRole,
  type CanonicalAccountRole,
  type Department,
  type ClassType,
  type ClassAssignment,
  type AuthAccessResult,
  type PermissionKey,
} from './teacher-access.ts';

export type TeacherScopeType = 'leadership' | 'class_teacher' | 'subject_teacher' | 'unrestricted';

export interface SubjectClassPair {
  classId: string;
  classType: ClassType;
  subjectId?: string | null;
  subjectName?: string | null;
  department: 'secular' | 'theology';
}

export interface UserScopeInput {
  role?: string | null;
  subject?: string | null;
  status?: string | null;
  teacherId?: string | null;
  classes?: unknown;
  classAssignments?: ClassAssignment[];
  homeroomClassIds?: string[];
  specialPermissions?: string[] | null;
  effectivePermissions?: PermissionKey[] | null;
  rolePermissionsMap?: Record<string, string[]> | null;
  isAuthorized?: boolean;
  message?: string;
}

export interface ResolvedUserScope {
  isAuthorized: boolean;
  message?: string;
  teacherId?: string | null;
  rawRole: string;
  canonicalRole: CanonicalAccountRole;
  teacherScopeType: TeacherScopeType;
  department: Department;
  isFullAccess: boolean;
  isAdmin: boolean;
  isPrincipal: boolean;
  isHeadTeacher: boolean;
  isDOS: boolean;
  isTeacher: boolean;
  isClassTeacher: boolean;
  isSubjectTeacher: boolean;
  isUnassigned: boolean;
  allowedClassIds: string[];
  allowedCircularClassIds: string[];
  allowedTheologyClassIds: string[];
  homeroomClassIds: string[];
  assignedSubjectPairs: SubjectClassPair[];
  assignedSubjects: string[];
  defaultClassId: string | null;
  defaultCircularClassId: string | null;
  defaultTheologyClassId: string | null;
  defaultSubjectId: string | null;
  effectivePermissions: PermissionKey[];
  canAccessSecular: boolean;
  canAccessTheology: boolean;
  // Module capabilities
  canAccessClasses: boolean;
  canAccessStudents: boolean;
  canWriteStudents: boolean;
  canAccessReports: boolean;
  canEditClassTeacherRemarks: boolean;
  canEditHeadTeacherRemarks: boolean;
  canAccessMarksEntry: boolean;
  canWriteMarks: boolean;
  canLockMarks: boolean;
  canAccessSubjects: boolean;
  canAccessSecularHub: boolean;
  canAccessTheologyHub: boolean;
  canViewStaff: boolean;
  canManageTeachers: boolean;
  canManageSettings: boolean;
  canManageUploads: boolean;
  canViewAuditLogs: boolean;
}

const DEPARTMENT_TOKEN_SET = new Set([
  'secular',
  'theology',
  'both',
  'all',
  'general',
  'administration',
  'circular',
]);

export function parseSubjectTokens(rawSubject?: string | null): string[] {
  if (!rawSubject) return [];
  return rawSubject
    .split(/[,;|]+/)
    .map((token) => token.trim())
    .filter((token) => Boolean(token) && !DEPARTMENT_TOKEN_SET.has(token.toLowerCase()));
}

export function parseClassTokens(rawClasses: unknown): string[] {
  if (!rawClasses) return [];
  if (Array.isArray(rawClasses)) {
    return rawClasses.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  if (typeof rawClasses === 'string') {
    const trimmed = rawClasses.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
        }
      } catch {
        // fallback to comma split
      }
    }
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Single authoritative server + client permission and scope resolver.
 */
export function resolveUserScope(input: UserScopeInput | AuthAccessResult): ResolvedUserScope {
  const rawRole = (input.role ?? '').trim();
  const rl = rawRole.toLowerCase();
  const rawSubject = ('subject' in input ? input.subject : undefined) ?? '';
  const status = (('status' in input ? input.status : undefined) ?? 'active')?.trim().toLowerCase() || 'active';

  const isSuspended = ['inactive', 'suspended', 'deactivated', 'banned'].includes(status);
  const isSupportOrGuest = rl === 'support staff' || rl === 'guest' || rl === 'pending' || !rawRole;

  if (isSuspended || isSupportOrGuest || input.isAuthorized === false) {
    return {
      isAuthorized: false,
      message:
        input.message ||
        (isSuspended
          ? 'Account is suspended or inactive.'
          : 'Unauthorized: Insufficient permissions to access academic records.'),
      teacherId: input.teacherId ?? null,
      rawRole,
      canonicalRole: normalizeAccountRole(rawRole, rawSubject),
      teacherScopeType: 'subject_teacher',
      department: 'secular',
      isFullAccess: false,
      isAdmin: false,
      isPrincipal: false,
      isHeadTeacher: false,
      isDOS: false,
      isTeacher: false,
      isClassTeacher: false,
      isSubjectTeacher: false,
      isUnassigned: true,
      allowedClassIds: [],
      allowedCircularClassIds: [],
      allowedTheologyClassIds: [],
      homeroomClassIds: [],
      assignedSubjectPairs: [],
      assignedSubjects: [],
      defaultClassId: null,
      defaultCircularClassId: null,
      defaultTheologyClassId: null,
      defaultSubjectId: null,
      effectivePermissions: [],
      canAccessSecular: false,
      canAccessTheology: false,
      canAccessClasses: false,
      canAccessStudents: false,
      canWriteStudents: false,
      canAccessReports: false,
      canEditClassTeacherRemarks: false,
      canEditHeadTeacherRemarks: false,
      canAccessMarksEntry: false,
      canWriteMarks: false,
      canLockMarks: false,
      canAccessSubjects: false,
      canAccessSecularHub: false,
      canAccessTheologyHub: false,
      canViewStaff: false,
      canManageTeachers: false,
      canManageSettings: false,
      canManageUploads: false,
      canViewAuditLogs: false,
    };
  }

  const canonicalRole = normalizeAccountRole(rawRole, rawSubject);
  const isAdmin = isAdministratorRole(rawRole) || canonicalRole === 'Administrator';
  const isPrincipal = isPrincipalRole(rawRole) || canonicalRole === 'Principal';
  const isHeadTeacher = canonicalRole === 'Head Teacher';
  const isDOS = canonicalRole === 'DOS Secular' || canonicalRole === 'DOS Theology';
  const isFullAccess = isAdmin || isPrincipal || isHeadTeacher || isDOS;
  const isTeacher = !isFullAccess && isTeacherLevelRole(rawRole);

  const effectivePermissions =
    'effectivePermissions' in input && Array.isArray(input.effectivePermissions)
      ? input.effectivePermissions
      : resolveEffectivePermissions(
          rawRole,
          rawSubject,
          input.specialPermissions ?? null,
          'rolePermissionsMap' in input ? input.rolePermissionsMap : null
        );
  const permSet = new Set<PermissionKey>(effectivePermissions);

  const classAssignments: ClassAssignment[] = input.classAssignments ?? [];
  const legacyClasses = 'classes' in input ? parseClassTokens(input.classes) : [];
  const filterByClasses = 'filterByClasses' in input && Array.isArray(input.filterByClasses) ? input.filterByClasses : [];

  const department: Department =
    ('filterByDepartment' in input && input.filterByDepartment)
      ? input.filterByDepartment
      : resolveRoleDepartment(rawRole, rawSubject, classAssignments);

  const canAccessSecular = department === 'secular' || department === 'both';
  const canAccessTheology = department === 'theology' || department === 'both';

  // Filter assignments by allowed department
  const departmentFilteredAssignments = classAssignments.filter((a) => {
    if (department === 'both') return true;
    if (department === 'secular') return a.classType === 'circular';
    if (department === 'theology') return a.classType === 'theology';
    return true;
  });

  const allowedCircularClassIds = [
    ...new Set(
      departmentFilteredAssignments
        .filter((a) => a.classType === 'circular')
        .map((a) => a.classId)
    ),
  ];

  const allowedTheologyClassIds = [
    ...new Set(
      departmentFilteredAssignments
        .filter((a) => a.classType === 'theology')
        .map((a) => a.classId)
    ),
  ];

  const combinedAllowedClassIds = [
    ...new Set([
      ...allowedCircularClassIds,
      ...allowedTheologyClassIds,
      ...filterByClasses,
      ...legacyClasses,
    ]),
  ];

  // Parse explicit subject tokens and subject-class pairs
  const explicitSubjectTokens = parseSubjectTokens(rawSubject);
  const assignedSubjectPairs: SubjectClassPair[] = [];

  for (const assignment of departmentFilteredAssignments) {
    const dept: 'secular' | 'theology' = assignment.classType === 'theology' ? 'theology' : 'secular';
    if (assignment.subjectId || assignment.subjectName) {
      assignedSubjectPairs.push({
        classId: assignment.classId,
        classType: assignment.classType,
        subjectId: assignment.subjectId ?? null,
        subjectName: assignment.subjectName ?? null,
        department: dept,
      });
    } else if (explicitSubjectTokens.length > 0) {
      for (const subj of explicitSubjectTokens) {
        assignedSubjectPairs.push({
          classId: assignment.classId,
          classType: assignment.classType,
          subjectId: subj,
          subjectName: subj,
          department: dept,
        });
      }
    }
  }

  const assignedSubjects = [
    ...new Set([
      ...explicitSubjectTokens,
      ...assignedSubjectPairs
        .map((p) => p.subjectId || p.subjectName)
        .filter((s): s is string => Boolean(s)),
    ]),
  ];

  // Determine Class Teacher (Homeroom / Muraqib) vs Subject Teacher scope
  const explicitHomeroomIds = 'homeroomClassIds' in input && Array.isArray(input.homeroomClassIds)
    ? input.homeroomClassIds
    : [];
  const assignmentHomeroomIds = departmentFilteredAssignments
    .filter((a) => a.isHomeroom)
    .map((a) => a.classId);

  const isSubjectOnlyRoleName =
    rl === 'subject teacher' ||
    rl === 'subject teacher secular' ||
    rl === 'subject teacher theology' ||
    rl === 'teacher' ||
    rl === 'teacher secular' ||
    rl === 'teacher theology' ||
    rl === 'secular teacher' ||
    rl === 'theology teacher' ||
    rl === 'theology instructor';

  const hasHomeroomDesignation =
    explicitHomeroomIds.length > 0 ||
    assignmentHomeroomIds.length > 0 ||
    rl === 'class teacher' ||
    rl === 'class teacher secular' ||
    rl === 'class teacher theology' ||
    rl === 'muraqib';

  const isClassTeacher = isTeacher && hasHomeroomDesignation && !rl.startsWith('subject teacher');
  const isSubjectTeacher =
    isTeacher &&
    (isSubjectOnlyRoleName || assignedSubjectPairs.length > 0 || !isClassTeacher);

  const homeroomClassIds = isClassTeacher
    ? [
        ...new Set([
          ...explicitHomeroomIds,
          ...assignmentHomeroomIds,
          ...(explicitHomeroomIds.length === 0 && assignmentHomeroomIds.length === 0
            ? combinedAllowedClassIds
            : []),
        ]),
      ]
    : [];

  const isUnassigned =
    isTeacher &&
    combinedAllowedClassIds.length === 0 &&
    assignedSubjectPairs.length === 0;

  const defaultCircularClassId = allowedCircularClassIds[0] ?? null;
  const defaultTheologyClassId = allowedTheologyClassIds[0] ?? null;
  const defaultClassId =
    defaultCircularClassId ??
    defaultTheologyClassId ??
    combinedAllowedClassIds[0] ??
    null;

  const defaultSubjectId =
    assignedSubjectPairs[0]?.subjectId ??
    assignedSubjectPairs[0]?.subjectName ??
    assignedSubjects[0] ??
    null;

  const teacherScopeType: TeacherScopeType = isFullAccess
    ? 'leadership'
    : isClassTeacher
      ? 'class_teacher'
      : 'subject_teacher';

  return {
    isAuthorized: true,
    teacherId: input.teacherId ?? null,
    rawRole,
    canonicalRole,
    teacherScopeType,
    department,
    isFullAccess,
    isAdmin,
    isPrincipal,
    isHeadTeacher,
    isDOS,
    isTeacher,
    isClassTeacher,
    isSubjectTeacher,
    isUnassigned,
    allowedClassIds: combinedAllowedClassIds,
    allowedCircularClassIds,
    allowedTheologyClassIds,
    homeroomClassIds,
    assignedSubjectPairs,
    assignedSubjects,
    defaultClassId,
    defaultCircularClassId,
    defaultTheologyClassId,
    defaultSubjectId,
    effectivePermissions,
    canAccessSecular,
    canAccessTheology,
    // Module capabilities
    canAccessClasses: isFullAccess || isClassTeacher || isTeacher,
    canAccessStudents: (isFullAccess || isClassTeacher || isTeacher) && permSet.has('read_students'),
    canWriteStudents: permSet.has('write_students'),
    canAccessReports: (isFullAccess || isClassTeacher || isTeacher) && permSet.has('read_reports'),
    canEditClassTeacherRemarks: permSet.has('edit_class_teacher_remarks'),
    canEditHeadTeacherRemarks: permSet.has('edit_head_teacher_remarks'),
    canAccessMarksEntry: (isFullAccess || isTeacher) && (permSet.has('read_marks') || permSet.has('write_marks')),
    canWriteMarks: permSet.has('write_marks'),
    canLockMarks: permSet.has('lock_marks'),
    canAccessSubjects: isFullAccess || isTeacher,
    canAccessSecularHub: canAccessSecular && (isFullAccess || isTeacher) && permSet.has('read_marks'),
    canAccessTheologyHub: canAccessTheology && (isFullAccess || isTeacher) && permSet.has('read_marks'),
    canViewStaff: permSet.has('view_staff') || permSet.has('manage_users'),
    canManageTeachers: permSet.has('manage_users'),
    canManageSettings: permSet.has('manage_settings'),
    canManageUploads: isAdmin || isPrincipal || isHeadTeacher || isDOS || isClassTeacher || isTeacher,
    canViewAuditLogs: permSet.has('view_activity_logs'),
  };
}

/**
 * Checks whether the resolved scope can access a given class ID.
 */
export function canAccessClassInScope(
  scope: ResolvedUserScope,
  classId: string | null | undefined,
  classType?: ClassType
): boolean {
  if (!scope.isAuthorized || !classId) return false;
  if (classType === 'circular' && !scope.canAccessSecular) return false;
  if (classType === 'theology' && !scope.canAccessTheology) return false;
  if (scope.isFullAccess) return true;
  if (classType === 'circular' && scope.allowedCircularClassIds.length > 0) {
    return scope.allowedCircularClassIds.includes(classId);
  }
  if (classType === 'theology' && scope.allowedTheologyClassIds.length > 0) {
    return (
      scope.allowedTheologyClassIds.includes(classId) ||
      (scope.department === 'both' && scope.allowedCircularClassIds.includes(classId))
    );
  }
  return scope.allowedClassIds.includes(classId);
}

/**
 * Checks whether the resolved scope can access a specific subject within a class.
 */
export function canAccessSubjectInScope(
  scope: ResolvedUserScope,
  classId: string | null | undefined,
  subjectIdOrName: string | null | undefined,
  department?: 'secular' | 'theology'
): boolean {
  if (!scope.isAuthorized) return false;
  if (department === 'secular' && !scope.canAccessSecular) return false;
  if (department === 'theology' && !scope.canAccessTheology) return false;
  if (scope.isFullAccess) return true;

  if (classId && !scope.allowedClassIds.includes(classId)) {
    return false;
  }

  // If teacher is a homeroom Class Teacher for this class and has no subject-pair restriction on it, allow all subjects in their department
  if (
    classId &&
    scope.isClassTeacher &&
    scope.homeroomClassIds.includes(classId) &&
    scope.assignedSubjects.length === 0
  ) {
    return true;
  }

  if (!subjectIdOrName) return true;
  const target = subjectIdOrName.trim().toLowerCase();

  // Check explicit class + subject pairs first
  if (scope.assignedSubjectPairs.length > 0) {
    const classPairs = classId
      ? scope.assignedSubjectPairs.filter((p) => p.classId === classId)
      : scope.assignedSubjectPairs;
    if (classPairs.length > 0) {
      return classPairs.some(
        (p) =>
          p.subjectId?.trim().toLowerCase() === target ||
          p.subjectName?.trim().toLowerCase() === target
      );
    }
  }

  if (scope.assignedSubjects.length > 0) {
    return scope.assignedSubjects.some((s) => s.trim().toLowerCase() === target);
  }

  // Class teacher with no specific subject restriction can access all subjects for their assigned class
  return scope.isClassTeacher;
}

/**
 * Checks whether the user can view the full-class Hub broadsheet (all subjects) for a class.
 * Admin, Headteacher, DOS, and the assigned Class Teacher (Homeroom / Muraqib) can view full broadsheets.
 */
export function canAccessFullClassBroadsheet(
  scope: ResolvedUserScope,
  classId?: string | null
): boolean {
  if (!scope.isAuthorized) return false;
  if (scope.isFullAccess) return true;
  if (!scope.isClassTeacher) return false;
  if (!classId) return scope.homeroomClassIds.length > 0;
  return scope.homeroomClassIds.includes(classId) || scope.allowedClassIds.includes(classId);
}


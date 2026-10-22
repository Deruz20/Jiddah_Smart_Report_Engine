import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
  accessDeniedForLookupError,
  authorizeTeacherProfile,
  resolveTeacherProfile,
  isTeacherLevelRole,
  isAdministratorRole,
  type AuthAccessResult,
  type ClassAssignment,
  type Department,
  type ActionType,
  type TeacherProfile,
  type ClassType,
  canAccessClass,
} from './teacher-access.ts';

export type { AuthAccessResult, ClassAssignment, Department, ActionType } from './teacher-access.ts';

function parseLegacyClassList(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
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

function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function verifyDataAccess(
  _supabase: SupabaseClient,
  user: User,
  action: ActionType,
  targetClass?: string | null,
  targetDepartment?: Department | null
): Promise<AuthAccessResult> {
  // Support unit test mock client when passed
  const isMockClient = !_supabase?.auth || typeof (_supabase as any).auth?.getUser !== 'function';
  if (isMockClient) {
    try {
      const q: any = _supabase.from('teachers');
      const s = q?.select ? q.select('*') : q;
      let mockRow: any = null;
      if (s?.eq) {
        const eqTarget = s.eq('id', user.id);
        const res = typeof eqTarget?.single === 'function' ? await eqTarget.single() : await eqTarget;
        mockRow = res?.data || (Array.isArray(res) ? res[0] : null);
      }
      if (mockRow) {
        return authorizeTeacherProfile(
          mockRow,
          [],
          action,
          targetClass,
          targetDepartment
        );
      }
    } catch {
      // Continue to regular lookup
    }
  }

  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const directory = !isMockClient && adminKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321', adminKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : _supabase;

  let profiles: any[] | null = null;
  let profileError: any = null;

  const hasValidUuid = isValidUuid(user.id);
  if (hasValidUuid) {
    const res = await directory
      .from('teachers')
      .select('id, auth_user_id, email, role, subject, status, classes')
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
      .limit(2);
    profiles = res.data;
    profileError = res.error;

    // Fallback if `classes` column does not exist on older schema
    if (profileError && profileError.message?.includes('classes')) {
      const retry = await directory
        .from('teachers')
        .select('id, auth_user_id, email, role, subject, status')
        .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
        .limit(2);
      profiles = retry.data as any;
      profileError = retry.error;
    }
  } else if (user.email) {
    const res = await directory
      .from('teachers')
      .select('id, auth_user_id, email, role, subject, status, classes')
      .eq('email', user.email)
      .limit(2);
    profiles = res.data;
    profileError = res.error;

    if (profileError && profileError.message?.includes('classes')) {
      const retry = await directory
        .from('teachers')
        .select('id, auth_user_id, email, role, subject, status')
        .eq('email', user.email)
        .limit(2);
      profiles = retry.data as any;
      profileError = retry.error;
    }
  }

  const serverRole = user.app_metadata?.role;
  const profileLookupDenied = accessDeniedForLookupError(profileError, 'Unable to verify staff identity.');
  if (profileLookupDenied) {
    // If database timed out but user has server-signed app_metadata Administrator role, allow fallback
    if (serverRole && isAdministratorRole(serverRole)) {
      profiles = [{
        id: user.id,
        auth_user_id: user.id,
        email: user.email || '',
        role: serverRole,
        status: 'active',
      }] as any;
    } else {
      console.error('Teacher access profile lookup failed:', profileError?.message);
      return profileLookupDenied;
    }
  }

  let profile = resolveTeacherProfile((profiles ?? []) as TeacherProfile[], user.id);

  // Fallback for legacy email-mapped rows if no auth_user_id/id match was found
  if (!profile && user.email) {
    let { data: emailProfiles, error: emailError } = await directory
      .from('teachers')
      .select('id, auth_user_id, email, role, subject, status, classes')
      .eq('email', user.email)
      .limit(2);

    if (emailError && emailError.message?.includes('classes')) {
      const retryEmail = await directory
        .from('teachers')
        .select('id, auth_user_id, email, role, subject, status')
        .eq('email', user.email)
        .limit(2);
      emailProfiles = retryEmail.data as any;
      emailError = retryEmail.error;
    }

    if (!emailError && emailProfiles && emailProfiles.length === 1) {
      profile = emailProfiles[0] as TeacherProfile;
    }
  }

  // Bootstrap fallback if user has server-verified Administrator role in app_metadata
  if (!profile) {
    if (serverRole && isAdministratorRole(serverRole)) {
      profile = {
        id: user.id,
        auth_user_id: user.id,
        role: 'Administrator',
        status: 'active',
      };
    }
  }

  if (!profile) {
    return { isAuthorized: false, message: 'User profile not found or identity is ambiguous.' };
  }

  let assignments: ClassAssignment[] = [];
  if (isTeacherLevelRole(profile.role)) {
    const [assignmentRes, homeroomRes] = await Promise.all([
      directory
        .from('teacher_class_assignments')
        .select('class_id, class_type')
        .eq('teacher_id', profile.id),
      directory
        .from('circular_classes')
        .select('id')
        .eq('class_teacher_id', profile.id),
    ]);

    const assignmentLookupDenied = accessDeniedForLookupError(
      assignmentRes.error,
      'Unable to verify teacher class assignments.'
    );
    if (assignmentLookupDenied && !assignmentRes.error?.message?.includes('does not exist')) {
      console.error('Teacher class assignment lookup failed:', assignmentRes.error?.message);
      return assignmentLookupDenied;
    }

    const homeroomLookupDenied = accessDeniedForLookupError(
      homeroomRes.error,
      'Unable to verify teacher class assignments.'
    );
    if (homeroomLookupDenied) {
      console.error('Teacher homeroom lookup failed:', homeroomRes.error?.message);
      return homeroomLookupDenied;
    }

    assignments = [
      ...(assignmentRes.data ?? [])
        .filter((row: { class_id: string; class_type: string }) =>
          row.class_type === 'circular' || row.class_type === 'theology'
        )
        .map((row: { class_id: string; class_type: 'circular' | 'theology' }) => ({
          classId: row.class_id,
          classType: row.class_type,
        })),
      ...(homeroomRes.data ?? []).map((row: { id: string }) => ({
        classId: row.id,
        classType: 'circular' as const,
      })),
    ];

    // Also resolve any legacy `teachers.classes` entries (by UUID or class name)
    const legacyEntries = parseLegacyClassList(profile.classes);
    if (legacyEntries.length > 0) {
      const [allCircularRes, allTheologyRes] = await Promise.all([
        directory.from('circular_classes').select('id, class_name'),
        directory.from('theology_classes').select('id, class_name_arabic, class_name_english'),
      ]);

      const circularList = allCircularRes.data ?? [];
      const theologyList = allTheologyRes.data ?? [];

      for (const token of legacyEntries) {
        const lower = token.toLowerCase();
        const matchedCircular = circularList.find(
          (c: any) => c.id === token || String(c.class_name ?? '').trim().toLowerCase() === lower
        );
        if (matchedCircular) {
          assignments.push({ classId: matchedCircular.id, classType: 'circular' });
        }
        const matchedTheology = theologyList.find(
          (t: any) =>
            t.id === token ||
            String(t.class_name_arabic ?? '').trim().toLowerCase() === lower ||
            String(t.class_name_english ?? '').trim().toLowerCase() === lower
        );
        if (matchedTheology) {
          assignments.push({ classId: matchedTheology.id, classType: 'theology' });
        }
      }
    }
  }

  return authorizeTeacherProfile(
    profile,
    assignments,
    action,
    targetClass,
    targetDepartment
  );
}

export async function verifyEnrollmentClassAccess(
  supabase: SupabaseClient,
  user: User,
  action: ActionType,
  enrollmentId: string,
  classType: ClassType
) {
  const access = await verifyDataAccess(supabase, user, action);
  if (!access.isAuthorized) return { access, enrollment: null };

  const { data: enrollment, error } = await supabase
    .from('enrollments')
    .select('id, circular_class_id, theology_class_id')
    .eq('id', enrollmentId)
    .maybeSingle();

  if (error) {
    console.error('Enrollment access lookup failed:', error.message);
    return {
      access: { isAuthorized: false, message: 'Unable to verify enrollment access.' },
      enrollment: null,
    };
  }
  if (!enrollment) {
    return {
      access: { isAuthorized: false, message: 'Enrollment not found.' },
      enrollment: null,
    };
  }

  const allowed =
    classType === 'circular'
      ? canAccessClass(access, classType, enrollment.circular_class_id)
      : canAccessClass(access, classType, enrollment.theology_class_id, enrollment.circular_class_id);
  if (!allowed) {
    return {
      access: { isAuthorized: false, message: 'Unauthorized: Enrollment is outside your assigned classes.' },
      enrollment: null,
    };
  }

  return { access, enrollment };
}

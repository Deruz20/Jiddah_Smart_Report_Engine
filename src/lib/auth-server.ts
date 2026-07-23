import { SupabaseClient, User } from '@supabase/supabase-js'

export type ActionType = 'read' | 'write';
export type Department = 'secular' | 'theology' | 'both';

export interface AuthAccessResult {
  isAuthorized: boolean;
  message?: string;
  // Specific query filters the route should apply, if applicable
  filterByDepartment?: Department;
  filterByClasses?: string[];
  role?: string;
}

/**
 * Single source of truth for backend API authorization.
 * FAILS CLOSED: Any unrecognized role gets 403 Forbidden.
 * 
 * @param supabase The Supabase client (used to fetch fresh teacher profile)
 * @param user The authenticated user
 * @param action 'read' or 'write'
 * @param targetClass Optional. If the request is for a specific class, pass it here.
 * @param targetDepartment Optional. 'secular' or 'theology', if the request is department-specific.
 */
export async function verifyDataAccess(
  supabase: SupabaseClient,
  user: User,
  action: ActionType,
  targetClass?: string | null,
  targetDepartment?: Department | null
): Promise<AuthAccessResult> {
  // Always fetch fresh from the teachers table. NEVER trust user_metadata.
  const { data: profile } = await supabase
    .from('teachers')
    .select('role, subject, classes')
    .eq('email', user.email)
    .single();

  if (!profile) {
    // If they aren't in the teachers table, check if they are the hardcoded superadmin
    // (In local dev / initial setup, sometimes the first admin isn't in teachers yet)
    // But to be strictly safe, we fail closed unless they are explicitly seeded.
    // However, we'll allow "admin" fallback ONLY IF it's the exact owner email.
    // Let's keep it strictly fail-closed. If not in teachers table -> DENY.
    // Wait, the original code had: user.user_metadata?.role === 'admin'
    // To not break the absolute root admin, let's check user_metadata ONLY if role is exactly 'Administrator'
    // and even then, let's be careful. Let's just return false if not in teachers table, UNLESS we explicitly 
    // want to allow a root admin. I'll check user_metadata ONLY for 'Administrator', but prompt says:
    // "never reads user.user_metadata or any session/token claim for this decision."
    // Okay, strict compliance: if not in `teachers` table, YOU HAVE NO ACCESS.
    return { isAuthorized: false, message: 'User profile not found in teachers directory.' };
  }

  const role = profile.role as string;
  
  // 1. Administrator
  if (role === 'Administrator' || role === 'admin') {
    return { isAuthorized: true, role };
  }

  // 2. Head Teacher & Deputy Head Teacher
  if (role === 'Head Teacher' || role === 'Deputy Head Teacher') {
    if (action === 'write') {
      return { isAuthorized: false, message: 'Unauthorized: Read-only access across departments.' };
    }
    // Read access to both departments
    return { isAuthorized: true, role, filterByDepartment: 'both' };
  }

  // 3. Support Staff
  if (role === 'Support Staff') {
    // Explicitly denied from academic endpoints
    return { isAuthorized: false, message: 'Unauthorized: Support Staff do not have access to academic records.' };
  }

  // 4. DOS
  if (role === 'DOS Secular' || role === 'DOS Theology' || role === 'DOS') {
    const isTheology = role === 'DOS Theology' || (role === 'DOS' && profile.subject?.toLowerCase().includes('theology'));
    
    const myDepartment: Department = isTheology ? 'theology' : 'secular';

    if (targetDepartment && targetDepartment !== myDepartment) {
      return { isAuthorized: false, message: `Unauthorized: You only have access to the ${myDepartment} department.` };
    }

    return { isAuthorized: true, role, filterByDepartment: myDepartment };
  }

  // 5. Class Teacher, Theology Instructor, Teacher
  if (role === 'Class Teacher' || role === 'Theology Instructor' || role === 'Teacher') {
    const assignedClasses: string[] = profile.classes || [];
    
    if (targetClass && !assignedClasses.includes(targetClass)) {
      return { isAuthorized: false, message: `Unauthorized: You do not have access to class ${targetClass}.` };
    }

    const isTheology = role === 'Theology Instructor' || (profile.subject?.toLowerCase().includes('theology'));
    const myDepartment: Department = isTheology ? 'theology' : 'secular';

    if (targetDepartment && targetDepartment !== myDepartment) {
      return { isAuthorized: false, message: `Unauthorized: You only have access to the ${myDepartment} department.` };
    }

    // If they didn't specify a target class, we authorize but return their assigned classes so the endpoint can filter.
    return { isAuthorized: true, role, filterByClasses: assignedClasses, filterByDepartment: myDepartment };
  }

  // Fail closed for any unrecognized role
  return { isAuthorized: false, message: `Unauthorized: Unrecognized role '${role}'.` };
}

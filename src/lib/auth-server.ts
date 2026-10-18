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
    .select('id, role, subject, classes, status')
    .eq('email', user.email)
    .single();

  if (!profile) {
    return { isAuthorized: false, message: 'User profile not found in teachers directory.' };
  }

  // Reject inactive / suspended accounts immediately
  if (profile.status === 'inactive') {
    return { isAuthorized: false, message: 'Account is suspended or inactive.' };
  }

  const role = profile.role as string;
  
  // 1. Administrator
  if (role === 'Administrator' || role === 'admin') {
    return { isAuthorized: true, role };
  }

  // 2. Head Teacher & Deputy Head Teacher (including HM alias)
  if (role === 'Head Teacher' || role === 'Deputy Head Teacher' || role === 'HM') {
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

  // 4. DOS (Director of Studies)
  if (role === 'DOS Secular' || role === 'DOS Theology' || role === 'DOS') {
    let myDepartment: Department = 'secular';
    const sub = profile.subject?.toLowerCase() || '';

    if (role === 'DOS Theology' || (role === 'DOS' && sub.includes('theology'))) {
      myDepartment = 'theology';
    } else if (role === 'DOS' && (!profile.subject || sub.includes('both') || sub.includes('all'))) {
      myDepartment = 'both';
    }

    if (targetDepartment && myDepartment !== 'both' && targetDepartment !== myDepartment) {
      return { isAuthorized: false, message: `Unauthorized: You only have access to the ${myDepartment} department.` };
    }

    return { isAuthorized: true, role, filterByDepartment: myDepartment };
  }

  // 5. Class Teacher, Theology Instructor, Teacher
  if (role === 'Class Teacher' || role === 'Theology Instructor' || role === 'Teacher') {
    // Resolve assigned class IDs from teacher_class_assignments junction table and legacy columns
    const { data: assignments } = await supabase
      .from('teacher_class_assignments')
      .select('class_id')
      .eq('teacher_id', profile.id);

    const { data: circularClasses } = await supabase
      .from('circular_classes')
      .select('id')
      .eq('class_teacher_id', profile.id);

    const classIdsFromAssignments = (assignments || []).map((a: any) => a.class_id);
    const classIdsFromCircular = (circularClasses || []).map((c: any) => c.id);
    const assignedClasses: string[] = Array.from(new Set([
      ...(profile.classes || []),
      ...classIdsFromAssignments,
      ...classIdsFromCircular
    ]));
    
    if (targetClass && !assignedClasses.includes(targetClass)) {
      return { isAuthorized: false, message: `Unauthorized: You do not have access to class ${targetClass}.` };
    }

    // Class Teachers oversee both circular and theology for their assigned cohort.
    // Theology Instructors specialize strictly in theology.
    // Standard Teachers specialize strictly in secular curriculum.
    let myDepartment: Department = 'secular';
    if (role === 'Class Teacher') {
      myDepartment = 'both';
    } else if (role === 'Theology Instructor' || (profile.subject?.toLowerCase().includes('theology'))) {
      myDepartment = 'theology';
    }

    if (targetDepartment && myDepartment !== 'both' && targetDepartment !== myDepartment) {
      return { isAuthorized: false, message: `Unauthorized: You only have access to the ${myDepartment} department.` };
    }

    // If they didn't specify a target class, we authorize but return their assigned classes so the endpoint can filter.
    return { isAuthorized: true, role, filterByClasses: assignedClasses, filterByDepartment: myDepartment };
  }

  // Fail closed for any unrecognized role
  return { isAuthorized: false, message: `Unauthorized: Unrecognized role '${role}'.` };
}

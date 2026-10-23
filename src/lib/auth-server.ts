import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createAdminClient } from '@/utils/supabase/server'
import { canAccessCurriculumClass, resolveTeacherIdentity } from '@/lib/teacher-access-scope'
export { canAccessCurriculumClass, resolveTeacherIdentity } from '@/lib/teacher-access-scope'

export type ActionType = 'read' | 'write'
export type Department = 'secular' | 'theology' | 'both'

export interface AuthAccessResult {
  isAuthorized: boolean
  message?: string
  filterByDepartment?: Department
  filterByClasses?: string[]
  filterByCircularClasses?: string[]
  filterByTheologyClasses?: string[]
  role?: string
}

const denied = (message: string): AuthAccessResult => ({
  isAuthorized: false,
  message,
})

const uniqueIds = (values: unknown[]) =>
  [...new Set(values.filter((value): value is string => typeof value === 'string' && value.length > 0))]

export async function verifyDataAccess(
  _supabase: SupabaseClient,
  user: User,
  action: ActionType,
  targetClass?: string | null,
  targetDepartment?: Department | null
): Promise<AuthAccessResult> {
  const admin = createAdminClient()
  const { data: profiles, error: profileError } = await admin
    .from('teachers')
    .select('id, auth_user_id, role, subject, status')
    .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)

  if (profileError) {
    console.error('Teacher identity lookup failed:', profileError.message)
    return denied('Unable to verify staff identity.')
  }

  const profile = resolveTeacherIdentity(profiles, user.id)
  if (!profile) {
    return denied('User profile was not found or is ambiguous.')
  }

  const role = typeof profile.role === 'string' ? profile.role.trim() : ''
  const normalizedRole = role.toLowerCase()

  if (normalizedRole === 'administrator' || normalizedRole === 'admin') {
    return { isAuthorized: true, role }
  }

  if (['head teacher', 'deputy head teacher', 'hm'].includes(normalizedRole)) {
    if (action === 'write') {
      return denied('Unauthorized: Read-only access across departments.')
    }
    return { isAuthorized: true, role, filterByDepartment: 'both' }
  }

  if (normalizedRole === 'support staff') {
    return denied('Unauthorized: Support Staff do not have access to academic records.')
  }

  let department: Department | undefined
  if (['dos secular', 'dos theology', 'dos'].includes(normalizedRole)) {
    const subject = typeof profile.subject === 'string' ? profile.subject.toLowerCase() : ''
    department = normalizedRole === 'dos theology' || (normalizedRole === 'dos' && subject.includes('theology'))
      ? 'theology'
      : 'secular'
    if (normalizedRole === 'dos' && ['both', 'all'].includes(subject.trim())) {
      department = 'both'
    }
    if (targetDepartment && department !== 'both' && targetDepartment !== department) {
      return denied(`Unauthorized: You only have access to the ${department} department.`)
    }
    return { isAuthorized: true, role, filterByDepartment: department }
  }

  if (!['class teacher', 'theology instructor', 'teacher'].includes(normalizedRole)) {
    return denied(`Unauthorized: Unrecognized role '${role}'.`)
  }

  const [{ data: assignments, error: assignmentError }, { data: homerooms, error: homeroomError }] =
    await Promise.all([
      admin
        .from('teacher_class_assignments')
        .select('class_id, class_type')
        .eq('teacher_id', profile.id),
      admin
        .from('circular_classes')
        .select('id')
        .eq('class_teacher_id', profile.id),
    ])

  if (assignmentError || homeroomError) {
    console.error(
      'Teacher assignment lookup failed:',
      assignmentError?.message ?? homeroomError?.message
    )
    return denied('Unable to verify class assignments.')
  }

  const classAssignments = assignments ?? []
  const assignedCircular = uniqueIds([
    ...classAssignments
      .filter((row) => ['circular', 'secular'].includes(String(row.class_type).toLowerCase()))
      .map((row) => row.class_id),
    ...(homerooms ?? []).map((row) => row.id),
  ])
  const assignedTheology = uniqueIds(
    classAssignments
      .filter((row) => String(row.class_type).toLowerCase() === 'theology')
      .map((row) => row.class_id)
  )

  const profileSubject = typeof profile.subject === 'string' ? profile.subject.toLowerCase() : ''
  const theologyOnly = normalizedRole === 'theology instructor' ||
    (normalizedRole === 'teacher' && profileSubject.includes('theology'))
  const circularOnly = normalizedRole === 'teacher' && !theologyOnly
  const circularClasses = theologyOnly ? [] : assignedCircular
  const theologyClasses = circularOnly ? [] : assignedTheology
  const classes = uniqueIds([...circularClasses, ...theologyClasses])

  if (targetDepartment && targetDepartment !== 'both') {
    const departmentClasses = targetDepartment === 'theology' ? theologyClasses : circularClasses
    if (targetClass && !departmentClasses.includes(targetClass)) {
      return denied(`Unauthorized: You do not have access to class ${targetClass}.`)
    }
  } else if (targetClass && !classes.includes(targetClass)) {
    return denied(`Unauthorized: You do not have access to class ${targetClass}.`)
  }

  return {
    isAuthorized: true,
    role,
    filterByDepartment: theologyOnly ? 'theology' : circularOnly ? 'secular' : undefined,
    filterByClasses: classes,
    filterByCircularClasses: circularClasses,
    filterByTheologyClasses: theologyClasses,
  }
}

export type ClassCurriculum = 'circular' | 'theology'

export interface ClassScope {
  isAuthorized: boolean
  role?: string
  filterByDepartment?: 'secular' | 'theology' | 'both'
  filterByCircularClasses?: string[]
  filterByTheologyClasses?: string[]
}

export interface TeacherIdentity {
  id: string
  auth_user_id: string | null
  status?: string | null
  role?: string | null
  subject?: string | null
}

export function resolveTeacherIdentity(
  profiles: TeacherIdentity[] | null,
  authUserId: string
): TeacherIdentity | null {
  if (!profiles || profiles.length !== 1) return null
  const profile = profiles[0]
  if (profile.auth_user_id !== authUserId && profile.id !== authUserId) return null
  if (profile.status != null && profile.status.trim().toLowerCase() !== 'active') return null
  return profile
}

export function canAccessCurriculumClass(
  access: ClassScope,
  curriculum: ClassCurriculum,
  classId: string | null | undefined
): boolean {
  if (!access.isAuthorized || !classId) return false
  if (['administrator', 'admin'].includes(access.role?.toLowerCase() ?? '')) return true

  if (
    access.filterByDepartment &&
    access.filterByDepartment !== 'both' &&
    access.filterByDepartment !== curriculum
  ) {
    return false
  }

  const role = access.role?.trim().toLowerCase()
  if (['head teacher', 'deputy head teacher', 'hm', 'dos secular', 'dos theology', 'dos'].includes(role ?? '')) {
    return access.filterByDepartment === 'both' || access.filterByDepartment === curriculum
  }

  const assigned = curriculum === 'theology'
    ? access.filterByTheologyClasses
    : access.filterByCircularClasses

  return Array.isArray(assigned) && assigned.includes(classId)
}

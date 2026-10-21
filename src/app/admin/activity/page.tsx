import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import ActivityClient from '@/components/layout/activity-client'
import { verifyDataAccess } from '@/lib/auth-server'
import { isAdministratorRole } from '@/lib/teacher-access'

export const dynamic = 'force-dynamic'

function parseMetadata(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'object') return value as Record<string, unknown>
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }
  return {}
}

export default async function ActivityPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="p-10">Unauthorized</div>

  const authRes = await verifyDataAccess(supabase, user, 'read')
  if (!authRes.isAuthorized) {
    return <div className="p-10 text-rose-600">Access Denied: {authRes.message}</div>
  }

  // Fetch from both `activity_logs` (primary audit stream) and legacy `activity_log` in parallel
  const [logsPluralRes, logsSingularRes, teachersRes] = await Promise.all([
    supabase
      .from('activity_logs')
      .select('id, user_id, action, metadata, details, created_at')
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('activity_log')
      .select('id, teacher_id, action_type, description, target_table, metadata, created_at, teachers!activity_log_teacher_id_fkey(name, email, role, subject)')
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('teachers')
      .select('id, auth_user_id, name, email, role, subject'),
  ])

  const teacherMap = new Map<string, { name: string; role: string; subject: string }>()
  for (const t of teachersRes.data ?? []) {
    const info = {
      name: t.name || t.email || 'Staff Member',
      role: t.role || 'Staff',
      subject: t.subject || '',
    }
    if (t.id) teacherMap.set(t.id, info)
    if (t.auth_user_id) teacherMap.set(t.auth_user_id, info)
  }

  const isAdmin = isAdministratorRole(authRes.role)

  const pluralActivities = (logsPluralRes.data ?? []).map((item: any) => {
    const meta = parseMetadata(item.metadata ?? item.details)
    const actor = teacherMap.get(item.user_id)
    const action = String(item.action ?? 'System Activity')
    const entityType = String(meta.target_table || meta.curriculum || 'system')
    const entityLabel = String(
      meta.description ||
        meta.class_name ||
        meta.name ||
        (meta.notificationId ? `Notification #${meta.notificationId}` : action)
    )
    return {
      id: `al-${item.id}`,
      user_name: actor ? `${actor.name} (${actor.role})` : 'Administrator / System',
      action,
      entity_label: entityLabel,
      entity_type: entityType,
      created_at: item.created_at ?? new Date().toISOString(),
      department: actor?.subject?.toLowerCase().includes('theology') ? 'theology' : 'secular',
    }
  })

  const singularActivities = (logsSingularRes.data ?? []).map((item: any) => {
    const action = String(item.action_type ?? 'Activity')
    const entityType = item.target_table || 'system'
    const entityLabel = String(item.description || action)
    const teacherName = item.teachers?.name || item.teachers?.email || 'System'
    const teacherRole = item.teachers?.role ? ` (${item.teachers.role})` : ''

    return {
      id: `leg-${item.id}`,
      user_name: `${teacherName}${teacherRole}`,
      action,
      entity_label: entityLabel,
      entity_type: entityType,
      created_at: item.created_at ?? new Date().toISOString(),
      department: item.teachers?.subject?.toLowerCase()?.includes('theology') ? 'theology' : 'secular',
    }
  })

  const merged = [...pluralActivities, ...singularActivities]
    .filter((entry) => {
      // Administrator and Head Teacher see 100% of all activity across all accounts
      if (isAdmin || authRes.filterByDepartment === 'both' || !authRes.filterByDepartment) {
        return true
      }
      // Department DOS sees activity relevant to their department
      return entry.department === authRes.filterByDepartment || entry.entity_type === 'system'
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 150)

  return (
    <div className="w-full h-full bg-[#FDFBF7] dark:bg-stone-950">
      <ActivityClient initialActivities={merged} />
    </div>
  )
}

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import ActivityClient from '@/components/layout/activity-client'
import { verifyDataAccess } from '@/lib/auth-server'

export const dynamic = "force-dynamic";

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

  const authRes = await verifyDataAccess(supabase, user, 'read');
  if (!authRes.isAuthorized) {
    return <div className="p-10 text-red-500">Access Denied: {authRes.message}</div>
  }

  // Activity logs are online-only and admin visible
  const { data, error } = await supabase
    .from('activity_log')
    .select('id, teacher_id, action_type, description, target_table, metadata, created_at, teachers!activity_log_teacher_id_fkey(name, email)')
    .order('created_at', { ascending: false })
    .limit(100)

  const activities = (data ?? []).map((item: any) => {
    const metadata = parseMetadata(item.metadata)
    const action = String(item.action_type ?? 'Activity')
    const entityType = item.target_table || 'system'
    const entityLabel = String(item.description || action)
    const teacherName = item.teachers?.name || item.teachers?.email || 'System'

    return {
      id: String(item.id),
      user_name: String(teacherName),
      action,
      entity_label: entityLabel,
      entity_type: entityType,
      created_at: item.created_at ?? new Date().toISOString(),
    }
  })

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-[#0f172a]">
      <ActivityClient initialActivities={activities} />
    </div>
  )
}

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import ActivityClient from '@/components/layout/activity-client'
import { getAuthenticatedUser } from '@/lib/api-server'

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

function getEntityType(action: string, metadata: Record<string, unknown>) {
  if (action.includes('student') || metadata.student) return 'student'
  if (action.includes('mark') || action.includes('marks')) return 'marks'
  if (action.includes('teacher') || metadata.teacher) return 'teacher'
  if (action.includes('report') || metadata.report) return 'report'
  if (action.includes('notification') || metadata.notification) return 'notification'
  return 'system'
}

export default async function ActivityPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, user_id, action, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  const activities = (data ?? []).map((item: any) => {
    const metadata = parseMetadata(item.metadata)
    const action = String(item.action ?? 'Activity')
    const entityType = getEntityType(action, metadata)
    const entityLabel =
      String(metadata.entity_label ?? metadata.teacher ?? metadata.class ?? metadata.report ?? action)

    return {
      id: String(item.id),
      user_name: String(metadata.user_name ?? item.user_id ?? 'System'),
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

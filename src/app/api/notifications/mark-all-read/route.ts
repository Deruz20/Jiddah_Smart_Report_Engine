import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, recordActivity } from '@/lib/api-server'

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function POST(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    // 1. Mark all private notifications for this user as read
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', user.id)
      .eq('read', false)

    if (error) {
      console.error('mark-all-read error:', error.message)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    // 2. Record mark_all_notifications_read event in activity_logs for this user
    await recordActivity(supabase, user.id, 'mark_all_notifications_read', {
      readAt: new Date().toISOString(),
    })

    return withCors(request, NextResponse.json({ success: true }))
  } catch (err: any) {
    console.error('mark-all-read exception:', err)
    return withCors(
      request,
      NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    )
  }
}

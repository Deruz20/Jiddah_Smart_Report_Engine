import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser } from '@/lib/api-server'

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    // 1. Count private unread notifications for this specific user
    const { count: privateUnread, error: privErr } = await supabase
      .from('notifications')
      .select('id', { head: true, count: 'exact' })
      .eq('read', false)
      .eq('recipient_id', user.id)

    // 2. Fetch unread broadcast notifications
    const { data: broadcastNotifs, error: bcastErr } = await supabase
      .from('notifications')
      .select('id, created_at')
      .is('recipient_id', null)
      .limit(100)

    if (privErr || bcastErr) {
      const msg = privErr?.message || bcastErr?.message || 'Database error'
      console.error('notifications unread-count error:', msg)
      return withCors(request, NextResponse.json({ error: msg }, { status: 500 }))
    }

    // 3. Filter broadcast notifications by user's activity log read records
    const { data: userLogs } = await supabase
      .from('activity_logs')
      .select('action, metadata, created_at')
      .eq('user_id', user.id)
      .in('action', ['mark_notification_read', 'mark_all_notifications_read'])
      .order('created_at', { ascending: false })
      .limit(200)

    const readBroadcastIds = new Set<string>()
    let markAllReadTimestamp: number | null = null

    if (userLogs) {
      for (const log of userLogs) {
        if (log.action === 'mark_all_notifications_read') {
          let t = log.created_at ? new Date(log.created_at).getTime() : 0
          try {
            const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
            if (meta?.readAt) t = Math.max(t, new Date(meta.readAt).getTime())
          } catch {}
          if (!markAllReadTimestamp || t > markAllReadTimestamp) {
            markAllReadTimestamp = t
          }
        } else if (log.action === 'mark_notification_read') {
          try {
            const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
            if (meta?.notificationId != null) {
              readBroadcastIds.add(String(meta.notificationId))
            }
          } catch {}
        }
      }
    }

    let unreadBroadcastCount = 0
    for (const b of (broadcastNotifs ?? [])) {
      const bId = String(b.id)
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      const isRead = readBroadcastIds.has(bId) || (markAllReadTimestamp !== null && bTime <= markAllReadTimestamp)
      if (!isRead) {
        unreadBroadcastCount++
      }
    }

    const totalUnread = (privateUnread ?? 0) + unreadBroadcastCount
    return withCors(request, NextResponse.json({ count: totalUnread }))
  } catch (err: any) {
    console.error('notifications unread-count exception:', err)
    return withCors(
      request,
      NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    )
  }
}

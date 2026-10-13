import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, isNumericId, recordActivity } from '@/lib/api-server'

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  const notificationId = params?.id
  if (!notificationId) {
    return withCors(request, NextResponse.json({ error: 'Invalid notification ID' }, { status: 400 }))
  }

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const idValue = isNumericId(notificationId) ? Number(notificationId) : notificationId

    // 1. Verify notification exists and is accessible to caller
    const { data: targetNotification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, recipient_id')
      .eq('id', idValue)
      .or(`recipient_id.is.null,recipient_id.eq.${user.id}`)
      .maybeSingle()

    if (fetchError) {
      console.error('notification mark-read fetch error:', fetchError.message)
      return withCors(request, NextResponse.json({ error: fetchError.message }, { status: 500 }))
    }

    if (!targetNotification) {
      return withCors(request, NextResponse.json({ error: 'Notification not found' }, { status: 404 }))
    }

    // 2. Private notification: mutate read = true on the user's specific row
    if (targetNotification.recipient_id === user.id) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', idValue)
        .eq('recipient_id', user.id)

      if (updateError) {
        console.error('notification mark-read error:', updateError.message)
        return withCors(request, NextResponse.json({ error: updateError.message }, { status: 500 }))
      }
    }

    // 3. For broadcast notifications (recipient_id is null), do NOT mutate the shared row.
    // Recording the event in activity_logs tracks this user's read state without corrupting other users.
    await recordActivity(supabase, user.id, 'mark_notification_read', {
      notificationId: idValue,
    })

    return withCors(request, NextResponse.json({ success: true }))
  } catch (err: any) {
    console.error('notification mark-read exception:', err)
    return withCors(
      request,
      NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context)
}

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, recordActivity } from '@/lib/api-server'

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

    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100)

    if (user?.id) {
      query = query.or(`recipient_id.is.null,recipient_id.eq.${user.id}`)
    }

    const { data, error } = await query
    if (error) {
      console.error('notifications GET error:', error.message)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    const notifications = (data ?? []).map((notification: any) => ({
      id: notification.id,
      title: notification.title || '',
      message: notification.message || '',
      time: notification.time || notification.created_at || '',
      read: Boolean(notification.read),
      priority: notification.priority || 'normal',
      type: notification.type || 'info',
    }))

    if (user?.id) {
      await recordActivity(supabase, user.id, 'view_notifications', {
        count: notifications.length,
      })
    }

    return withCors(request, NextResponse.json({ data: notifications }))
  } catch (err: any) {
    console.error('notifications GET exception:', err)
    return withCors(
      request,
      NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    )
  }
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

    const body = await request.json()
    const title = typeof body?.title === 'string' ? body.title.trim() : ''
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    const priority = ['high', 'medium', 'normal'].includes(body?.priority) ? body.priority : 'normal'
    const type = typeof body?.type === 'string' ? body.type.trim() : 'info'
    const recipientId = body?.recipient_id || null

    if (!title || !message) {
      return withCors(request, NextResponse.json({ error: 'Title and message are required' }, { status: 400 }))
    }

    // Role verification: Ordinary staff cannot broadcast or spoof notifications to other users
    const { data: callerProfile } = await supabase
      .from('teachers')
      .select('role')
      .eq('email', user.email)
      .single()

    const callerRole = callerProfile?.role || ''
    const isPrivileged = [
      'Administrator',
      'admin',
      'Head Teacher',
      'HM',
      'Deputy Head Teacher',
      'DOS',
      'DOS Secular',
      'DOS Theology',
    ].includes(callerRole)

    if (!isPrivileged && (recipientId === null || recipientId !== user.id)) {
      return withCors(
        request,
        NextResponse.json(
          { error: 'Forbidden: Ordinary users cannot send broadcast or cross-user notifications' },
          { status: 403 }
        )
      )
    }

    // Deduplication check: avoid exact duplicate notification (same title AND message AND recipient) within last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    let dupQuery = supabase
      .from('notifications')
      .select('id')
      .eq('title', title)
      .eq('message', message)
      .gte('created_at', fiveMinutesAgo)

    if (recipientId) {
      dupQuery = dupQuery.eq('recipient_id', recipientId)
    } else {
      dupQuery = dupQuery.is('recipient_id', null)
    }

    const { data: existingDup } = await dupQuery.limit(1)
    if (existingDup && existingDup.length > 0) {
      return withCors(request, NextResponse.json({ success: true, deduplicated: true, id: existingDup[0].id }))
    }

    const insertData: any = {
      title,
      message,
      priority,
      type,
      recipient_id: recipientId,
      read: false,
      created_at: new Date().toISOString()
    }

    const { data, error } = await supabase.from('notifications').insert([insertData]).select()
    if (error) {
      console.error('notifications POST error:', error.message)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    return withCors(request, NextResponse.json({ success: true, data: data?.[0] }, { status: 201 }))
  } catch (err: any) {
    console.error('notifications POST exception:', err)
    return withCors(
      request,
      NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    )
  }
}

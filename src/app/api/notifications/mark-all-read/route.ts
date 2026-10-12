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

    let query = supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString(), read_by: user.id })
      .eq('read', false)

    if (user.id) {
      query = query.or(`recipient_id.is.null,recipient_id.eq.${user.id}`)
    }

    const { error } = await query

    if (error) {
      console.error('mark-all-read error:', error.message)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    await recordActivity(supabase, user.id, 'mark_all_notifications_read', {})

    return withCors(request, NextResponse.json({ success: true }))
  } catch (err: any) {
    console.error('mark-all-read exception:', err)
    return withCors(
      request,
      NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
    )
  }
}

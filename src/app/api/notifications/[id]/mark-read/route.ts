import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser } from '@/lib/api-server'
import { markNotificationReadForUser } from '@/lib/notifications'

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

    const result = await markNotificationReadForUser(supabase, user.id, notificationId)
    return withCors(request, NextResponse.json(result.body, { status: result.status }))
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

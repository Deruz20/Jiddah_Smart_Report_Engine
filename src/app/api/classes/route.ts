import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { classIdsForType } from '@/lib/teacher-access'

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { verifyDataAccess } = await import('@/lib/auth-server')
    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    const allowedClassIds = classIdsForType(authRes, 'circular')
    if (allowedClassIds !== null && allowedClassIds.length === 0) {
      return withCors(request, NextResponse.json({ data: [] }))
    }

    let query = supabase
      .from('circular_classes')
      .select('id, class_name, section')
      .order('section', { ascending: true })
      .order('class_name', { ascending: true })

    if (allowedClassIds !== null) {
      const validUuids = allowedClassIds.filter((c: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c));
      if (validUuids.length === 0) {
        return withCors(request, NextResponse.json({ data: [] }))
      }
      query = query.in('id', validUuids)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    return withCors(request, NextResponse.json({ data }))
  } catch (err) {
    console.error('API error:', err)
    return withCors(request, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export async function POST(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const body = await request.json()

    if (!body.class_name || !body.section) {
      return withCors(request, NextResponse.json({ error: 'Class name and section are required' }, { status: 400 }))
    }

    const validSections = ['nursery', 'lower_primary', 'upper_primary']
    if (!validSections.includes(body.section)) {
      return withCors(request, NextResponse.json({ error: 'Invalid section' }, { status: 400 }))
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: existingClasses } = await supabase
      .from('circular_classes')
      .select('id')
      .eq('class_name', body.class_name.trim())

    if (existingClasses && existingClasses.length > 0) {
      return withCors(
        request,
        NextResponse.json({ error: `Class "${body.class_name}" already exists` }, { status: 409 })
      )
    }

    const insertData = {
      class_name: body.class_name.trim(),
      section: body.section,
    }

    const { data, error } = await supabase.from('circular_classes').insert([insertData]).select()

    if (error) {
      console.error('Supabase error:', error)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    return withCors(request, NextResponse.json({ data }, { status: 201 }))
  } catch (err) {
    console.error('API error:', err)
    return withCors(
      request,
      NextResponse.json(
        { error: err instanceof Error ? err.message : 'Internal server error' },
        { status: 500 }
      )
    )
  }
}

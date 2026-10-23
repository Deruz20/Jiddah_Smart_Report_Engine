import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess } from '@/lib/auth-server'

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const access = await verifyDataAccess(supabase, user, 'read')
    if (!access.isAuthorized) {
      return withCors(request, NextResponse.json({ error: access.message }, { status: 403 }))
    }
    if (access.filterByDepartment === 'secular') {
      return withCors(request, NextResponse.json({ data: [] }))
    }

    const supabaseAdmin = createAdminClient()
    let query = supabaseAdmin
      .from('theology_classes')
      .select('id, class_name_arabic, class_name_english, level')
    if (access.filterByTheologyClasses) {
      if (access.filterByTheologyClasses.length === 0) {
        return withCors(request, NextResponse.json({ data: [] }))
      }
      query = query.in('id', access.filterByTheologyClasses)
    }

    const { data, error } = await query
      .order('level', { ascending: true })
      .order('class_name_arabic', { ascending: true })

    if (error) {
      console.error('theology_classes DB error:', error.message)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    return withCors(request, NextResponse.json({ data }))
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

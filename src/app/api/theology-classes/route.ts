import { createClient as createServerClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess } from '@/lib/auth-server'
import { classIdsForType } from '@/lib/teacher-access'

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)

    // Check for user session (via cookie or Bearer token)
    let user = null
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data: userData } = await supabase.auth.getUser(token)
      user = userData?.user || null
    } else {
      const { data: userData } = await supabase.auth.getUser()
      user = userData?.user || null
    }

    if (!user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    let allowedTheologyClassIds: string[] | null = null
    if (authRes.filterByClasses) {
      const assignedTheology = classIdsForType(authRes, 'theology') ?? []
      const assignedCircular = classIdsForType(authRes, 'circular') ?? []
      const cohortIds: string[] = []
      if (assignedCircular.length > 0) {
        const { data: cohortEnrollments, error: cohortError } = await supabase
          .from('enrollments')
          .select('theology_class_id')
          .in('circular_class_id', assignedCircular)
          .not('theology_class_id', 'is', null)

        if (cohortError) {
          console.error('theology-classes enrollment lookup error:', cohortError.message)
          return withCors(request, NextResponse.json({ error: cohortError.message }, { status: 500 }))
        }
        cohortIds.push(...(cohortEnrollments ?? []).map((row) => row.theology_class_id).filter(Boolean))
      }
      allowedTheologyClassIds = Array.from(new Set([...assignedTheology, ...cohortIds]))
    } else if (authRes.filterByDepartment === 'secular') {
      allowedTheologyClassIds = []
    }

    let query = supabase
      .from('theology_classes')
      .select('id, class_name_arabic, class_name_english, level')
      .order('level', { ascending: true })
      .order('class_name_arabic', { ascending: true })

    if (allowedTheologyClassIds !== null && allowedTheologyClassIds.length === 0) {
      return withCors(request, NextResponse.json({ data: [] }))
    }
    if (allowedTheologyClassIds !== null) {
      query = query.in('id', allowedTheologyClassIds)
    }

    const { data, error } = await query

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

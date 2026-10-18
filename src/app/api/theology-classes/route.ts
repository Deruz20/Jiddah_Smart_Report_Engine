import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess } from '@/lib/auth-server'
import { getSupabaseAnonKey } from '@/lib/supabase-env'

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = getSupabaseAnonKey()

    if (!supabaseUrl || !supabaseKey) {
      return withCors(request, NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 }))
    }

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

    let allowedTheologyClassIds: string[] | null = null

    if (user) {
      const authRes = await verifyDataAccess(supabase, user, 'read')
      if (!authRes.isAuthorized) {
        return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
      }

      if (authRes.filterByClasses) {
        const assignedClasses = authRes.filterByClasses

        // 1. Direct assignments to theology classes
        const { data: directTheology } = await supabase
          .from('teacher_class_assignments')
          .select('class_id')
          .eq('class_type', 'theology')
          .in('class_id', assignedClasses)

        const directIds = (directTheology || []).map((t: any) => t.class_id)

        // 2. Cohort assignments: theology classes enrolled by students in the teacher's circular class(es)
        const { data: cohortEnrollments } = await supabase
          .from('enrollments')
          .select('theology_class_id')
          .in('circular_class_id', assignedClasses)
          .not('theology_class_id', 'is', null)

        const cohortIds = (cohortEnrollments || []).map((e: any) => e.theology_class_id).filter(Boolean)

        allowedTheologyClassIds = Array.from(new Set([...directIds, ...cohortIds]))
      }
    }

    let query = supabase
      .from('theology_classes')
      .select('id, class_name_arabic, class_name_english, level')
      .order('level', { ascending: true })
      .order('class_name_arabic', { ascending: true })

    if (allowedTheologyClassIds !== null) {
      if (allowedTheologyClassIds.length > 0) {
        query = query.in('id', allowedTheologyClassIds)
      } else {
        query = query.eq('id', '00000000-0000-0000-0000-000000000000')
      }
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

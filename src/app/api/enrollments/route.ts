import { reshapeEnrollmentRow } from '@/lib/enrollment-shape'
import { createClient } from '@/utils/supabase/server'
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
      return withCors(request, NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'read');
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    let query = supabase
      .from('enrollments')
      .select(`
        id,
        academic_year,
        is_active,
        circular_classes ( id, class_name, section ),
        theology_classes ( id, class_name_arabic, class_name_english, level ),
        students ( id, name, admission_number, created_at )
      `)
      .eq('is_active', true)
      .order('academic_year', { ascending: false })

    if (authRes.filterByClasses) {
      const assignedClasses = authRes.filterByClasses;
      if (assignedClasses.length > 0) {
        query = query.in('circular_class_id', assignedClasses)
      } else {
        query = query.eq('circular_class_id', 'UNASSIGNED_DUMMY_VALUE')
      }
    } else if (authRes.filterByDepartment) {
      if (authRes.filterByDepartment === 'theology') {
        query = query.not('theology_class_id', 'is', null)
      } else if (authRes.filterByDepartment === 'secular') {
        query = query.not('circular_class_id', 'is', null)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return withCors(request, NextResponse.json({ error: error.message }, { status: 500 }))
    }

    const reshaped =
      data?.map((e) => reshapeEnrollmentRow(e)).filter((row): row is NonNullable<typeof row> => row != null) ?? []

    return withCors(request, NextResponse.json(reshaped))
  } catch (err) {
    console.error('API error:', err)
    return withCors(request, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
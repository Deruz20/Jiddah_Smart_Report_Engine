import { reshapeEnrollmentRow } from '@/lib/enrollment-shape'
import { createClient } from '@/utils/supabase/server'
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
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    let query = supabase
      .from('enrollments')
      .select(`
        id,
        academic_year,
        is_active,
        circular_class_id,
        theology_class_id,
        circular_classes ( id, class_name, section ),
        theology_classes ( id, class_name_arabic, class_name_english, level ),
        students!inner ( id, name, admission_number, created_at, arabic_name, is_archived )
      `)
      .eq('is_active', true)
      .order('academic_year', { ascending: false })

    if (authRes.filterByClasses) {
      const circularClassIds = classIdsForType(authRes, 'circular') ?? []
      const theologyClassIds = classIdsForType(authRes, 'theology') ?? []
      const validUuid = (id: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      const filters = [
        ...(circularClassIds.filter(validUuid).length
          ? [`circular_class_id.in.(${circularClassIds.filter(validUuid).join(',')})`]
          : []),
        ...(theologyClassIds.filter(validUuid).length
          ? [`theology_class_id.in.(${theologyClassIds.filter(validUuid).join(',')})`]
          : []),
      ]
      if (filters.length === 0) {
        return withCors(request, NextResponse.json([]))
      }
      query = query.or(filters.join(','))
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

    const activeRows = (data ?? []).filter((row: any) => {
      const studentObj = Array.isArray(row.students) ? row.students[0] : row.students
      return studentObj?.is_archived !== true
    })

    const reshaped =
      activeRows.map((e) => reshapeEnrollmentRow(e)).filter((row): row is NonNullable<typeof row> => row != null) ?? []

    return withCors(request, NextResponse.json(reshaped))
  } catch (err) {
    console.error('API error:', err)
    return withCors(request, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

import { reshapeEnrollmentRow } from '@/lib/enrollment-shape'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess, hasPermission } from '@/lib/auth-server'
import { classIdsForType } from '@/lib/teacher-access'
import { resolveCurrentSchoolId, applyTenantScope } from '@/lib/tenant-context'

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
    if (!authRes.isAuthorized || !hasPermission(authRes, 'read_students')) {
      return withCors(
        request,
        NextResponse.json({ error: authRes.message || 'Forbidden: Insufficient permissions to read enrollments.' }, { status: 403 })
      )
    }

    const { searchParams } = new URL(request.url)
    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')
    const searchParam = searchParams.get('search')?.trim()
    const classIdParam = searchParams.get('class_id')

    const isPaginated = pageParam !== null || limitParam !== null
    const page = Math.max(1, parseInt(pageParam || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(limitParam || '20', 10)))
    const from = (page - 1) * limit
    const to = from + limit - 1

    const schoolId = await resolveCurrentSchoolId(supabase, user, request)

    let selectOptions: { count?: 'exact' } = {}
    if (isPaginated) {
      selectOptions = { count: 'exact' }
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
        students!inner ( id, name, admission_number, created_at, arabic_name, is_archived, is_muslim )
      `, selectOptions)
      .eq('is_active', true)
      .order('academic_year', { ascending: false })

    query = applyTenantScope(query, schoolId)

    if (searchParam) {
      query = query.or(`students.name.ilike.%${searchParam}%,students.admission_number.ilike.%${searchParam}%`)
    }

    if (classIdParam && classIdParam !== 'all') {
      query = query.or(`circular_class_id.eq.${classIdParam},theology_class_id.eq.${classIdParam}`)
    }

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
        return withCors(request, NextResponse.json(isPaginated ? { data: [], pagination: { page, limit, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false } } : []))
      }
      query = query.or(filters.join(','))
    } else if (authRes.filterByDepartment) {
      if (authRes.filterByDepartment === 'theology') {
        query = query.not('theology_class_id', 'is', null)
      } else if (authRes.filterByDepartment === 'secular') {
        query = query.not('circular_class_id', 'is', null)
      }
    }

    if (isPaginated) {
      query = query.range(from, to)
    }

    const { data, count, error } = await query

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

    if (isPaginated) {
      const total = count ?? reshaped.length
      const totalPages = Math.max(1, Math.ceil(total / limit))
      return withCors(request, NextResponse.json({
        data: reshaped,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        }
      }))
    }

    return withCors(request, NextResponse.json(reshaped))
  } catch (err) {
    console.error('API error:', err)
    return withCors(request, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

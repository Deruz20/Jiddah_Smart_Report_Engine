import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess, resolveUserScope } from '@/lib/auth-server'
import { classIdsForType } from '@/lib/teacher-access'

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request) ?? new NextResponse(null, { status: 204 })
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 }))
    }

    const access = await verifyDataAccess(supabase, user, 'read')
    if (!access.isAuthorized) {
      return withCors(request, NextResponse.json({ error: access.message || 'Forbidden', code: 'FORBIDDEN' }, { status: 403 }))
    }

    const scope = resolveUserScope(access)
    const allowedCirc = classIdsForType(access, 'circular')
    const allowedTheo = classIdsForType(access, 'theology')
    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    let enrollQuery = supabase.from('enrollments').select('id, circular_class_id, theology_class_id', { count: 'exact' }).eq('is_active', true)
    let classQuery = supabase.from('circular_classes').select('id, class_name, section')

    if (allowedCirc !== null || allowedTheo !== null) {
      const validCirc = (allowedCirc || []).filter(isUuid)
      const validTheo = (allowedTheo || []).filter(isUuid)
      const orParts = [
        ...(validCirc.length ? [`circular_class_id.in.(${validCirc.join(',')})`] : []),
        ...(validTheo.length ? [`theology_class_id.in.(${validTheo.join(',')})`] : []),
      ]
      if (orParts.length > 0) {
        enrollQuery = enrollQuery.or(orParts.join(','))
      } else {
        enrollQuery = enrollQuery.eq('circular_class_id', '00000000-0000-0000-0000-000000000000')
      }

      if (validCirc.length > 0) {
        classQuery = classQuery.in('id', validCirc)
      } else if (allowedCirc !== null) {
        classQuery = classQuery.eq('id', '00000000-0000-0000-0000-000000000000')
      }
    }

    const [
      { data: enrollments, count: studentCount },
      { count: teacherCount },
      { data: classes },
      { data: terms },
      { count: reportCount },
      { data: attendanceRows },
    ] = await Promise.all([
      enrollQuery,
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      classQuery,
      supabase.from('terms').select('id, label, term_number, academic_year, is_current').eq('is_current', true).limit(1),
      supabase.from('activity_logs').select('*', { count: 'exact', head: true }).ilike('action', '%report%'),
      supabase.from('attendance').select('status, date').limit(500),
    ])

    const currentTerm = terms?.[0] ?? null
    const enrollRows = enrollments ?? []
    const enrollIds = enrollRows.map((e: any) => e.id)

    let marksEntered = 0
    if (currentTerm?.id && enrollIds.length > 0) {
      const { count: circMarksCount } = await supabase
        .from('circular_marks')
        .select('*', { count: 'exact', head: true })
        .eq('term_id', currentTerm.id)
      marksEntered = circMarksCount ?? 0
    }

    const totalRequired = (studentCount ?? enrollRows.length) * 4
    const pendingMarks = Math.max(0, totalRequired - marksEntered)

    const attList = attendanceRows ?? []
    const presentCount = attList.filter((a: any) => a.status === 'present' || a.status === 'late').length
    const avgAttendance = attList.length > 0 ? Math.round((presentCount / attList.length) * 100) : 0

    const classPerformance =
      (classes ?? []).map((c: any) => {
        const cohortCount = enrollRows.filter((e: any) => e.circular_class_id === c.id).length
        return {
          class: c.class_name,
          students: cohortCount,
          avg: 0,
        }
      })

    const payload = {
      scope: {
        role: scope.canonicalRole,
        department: scope.department,
        isUnassigned: scope.isUnassigned,
      },
      kpis: {
        totalStudents: studentCount ?? enrollRows.length,
        activeClasses: classes?.length ?? 0,
        reportsGenerated: reportCount ?? 0,
        avgAttendance,
        teachers: teacherCount ?? 0,
        pendingMarks,
      },
      termPerformance: [],
      classPerformance,
      subjectPerformance: [],
      attendanceTrend: [],
      currentTerm,
    }

    return withCors(request, NextResponse.json(payload))
  } catch (err: any) {
    return withCors(
      request,
      NextResponse.json({ error: err?.message || 'Failed to load analytics', code: 'ANALYTICS_ERROR' }, { status: 500 })
    )
  }
}

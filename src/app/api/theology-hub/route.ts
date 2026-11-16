import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess, resolveUserScope, canAccessSubjectInScope } from '@/lib/auth-server'
import { classIdsForType } from '@/lib/teacher-access'
import { fetchAllSupabaseRows } from '@/lib/supabase-pagination'
import { getMarkScore } from '@/lib/mark-scores'
import { resolveEquivalentTerms, fetchAndReconcileTheologyMarks } from '@/lib/marks-reconciliation'
import { isNonMuslimStudent } from '@/lib/student-religion'

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const { searchParams } = new URL(request.url)
    const termId = searchParams.get('term_id')
    const classId = searchParams.get('class_id')
    const level = searchParams.get('level')

    if (!termId) {
      return withCors(request, NextResponse.json({ error: 'term_id is required' }, { status: 400 }))
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'read', null, 'theology')
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    const allowedTheologyIds = classIdsForType(authRes, 'theology')
    if (allowedTheologyIds !== null && allowedTheologyIds.length === 0) {
      return withCors(request, NextResponse.json({ enrollments: [], marks: [], subjects: [] }))
    }

    if (classId && allowedTheologyIds !== null && !allowedTheologyIds.includes(classId)) {
      return withCors(request, NextResponse.json({ error: 'Access to the requested class is denied' }, { status: 403 }))
    }

    const [enrollments, subjectsRes] = await Promise.all([
      fetchAllSupabaseRows(() => {
        let query = supabase
          .from('enrollments')
          .select(`
            id,
            student_id,
            theology_class_id,
            is_active,
            students ( id, name, arabic_name, admission_number, gender, religion, is_muslim ),
            theology_classes ( id, class_name_arabic, class_name_english, level )
          `)
          .not('theology_class_id', 'is', null)
          .eq('is_active', true)

        if (classId) {
          query = query.eq('theology_class_id', classId)
        } else if (allowedTheologyIds !== null) {
          query = query.in('theology_class_id', allowedTheologyIds)
        }
        return query.order('id', { ascending: true })
      }),
      supabase
        .from('theology_subjects')
        .select('id, subject_name_arabic, level, sort_order')
        .order('sort_order', { ascending: true }),
    ])

    let subjects = (subjectsRes.data ?? []).map((s: any) => ({
      ...s,
      curriculum: 'theology',
    }))

    // Resilient fallback to `subjects` table if `theology_subjects` errored or is empty
    if (subjectsRes.error || subjects.length === 0) {
      console.warn('theology_subjects primary lookup returned empty/error, trying fallback:', subjectsRes.error?.message)
      const fallbackQuery = await supabase
        .from('subjects')
        .select('id, subject_name, curriculum, section')
        .eq('curriculum', 'theology')
      if (!fallbackQuery.error && fallbackQuery.data && fallbackQuery.data.length > 0) {
        subjects = fallbackQuery.data.map((s: any) => ({
          id: s.id,
          subject_name_arabic: s.subject_name,
          level: s.section,
          curriculum: 'theology',
        }))
      }
    }

    const userScope = resolveUserScope(authRes)
    if (userScope.isSubjectTeacher && !userScope.isClassTeacher && userScope.assignedSubjects.length > 0) {
      const filteredSubjects = subjects.filter(
        (s: any) =>
          canAccessSubjectInScope(userScope, null, s.id, 'theology') ||
          canAccessSubjectInScope(userScope, null, s.subject_name_arabic, 'theology') ||
          canAccessSubjectInScope(userScope, null, s.subject_name_english, 'theology')
      )
      if (filteredSubjects.length > 0) {
        subjects = filteredSubjects
      }
    }

    // Exclude non-Muslim and theology-exempt students from theology hub
    const filteredEnrollments = enrollments
      .map((e: any) => ({
        ...e,
        students: Array.isArray(e.students) ? e.students[0] : e.students,
        theology_classes: Array.isArray(e.theology_classes) ? e.theology_classes[0] : e.theology_classes,
      }))
      .filter((e: any) => {
        return !isNonMuslimStudent(e.students)
      })

    const enrollmentIds = filteredEnrollments.map((e: any) => e.id)
    const studentIds = filteredEnrollments.map((e: any) => e.student_id).filter(Boolean) as string[]

    if (enrollmentIds.length === 0) {
      return withCors(
        request,
        NextResponse.json({
          enrollments: [],
          marks: [],
          subjects,
        })
      )
    }

    let termInfo = { termIds: [termId], termAliases: [] as string[], academicYear: new Date().getFullYear() }
    try {
      termInfo = await resolveEquivalentTerms(supabase, termId)
    } catch (e) {
      console.warn('Theology Hub resolveEquivalentTerms fallback:', e)
    }

    const reconciledMarks = await fetchAndReconcileTheologyMarks(supabase, {
      enrollmentIds,
      studentIds,
      termIds: termInfo.termIds,
      termAliases: termInfo.termAliases,
      academicYear: termInfo.academicYear,
    })

    const marks = reconciledMarks.map((mark) => ({
      id: mark.id,
      enrollment_id: mark.enrollment_id,
      student_id: mark.student_id,
      subject_id: mark.subject_id,
      mot_score: mark.mot_score,
      eot_score: mark.eot_score,
    }))

    return withCors(
      request,
      NextResponse.json({
        enrollments: filteredEnrollments,
        marks,
        subjects,
      })
    )
  } catch (err) {
    console.error('Theology Hub API error:', err)
    return withCors(
      request,
      NextResponse.json(
        { error: err instanceof Error ? err.message : 'Internal server error' },
        { status: 500 }
      )
    )
  }
}

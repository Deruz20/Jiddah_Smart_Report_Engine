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
    const { searchParams } = new URL(request.url)
    const termId = searchParams.get('term_id')

    if (!termId) {
      return withCors(request, NextResponse.json({ error: 'term_id is required' }, { status: 400 }))
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'read', null, 'secular')
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    const allowedCircularIds = classIdsForType(authRes, 'circular')
    if (allowedCircularIds !== null && allowedCircularIds.length === 0) {
      return withCors(request, NextResponse.json({ enrollments: [], marks: [], subjects: [] }))
    }

    let enrollmentsQuery = supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        circular_class_id,
        is_active,
        students ( name, admission_number ),
        circular_classes ( id, class_name, section )
      `)
      .not('circular_class_id', 'is', null)
      .eq('is_active', true)

    if (allowedCircularIds !== null) {
      enrollmentsQuery = enrollmentsQuery.in('circular_class_id', allowedCircularIds)
    }

    const [enrollmentsRes, circularSubjectsRes] = await Promise.all([
      enrollmentsQuery,
      supabase
        .from('circular_subjects')
        .select('id, subject_name, section')
        .order('subject_name', { ascending: true }),
    ])

    if (enrollmentsRes.error) throw enrollmentsRes.error

    const enrollments = enrollmentsRes.data ?? []
    const enrollmentIds = enrollments.map((e) => e.id)

    let subjects = (circularSubjectsRes.data ?? []).map((s: any) => ({
      ...s,
      curriculum: 'secular',
    }))

    // Fallback to legacy `subjects` table if `circular_subjects` is empty or errored
    if (circularSubjectsRes.error || subjects.length === 0) {
      const legacySubjects = await supabase
        .from('subjects')
        .select('id, subject_name, section, curriculum')
        .eq('curriculum', 'secular')
      if (!legacySubjects.error && legacySubjects.data) {
        subjects = legacySubjects.data
      }
    }

    let marks: any[] = []
    if (enrollmentIds.length > 0) {
      const { data: marksData, error: marksError } = await supabase
        .from('circular_marks')
        .select(`
          id,
          enrollment_id,
          subject_id,
          bot_score,
          mot_score,
          eot_score
        `)
        .eq('term_id', termId)
        .in('enrollment_id', enrollmentIds)

      if (marksError) throw marksError
      marks = marksData ?? []
    }

    return withCors(
      request,
      NextResponse.json({
        enrollments,
        marks,
        subjects,
      })
    )
  } catch (err) {
    console.error('Secular Hub API error:', err)
    return withCors(
      request,
      NextResponse.json(
        { error: err instanceof Error ? err.message : 'Internal server error' },
        { status: 500 }
      )
    )
  }
}

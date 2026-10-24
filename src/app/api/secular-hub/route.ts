import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess } from '@/lib/auth-server'
import { classIdsForType } from '@/lib/teacher-access'
import { fetchAllSupabaseRows } from '@/lib/supabase-pagination'
import { getMarkScore } from '@/lib/mark-scores'

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

    const [enrollments, circularSubjectsRes] = await Promise.all([
      fetchAllSupabaseRows(() => {
        let query = supabase
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
          query = query.in('circular_class_id', allowedCircularIds)
        }
        return query.order('id', { ascending: true })
      }),
      supabase
        .from('circular_subjects')
        .select('id, subject_name, section')
        .order('subject_name', { ascending: true }),
    ])

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
      for (let index = 0; index < enrollmentIds.length; index += 100) {
        const enrollmentChunk = enrollmentIds.slice(index, index + 100)
        const chunkMarks = await fetchAllSupabaseRows(() =>
          supabase
            .from('circular_marks')
            // Read both legacy mark and current score columns, then return normalized values.
            .select('*')
            .eq('term_id', termId)
            .in('enrollment_id', enrollmentChunk)
            .order('id', { ascending: true })
        )
        marks.push(...chunkMarks.map((mark) => ({
          id: mark.id,
          enrollment_id: mark.enrollment_id,
          subject_id: mark.subject_id,
          bot_score: getMarkScore(mark, 'bot'),
          mot_score: getMarkScore(mark, 'mot'),
          eot_score: getMarkScore(mark, 'eot'),
        })))
      }
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

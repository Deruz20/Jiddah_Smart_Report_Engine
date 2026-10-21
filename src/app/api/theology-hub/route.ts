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

    const authRes = await verifyDataAccess(supabase, user, 'read', null, 'theology')
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    const allowedTheologyIds = classIdsForType(authRes, 'theology')
    if (allowedTheologyIds !== null && allowedTheologyIds.length === 0) {
      return withCors(request, NextResponse.json({ enrollments: [], marks: [], subjects: [] }))
    }

    let enrollmentsQuery = supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        theology_class_id,
        is_active,
        students ( name, arabic_name, admission_number ),
        theology_classes ( id, class_name_arabic, class_name_english, level )
      `)
      .not('theology_class_id', 'is', null)
      .eq('is_active', true)

    if (allowedTheologyIds !== null) {
      enrollmentsQuery = enrollmentsQuery.in('theology_class_id', allowedTheologyIds)
    }

    const [enrollmentsRes, subjectsRes] = await Promise.all([
      enrollmentsQuery,
      supabase
        .from('theology_subjects')
        .select('id, subject_name_arabic, level')
        .order('sort_order', { ascending: true }),
    ])

    if (enrollmentsRes.error) throw enrollmentsRes.error
    if (subjectsRes.error) throw subjectsRes.error

    const enrollments = enrollmentsRes.data ?? []
    const subjects = subjectsRes.data ?? []
    const enrollmentIds = enrollments.map((e) => e.id)

    let marks: any[] = []
    if (enrollmentIds.length > 0) {
      const { data: marksData, error: marksError } = await supabase
        .from('theology_marks')
        .select(`
          id,
          enrollment_id,
          subject_id,
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

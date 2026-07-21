import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'

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

    // 1. Fetch active enrollments with their circular class and student details
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        circular_class_id,
        is_active,
        students ( name, admission_number ),
        circular_classes ( id, class_name, level )
      `)
      .not('circular_class_id', 'is', null)
      .eq('is_active', true)

    if (enrollmentsError) throw enrollmentsError

    const enrollmentIds = enrollments.map(e => e.id)

    // 2. Fetch marks for these enrollments for the given term
    const { data: marks, error: marksError } = await supabase
      .from('marks')
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

    // 3. Fetch subjects
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, subject_name, level')

    if (subjectsError) throw subjectsError

    return withCors(request, NextResponse.json({
      enrollments,
      marks,
      subjects
    }))

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

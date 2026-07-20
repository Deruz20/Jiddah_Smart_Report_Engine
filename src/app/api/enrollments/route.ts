import { reshapeEnrollmentRow } from '@/lib/enrollment-shape'
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
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 }))
    }

    const { data: profile } = await supabase.from('teachers').select('role, subject, classes').eq('email', user.email).single()
    const rawRole = profile?.role || user.user_metadata?.role || '';
    const isDOS = typeof rawRole === 'string' && rawRole.toUpperCase().includes('DOS');
    const isTeacher = typeof rawRole === 'string' && (rawRole.includes('Class Teacher') || rawRole.includes('Theology Instructor') || rawRole.toLowerCase() === 'teacher');
    const isAdmin = !isDOS && !isTeacher;

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

    if (isTeacher) {
      const assignedClasses = profile?.classes || [];
      if (assignedClasses.length > 0) {
        query = query.in('circular_class', assignedClasses)
      } else {
        query = query.eq('circular_class', 'UNASSIGNED_DUMMY_VALUE')
      }
    } else if (isDOS) {
      const isTheology = rawRole.toUpperCase().includes('THEOLOGY') || profile?.subject?.toLowerCase().includes('theology');
      if (isTheology) {
        query = query.not('theology_class', 'is', null)
      } else {
        query = query.not('circular_class', 'is', null)
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
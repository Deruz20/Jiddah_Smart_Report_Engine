import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { canAccessCurriculumClass, verifyDataAccess } from '@/lib/auth-server'
import { recordActivity } from '@/lib/api-server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const term_id = searchParams.get('term_id')

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Auth Enforcement Check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized) {
      return NextResponse.json({ error: authRes.message }, { status: 403 })
    }
    if (authRes.filterByDepartment && authRes.filterByDepartment === 'secular') {
      return NextResponse.json({ error: 'Unauthorized: Cannot access Theology marks' }, { status: 403 })
    }

    let query = supabase
      .from('theology_marks')
      .select(`
        id,
        enrollment_id,
        subject_id,
        term_id,
        mot_score,
        eot_score,
        enrollments!inner (
          student_id,
          theology_class_id,
          students ( name ),
          theology_classes ( class_name_english, level )
        ),
        theology_subjects ( subject_name_arabic, level )
      `)

    if (authRes.filterByTheologyClasses) {
      if (authRes.filterByTheologyClasses.length === 0) {
        return NextResponse.json({ data: [] }, { status: 200 })
      }
      query = query.in('enrollments.theology_class_id', authRes.filterByTheologyClasses)
    }

    if (term_id) {
      query = query.eq('term_id', term_id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] }, { status: 200 })
  } catch (err) {
    console.error('GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { enrollment_id, subject_id, term_id, mot_score, eot_score } = body

    if (!enrollment_id || !subject_id || !term_id) {
      return NextResponse.json(
        { error: 'enrollment_id, subject_id, and term_id are required' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Auth Enforcement Check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authRes = await verifyDataAccess(supabase, user, 'write')
    if (!authRes.isAuthorized) {
      return NextResponse.json({ error: authRes.message }, { status: 403 })
    }
    if (authRes.filterByDepartment && authRes.filterByDepartment === 'secular') {
      return NextResponse.json({ error: 'Unauthorized: Cannot modify Theology marks' }, { status: 403 })
    }

    const { data: enrollment, error: enrollmentError } = await createAdminClient()
      .from('enrollments')
      .select('theology_class_id, theology_classes(level)')
      .eq('id', enrollment_id)
      .maybeSingle()

    if (enrollmentError) {
      console.error('Theology marks enrollment lookup failed:', enrollmentError.message)
      return NextResponse.json({ error: 'Unable to verify class access.' }, { status: 500 })
    }
    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }
    if (!canAccessCurriculumClass(authRes, 'theology', enrollment.theology_class_id)) {
      return NextResponse.json({ error: 'Unauthorized: Cannot modify marks for an unassigned class.' }, { status: 403 })
    }

    const classMeta = Array.isArray(enrollment.theology_classes)
      ? enrollment.theology_classes[0]
      : enrollment.theology_classes
    const { data: subject, error: subjectError } = await supabase
      .from('theology_subjects')
      .select('id, level')
      .eq('id', subject_id)
      .maybeSingle()
    if (subjectError) {
      console.error('Theology subject lookup failed:', subjectError.message)
      return NextResponse.json({ error: 'Unable to verify subject access.' }, { status: 500 })
    }
    if (!subject || subject.level !== classMeta?.level) {
      return NextResponse.json({ error: 'Subject does not belong to the assigned theology class level.' }, { status: 400 })
    }

    const updateData: any = {}
    if (mot_score !== undefined) updateData.mot_score = mot_score === '' ? null : parseFloat(mot_score)
    if (eot_score !== undefined) updateData.eot_score = eot_score === '' ? null : parseFloat(eot_score)

    // Check if record already exists to handle re-entry update gracefully
    const { data: existing, error: existErr } = await supabase
      .from('theology_marks')
      .select('id')
      .eq('enrollment_id', enrollment_id)
      .eq('subject_id', subject_id)
      .eq('term_id', term_id)
      .maybeSingle()

    if (existErr) {
      console.error('Check existing error:', existErr)
      return NextResponse.json({ error: 'Unable to verify existing marks.' }, { status: 500 })
    }

    let result
    if (existing) {
      result = await supabase
        .from('theology_marks')
        .update(updateData)
        .eq('id', existing.id)
        .select()
    } else {
      const insertData = {
        enrollment_id,
        subject_id,
        term_id,
        ...updateData
      }
      result = await supabase
        .from('theology_marks')
        .insert([insertData])
        .select()
    }

    if (result.error) {
      console.error('Supabase error:', result.error)
      return NextResponse.json({ error: result.error.message }, { status: 400 })
    }

    await recordActivity(supabase, user.id, 'Entered Theology Marks', {
      enrollment_id,
      term_id,
      mot_score,
      eot_score
    })

    return NextResponse.json({ data: result.data }, { status: existing ? 200 : 201 })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, mot_score, eot_score } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Auth Enforcement Check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authRes = await verifyDataAccess(supabase, user, 'write')
    if (!authRes.isAuthorized) {
      return NextResponse.json({ error: authRes.message }, { status: 403 })
    }
    if (authRes.filterByDepartment === 'secular') {
      return NextResponse.json({ error: 'Unauthorized: Cannot modify Theology marks' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data: mark, error: markError } = await admin
      .from('theology_marks')
      .select('enrollment_id')
      .eq('id', id)
      .maybeSingle()
    if (markError) {
      console.error('Theology mark lookup failed:', markError.message)
      return NextResponse.json({ error: 'Unable to verify mark access.' }, { status: 500 })
    }
    if (!mark) return NextResponse.json({ error: 'Mark not found.' }, { status: 404 })

    const { data: enrollment, error: enrollmentError } = await admin
      .from('enrollments')
      .select('theology_class_id')
      .eq('id', mark.enrollment_id)
      .maybeSingle()
    if (enrollmentError) {
      console.error('Theology marks enrollment lookup failed:', enrollmentError.message)
      return NextResponse.json({ error: 'Unable to verify class access.' }, { status: 500 })
    }
    if (!enrollment || !canAccessCurriculumClass(authRes, 'theology', enrollment.theology_class_id)) {
      return NextResponse.json({ error: 'Unauthorized: Cannot modify marks for an unassigned class.' }, { status: 403 })
    }

    const updateData: any = {}
    if (mot_score !== undefined) updateData.mot_score = mot_score === '' ? null : parseFloat(mot_score)
    if (eot_score !== undefined) updateData.eot_score = eot_score === '' ? null : parseFloat(eot_score)

    const { data, error } = await supabase.from('theology_marks').update(updateData).eq('id', id).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (!data?.length) {
      return NextResponse.json({ error: 'Mark was not updated; no row was changed.' }, { status: 403 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Auth Enforcement Check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authRes = await verifyDataAccess(supabase, user, 'write')
    if (!authRes.isAuthorized) {
      return NextResponse.json({ error: authRes.message }, { status: 403 })
    }
    if (authRes.filterByDepartment === 'secular') {
      return NextResponse.json({ error: 'Unauthorized: Cannot modify Theology marks' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data: mark, error: markError } = await admin
      .from('theology_marks')
      .select('enrollment_id')
      .eq('id', id)
      .maybeSingle()
    if (markError) {
      console.error('Theology mark lookup failed:', markError.message)
      return NextResponse.json({ error: 'Unable to verify mark access.' }, { status: 500 })
    }
    if (!mark) return NextResponse.json({ error: 'Mark not found.' }, { status: 404 })

    const { data: enrollment, error: enrollmentError } = await admin
      .from('enrollments')
      .select('theology_class_id')
      .eq('id', mark.enrollment_id)
      .maybeSingle()
    if (enrollmentError) {
      console.error('Theology marks enrollment lookup failed:', enrollmentError.message)
      return NextResponse.json({ error: 'Unable to verify class access.' }, { status: 500 })
    }
    if (!enrollment || !canAccessCurriculumClass(authRes, 'theology', enrollment.theology_class_id)) {
      return NextResponse.json({ error: 'Unauthorized: Cannot delete marks for an unassigned class.' }, { status: 403 })
    }

    const { data, error } = await supabase.from('theology_marks').delete().eq('id', id).select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (!data?.length) {
      return NextResponse.json({ error: 'Mark was not deleted; no row was changed.' }, { status: 403 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const studentId = (await params).id
    const body = await request.json()

    if (!body.name || !body.admission_number || !body.circular_class_id) {
      return withCors(
        request,
        NextResponse.json(
          { error: 'name, circular_class_id, and admission_number are required' },
          { status: 400 }
        )
      )
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const isMuslim = ['muslim', 'islam'].includes((body.religion || '').toLowerCase().trim());

    if (!isMuslim && body.theology_class_id) {
      return withCors(
        request,
        NextResponse.json(
          { error: 'Non-Muslim students cannot have a theology class' },
          { status: 400 }
        )
      )
    }

    // 1. Update the student record
    const { error: studentUpdateError } = await supabase
      .from('students')
      .update({
        name: body.name.trim(),
        arabic_name: body.arabic_name ? body.arabic_name.trim() : null,
        gender: body.gender || null,
        admission_number: body.admission_number.trim(),
        is_muslim: isMuslim,
      })
      .eq('id', studentId)

    if (studentUpdateError) {
      console.error('Student update error:', studentUpdateError)
      return withCors(request, NextResponse.json({ error: studentUpdateError.message }, { status: 500 }))
    }

    // 2. Fetch current active enrollment
    const { data: currentEnrollment, error: fetchEnrollmentError } = await supabase
      .from('enrollments')
      .select('id, circular_class_id, theology_class_id, academic_year')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .single()

    if (fetchEnrollmentError && fetchEnrollmentError.code !== 'PGRST116') { // PGRST116 is not found
      return withCors(request, NextResponse.json({ error: fetchEnrollmentError.message }, { status: 500 }))
    }

    const newCircularClass = body.circular_class_id
    const newTheologyClass = body.theology_class_id || null

    if (currentEnrollment) {
      const circularChanged = currentEnrollment.circular_class_id !== newCircularClass
      const theologyChanged = currentEnrollment.theology_class_id !== newTheologyClass

      if (circularChanged || theologyChanged) {
        // Mark old enrollment inactive
        await supabase
          .from('enrollments')
          .update({ is_active: false })
          .eq('id', currentEnrollment.id)

        // Create new enrollment
        const { error: newEnrollmentError } = await supabase
          .from('enrollments')
          .insert([{
            student_id: studentId,
            circular_class_id: newCircularClass,
            theology_class_id: newTheologyClass,
            academic_year: currentEnrollment.academic_year,
            is_active: true,
          }])

        if (newEnrollmentError) {
          console.error('New enrollment insert error:', newEnrollmentError)
          return withCors(request, NextResponse.json({ error: newEnrollmentError.message }, { status: 500 }))
        }
      }
    } else {
      // No active enrollment found, just create one
      await supabase
        .from('enrollments')
        .insert([{
          student_id: studentId,
          circular_class_id: newCircularClass,
          theology_class_id: newTheologyClass,
          academic_year: new Date().getFullYear(),
          is_active: true,
        }])
    }

    return withCors(request, NextResponse.json({ success: true }))
  } catch (err) {
    console.error('API error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return withCors(request, NextResponse.json({ error: message }, { status: 500 }))
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const studentId = (await params).id
    const { searchParams } = new URL(request.url)
    const isHardDelete = searchParams.get('hard_delete') === 'true'
    
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    if (isHardDelete) {
      // For hard delete, we first need to get all enrollments for this student to delete their marks
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId)

      if (enrollments && enrollments.length > 0) {
        const enrollmentIds = enrollments.map(e => e.id)
        
        // Delete circular marks
        await supabase.from('circular_marks').delete().in('enrollment_id', enrollmentIds)
        // Delete theology marks
        await supabase.from('theology_marks').delete().in('enrollment_id', enrollmentIds)
        // Delete enrollments
        await supabase.from('enrollments').delete().eq('student_id', studentId)
      }

      // Finally, delete the student
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)

      if (deleteError) {
        return withCors(request, NextResponse.json({ error: deleteError.message }, { status: 500 }))
      }
    } else {
      // Soft delete (Archive)
      const { error: archiveError } = await supabase
        .from('students')
        .update({ is_archived: true })
        .eq('id', studentId)

      if (archiveError) {
        return withCors(request, NextResponse.json({ error: archiveError.message }, { status: 500 }))
      }
    }

    return withCors(request, NextResponse.json({ success: true }))
  } catch (err) {
    console.error('API error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return withCors(request, NextResponse.json({ error: message }, { status: 500 }))
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const studentId = (await params).id
    const body = await request.json()

    if (body.is_archived === undefined) {
       return withCors(request, NextResponse.json({ error: 'is_archived is required' }, { status: 400 }))
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { error: archiveError } = await supabase
      .from('students')
      .update({ is_archived: body.is_archived })
      .eq('id', studentId)

    if (archiveError) {
      return withCors(request, NextResponse.json({ error: archiveError.message }, { status: 500 }))
    }

    return withCors(request, NextResponse.json({ success: true }))
  } catch (err) {
    console.error('API error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return withCors(request, NextResponse.json({ error: message }, { status: 500 }))
  }
}

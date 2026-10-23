import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { canAccessCurriculumClass, verifyDataAccess } from '@/lib/auth-server'

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
    const supabaseAdmin = createAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'write')
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    const { data: currentEnrollment, error: fetchEnrollmentError } = await supabaseAdmin
      .from('enrollments')
      .select('id, circular_class_id, theology_class_id, academic_year')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .maybeSingle()

    if (fetchEnrollmentError) {
      console.error('Student enrollment scope lookup failed:', fetchEnrollmentError.message)
      return withCors(request, NextResponse.json({ error: 'Unable to verify student class access.' }, { status: 500 }))
    }

    const hasCurrentScope = currentEnrollment
      ? canAccessCurriculumClass(authRes, 'circular', currentEnrollment.circular_class_id) ||
        canAccessCurriculumClass(authRes, 'theology', currentEnrollment.theology_class_id)
      : false
    if (!hasCurrentScope && (currentEnrollment || authRes.filterByClasses)) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized to modify this student.' }, { status: 403 }))
    }

    if (
      body.circular_class_id !== currentEnrollment?.circular_class_id &&
      ((currentEnrollment?.circular_class_id &&
        !canAccessCurriculumClass(authRes, 'circular', currentEnrollment.circular_class_id)) ||
        !canAccessCurriculumClass(authRes, 'circular', body.circular_class_id))
    ) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized: Cannot move student to an unassigned circular class.' }, { status: 403 }))
    }
    const nextTheologyClassId = body.theology_class_id || null
    if (
      nextTheologyClassId !== (currentEnrollment?.theology_class_id || null) &&
      ((currentEnrollment?.theology_class_id &&
        !canAccessCurriculumClass(authRes, 'theology', currentEnrollment.theology_class_id)) ||
        (nextTheologyClassId &&
          !canAccessCurriculumClass(authRes, 'theology', nextTheologyClassId)))
    ) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized: Cannot move student to an unassigned theology class.' }, { status: 403 }))
    }
    if (!currentEnrollment && authRes.filterByClasses) {
      if (
        !canAccessCurriculumClass(authRes, 'circular', body.circular_class_id) ||
        (body.theology_class_id && !canAccessCurriculumClass(authRes, 'theology', body.theology_class_id))
      ) {
        return withCors(request, NextResponse.json({ error: 'Unauthorized: Cannot create an enrollment outside assigned classes.' }, { status: 403 }))
      }
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

    const { data: updatedStudent, error: studentUpdateError } = await supabaseAdmin
      .from('students')
      .update({
        name: body.name.trim(),
        arabic_name: body.arabic_name ? body.arabic_name.trim() : null,
        gender: body.gender ? body.gender.toLowerCase() : null,
        admission_number: body.admission_number.trim(),
        is_muslim: isMuslim,
      })
      .eq('id', studentId)
      .select('id')
      .maybeSingle()

    if (studentUpdateError) {
      console.error('Student update error:', studentUpdateError)
      return withCors(request, NextResponse.json({ error: studentUpdateError.message }, { status: 500 }))
    }
    if (!updatedStudent) {
      return withCors(request, NextResponse.json({ error: 'Student not found.' }, { status: 404 }))
    }

    const newCircularClass = body.circular_class_id
    const newTheologyClass = body.theology_class_id || null

    if (currentEnrollment) {
      const circularChanged = currentEnrollment.circular_class_id !== newCircularClass
      const theologyChanged = currentEnrollment.theology_class_id !== newTheologyClass

      if (circularChanged || theologyChanged) {
        // Mark old enrollment inactive
        const { error: deactivateError } = await supabaseAdmin
          .from('enrollments')
          .update({ is_active: false })
          .eq('id', currentEnrollment.id)
        if (deactivateError) {
          return withCors(request, NextResponse.json({ error: deactivateError.message }, { status: 500 }))
        }

        // Create new enrollment
        const { error: newEnrollmentError } = await supabaseAdmin
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
      const { error: enrollmentInsertError } = await supabaseAdmin
        .from('enrollments')
        .insert([{
          student_id: studentId,
          circular_class_id: newCircularClass,
          theology_class_id: newTheologyClass,
          academic_year: new Date().getFullYear(),
          is_active: true,
        }])
      if (enrollmentInsertError) {
        return withCors(request, NextResponse.json({ error: enrollmentInsertError.message }, { status: 500 }))
      }
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
    const supabaseAdmin = createAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'write')
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    if (isHardDelete && !['administrator', 'admin'].includes(authRes.role?.toLowerCase() ?? '')) {
      return withCors(request, NextResponse.json({ error: 'Only administrators may permanently delete students.' }, { status: 403 }))
    }

    if (authRes.filterByClasses || authRes.filterByDepartment) {
      const { data: existingEnrollment, error: enrollmentScopeError } = await supabaseAdmin
        .from('enrollments')
        .select('circular_class_id, theology_class_id')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .maybeSingle()

      if (enrollmentScopeError) {
        console.error('Student deletion scope lookup failed:', enrollmentScopeError.message)
        return withCors(request, NextResponse.json({ error: 'Unable to verify student class access.' }, { status: 500 }))
      }
      if (!existingEnrollment) {
        return withCors(request, NextResponse.json({ error: 'Student enrollment not found.' }, { status: 404 }))
      }
        
      const hasAccess =
        canAccessCurriculumClass(authRes, 'circular', existingEnrollment.circular_class_id) ||
        canAccessCurriculumClass(authRes, 'theology', existingEnrollment.theology_class_id)
      if (!hasAccess) {
        return withCors(request, NextResponse.json({ error: 'Unauthorized to delete this student.' }, { status: 403 }))
      }
    }

    if (isHardDelete) {
      // For hard delete, we first need to get all enrollments for this student to delete their marks
      const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
        .from('enrollments')
        .select('id')
        .eq('student_id', studentId)
      if (enrollmentsError) {
        return withCors(request, NextResponse.json({ error: enrollmentsError.message }, { status: 500 }))
      }

      if (enrollments && enrollments.length > 0) {
        const enrollmentIds = enrollments.map(e => e.id)
        
        // Delete circular marks
        const { error: circularMarksError } = await supabaseAdmin.from('circular_marks').delete().in('enrollment_id', enrollmentIds)
        if (circularMarksError) {
          return withCors(request, NextResponse.json({ error: circularMarksError.message }, { status: 500 }))
        }
        // Delete theology marks
        const { error: theologyMarksError } = await supabaseAdmin.from('theology_marks').delete().in('enrollment_id', enrollmentIds)
        if (theologyMarksError) {
          return withCors(request, NextResponse.json({ error: theologyMarksError.message }, { status: 500 }))
        }
        // Delete enrollments
        const { error: deleteEnrollmentsError } = await supabaseAdmin.from('enrollments').delete().eq('student_id', studentId)
        if (deleteEnrollmentsError) {
          return withCors(request, NextResponse.json({ error: deleteEnrollmentsError.message }, { status: 500 }))
        }
      }

      // Finally, delete the student
      const { error: deleteError } = await supabaseAdmin
        .from('students')
        .delete()
        .eq('id', studentId)

      if (deleteError) {
        return withCors(request, NextResponse.json({ error: deleteError.message }, { status: 500 }))
      }
    } else {
      // Soft delete (Archive)
      const { data: archivedStudent, error: archiveError } = await supabaseAdmin
        .from('students')
        .update({ is_archived: true })
        .eq('id', studentId)
        .select('id')
        .maybeSingle()

      if (archiveError) {
        return withCors(request, NextResponse.json({ error: archiveError.message }, { status: 500 }))
      }
      if (!archivedStudent) {
        return withCors(request, NextResponse.json({ error: 'Student not found.' }, { status: 404 }))
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
    const supabaseAdmin = createAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'write')
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    if (authRes.filterByClasses || authRes.filterByDepartment) {
      const { data: enrollment, error: enrollmentError } = await supabaseAdmin
        .from('enrollments')
        .select('circular_class_id, theology_class_id')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .maybeSingle()

      if (enrollmentError) {
        console.error('Student archive scope lookup failed:', enrollmentError.message)
        return withCors(request, NextResponse.json({ error: 'Unable to verify student class access.' }, { status: 500 }))
      }
      if (!enrollment) {
        return withCors(request, NextResponse.json({ error: 'Student enrollment not found.' }, { status: 404 }))
      }

      const hasAccess =
        canAccessCurriculumClass(authRes, 'circular', enrollment.circular_class_id) ||
        canAccessCurriculumClass(authRes, 'theology', enrollment.theology_class_id)
      if (!hasAccess) {
        return withCors(request, NextResponse.json({ error: 'Unauthorized to archive this student.' }, { status: 403 }))
      }
    }

    const { data: archivedStudent, error: archiveError } = await supabaseAdmin
      .from('students')
      .update({ is_archived: body.is_archived })
      .eq('id', studentId)
      .select('id')
      .maybeSingle()

    if (archiveError) {
      return withCors(request, NextResponse.json({ error: archiveError.message }, { status: 500 }))
    }
    if (!archivedStudent) {
      return withCors(request, NextResponse.json({ error: 'Student not found.' }, { status: 404 }))
    }

    return withCors(request, NextResponse.json({ success: true }))
  } catch (err) {
    console.error('API error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return withCors(request, NextResponse.json({ error: message }, { status: 500 }))
  }
}

import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess } from '@/lib/auth-server'
import { canAccessClass, canAccessEnrollment, canHardDeleteStudent, isAdministratorRole } from '@/lib/teacher-access'

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
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'write')
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    const { data: currentEnrollments, error: currentEnrollmentsError } = await supabaseAdmin
      .from('enrollments')
      .select('id, circular_class_id, theology_class_id, academic_year')
      .eq('student_id', studentId)
      .eq('is_active', true)

    if (currentEnrollmentsError) {
      console.error('Student enrollment access lookup failed:', currentEnrollmentsError.message)
      return withCors(request, NextResponse.json({ error: 'Unable to verify student class access.' }, { status: 500 }))
    }

    if (!currentEnrollments?.length) {
      if (!isAdministratorRole(authRes.role)) {
        return withCors(request, NextResponse.json({ error: 'Unauthorized: Student has no active enrollment in your assigned classes.' }, { status: 403 }))
      }
    } else {
      if (currentEnrollments.some((enrollment) => !canAccessEnrollment(authRes, enrollment))) {
        return withCors(request, NextResponse.json({ error: 'Unauthorized: Cannot modify student outside your assigned classes.' }, { status: 403 }))
      }

      const currentEnrollment = currentEnrollments.length === 1 ? currentEnrollments[0] : null
      if (!currentEnrollment) {
        return withCors(request, NextResponse.json({ error: 'Unable to update a student with multiple active enrollments.' }, { status: 409 }))
      }

      const nextCircularClass = body.circular_class_id
      const nextTheologyClass = body.theology_class_id || null
      const canManageCircular = canAccessClass(authRes, 'circular', currentEnrollment.circular_class_id)
      const canManageTheology = canAccessClass(
        authRes,
        'theology',
        currentEnrollment.theology_class_id,
        currentEnrollment.circular_class_id
      )
      const circularAllowed = canManageCircular
        ? canAccessClass(authRes, 'circular', nextCircularClass)
        : nextCircularClass === currentEnrollment.circular_class_id
      const theologyAllowed = canManageTheology
        ? !nextTheologyClass || canAccessClass(
          authRes,
          'theology',
          nextTheologyClass,
          nextCircularClass
        )
        : nextTheologyClass === currentEnrollment.theology_class_id

      if (!circularAllowed || !theologyAllowed) {
        return withCors(request, NextResponse.json({ error: 'Unauthorized: Cannot assign classes outside your permissions.' }, { status: 403 }))
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

    // 1. Update the student record
    const { error: studentUpdateError } = await supabase
      .from('students')
      .update({
        name: body.name.trim(),
        arabic_name: body.arabic_name ? body.arabic_name.trim() : null,
        gender: body.gender ? body.gender.toLowerCase() : null,
        admission_number: body.admission_number.trim(),
        is_muslim: isMuslim,
      })
      .eq('id', studentId)

    if (studentUpdateError) {
      console.error('Student update error:', studentUpdateError)
      return withCors(request, NextResponse.json({ error: studentUpdateError.message }, { status: 500 }))
    }

    const currentEnrollment = currentEnrollments?.[0] ?? null

    const newCircularClass = body.circular_class_id
    const newTheologyClass = body.theology_class_id || null

    if (currentEnrollment) {
      const circularChanged = currentEnrollment.circular_class_id !== newCircularClass
      const theologyChanged = currentEnrollment.theology_class_id !== newTheologyClass

      if (circularChanged || theologyChanged) {
        const { error: archiveEnrollmentError } = await supabaseAdmin
          .from('enrollments')
          .update({ is_active: false })
          .eq('id', currentEnrollment.id)

        if (archiveEnrollmentError) {
          return withCors(request, NextResponse.json({ error: archiveEnrollmentError.message }, { status: 500 }))
        }

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
      const { error: newEnrollmentError } = await supabaseAdmin
        .from('enrollments')
        .insert([{
          student_id: studentId,
          circular_class_id: newCircularClass,
          theology_class_id: newTheologyClass,
          academic_year: new Date().getFullYear(),
          is_active: true,
        }])

      if (newEnrollmentError) {
        return withCors(request, NextResponse.json({ error: newEnrollmentError.message }, { status: 500 }))
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
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'write')
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    if (isHardDelete && !canHardDeleteStudent(authRes)) {
      return withCors(request, NextResponse.json({ error: 'Only administrators may permanently delete student records.' }, { status: 403 }))
    }

    let targetEnrollmentQuery = supabaseAdmin
      .from('enrollments')
      .select('id, circular_class_id, theology_class_id')
      .eq('student_id', studentId)
    if (!isHardDelete) {
      targetEnrollmentQuery = targetEnrollmentQuery.eq('is_active', true)
    }
    const { data: targetEnrollments, error: targetEnrollmentsError } = await targetEnrollmentQuery

    if (targetEnrollmentsError) {
      console.error('Student enrollment access lookup failed:', targetEnrollmentsError.message)
      return withCors(request, NextResponse.json({ error: 'Unable to verify student class access.' }, { status: 500 }))
    }

    if (!isAdministratorRole(authRes.role) && (
      !targetEnrollments?.length ||
      targetEnrollments.some((enrollment) => !canAccessEnrollment(authRes, enrollment))
    )) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized to delete this student' }, { status: 403 }))
    }

    if (isHardDelete) {
      if (targetEnrollments && targetEnrollments.length > 0) {
        const enrollmentIds = targetEnrollments.map(enrollment => enrollment.id)
        
        const { error: circularMarksError } = await supabaseAdmin
          .from('circular_marks')
          .delete()
          .in('enrollment_id', enrollmentIds)
        if (circularMarksError) {
          return withCors(request, NextResponse.json({ error: circularMarksError.message }, { status: 500 }))
        }

        const { error: theologyMarksError } = await supabaseAdmin
          .from('theology_marks')
          .delete()
          .in('enrollment_id', enrollmentIds)
        if (theologyMarksError) {
          return withCors(request, NextResponse.json({ error: theologyMarksError.message }, { status: 500 }))
        }

        const { error: enrollmentDeleteError } = await supabaseAdmin
          .from('enrollments')
          .delete()
          .eq('student_id', studentId)
        if (enrollmentDeleteError) {
          return withCors(request, NextResponse.json({ error: enrollmentDeleteError.message }, { status: 500 }))
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

    const authRes = await verifyDataAccess(supabase, user, 'write')
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    const { data: activeEnrollments, error: enrollmentError } = await createAdminClient()
      .from('enrollments')
      .select('circular_class_id, theology_class_id')
      .eq('student_id', studentId)
      .eq('is_active', true)

    if (enrollmentError) {
      console.error('Student enrollment access lookup failed:', enrollmentError.message)
      return withCors(request, NextResponse.json({ error: 'Unable to verify student class access.' }, { status: 500 }))
    }

    if (!isAdministratorRole(authRes.role) && (
      !activeEnrollments?.length ||
      activeEnrollments.some((enrollment) => !canAccessEnrollment(authRes, enrollment))
    )) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized to update this student' }, { status: 403 }))
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

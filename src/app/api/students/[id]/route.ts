import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess, hasPermission } from '@/lib/auth-server'
import {
  canAccessEnrollment,
  canHardDeleteStudent,
  isAdministratorRole,
  resolveEnrollmentClassUpdate,
} from '@/lib/teacher-access'

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

    if (
      !body.name ||
      !body.admission_number ||
      (!body.circular_class_id && !body.theology_class_id)
    ) {
      return withCors(
        request,
        NextResponse.json(
          { error: 'name, admission_number, and at least one class are required' },
          { status: 400 }
        )
      )
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const supabaseAdmin = createAdminClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized || !hasPermission(authRes, 'write_students')) {
      return withCors(
        request,
        NextResponse.json(
          { error: authRes.message || 'Forbidden: Insufficient permissions to edit student records.' },
          { status: 403 }
        )
      )
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

    let enrollmentClassUpdate: ReturnType<typeof resolveEnrollmentClassUpdate> = null

    if (!currentEnrollments?.length) {
      if (!isAdministratorRole(authRes.role)) {
        return withCors(request, NextResponse.json({ error: 'Unauthorized: Student has no active enrollment in your assigned classes.' }, { status: 403 }))
      }
      if (!body.circular_class_id) {
        return withCors(request, NextResponse.json({ error: 'A circular class is required for a new enrollment.' }, { status: 400 }))
      }
    } else {
      if (currentEnrollments.some((enrollment) => !canAccessEnrollment(authRes, enrollment))) {
        return withCors(request, NextResponse.json({ error: 'Unauthorized: Cannot modify student outside your assigned classes.' }, { status: 403 }))
      }

      const currentEnrollment = currentEnrollments.length === 1 ? currentEnrollments[0] : null
      if (!currentEnrollment) {
        return withCors(request, NextResponse.json({ error: 'Unable to update a student with multiple active enrollments.' }, { status: 409 }))
      }

      enrollmentClassUpdate = resolveEnrollmentClassUpdate(
        authRes,
        currentEnrollment,
        {
          circular_class_id: body.circular_class_id,
          theology_class_id: body.theology_class_id,
        }
      )
      if (!enrollmentClassUpdate) {
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

    // 1. Update the student record (use supabaseAdmin after verified RBAC check so scoped non-admin roles with write_students succeed)
    const { error: studentUpdateError } = await supabaseAdmin
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

    const newCircularClass = enrollmentClassUpdate
      ? enrollmentClassUpdate.circular_class_id
      : body.circular_class_id
    const newTheologyClass = enrollmentClassUpdate
      ? enrollmentClassUpdate.theology_class_id
      : body.theology_class_id || null

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
    const supabaseAdmin = createAdminClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized || !hasPermission(authRes, 'write_students')) {
      return withCors(
        request,
        NextResponse.json(
          { error: authRes.message || 'Forbidden: Insufficient permissions to edit student records.' },
          { status: 403 }
        )
      )
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
      const { error: archiveError } = await supabaseAdmin
        .from('students')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
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

    const hasArchiveUpdate = body.is_archived !== undefined
    const hasNameUpdate =
      body.name !== undefined || body.arabic_name !== undefined || body.name_arabic !== undefined

    if (!hasArchiveUpdate && !hasNameUpdate) {
      return withCors(
        request,
        NextResponse.json({ error: 'is_archived or name/arabic_name is required' }, { status: 400 })
      )
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'read')
    const canArchive = hasPermission(authRes, 'write_students')
    const canQuickFixName =
      hasPermission(authRes, 'write_students') || hasPermission(authRes, 'read_reports')

    if (!authRes.isAuthorized || (hasArchiveUpdate && !canArchive) || (hasNameUpdate && !canQuickFixName)) {
      return withCors(
        request,
        NextResponse.json(
          { error: authRes.message || 'Forbidden: Insufficient permissions to edit student records.' },
          { status: 403 }
        )
      )
    }

    const supabaseAdmin = createAdminClient(cookieStore)
    const { data: activeEnrollments, error: enrollmentError } = await supabaseAdmin
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

    const updatePayload: Record<string, any> = {}
    if (hasArchiveUpdate) {
      const nextArchived = Boolean(body.is_archived)
      updatePayload.is_archived = nextArchived
      updatePayload.archived_at = nextArchived ? new Date().toISOString() : null
    }
    if (body.name !== undefined) {
      const trimmedName = String(body.name || '').trim()
      if (!trimmedName) {
        return withCors(request, NextResponse.json({ error: 'Student name cannot be empty' }, { status: 400 }))
      }
      updatePayload.name = trimmedName
    }
    if (body.arabic_name !== undefined || body.name_arabic !== undefined) {
      const rawArabic = body.arabic_name !== undefined ? body.arabic_name : body.name_arabic
      const trimmedArabic = rawArabic == null ? '' : String(rawArabic).trim()
      updatePayload.arabic_name = trimmedArabic || null
    }

    const { data: updatedStudent, error: updateError } = await supabaseAdmin
      .from('students')
      .update(updatePayload)
      .eq('id', studentId)
      .select('id, name, arabic_name, is_archived')
      .single()

    if (updateError) {
      return withCors(request, NextResponse.json({ error: updateError.message }, { status: 500 }))
    }

    return withCors(request, NextResponse.json({ success: true, student: updatedStudent }))
  } catch (err) {
    console.error('API error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return withCors(request, NextResponse.json({ error: message }, { status: 500 }))
  }
}

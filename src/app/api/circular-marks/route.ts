import { createAdminClient, createClient } from '@/utils/supabase/server'
import { getServiceRoleKey } from '@/lib/supabase-env'
import { upsertAndVerifyMarks } from '@/lib/marks-write'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyDataAccess, hasPermission, verifyEnrollmentClassAccess } from '@/lib/auth-server'
import { canAccessClass, isAdministratorRole, subjectMatchesClassScope } from '@/lib/teacher-access'
import { resolveSectionType } from '@/lib/section-type'
import { fetchMergedSchoolSettings, isExamSetLockedForUser } from '@/lib/school-settings-helper'
import { resolveEquivalentTerms } from '@/lib/marks-reconciliation'
import { verifyCircularSubjectScope } from '@/lib/services/marks-scope.service'

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
    if (!authRes.isAuthorized || !hasPermission(authRes, 'read_marks')) {
      return NextResponse.json({ error: authRes.message || 'Forbidden: Insufficient permissions to read marks.' }, { status: 403 })
    }
    if (authRes.filterByDepartment && authRes.filterByDepartment === 'theology') {
      return NextResponse.json({ error: 'Unauthorized: Cannot access Secular marks' }, { status: 403 })
    }

    let query = supabase
      .from('circular_marks')
      .select(`
        id,
        enrollment_id,
        subject_id,
        term_id,
        bot_score,
        mot_score,
        eot_score,
        enrollments!inner (
          student_id,
          is_active,
          circular_class_id,
          students!inner ( name, is_archived ),
          circular_classes ( class_name, section )
        ),
        circular_subjects ( subject_name, section )
      `)
      .eq('enrollments.is_active', true)
      .eq('enrollments.students.is_archived', false)

    if (term_id) {
      const termInfo = await resolveEquivalentTerms(supabase, term_id)
      query = query.in('term_id', termInfo.termIds)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const scopedData = (data || []).filter((mark: any) => {
      const enrollment = Array.isArray(mark.enrollments) ? mark.enrollments[0] : mark.enrollments
      const circularClass = Array.isArray(enrollment?.circular_classes)
        ? enrollment.circular_classes[0]
        : enrollment?.circular_classes
      const subject = Array.isArray(mark.circular_subjects)
        ? mark.circular_subjects[0]
        : mark.circular_subjects
      const classSection = circularClass
        ? resolveSectionType(circularClass.section, circularClass.class_name)
        : null
      return canAccessClass(authRes, 'circular', enrollment?.circular_class_id) &&
        subjectMatchesClassScope(classSection, subject?.section)
    })
    return NextResponse.json({ data: scopedData }, { status: 200 })
  } catch (err) {
    console.error('GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { enrollment_id, subject_id, term_id, bot_score, mot_score, eot_score } = body

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

    const { access: authRes, enrollment } = await verifyEnrollmentClassAccess(
      supabase, user, 'write', enrollment_id, 'circular'
    )
    if (!authRes.isAuthorized) return NextResponse.json({ error: authRes.message }, { status: 403 })

    const isAdmin =
      isAdministratorRole(authRes.canonicalRole || authRes.role) ||
      authRes.role === 'Administrator' ||
      authRes.role === 'admin'
    if (!isAdmin) {
      const schoolSettings = await fetchMergedSchoolSettings(supabase)
      for (const [present, setKey] of [
        [bot_score !== undefined, 'bot'],
        [mot_score !== undefined, 'mot'],
        [eot_score !== undefined, 'eot'],
      ] as const) {
        if (present) {
          const lockCheck = isExamSetLockedForUser(schoolSettings, setKey, isAdmin)
          if (lockCheck.locked) {
            return NextResponse.json({ error: lockCheck.message }, { status: 423 })
          }
        }
      }
    }

    const subjectScope = await verifyCircularSubjectScope(
      supabase,
      enrollment?.circular_class_id ?? null,
      subject_id
    )
    if (subjectScope.error) {
      console.error('Circular subject scope lookup failed:', subjectScope.error)
      return NextResponse.json({ error: 'Unable to verify subject scope.' }, { status: 500 })
    }
    if (!subjectScope.allowed) {
      return NextResponse.json({ error: 'Subject is outside the assigned class section.' }, { status: 403 })
    }

    const parseScore = (val: any) => {
      if (val === undefined) return undefined
      if (val === null || val === '') return null
      const parsed = parseFloat(val)
      return Number.isFinite(parsed) ? parsed : null
    }

    const updateData: any = {}
    if (bot_score !== undefined) updateData.bot_score = parseScore(bot_score)
    if (mot_score !== undefined) updateData.mot_score = parseScore(mot_score)
    if (eot_score !== undefined) updateData.eot_score = parseScore(eot_score)

    const dbWriteClient = getServiceRoleKey() ? createAdminClient(cookieStore) : supabase
    const upsertRow = {
      enrollment_id,
      subject_id,
      term_id,
      ...updateData,
    }
    const writeRes = await upsertAndVerifyMarks(dbWriteClient, 'circular_marks', [upsertRow], {
      enrollmentId: enrollment_id,
      termId: term_id,
    })

    if (writeRes.error) {
      console.error('Circular marks write error:', writeRes.error)
      return NextResponse.json({ error: writeRes.error }, { status: 500 })
    }

    // Dispatch event-driven system notification for user
    const { createSystemNotification } = await import('@/lib/notifications')
    await createSystemNotification(supabase, {
      title: 'Marks Saved',
      message: `Marks recorded for enrollment #${enrollment_id.slice(0, 8)}.`,
      recipientId: user.id,
      priority: 'normal',
      type: 'marks',
    })

    return NextResponse.json({ data: writeRes.persistedRows }, { status: 200 })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, bot_score, mot_score, eot_score } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: mark, error: markError } = await supabase
      .from('circular_marks')
      .select('enrollment_id, subject_id')
      .eq('id', id)
      .maybeSingle()
    if (markError) return NextResponse.json({ error: markError.message }, { status: 500 })
    if (!mark) return NextResponse.json({ error: 'Mark not found' }, { status: 404 })
    const { access, enrollment } = await verifyEnrollmentClassAccess(
      supabase, user, 'write', mark.enrollment_id, 'circular'
    )
    if (!access.isAuthorized) return NextResponse.json({ error: access.message }, { status: 403 })

    const isAdmin =
      isAdministratorRole(access.canonicalRole || access.role) ||
      access.role === 'Administrator' ||
      access.role === 'admin'
    if (!isAdmin) {
      const schoolSettings = await fetchMergedSchoolSettings(supabase)
      for (const [present, setKey] of [
        [bot_score !== undefined, 'bot'],
        [mot_score !== undefined, 'mot'],
        [eot_score !== undefined, 'eot'],
      ] as const) {
        if (present) {
          const lockCheck = isExamSetLockedForUser(schoolSettings, setKey, isAdmin)
          if (lockCheck.locked) {
            return NextResponse.json({ error: lockCheck.message }, { status: 423 })
          }
        }
      }
    }
    const subjectScope = await verifyCircularSubjectScope(
      supabase,
      enrollment?.circular_class_id ?? null,
      mark.subject_id
    )
    if (subjectScope.error) {
      console.error('Circular subject scope lookup failed:', subjectScope.error)
      return NextResponse.json({ error: 'Unable to verify subject scope.' }, { status: 500 })
    }
    if (!subjectScope.allowed) {
      return NextResponse.json({ error: 'Subject is outside the assigned class section.' }, { status: 403 })
    }

    const parseScore = (val: any) => {
      if (val === undefined) return undefined
      if (val === null || val === '') return null
      const parsed = parseFloat(val)
      return Number.isFinite(parsed) ? parsed : null
    }

    const updateData: any = {}
    if (bot_score !== undefined) updateData.bot_score = parseScore(bot_score)
    if (mot_score !== undefined) updateData.mot_score = parseScore(mot_score)
    if (eot_score !== undefined) updateData.eot_score = parseScore(eot_score)

    const { data, error } = await supabase.from('circular_marks').update(updateData).eq('id', id).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: mark, error: markError } = await supabase
      .from('circular_marks')
      .select('enrollment_id, subject_id')
      .eq('id', id)
      .maybeSingle()
    if (markError) return NextResponse.json({ error: markError.message }, { status: 500 })
    if (!mark) return NextResponse.json({ error: 'Mark not found' }, { status: 404 })
    const { access, enrollment } = await verifyEnrollmentClassAccess(
      supabase, user, 'write', mark.enrollment_id, 'circular'
    )
    if (!access.isAuthorized) return NextResponse.json({ error: access.message }, { status: 403 })

    const isAdmin =
      isAdministratorRole(access.canonicalRole || access.role) ||
      access.role === 'Administrator' ||
      access.role === 'admin'
    if (!isAdmin) {
      const schoolSettings = await fetchMergedSchoolSettings(supabase)
      const lockCheck = isExamSetLockedForUser(schoolSettings, 'all', isAdmin)
      if (lockCheck.locked) {
        return NextResponse.json({ error: lockCheck.message }, { status: 423 })
      }
    }
    const subjectScope = await verifyCircularSubjectScope(
      supabase,
      enrollment?.circular_class_id ?? null,
      mark.subject_id
    )
    if (subjectScope.error) {
      console.error('Circular subject scope lookup failed:', subjectScope.error)
      return NextResponse.json({ error: 'Unable to verify subject scope.' }, { status: 500 })
    }
    if (!subjectScope.allowed) {
      return NextResponse.json({ error: 'Subject is outside the assigned class section.' }, { status: 403 })
    }

    const { error } = await supabase.from('circular_marks').delete().eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

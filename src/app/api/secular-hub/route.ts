import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess, hasPermission, resolveUserScope, canAccessSubjectInScope } from '@/lib/auth-server'
import { classIdsForType } from '@/lib/teacher-access'
import { fetchAllSupabaseRows } from '@/lib/supabase-pagination'
import { getMarkScore } from '@/lib/mark-scores'
import { resolveEquivalentTerms, fetchAndReconcileSecularMarks } from '@/lib/marks-reconciliation'
import { fetchMergedSchoolSettings } from '@/lib/school-settings-helper'
import { mapClassesToSections, type HubSectionId } from '@/lib/academic-sections'

const VALID_SECTION_IDS = new Set<HubSectionId>(['nursery', 'lower_primary', 'upper_primary'])

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const { searchParams } = new URL(request.url)
    const termId = searchParams.get('term_id')
    const classId = searchParams.get('class_id')
    const rawSectionId = searchParams.get('section_id')

    if (!termId) {
      return withCors(request, NextResponse.json({ error: 'term_id is required' }, { status: 400 }))
    }

    if (rawSectionId && !VALID_SECTION_IDS.has(rawSectionId as HubSectionId)) {
      return withCors(request, NextResponse.json({ error: 'Invalid section_id' }, { status: 400 }))
    }
    const sectionId = (rawSectionId || null) as HubSectionId | null

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'read', null, 'secular')
    if (!authRes.isAuthorized || !hasPermission(authRes, 'read_marks')) {
      return withCors(request, NextResponse.json({ error: authRes.message || 'Forbidden: Insufficient permissions to view hub marks.' }, { status: 403 }))
    }

    const allowedCircularIds = classIdsForType(authRes, 'circular')
    if (allowedCircularIds !== null && allowedCircularIds.length === 0) {
      return withCors(request, NextResponse.json({ enrollments: [], marks: [], subjects: [], classes: [], unmappedClasses: [] }))
    }

    if (classId && allowedCircularIds !== null && !allowedCircularIds.includes(classId)) {
      return withCors(request, NextResponse.json({ error: 'Access to the requested class is denied' }, { status: 403 }))
    }

    const supabaseAdmin = createAdminClient(cookieStore)
    let classesQuery = supabaseAdmin
      .from('circular_classes')
      .select('id, class_name, section')
      .order('section', { ascending: true })
      .order('class_name', { ascending: true })
    if (allowedCircularIds !== null) {
      classesQuery = classesQuery.in('id', allowedCircularIds)
    }

    const [permittedClassesRes, termMetaRes, schoolSettings, circularSubjectsRes] = await Promise.all([
      classesQuery,
      supabaseAdmin
        .from('terms')
        .select('id, academic_year, term_number, label, is_current')
        .eq('id', termId)
        .maybeSingle(),
      fetchMergedSchoolSettings(supabaseAdmin),
      supabaseAdmin
        .from('circular_subjects')
        .select('id, subject_name, section')
        .order('subject_name', { ascending: true }),
    ])

    const permittedClasses = permittedClassesRes.data ?? []
    const sectionMapping = mapClassesToSections(
      permittedClasses,
      'secular',
      schoolSettings.hub_sections,
      schoolSettings.candidate_class_rules
    )
    const sectionClassIds =
      sectionId && !classId ? sectionMapping.bySection[sectionId].map((c) => c.id) : null

    const enrollments =
      sectionClassIds && sectionClassIds.length === 0
        ? []
        : await fetchAllSupabaseRows(() => {
            let query = supabaseAdmin
              .from('enrollments')
              .select(`
                id,
                student_id,
                circular_class_id,
                is_active,
                students!inner ( id, name, admission_number, gender, is_archived ),
                circular_classes ( id, class_name, section )
              `)
              .not('circular_class_id', 'is', null)
              .eq('is_active', true)
              .eq('students.is_archived', false)

            if (classId) {
              query = query.eq('circular_class_id', classId)
            } else if (sectionClassIds) {
              query = query.in('circular_class_id', sectionClassIds)
            } else if (allowedCircularIds !== null) {
              query = query.in('circular_class_id', allowedCircularIds)
            }
            return query.order('id', { ascending: true })
          })

    const normalizedEnrollments = enrollments
      .map((e: any) => ({
        ...e,
        students: Array.isArray(e.students) ? e.students[0] : e.students,
        circular_classes: Array.isArray(e.circular_classes) ? e.circular_classes[0] : e.circular_classes,
      }))
      .filter((e: any) => e.students && e.students.is_archived !== true)

    const enrollmentIds = normalizedEnrollments.map((e) => e.id)

    let subjects = (circularSubjectsRes.data ?? []).map((s: any) => ({
      ...s,
      curriculum: 'secular',
    }))

    // Fallback to legacy `subjects` table if `circular_subjects` is empty or errored
    if (circularSubjectsRes.error || subjects.length === 0) {
      const legacySubjects = await supabaseAdmin
        .from('subjects')
        .select('id, subject_name, section, curriculum')
        .eq('curriculum', 'secular')
      if (!legacySubjects.error && legacySubjects.data) {
        subjects = legacySubjects.data
      }
    }

    const userScope = resolveUserScope(authRes)
    if (userScope.isSubjectTeacher && !userScope.isClassTeacher && userScope.assignedSubjects.length > 0) {
      const filteredSubjects = subjects.filter(
        (s: any) =>
          canAccessSubjectInScope(userScope, null, s.id, 'secular') ||
          canAccessSubjectInScope(userScope, null, s.subject_name, 'secular')
      )
      if (filteredSubjects.length > 0) {
        subjects = filteredSubjects
      }
    }

    const termMeta = termMetaRes.data ?? null

    if (enrollmentIds.length === 0) {
      const emptyRes = NextResponse.json({
        enrollments: [],
        marks: [],
        subjects,
        classes: permittedClasses,
        termMeta,
        unmappedClasses: sectionMapping.unmappedClasses,
        gradingConfig: {
          grading_scale: schoolSettings.grading_scale,
          division_boundaries: schoolSettings.division_boundaries,
          hub_sections: schoolSettings.hub_sections,
          candidate_class_rules: schoolSettings.candidate_class_rules,
        },
        schoolSettings: {
          school_name: schoolSettings.school_name || schoolSettings.name || '',
          arabic_name: schoolSettings.arabic_name || '',
          motto: schoolSettings.motto || '',
          stamp_date: (schoolSettings as any).stamp_date || schoolSettings.print_preferences?.stamp_date || '',
          print_preferences: schoolSettings.print_preferences,
        },
      })
      emptyRes.headers.set('Cache-Control', 'no-store, max-age=0')
      return withCors(request, emptyRes)
    }

    let termInfo = { termIds: [termId], termAliases: [] as string[], academicYear: new Date().getFullYear() }
    try {
      termInfo = await resolveEquivalentTerms(supabaseAdmin, termId)
    } catch (e) {
      console.warn('Secular Hub resolveEquivalentTerms fallback:', e)
    }
    const studentIds = normalizedEnrollments.map((e: any) => e.student_id).filter(Boolean) as string[]

    const reconciledMarks = await fetchAndReconcileSecularMarks(supabaseAdmin, {
      enrollmentIds,
      studentIds,
      termIds: termInfo.termIds,
      termAliases: termInfo.termAliases,
      academicYear: termInfo.academicYear,
    })

    const marks = reconciledMarks.map((mark) => ({
      id: mark.id,
      enrollment_id: mark.enrollment_id,
      student_id: mark.student_id,
      subject_id: mark.subject_id,
      subject_name: mark.subject_name,
      subject_code: mark.subject_code,
      bot_score: mark.bot_score,
      mot_score: mark.mot_score,
      eot_score: mark.eot_score,
    }))

    const response = NextResponse.json({
      enrollments: normalizedEnrollments,
      marks,
      subjects,
      classes: permittedClasses,
      termMeta,
      unmappedClasses: sectionMapping.unmappedClasses,
      gradingConfig: {
        grading_scale: schoolSettings.grading_scale,
        division_boundaries: schoolSettings.division_boundaries,
        hub_sections: schoolSettings.hub_sections,
        candidate_class_rules: schoolSettings.candidate_class_rules,
      },
      schoolSettings: {
        school_name: schoolSettings.school_name || schoolSettings.name || '',
        arabic_name: schoolSettings.arabic_name || '',
        motto: schoolSettings.motto || '',
        stamp_date: (schoolSettings as any).stamp_date || schoolSettings.print_preferences?.stamp_date || '',
        print_preferences: schoolSettings.print_preferences,
      },
    })
    response.headers.set('Cache-Control', 'no-store, max-age=0')
    return withCors(request, response)
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

import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { verifyDataAccess, hasPermission, resolveUserScope, canAccessSubjectInScope } from '@/lib/auth-server'
import { classIdsForType } from '@/lib/teacher-access'
import { fetchAllSupabaseRows } from '@/lib/supabase-pagination'
import { getMarkScore } from '@/lib/mark-scores'
import { resolveEquivalentTerms, fetchAndReconcileTheologyMarks } from '@/lib/marks-reconciliation'
import { isNonMuslimStudent } from '@/lib/student-religion'
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
    const level = searchParams.get('level')

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

    const authRes = await verifyDataAccess(supabase, user, 'read', null, 'theology')
    if (!authRes.isAuthorized || !hasPermission(authRes, 'read_marks')) {
      return withCors(request, NextResponse.json({ error: authRes.message || 'Forbidden: Insufficient permissions to view hub marks.' }, { status: 403 }))
    }

    const allowedTheologyIds = classIdsForType(authRes, 'theology')
    if (allowedTheologyIds !== null && allowedTheologyIds.length === 0) {
      return withCors(request, NextResponse.json({ enrollments: [], marks: [], subjects: [], classes: [], unmappedClasses: [] }))
    }

    if (classId && allowedTheologyIds !== null && !allowedTheologyIds.includes(classId)) {
      return withCors(request, NextResponse.json({ error: 'Access to the requested class is denied' }, { status: 403 }))
    }

    const supabaseAdmin = createAdminClient(cookieStore)
    let classesQuery = supabaseAdmin
      .from('theology_classes')
      .select('id, class_name_arabic, class_name_english, level')
      .order('level', { ascending: true })
      .order('class_name_arabic', { ascending: true })
    if (allowedTheologyIds !== null) {
      classesQuery = classesQuery.in('id', allowedTheologyIds)
    }

    const [permittedClassesRes, termMetaRes, schoolSettings, subjectsRes] = await Promise.all([
      classesQuery,
      supabaseAdmin
        .from('terms')
        .select('id, academic_year, term_number, label, is_current')
        .eq('id', termId)
        .maybeSingle(),
      fetchMergedSchoolSettings(supabaseAdmin),
      supabaseAdmin
        .from('theology_subjects')
        .select('id, subject_name_arabic, level, sort_order')
        .order('sort_order', { ascending: true }),
    ])

    const permittedClasses = permittedClassesRes.data ?? []
    const sectionMapping = mapClassesToSections(
      permittedClasses,
      'theology',
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
                theology_class_id,
                is_active,
                students!inner ( id, name, arabic_name, admission_number, gender, religion, is_muslim, is_archived ),
                theology_classes ( id, class_name_arabic, class_name_english, level )
              `)
              .not('theology_class_id', 'is', null)
              .eq('is_active', true)
              .eq('students.is_archived', false)

            if (classId) {
              query = query.eq('theology_class_id', classId)
            } else if (sectionClassIds) {
              query = query.in('theology_class_id', sectionClassIds)
            } else if (allowedTheologyIds !== null) {
              query = query.in('theology_class_id', allowedTheologyIds)
            }
            return query.order('id', { ascending: true })
          })

    let subjects = (subjectsRes.data ?? []).map((s: any) => ({
      ...s,
      curriculum: 'theology',
    }))

    // Resilient fallback to `subjects` table if `theology_subjects` errored or is empty
    if (subjectsRes.error || subjects.length === 0) {
      console.warn('theology_subjects primary lookup returned empty/error, trying fallback:', subjectsRes.error?.message)
      const fallbackQuery = await supabaseAdmin
        .from('subjects')
        .select('id, subject_name, curriculum, section')
        .eq('curriculum', 'theology')
      if (!fallbackQuery.error && fallbackQuery.data && fallbackQuery.data.length > 0) {
        subjects = fallbackQuery.data.map((s: any) => ({
          id: s.id,
          subject_name_arabic: s.subject_name,
          level: s.section,
          curriculum: 'theology',
        }))
      }
    }

    const userScope = resolveUserScope(authRes)
    if (userScope.isSubjectTeacher && !userScope.isClassTeacher && userScope.assignedSubjects.length > 0) {
      const filteredSubjects = subjects.filter(
        (s: any) =>
          canAccessSubjectInScope(userScope, null, s.id, 'theology') ||
          canAccessSubjectInScope(userScope, null, s.subject_name_arabic, 'theology') ||
          canAccessSubjectInScope(userScope, null, s.subject_name_english, 'theology')
      )
      if (filteredSubjects.length > 0) {
        subjects = filteredSubjects
      }
    }

    // Exclude non-Muslim and theology-exempt students from theology hub
    const filteredEnrollments = enrollments
      .map((e: any) => ({
        ...e,
        students: Array.isArray(e.students) ? e.students[0] : e.students,
        theology_classes: Array.isArray(e.theology_classes) ? e.theology_classes[0] : e.theology_classes,
      }))
      .filter((e: any) => {
        return e.students && e.students.is_archived !== true && !isNonMuslimStudent(e.students)
      })

    const enrollmentIds = filteredEnrollments.map((e: any) => e.id)
    const studentIds = filteredEnrollments.map((e: any) => e.student_id).filter(Boolean) as string[]
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
          theology_grading_scale: schoolSettings.theology_grading_scale,
          theology_division_boundaries: (schoolSettings as any).theology_division_boundaries,
          theology_remarks: schoolSettings.theology_remarks,
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
      console.warn('Theology Hub resolveEquivalentTerms fallback:', e)
    }

    const reconciledMarks = await fetchAndReconcileTheologyMarks(supabaseAdmin, {
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
      mot_score: mark.mot_score,
      eot_score: mark.eot_score,
    }))

    const response = NextResponse.json({
      enrollments: filteredEnrollments,
      marks,
      subjects,
      classes: permittedClasses,
      termMeta,
      unmappedClasses: sectionMapping.unmappedClasses,
      gradingConfig: {
        theology_grading_scale: schoolSettings.theology_grading_scale,
        theology_division_boundaries: (schoolSettings as any).theology_division_boundaries,
        theology_remarks: schoolSettings.theology_remarks,
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

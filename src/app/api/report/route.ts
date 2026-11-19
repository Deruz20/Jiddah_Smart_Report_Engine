import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import {
  getSubjectGradeNumber,
  getGradeDisplay,
  getTheologyGradeNumber,
  getTheologyGradeDisplay,
  getSubjectRemark,
  getTheologySubjectRemark,
  getNurseryGrade,
  isCoreSubject,
  isGradableSubject,
  calculateAggregate,
  calculateTheologyAggregateFromMarks,
  getDivision,
  getTheologyDivision,
  getPromotionStatus,
  getConductRemark,
  getClassTeacherReportComment,
  getHeadTeacherComment,
  getNurseryTeacherComment,
  getNurseryTheologySubjectRemark,
  getTheologyComment,
  getGradingRemarkForScore,
  getGradingRemarkForScores,
  resolveDistinctNurserySecularComments,
  resolveDistinctNurseryTheologyComments,
} from '@/lib/grading'
import { resolveSectionType } from '@/lib/section-type'
import { canAccessClass, isAdministratorRole } from '@/lib/teacher-access'
import { hasRequiredClassForReport } from '@/lib/report-class-context'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { evaluateCriteria, GradingCriterion } from '@/lib/grading-engine'
import { fetchMergedSchoolSettings } from '@/lib/school-settings-helper'
import { getReportSignatures } from '@/utils/signatures'
import { resolveEquivalentTerms, fetchAndReconcileSecularMarks, fetchAndReconcileTheologyMarks, findReconciledMark } from '@/lib/marks-reconciliation'
import { isNonMuslimStudent } from '@/lib/student-religion'
import {
  getLiveIsoDateString,
  isStaleHardcodedStampDate,
  resolveEffectiveStampDate,
} from '@/lib/stamp-date'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type GradeRow = {
  subject_name: string
  score: number | null
}

const TERM_LABELS: Record<string, string> = {
  beginning: 'Beginning Term',
  midterm: 'Mid Term',
  endterm: 'End Term',
}

const TERM_NUMBERS: Record<string, number> = {
  beginning: 1,
  midterm: 2,
  endterm: 3,
}

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function GET(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight
  const searchParams = request.nextUrl.searchParams
  const enrollmentId = searchParams.get('enrollment_id')
  const termId = searchParams.get('term_id')
  const score_type = searchParams.get('score_type') || 'mot'
  const curriculum = searchParams.get('curriculum') || 'secular'
  const stamp_date = searchParams.get('stamp_date') || undefined

  if (!enrollmentId || !termId) {
    return withCors(request, NextResponse.json({ error: 'enrollmentId and termId are required' }, { status: 400 }))
  }

  const scoreType = score_type === 'bot' || score_type === 'mot' || score_type === 'eot'
    ? score_type
    : null
  if (!scoreType) {
    return withCors(request, NextResponse.json({ error: 'score_type must be bot, mot, or eot' }, { status: 400 }))
  }
  if (!['secular', 'theology'].includes(curriculum)) {
    return withCors(request, NextResponse.json({ error: 'curriculum must be secular or theology' }, { status: 400 }))
  }
  const reportCurriculum = curriculum === 'theology' ? 'theology' : 'secular'

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { verifyDataAccess, hasPermission } = await import('@/lib/auth-server')
    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized || !hasPermission(authRes, 'read_reports')) {
      return withCors(
        request,
        NextResponse.json(
          { error: authRes.message || 'Forbidden: You do not have permission to generate report cards.' },
          { status: 403 }
        )
      )
    }

    const supabaseAdmin = createAdminClient(cookieStore)

    const { data: gradingCriteriaData } = await supabaseAdmin.from('grading_criteria').select('*')
    const gradingCriteria = (gradingCriteriaData as GradingCriterion[]) || []

    const schoolSettings = await fetchMergedSchoolSettings(supabaseAdmin, gradingCriteria)

    const { data: enrollment, error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .select(`
        id,
        is_active,
        academic_year,
        circular_class_id,
        circular_classes ( id, class_name, section ),
        theology_class_id,
        theology_classes ( id, class_name_arabic, class_name_english, level ),
        students!inner ( id, name, arabic_name, admission_number, is_muslim, gender, is_archived )
      `)
      .eq('id', enrollmentId)
      .eq('is_active', true)
      .eq('students.is_archived', false)
      .single()

    if (enrollmentError || !enrollment) {
      return withCors(request, NextResponse.json({ error: 'Enrollment not found' }, { status: 404 }))
    }

    const reportCircularClass = Array.isArray(enrollment.circular_classes)
      ? enrollment.circular_classes[0]
      : enrollment.circular_classes
    const reportTheologyClass = Array.isArray(enrollment.theology_classes)
      ? enrollment.theology_classes[0]
      : enrollment.theology_classes

    if (!hasRequiredClassForReport(reportCurriculum, Boolean(reportCircularClass), Boolean(reportTheologyClass))) {
      return withCors(request, NextResponse.json({ error: 'Enrollment is missing a class for the requested curriculum' }, { status: 400 }))
    }

    const isAdmin = isAdministratorRole(authRes.role) || (!authRes.filterByClasses && !authRes.filterByDepartment);
    let allowedReportClass = isAdmin;
    if (!allowedReportClass) {
      if (curriculum === 'theology') {
        allowedReportClass = Boolean(enrollment.theology_class_id && canAccessClass(authRes, 'theology', enrollment.theology_class_id, enrollment.circular_class_id));
      } else if (curriculum === 'secular') {
        allowedReportClass = Boolean(enrollment.circular_class_id && canAccessClass(authRes, 'circular', enrollment.circular_class_id));
      } else {
        // combined curriculum
        const circularOk = Boolean(enrollment.circular_class_id && canAccessClass(authRes, 'circular', enrollment.circular_class_id));
        const theologyOk = Boolean(enrollment.theology_class_id && canAccessClass(authRes, 'theology', enrollment.theology_class_id, enrollment.circular_class_id));
        allowedReportClass = circularOk || theologyOk;
      }
    }
    if (!allowedReportClass) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized: Report is outside your assigned classes or curriculum.' }, { status: 403 }))
    }

    const section = reportCircularClass?.section ?? reportTheologyClass?.level
    const className = reportCircularClass?.class_name ?? reportTheologyClass?.class_name_english
    const sectionType = resolveSectionType(section, className)

    const { data: term, error: termError } = await supabaseAdmin
      .from('terms')
      .select('id, academic_year, term_number, label, is_current, start_date, end_date, next_term_start')
      .eq('id', termId)
      .single()

    if (termError || !term) {
      return withCors(request, NextResponse.json({ error: 'Term not found' }, { status: 404 }))
    }

    const validStampOverride =
      stamp_date && !isStaleHardcodedStampDate(stamp_date) ? stamp_date.trim() : undefined
    term.end_date = validStampOverride || getLiveIsoDateString()
    const resolvedResponseStampDate = resolveEffectiveStampDate(validStampOverride, term.end_date)

    // Reconcile equivalent terms by academic_year and term_number
    const termInfo = await resolveEquivalentTerms(supabaseAdmin, termId)
    const termIds = termInfo.termIds

    let { data: circularSubjects, error: circularSubjectsError } = await supabaseAdmin
      .from('subjects')
      .select('id, subject_name')
      .eq('curriculum', 'secular')
      .eq('section', sectionType)
      .order('subject_name', { ascending: true })

    if (circularSubjectsError || !circularSubjects || circularSubjects.length === 0) {
      const { data: circSubsFallback, error: circSubsFallbackErr } = await supabaseAdmin
        .from('circular_subjects')
        .select('id, subject_name')
        .eq('section', sectionType)
        .order('subject_name', { ascending: true })
      if (!circSubsFallbackErr && circSubsFallback && circSubsFallback.length > 0) {
        circularSubjects = circSubsFallback
        circularSubjectsError = null
      }
    }

    if (circularSubjectsError) {
      return withCors(request, NextResponse.json({ error: circularSubjectsError.message }, { status: 500 }))
    }

    const studentId = (Array.isArray(enrollment.students) ? enrollment.students[0]?.id : (enrollment.students as any)?.id) || null

    const circularMarks = await fetchAndReconcileSecularMarks(supabaseAdmin, {
      enrollmentIds: [enrollmentId],
      studentIds: studentId ? [studentId] : [],
      termIds,
      termAliases: termInfo.termAliases,
      academicYear: term.academic_year,
    })

    const { data: initialsData } = await supabaseAdmin.from('teacher_initials').select('*')
    const teacherInitialsMap: Record<string, string> = {}
    if (initialsData) {
      initialsData.forEach((item: any) => {
        const classKey = item.class_id ? `_${item.class_id}` : ''
        teacherInitialsMap[`${item.level}_${item.subject_id}${classKey}`] = item.initials
      })
    }

    const circularRows = (circularSubjects || []).map((subject: any) => {
      const existing = findReconciledMark(circularMarks || [], {
        studentId,
        enrollmentId,
        subjectId: subject.id,
        subjectName: subject.subject_name,
        curriculum: 'secular',
      })

      const score = scoreType === 'mot'
        ? existing?.mot_score ?? null
        : scoreType === 'bot'
          ? existing?.bot_score ?? null
          : existing?.eot_score ?? null

      const numericScore = typeof score === 'number' ? score : null

      const defaultGrade = numericScore !== null
        ? sectionType === 'nursery' ? getNurseryGrade(numericScore).grade : getGradeDisplay(getSubjectGradeNumber(numericScore, schoolSettings?.grading_scale))
        : '—'
      const defaultRemark = numericScore !== null
        ? sectionType === 'nursery'
          ? getNurseryGrade(numericScore).remark
          : scoreType === 'mot'
            ? getGradingRemarkForScore(numericScore, schoolSettings?.grading_scale)
            : getSubjectRemark(getSubjectGradeNumber(numericScore, schoolSettings?.grading_scale), schoolSettings?.grading_scale)
        : ''

      const overrideGrade = evaluateCriteria(numericScore, 'subject_score', 'secular', enrollment.circular_class_id, gradingCriteria, 'grade_label')
      const overrideRemark = evaluateCriteria(numericScore, 'subject_score', 'secular', enrollment.circular_class_id, gradingCriteria, 'comment')

      const gradeInfo = {
        grade: overrideGrade || defaultGrade,
        remark: overrideRemark || defaultRemark
      }

      const motNumeric = typeof existing?.mot_score === 'number' ? existing.mot_score : null
      const eotNumeric = typeof existing?.eot_score === 'number' ? existing.eot_score : null

      const defaultMotGrade = motNumeric !== null ? (sectionType === 'nursery' ? getNurseryGrade(motNumeric).grade : getGradeDisplay(getSubjectGradeNumber(motNumeric, schoolSettings?.grading_scale))) : null
      const defaultMotRemark = motNumeric !== null ? (sectionType === 'nursery' ? getNurseryGrade(motNumeric).remark : getSubjectRemark(getSubjectGradeNumber(motNumeric, schoolSettings?.grading_scale), schoolSettings?.grading_scale)) : null
      const overrideMotGrade = evaluateCriteria(motNumeric, 'subject_score', 'secular', enrollment.circular_class_id, gradingCriteria, 'grade_label')
      const overrideMotRemark = evaluateCriteria(motNumeric, 'subject_score', 'secular', enrollment.circular_class_id, gradingCriteria, 'comment')

      const motGradeInfo = {
        grade: overrideMotGrade || defaultMotGrade,
        remark: overrideMotRemark || defaultMotRemark
      }

      const defaultEotGrade = eotNumeric !== null ? (sectionType === 'nursery' ? getNurseryGrade(eotNumeric).grade : getGradeDisplay(getSubjectGradeNumber(eotNumeric, schoolSettings?.grading_scale))) : null
      const defaultEotRemark = eotNumeric !== null ? (sectionType === 'nursery' ? getNurseryGrade(eotNumeric).remark : getSubjectRemark(getSubjectGradeNumber(eotNumeric, schoolSettings?.grading_scale), schoolSettings?.grading_scale)) : null
      const overrideEotGrade = evaluateCriteria(eotNumeric, 'subject_score', 'secular', enrollment.circular_class_id, gradingCriteria, 'grade_label')
      const overrideEotRemark = evaluateCriteria(eotNumeric, 'subject_score', 'secular', enrollment.circular_class_id, gradingCriteria, 'comment')

      const eotGradeInfo = {
        grade: overrideEotGrade || defaultEotGrade,
        remark: overrideEotRemark || defaultEotRemark
      }

      const cId = enrollment.circular_class_id;
      const specificInitials = teacherInitialsMap[`${sectionType}_${subject.id}_${cId}`];
      const generalInitials = teacherInitialsMap[`${sectionType}_${subject.id}`];

      return {
        subject_name: subject.subject_name,
        bot_score: existing?.bot_score ?? null,
        mot_score: existing?.mot_score ?? null,
        eot_score: existing?.eot_score ?? null,
        bot_grade_display: existing?.bot_score != null ? (sectionType === 'nursery' ? getNurseryGrade(existing.bot_score).grade : getGradeDisplay(getSubjectGradeNumber(existing.bot_score, schoolSettings?.grading_scale))) : null,
        mot_grade_display: motGradeInfo.grade,
        eot_grade_display: eotGradeInfo.grade,
        score: numericScore,
        grade_display: gradeInfo.grade,
        remark: gradeInfo.remark,
        is_core: isCoreSubject(subject.subject_name, sectionType),
        teacher_initials: specificInitials || generalInitials || '',
      }
    })

    // Sort circular subjects by importance order
    const subjectOrder = {
      'lower_primary': ['ENG', 'MATH', 'LIT I', 'LIT II', 'I.R.E'],
      'upper_primary': ['ENG', 'MATH', 'SCI', 'SST', 'COMP']
    }

    const correctOrder = subjectOrder[sectionType as keyof typeof subjectOrder] || []
    const sortedCircularSubjects = circularRows.sort((a, b) => {
      const aIndex = correctOrder.indexOf(a.subject_name)
      const bIndex = correctOrder.indexOf(b.subject_name)
      // If both subjects are in the order array, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex
      }
      // If only one is in the order array, prioritize it
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      // If neither is in the order array, maintain original order
      return 0
    })

    const aggregateMarks = sortedCircularSubjects
      .filter((row) => typeof row.eot_score === 'number')
      .map((row) => ({ subject_name: row.subject_name, score: row.eot_score as number }))

    const motAggregateMarks = sortedCircularSubjects
      .filter((row) => typeof row.mot_score === 'number')
      .map((row) => ({ subject_name: row.subject_name, score: row.mot_score as number }))

    const botAggregateMarks = sortedCircularSubjects
      .filter((row) => typeof row.bot_score === 'number')
      .map((row) => ({ subject_name: row.subject_name, score: row.bot_score as number }))

    const aggregate = sectionType === 'nursery' ? null : calculateAggregate(aggregateMarks, sectionType, schoolSettings?.grading_scale)
    const mot_aggregate = sectionType === 'nursery' ? null : calculateAggregate(motAggregateMarks, sectionType, schoolSettings?.grading_scale)
    const bot_aggregate = sectionType === 'nursery' ? null : calculateAggregate(botAggregateMarks, sectionType, schoolSettings?.grading_scale)
    const reportAggregate = scoreType === 'mot' ? mot_aggregate : (scoreType === 'bot' ? bot_aggregate : aggregate)
    const division = reportAggregate !== null ? getDivision(reportAggregate, schoolSettings?.division_boundaries) : null
    const isTerm3 = term.term_number === 3
    const promotion_status = isTerm3 && division ? getPromotionStatus(division) : null
    const showClassPosition =
      schoolSettings?.print_preferences?.showClassPosition !== false &&
      schoolSettings?.ranking_preferences?.show_rank !== false

    const circularTotal = sortedCircularSubjects
      .filter((row) => isGradableSubject(row.subject_name, className))
      .reduce(
        (sum, row) => sum + (typeof row.score === 'number' ? row.score : 0),
        0
      )
    const bot_total = sortedCircularSubjects
      .filter((row) => isGradableSubject(row.subject_name, className))
      .reduce(
        (sum, row) => sum + (typeof row.bot_score === 'number' ? row.bot_score : 0),
        0
      )
    const mot_total = sortedCircularSubjects
      .filter((row) => isGradableSubject(row.subject_name, className))
      .reduce(
        (sum, row) => sum + (typeof row.mot_score === 'number' ? row.mot_score : 0),
        0
      )
    const eot_total = sortedCircularSubjects
      .filter((row) => isGradableSubject(row.subject_name, className))
      .reduce(
        (sum, row) => sum + (typeof row.eot_score === 'number' ? row.eot_score : 0),
        0
      )
    const targetTotal = scoreType === 'mot' ? mot_total : (scoreType === 'bot' ? bot_total : eot_total)
    const hasAnyRelevantMark = sortedCircularSubjects.some((row) =>
      typeof (scoreType === 'mot' ? row.mot_score : (scoreType === 'bot' ? row.bot_score : row.eot_score)) === 'number'
    )

    let position: number | null = null
    let total_students: number | null = null

    if (enrollment.circular_class_id && hasAnyRelevantMark && showClassPosition) {
      const { data: classEnrollments } = await supabaseAdmin
        .from('enrollments')
        .select('id, student_id, students!inner(id, is_archived)')
        .eq('circular_class_id', enrollment.circular_class_id)
        .eq('is_active', true)
        .eq('students.is_archived', false)

      if (classEnrollments && classEnrollments.length > 0) {
        const classEnrollmentIds = classEnrollments.map((e) => e.id)
        const classStudentIds = classEnrollments.map((e: any) => e.student_id).filter(Boolean)

        const classMarks = await fetchAndReconcileSecularMarks(supabaseAdmin, {
          enrollmentIds: classEnrollmentIds,
          studentIds: classStudentIds,
          termIds,
          termAliases: termInfo.termAliases,
          academicYear: term.academic_year,
        })

        if (classMarks && classMarks.length > 0) {
          // Only consider actively assessed subjects for complete-set ranking (e.g. skip completely blank COMP)
          const assessedSubjectIds = new Set(
            (circularSubjects || [])
              .filter((subject: any) =>
                classEnrollments.some((e) => {
                  const existing = findReconciledMark(classMarks, {
                    studentId: (e as any).student_id || null,
                    enrollmentId: e.id,
                    subjectId: subject.id,
                    subjectName: subject.subject_name,
                    curriculum: 'secular',
                  })
                  const s =
                    scoreType === 'mot'
                      ? existing?.mot_score
                      : scoreType === 'bot'
                        ? existing?.bot_score
                        : existing?.eot_score
                  return typeof s === 'number'
                })
              )
              .map((s: any) => s.id)
          )

          const entries: { id: string; total: number; isComplete: boolean }[] = []

          for (const e of classEnrollments) {
            const eStudentId = (e as any).student_id || null
            const eRows = (circularSubjects || []).map((subject: any) => {
              const existing = findReconciledMark(classMarks, {
                studentId: eStudentId,
                enrollmentId: e.id,
                subjectId: subject.id,
                subjectName: subject.subject_name,
                curriculum: 'secular',
              })
              const score = scoreType === 'mot'
                ? existing?.mot_score ?? null
                : scoreType === 'bot' ? existing?.bot_score ?? null : existing?.eot_score ?? null
              return { id: subject.id, subject_name: subject.subject_name, score: typeof score === 'number' ? score : null }
            })

            const gradableAssessed = eRows.filter(
              (r) => isGradableSubject(r.subject_name, className) && (assessedSubjectIds.size === 0 || assessedSubjectIds.has(r.id))
            )
            const hasMarks = eRows.some((row) => typeof row.score === 'number')
            if (hasMarks) {
              const eTotal = eRows
                .filter((row) => isGradableSubject(row.subject_name, className))
                .reduce((sum, row) => sum + (typeof row.score === 'number' ? row.score : 0), 0)
              const isComplete =
                gradableAssessed.length > 0 && gradableAssessed.every((row) => typeof row.score === 'number')
              entries.push({ id: e.id, total: eTotal, isComplete })
            }
          }

          const completeEntries = entries.filter((item) => item.isComplete)
          const pool = (completeEntries.length > 0 ? completeEntries : entries).sort((a, b) => b.total - a.total)

          if (pool.length > 0) {
            total_students = classEnrollments.length
            const myEntry = pool.find((item) => item.id === enrollmentId)
            if (myEntry) {
              // Standard competition ranking (1, 2, 2, 4)
              const firstIdx = pool.findIndex((item) => item.total === myEntry.total)
              position = firstIdx !== -1 ? firstIdx + 1 : null
            } else if (hasAnyRelevantMark) {
              const higherCount = pool.filter((item) => item.total > targetTotal).length
              position = higherCount + 1
            }
          }
        }
      }
    }

    const studentDataForTheo = Array.isArray(enrollment.students) ? enrollment.students[0] : enrollment.students
    let theologySectionData: {
      subjects: any[]
      total: number
      mot_total: number
      eot_total: number
      aggregate: number | null
      division: string | null
      teacher_comment: string
      head_teacher_comment: string
    } | null = null
    const theologyClassObjForType = Array.isArray(enrollment.theology_classes)
      ? enrollment.theology_classes[0]
      : (enrollment.theology_classes as any)
    const theologyLevel = theologyClassObjForType?.level
    const isTheologyNursery =
      sectionType === 'nursery' ||
      resolveSectionType(theologyLevel, theologyClassObjForType?.class_name_english || theologyClassObjForType?.class_name_arabic) === 'nursery'
    let existingTheologyMarks: any = null;
    let cachedTheologySubjects: any[] = [];

    if (enrollment.theology_class_id && theologyLevel) {
      let theologySubjects: any[] = []
      const { data: theologySubjectsRaw } = await supabaseAdmin
        .from('theology_subjects')
        .select('id, subject_name_arabic, level, sort_order')
        .eq('level', theologyLevel)
        .order('sort_order', { ascending: true })

      if (theologySubjectsRaw && theologySubjectsRaw.length > 0) {
        theologySubjects = theologySubjectsRaw
      } else {
        const { data: fallbackSubjects } = await supabaseAdmin
          .from('subjects')
          .select('id, subject_name')
          .eq('curriculum', 'theology')
          .eq('section', theologyLevel)
        theologySubjects = fallbackSubjects?.map((s: any) => ({ id: s.id, subject_name_arabic: s.subject_name })) || []
      }
      cachedTheologySubjects = theologySubjects

      const theologyMarks = await fetchAndReconcileTheologyMarks(supabaseAdmin, {
        enrollmentIds: [enrollmentId],
        studentIds: studentId ? [studentId] : [],
        termIds,
        termAliases: termInfo.termAliases,
        academicYear: term.academic_year,
      })

      existingTheologyMarks = theologyMarks

      const theologyRows = (theologySubjects || []).map((subject: any) => {
        const existing = findReconciledMark(theologyMarks || [], {
          studentId,
          enrollmentId,
          subjectId: subject.id,
          subjectName: subject.subject_name_arabic,
          curriculum: 'theology',
        })

        const score = scoreType === 'mot'
          ? existing?.mot_score ?? null
          : existing?.eot_score ?? null

        const numericScore = typeof score === 'number' ? score : null

        const defaultGrade = numericScore !== null ? getTheologyGradeDisplay(numericScore, (schoolSettings as any)?.theology_grading_scale) : '—'
        const overrideGrade = evaluateCriteria(numericScore, 'subject_score', 'theology', enrollment.theology_class_id, gradingCriteria, 'grade_label')
        const grade_display = overrideGrade || defaultGrade

        const defaultMotGrade = typeof existing?.mot_score === 'number' ? getTheologyGradeDisplay(existing.mot_score, (schoolSettings as any)?.theology_grading_scale) : null
        const overrideMotGrade = evaluateCriteria(existing?.mot_score ?? null, 'subject_score', 'theology', enrollment.theology_class_id, gradingCriteria, 'grade_label')
        const mot_grade_display = overrideMotGrade || defaultMotGrade

        const defaultEotGrade = typeof existing?.eot_score === 'number' ? getTheologyGradeDisplay(existing.eot_score, (schoolSettings as any)?.theology_grading_scale) : null
        const overrideEotGrade = evaluateCriteria(existing?.eot_score ?? null, 'subject_score', 'theology', enrollment.theology_class_id, gradingCriteria, 'grade_label')
        const eot_grade_display = overrideEotGrade || defaultEotGrade

        const defaultRemark = existing?.eot_score != null ? (
          getTheologySubjectRemark(getTheologyGradeNumber(existing.eot_score, (schoolSettings as any)?.theology_grading_scale), (schoolSettings as any)?.theology_grading_scale)
        ) : existing?.mot_score != null ? (
          getTheologySubjectRemark(getTheologyGradeNumber(existing.mot_score, (schoolSettings as any)?.theology_grading_scale), (schoolSettings as any)?.theology_grading_scale)
        ) : null
        const overrideRemark = evaluateCriteria(numericScore, 'subject_score', 'theology', enrollment.theology_class_id, gradingCriteria, 'comment')
        const rawTheoRemark = overrideRemark || defaultRemark
        const resolvedTheoRemark = isTheologyNursery
          ? getNurseryTheologySubjectRemark(numericScore ?? existing?.eot_score ?? existing?.mot_score ?? null, rawTheoRemark)
          : rawTheoRemark

        return {
          subject_name_arabic: subject.subject_name_arabic,
          mot_score: existing?.mot_score ?? null,
          eot_score: existing?.eot_score ?? null,
          mot_grade_display,
          eot_grade_display,
          score: numericScore,
          grade_display,
          theology_remark: resolvedTheoRemark
        }
      })

      // Sort theology subjects by importance order
      const theologyOrder = ['القرآن الكريم', 'اللغة العربية', 'الفقه', 'التربية الإسلامية']
      const sortedTheologySubjects = theologyRows.sort((a, b) => {
        const aIndex = theologyOrder.indexOf(a.subject_name_arabic)
        const bIndex = theologyOrder.indexOf(b.subject_name_arabic)
        // If both subjects are in the order array, sort by their position
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex
        }
        // If only one is in the order array, prioritize it
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1
        // If neither is in the order array, maintain original order
        return 0
      })

      const theologyAggregate = calculateTheologyAggregateFromMarks(
        sortedTheologySubjects,
        (schoolSettings as any)?.theology_grading_scale
      )
      const theologyDivision =
        theologyAggregate !== null
          ? getTheologyDivision(theologyAggregate, (schoolSettings as any)?.theology_division_boundaries)
          : null
      const theoTotal = sortedTheologySubjects.reduce(
        (sum, row) => sum + (typeof row.score === 'number' ? row.score : 0),
        0
      )
      const theoMotTotal = sortedTheologySubjects.reduce(
        (sum, row) => sum + (typeof row.mot_score === 'number' ? row.mot_score : 0),
        0
      )
      const theoEotTotal = sortedTheologySubjects.reduce(
        (sum, row) => sum + (typeof row.eot_score === 'number' ? row.eot_score : 0),
        0
      )
      const theoScoredCount =
        sortedTheologySubjects.filter((row) => typeof row.score === 'number').length ||
        sortedTheologySubjects.length
      const hasAnyTheoScore = sortedTheologySubjects.some((row) => typeof row.score === 'number')
      const theologyComment = hasAnyTheoScore || theologyDivision
        ? getTheologyComment(
            hasAnyTheoScore ? theoTotal : null,
            studentDataForTheo?.gender,
            schoolSettings?.theology_remarks,
            theologyDivision,
            theoScoredCount
          )
        : ''
      const theoHeadRule = evaluateCriteria(
        theologyAggregate ?? null,
        'head_comment',
        'theology',
        enrollment.theology_class_id,
        gradingCriteria,
        'comment'
      )
      const resolvedTheoComments = isTheologyNursery
        ? resolveDistinctNurseryTheologyComments({
            teacherComment: theologyComment,
            headComment: theoHeadRule,
            gender: studentDataForTheo?.gender,
          })
        : {
            teacherComment: theologyComment,
            headTeacherComment:
              theoHeadRule && theoHeadRule !== theologyComment
                ? theoHeadRule
                : 'نتيجة مشرفة وجهد مبارك، نتمنى له/لها دوام التفوق والنجاح.',
          }

      theologySectionData = {
        subjects: sortedTheologySubjects,
        total: theoTotal,
        mot_total: theoMotTotal,
        eot_total: theoEotTotal,
        aggregate: theologyAggregate,
        division: theologyDivision,
        teacher_comment: resolvedTheoComments.teacherComment,
        head_teacher_comment: resolvedTheoComments.headTeacherComment,
      }
    }

    let theologyPosition: number | null = null
    let totalTheologyStudents: number | null = null
    if (enrollment.theology_class_id && theologySectionData && typeof theologySectionData.total === 'number' && showClassPosition) {
      const { data: theologyEnrollments } = await supabaseAdmin
        .from('enrollments')
        .select('id, student_id, students!inner(id, is_archived)')
        .eq('theology_class_id', enrollment.theology_class_id)
        .eq('is_active', true)
        .eq('students.is_archived', false)

      if (theologyEnrollments && theologyEnrollments.length > 0) {
        const tEnrollmentIds = theologyEnrollments.map(e => e.id)
        const tStudentIds = theologyEnrollments.map((e: any) => e.student_id).filter(Boolean)
        const allTheologyMarks = await fetchAndReconcileTheologyMarks(supabaseAdmin, {
          enrollmentIds: tEnrollmentIds,
          studentIds: tStudentIds,
          termIds,
          termAliases: termInfo.termAliases,
          academicYear: term.academic_year,
        })

        if (allTheologyMarks && allTheologyMarks.length > 0) {
          const totals: { id: string; total: number }[] = []

          for (const e of theologyEnrollments) {
            const eStudentId = (e as any).student_id || null
            let eTotal = 0
            let hasMarks = false

            if (cachedTheologySubjects.length > 0) {
              for (const sub of cachedTheologySubjects) {
                const match = findReconciledMark(allTheologyMarks, {
                  studentId: eStudentId,
                  enrollmentId: e.id,
                  subjectId: sub.id,
                  subjectName: sub.subject_name_arabic,
                  curriculum: 'theology',
                })
                const s = scoreType === 'mot' ? match?.mot_score : match?.eot_score
                if (typeof s === 'number') {
                  eTotal += s
                  hasMarks = true
                }
              }
            } else {
              const eMarks = allTheologyMarks.filter(
                m => m.enrollment_id === e.id || (eStudentId && m.student_id === eStudentId)
              )
              for (const m of eMarks) {
                const s = scoreType === 'mot' ? m.mot_score : m.eot_score
                if (typeof s === 'number') {
                  eTotal += s
                  hasMarks = true
                }
              }
            }

            if (hasMarks) totals.push({ id: e.id, total: eTotal })
          }

          if (totals.length > 0) {
            totalTheologyStudents = theologyEnrollments.length
            totals.sort((a, b) => b.total - a.total)
            const myObj = totals.find(r => r.id === enrollment.id)
            if (myObj) {
              theologyPosition = totals.findIndex(r => r.total === myObj.total) + 1
            }
          }
        }
      }
      ; (theologySectionData as any).position = theologyPosition
        ; (theologySectionData as any).total_students = totalTheologyStudents
        ; (theologySectionData as any).theology_position = theologyPosition
        ; (theologySectionData as any).theology_total_students = totalTheologyStudents
    }

    const { data: signatureObjects } = await supabaseAdmin.storage.from('signatures').list('', { limit: 100 })
    const signatures: Record<string, string | null> = {
      'head-teacher': null,
      'principal': null,
      'school-stamp': null,
    }
    for (const object of signatureObjects ?? []) {
      const match = object.name.match(/^([a-z0-9-]+)\.(?:png|jpe?g|webp)$/i)
      if (match) {
        signatures[match[1]] = supabaseAdmin.storage.from('signatures').getPublicUrl(object.name).data.publicUrl
      }
    }

    // Only return data for the requested curriculum
    if (curriculum === 'theology') {
      if (!enrollment.theology_class_id) {
        return withCors(request, NextResponse.json({ error: 'Student is not enrolled in a theology class' }, { status: 400 }))
      }

      const studentData = Array.isArray(enrollment.students) ? enrollment.students[0] : enrollment.students
      const theologyClass = Array.isArray(enrollment.theology_classes) ? enrollment.theology_classes[0] : enrollment.theology_classes
      const theologyClassArabic = theologyClass?.class_name_arabic
      const theologyClassEnglish = theologyClass?.class_name_english

      const theoRes = NextResponse.json({
        id: enrollment.id,
        status: 'success',
        student: {
          name: studentData?.name ?? '—',
          admission_number: studentData?.admission_number ?? '—',
          arabic_name: studentData?.arabic_name ?? null,


          religion: studentData?.is_muslim === false ? 'Non-Muslim' : 'Muslim',
          class_name: theologyClassEnglish ?? '—',
          gender: studentData?.gender ?? null,
          theology_class_arabic: theologyClassArabic ?? null,
          theology_class_english: theologyClassEnglish ?? null,
          section: null,
          academic_year: enrollment.academic_year,
        },
        term: {
          label: term.label,
          term_number: term.term_number,
          academic_year: term.academic_year,
          start_date: term.start_date,
          end_date: term.end_date,
          next_term_start: term.next_term_start,
        },
        score_type,
        section_type: sectionType,
        circular: null,
        theology: theologySectionData,
        meta: {
          is_term_3: isTerm3,
          promotion_status: isTerm3 && theologySectionData?.division ? getPromotionStatus(theologySectionData.division as any) : null,
          position: theologyPosition,
          total_students: totalTheologyStudents,
        },
        signatures,
        settings: schoolSettings,
        stamp_date: resolvedResponseStampDate,
        debug: {
          enrollmentId: enrollment.id,
          circularMarksCount: 0,
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        }
      })
      theoRes.headers.set('Cache-Control', 'no-store, max-age=0')
      return withCors(request, theoRes)
    }

    // -- Secular report path ----------------------------------------------------
    const studentData = Array.isArray(enrollment.students) ? enrollment.students[0] : enrollment.students
    const circularClass = Array.isArray(enrollment.circular_classes) ? enrollment.circular_classes[0] : enrollment.circular_classes
    const theologyClass = Array.isArray(enrollment.theology_classes) ? enrollment.theology_classes[0] : enrollment.theology_classes
    const theologyClassArabic = theologyClass?.class_name_arabic
    const theologyClassEnglish = theologyClass?.class_name_english

    const nurseryGradesForComments = sectionType === 'nursery'
      ? sortedCircularSubjects
          .filter((row) => typeof row.score === 'number')
          .map((row) => getNurseryGrade(row.score as number).grade)
      : []
    const nurseryCommentDefault =
      nurseryGradesForComments.length > 0 ? getNurseryTeacherComment(nurseryGradesForComments) : ''
    const classTeacherGradingRule = evaluateCriteria(
      reportAggregate ?? null,
      'aggregate',
      'secular',
      enrollment.circular_class_id,
      gradingCriteria,
      'comment'
    )
    const rawHeadTeacherGradingRule = evaluateCriteria(
      reportAggregate ?? null,
      'head_comment',
      'secular',
      enrollment.circular_class_id,
      gradingCriteria,
      'comment'
    )
    const headTeacherGradingRule =
      sectionType === 'nursery' ? rawHeadTeacherGradingRule : (rawHeadTeacherGradingRule || classTeacherGradingRule)
    const distinctNurserySecularComments =
      sectionType === 'nursery'
        ? resolveDistinctNurserySecularComments({
            classRule: classTeacherGradingRule,
            headRule: rawHeadTeacherGradingRule,
            defaultComment: nurseryCommentDefault,
            grades: nurseryGradesForComments,
            isTerm3,
          })
        : null
    const conductGradingRule = evaluateCriteria(
      reportAggregate ?? null,
      'conduct',
      'secular',
      enrollment.circular_class_id,
      gradingCriteria,
      'comment'
    )

    const reportData = {
      id: enrollment.id,
      status: 'success',
      student: {
        name: studentData?.name ?? '—',
        admission_number: studentData?.admission_number ?? '—',
        arabic_name: studentData?.arabic_name ?? null,

        religion: studentData?.is_muslim === false ? 'Non-Muslim' : 'Muslim',
        class_name: (circularClass as any)?.class_name ?? '—',
        gender: studentData?.gender ?? null,
        theology_class_arabic: theologyClassArabic ?? null,
        theology_class_english: theologyClassEnglish ?? null,
        section,
        academic_year: enrollment.academic_year,
      },
      term: {
        label: term.label,
        term_number: term.term_number,
        academic_year: term.academic_year,
        start_date: term.start_date,
        end_date: term.end_date,
        next_term_start: term.next_term_start,
      },
      score_type,
      section_type: sectionType,
      circular: {
        subjects: sortedCircularSubjects,
        total: targetTotal,
        bot_aggregate,
        mot_aggregate,
        bot_total,
        mot_total,
        eot_total,
        aggregate,
        division,
        conduct_remark: scoreType === 'mot'
          ? ''
          : conductGradingRule ||
            getConductRemark(division, schoolSettings?.division_boundaries, schoolSettings?.promotion_comments?.default_conduct),
        class_teacher_comment: sectionType === 'nursery'
          ? distinctNurserySecularComments?.classTeacherComment || nurseryCommentDefault
          : getClassTeacherReportComment({
              scoreType,
              termNumber: term.term_number,
              promotionStatus: promotion_status,
              gradingComment: classTeacherGradingRule,
              division,
              scores: sortedCircularSubjects.filter(row => row.is_core).map(row => row.score),
              gradingBands: schoolSettings?.grading_scale,
              divisionBoundaries: schoolSettings?.division_boundaries,
              promotionComments: schoolSettings?.promotion_comments,
            }),
        head_teacher_comment: sectionType === 'nursery'
          ? distinctNurserySecularComments?.headTeacherComment || ''
          : scoreType === 'mot'
            ? headTeacherGradingRule || getGradingRemarkForScores(sortedCircularSubjects.filter(row => row.is_core).map(row => row.score), schoolSettings?.grading_scale)
            : headTeacherGradingRule || (division ? getHeadTeacherComment(division, sortedCircularSubjects.filter(row => row.is_core).map(row => row.score), schoolSettings?.grading_scale, schoolSettings?.division_boundaries) : ''),
        position,
        total_students,
      },
      theology: theologySectionData,
      theology_position: theologyPosition,
      theology_total_students: totalTheologyStudents,
      meta: {
        is_term_3: isTerm3,
        promotion_status,
        position,
        total_students,
        theology_position: theologyPosition,
        theology_total_students: totalTheologyStudents,
      },
      signatures,
      settings: schoolSettings,
      stamp_date: resolvedResponseStampDate,
      debug: {
        circularMarksCount: circularMarks?.length || 0,
        enrollmentId,
        termId,
      },
    }

    const secRes = NextResponse.json(reportData)
    secRes.headers.set('Cache-Control', 'no-store, max-age=0')
    return withCors(request, secRes)
  } catch (err: any) {
    console.error('Report API GET error:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}

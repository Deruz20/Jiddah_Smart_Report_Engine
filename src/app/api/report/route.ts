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
  calculateTheologyAggregate,
  getDivision,
  getPromotionStatus,
  getConductRemark,
  getClassTeacherReportComment,
  getHeadTeacherComment,
  getGradingRemarkForScore,
  getGradingRemarkForScores,
} from '@/lib/grading'
import { resolveSectionType } from '@/lib/section-type'
import { hasRequiredClassForReport } from '@/lib/report-class-context'
import { canAccessClass } from '@/lib/teacher-access'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { evaluateCriteria, GradingCriterion } from '@/lib/grading-engine'
import { fetchMergedSchoolSettings } from '@/lib/school-settings-helper'
import { getReportSignatures } from '@/utils/signatures'

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

    const { verifyDataAccess } = await import('@/lib/auth-server')
    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized) {
      return withCors(request, NextResponse.json({ error: authRes.message }, { status: 403 }))
    }

    const { data: gradingCriteriaData } = await supabase.from('grading_criteria').select('*')
    const gradingCriteria = (gradingCriteriaData as GradingCriterion[]) || []

    const schoolSettings = await fetchMergedSchoolSettings(supabase, gradingCriteria)

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        id,
        academic_year,
        circular_class_id,
        circular_classes ( id, class_name, section ),
        theology_class_id,
        theology_classes ( id, class_name_arabic, class_name_english, level ),
        students ( id, name, arabic_name, admission_number, is_muslim, gender )
      `)
      .eq('id', enrollmentId)
      .single()

    if (enrollmentError || !enrollment) {
      return withCors(request, NextResponse.json({ error: 'Enrollment not found' }, { status: 404 }))
    }

    const allowedReportClass = reportCurriculum === 'theology'
      ? canAccessClass(authRes, 'theology', enrollment.theology_class_id, enrollment.circular_class_id)
      : canAccessClass(authRes, 'circular', enrollment.circular_class_id)
    if (!allowedReportClass) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized: Report is outside your assigned classes or curriculum.' }, { status: 403 }))
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

    const section = reportCircularClass?.section ?? reportTheologyClass?.level
    const className = reportCircularClass?.class_name ?? reportTheologyClass?.class_name_english
    const sectionType = resolveSectionType(section, className)

    const { data: term, error: termError } = await supabase
      .from('terms')
      .select('id, academic_year, term_number, label, is_current, start_date, end_date, next_term_start')
      .eq('id', termId)
      .single()

    if (termError || !term) {
      return withCors(request, NextResponse.json({ error: 'Term not found' }, { status: 404 }))
    }

    const { data: circularSubjects, error: circularSubjectsError } = await supabase
      .from('subjects')
      .select('id, subject_name')
      .eq('curriculum', 'secular')
      .eq('section', sectionType)
      .order('subject_name', { ascending: true })

    if (circularSubjectsError) {
      return withCors(request, NextResponse.json({ error: circularSubjectsError.message }, { status: 500 }))
    }

    const { data: circularMarks, error: circularError } = await supabase
      .from('circular_marks')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .eq('term_id', termId);

    const debugInfo = {
      enrollmentId,
      termId,
      circularMarksCount: circularMarks?.length || 0,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    }

    if (circularError) {
      console.error('CIRCULAR MARKS ERROR:', JSON.stringify(circularError, null, 2));
      return withCors(request, NextResponse.json({ error: circularError.message }, { status: 500 }))
    }

    const { data: initialsData } = await supabase.from('teacher_initials').select('*')
    const teacherInitialsMap: Record<string, string> = {}
    if (initialsData) {
      initialsData.forEach((item: any) => {
        const classKey = item.class_id ? `_${item.class_id}` : ''
        teacherInitialsMap[`${item.level}_${item.subject_id}${classKey}`] = item.initials
      })
    }

    const circularRows = (circularSubjects || []).map((subject: any) => {
      const existing = (circularMarks || []).find((m: any) => m.subject_id === subject.id)
      
      const score = scoreType === 'mot'
        ? existing?.mot_score ?? null
        : scoreType === 'bot'
          ? existing?.bot_score ?? null
          : existing?.eot_score ?? null

      const numericScore = typeof score === 'number' ? score : null

      const defaultGrade = numericScore !== null
        ? sectionType === 'nursery' ? getNurseryGrade(numericScore).grade : getGradeDisplay(getSubjectGradeNumber(numericScore))
        : '—'
      const defaultRemark = numericScore !== null
        ? sectionType === 'nursery'
          ? getNurseryGrade(numericScore).remark
          : scoreType === 'mot'
            ? getGradingRemarkForScore(numericScore, schoolSettings?.grading_scale)
            : getSubjectRemark(numericScore, schoolSettings?.grading_scale)
        : ''

      const overrideGrade = evaluateCriteria(numericScore, 'subject_score', 'secular', enrollment.circular_class_id, gradingCriteria, 'grade_label')
      const overrideRemark = evaluateCriteria(numericScore, 'subject_score', 'secular', enrollment.circular_class_id, gradingCriteria, 'comment')

      const gradeInfo = {
        grade: overrideGrade || defaultGrade,
        remark: overrideRemark || defaultRemark
      }

      const motNumeric = typeof existing?.mot_score === 'number' ? existing.mot_score : null
      const eotNumeric = typeof existing?.eot_score === 'number' ? existing.eot_score : null

      const defaultMotGrade = motNumeric !== null ? (sectionType === 'nursery' ? getNurseryGrade(motNumeric).grade : getGradeDisplay(getSubjectGradeNumber(motNumeric))) : null
      const defaultMotRemark = motNumeric !== null ? (sectionType === 'nursery' ? getNurseryGrade(motNumeric).remark : getSubjectRemark(motNumeric, schoolSettings?.grading_scale)) : null
      const overrideMotGrade = evaluateCriteria(motNumeric, 'subject_score', 'secular', enrollment.circular_class_id, gradingCriteria, 'grade_label')
      const overrideMotRemark = evaluateCriteria(motNumeric, 'subject_score', 'secular', enrollment.circular_class_id, gradingCriteria, 'comment')

      const motGradeInfo = {
        grade: overrideMotGrade || defaultMotGrade,
        remark: overrideMotRemark || defaultMotRemark
      }

      const defaultEotGrade = eotNumeric !== null ? (sectionType === 'nursery' ? getNurseryGrade(eotNumeric).grade : getGradeDisplay(getSubjectGradeNumber(eotNumeric))) : null
      const defaultEotRemark = eotNumeric !== null ? (sectionType === 'nursery' ? getNurseryGrade(eotNumeric).remark : getSubjectRemark(eotNumeric, schoolSettings?.grading_scale)) : null
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
        bot_grade_display: existing?.bot_score != null ? (sectionType === 'nursery' ? getNurseryGrade(existing.bot_score).grade : getGradeDisplay(getSubjectGradeNumber(existing.bot_score))) : null,
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

    const aggregate = sectionType === 'nursery' ? null : calculateAggregate(aggregateMarks, sectionType)
    const mot_aggregate = sectionType === 'nursery' ? null : calculateAggregate(motAggregateMarks, sectionType)
    const bot_aggregate = sectionType === 'nursery' ? null : calculateAggregate(botAggregateMarks, sectionType)
    const reportAggregate = scoreType === 'mot' ? mot_aggregate : (scoreType === 'bot' ? bot_aggregate : aggregate)
    const division = reportAggregate !== null ? getDivision(reportAggregate) : null
    const isTerm3 = term.term_number === 3
    const promotion_status = isTerm3 && division ? getPromotionStatus(division) : null

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

    if (enrollment.circular_class_id && hasAnyRelevantMark) {
      const { data: classEnrollments } = await supabase
        .from('enrollments')
        .select('id, student_id')
        .eq('circular_class_id', enrollment.circular_class_id)
        .eq('is_active', true)

      if (classEnrollments && classEnrollments.length > 0) {
        const enrollmentIds = classEnrollments.map((e) => e.id)

        const { data: classMarks } = await supabase
          .from('circular_marks')
          .select('enrollment_id, subject_id, bot_score, mot_score, eot_score')
          .eq('term_id', termId)
          .in('enrollment_id', enrollmentIds)

        if (classMarks) {
          const totals: number[] = []

          for (const e of classEnrollments) {
            const eMarks = classMarks.filter((m) => m.enrollment_id === e.id)
            const eRows = (circularSubjects || []).map((subject: any) => {
              const existing = eMarks.find((m) => m.subject_id === subject.id)
              const score = scoreType === 'mot'
                ? existing?.mot_score ?? null
                : scoreType === 'bot' ? existing?.bot_score ?? null : existing?.eot_score ?? null
              return { subject_name: subject.subject_name, score: typeof score === 'number' ? score : null }
            })

            const eTotal = eRows.reduce((sum, row) => sum + (typeof row.score === 'number' ? row.score : 0), 0)
            const hasMarks = eRows.some((row) => typeof row.score === 'number')

            if (hasMarks) {
              totals.push(eTotal)
            }
          }

          if (totals.length > 0) {
            total_students = classEnrollments.length
            totals.sort((a, b) => b - a) // Highest total is best
            position = totals.indexOf(targetTotal) + 1
          }
        }
      }
    }

    let theologySectionData: { subjects: any[]; total: number; mot_total: number; eot_total: number; aggregate: number | null; division: string | null } | null = null
    const theologyLevel = Array.isArray(enrollment.theology_classes)
      ? enrollment.theology_classes[0]?.level
      : (enrollment.theology_classes as any)?.level
    let existingTheologyMarks: any = null;

    if (enrollment.theology_class_id && theologyLevel) {
      const { data: theologySubjectsRaw, error: theologySubjectsError } = await supabase
        .from('subjects')
        .select('id, subject_name')
        .eq('curriculum', 'theology')
        .eq('section', theologyLevel)

      const theologySubjects = theologySubjectsRaw?.map(s => ({ id: s.id, subject_name_arabic: s.subject_name }))

      if (theologySubjectsError) {
        return withCors(request, NextResponse.json({ error: theologySubjectsError.message }, { status: 500 }))
      }

      const { data: theologyMarks, error: theologyError } = await supabase
        .from('theology_marks')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .eq('term_id', termId);

      if (theologyError) {
        console.error('THEOLOGY MARKS ERROR:', JSON.stringify(theologyError, null, 2));
        return withCors(request, NextResponse.json({ error: theologyError.message }, { status: 500 }))
      }

      existingTheologyMarks = theologyMarks

      const theologyRows = (theologySubjects || []).map((subject: any) => {
        const existing = (theologyMarks || []).find((m: any) => m.subject_id === subject.id)

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
          getTheologySubjectRemark(existing.eot_score, (schoolSettings as any)?.theology_grading_scale)
        ) : existing?.mot_score != null ? (
          getTheologySubjectRemark(existing.mot_score, (schoolSettings as any)?.theology_grading_scale)
        ) : null
        const overrideRemark = evaluateCriteria(numericScore, 'subject_score', 'theology', enrollment.theology_class_id, gradingCriteria, 'comment')

        return {
          subject_name_arabic: subject.subject_name_arabic,
          mot_score: existing?.mot_score ?? null,
          eot_score: existing?.eot_score ?? null,
          mot_grade_display,
          eot_grade_display,
          score: numericScore,
          grade_display,
          theology_remark: overrideRemark || defaultRemark
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

      const theologyScores = sortedTheologySubjects.map((row) => row.score)
      const theologyAggregate = theologyScores.some((score) => score == null)
        ? null
        : calculateTheologyAggregate(theologyScores as number[], (schoolSettings as any)?.theology_grading_scale)

      theologySectionData = {
        subjects: sortedTheologySubjects,
        total: sortedTheologySubjects.reduce(
          (sum, row) => sum + (typeof row.score === 'number' ? row.score : 0),
          0
        ),
        mot_total: sortedTheologySubjects.reduce(
          (sum, row) => sum + (typeof row.mot_score === 'number' ? row.mot_score : 0),
          0
        ),
        eot_total: sortedTheologySubjects.reduce(
          (sum, row) => sum + (typeof row.eot_score === 'number' ? row.eot_score : 0),
          0
        ),
        aggregate: theologyAggregate,
        division: theologyAggregate !== null ? getDivision(theologyAggregate) : null,
      }
    }
    const signatures = await getReportSignatures(createAdminClient())

    // Only return data for the requested curriculum
    if (curriculum === 'theology') {
      if (!enrollment.theology_class_id) {
        return withCors(request, NextResponse.json({ error: 'Student is not enrolled in a theology class' }, { status: 400 }))
      }

      const studentData = Array.isArray(enrollment.students) ? enrollment.students[0] : enrollment.students
      const theologyClass = Array.isArray(enrollment.theology_classes) ? enrollment.theology_classes[0] : enrollment.theology_classes
      const theologyClassArabic = theologyClass?.class_name_arabic
      const theologyClassEnglish = theologyClass?.class_name_english

      // For theology ranking, we need to calculate class positions.
      // Doing this inline for theology if requested in theology mode.
      let theologyPosition = null;
      let totalTheologyStudents = null;

      if (enrollment.theology_class_id && theologySectionData && typeof theologySectionData.total === 'number') {
        const { data: theologyEnrollments } = await supabase
          .from('enrollments')
          .select('id, student_id')
          .eq('theology_class_id', enrollment.theology_class_id)
          .eq('is_active', true)

        if (theologyEnrollments && theologyEnrollments.length > 0) {
          const tEnrollmentIds = theologyEnrollments.map(e => e.id)
          const { data: allTheologyMarks } = await supabase
            .from('theology_marks')
            .select('enrollment_id, subject_id, mot_score, eot_score')
            .eq('term_id', termId)
            .in('enrollment_id', tEnrollmentIds)

          if (allTheologyMarks) {
            const totals: {id: string, total: number}[] = []

            for (const e of theologyEnrollments) {
              const eMarks = allTheologyMarks.filter(m => m.enrollment_id === e.id)
              let eTotal = 0
              let hasMarks = false

              for (const m of eMarks) {
                 const s = scoreType === 'mot' ? m.mot_score : m.eot_score;
                 if (typeof s === 'number') {
                    eTotal += s;
                    hasMarks = true;
                 }
              }

              if (hasMarks) totals.push({ id: e.id, total: eTotal })
            }

            if (totals.length > 0) {
              totalTheologyStudents = theologyEnrollments.length
              totals.sort((a, b) => b.total - a.total)
              const myObj = totals.find(r => r.id === enrollment.id)
              if (myObj) {
                // Standard Competition Ranking (1224 ranking)
                theologyPosition = totals.findIndex(r => r.total === myObj.total) + 1
              }
            }
          }
        }
      }


      return withCors(request, NextResponse.json({
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
          debug: {
            enrollmentId: enrollment.id,
            circularMarksCount: 0,
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          }
        }))
    }

    // -- Secular report path ----------------------------------------------------
    const studentData = Array.isArray(enrollment.students) ? enrollment.students[0] : enrollment.students
    const circularClass = Array.isArray(enrollment.circular_classes) ? enrollment.circular_classes[0] : enrollment.circular_classes
    const theologyClass = Array.isArray(enrollment.theology_classes) ? enrollment.theology_classes[0] : enrollment.theology_classes
    const theologyClassArabic = theologyClass?.class_name_arabic
    const theologyClassEnglish = theologyClass?.class_name_english

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
          : evaluateCriteria(reportAggregate ?? null, 'aggregate', 'secular', enrollment.circular_class_id, gradingCriteria, 'comment') || getConductRemark(division),
        class_teacher_comment: getClassTeacherReportComment({
          scoreType,
          termNumber: term.term_number,
          promotionStatus: promotion_status,
          gradingComment: evaluateCriteria(reportAggregate ?? null, 'aggregate', 'secular', enrollment.circular_class_id, gradingCriteria, 'comment'),
          division,
          scores: sortedCircularSubjects.filter(row => row.is_core).map(row => row.score),
          gradingBands: schoolSettings?.grading_scale,
        }),
        head_teacher_comment: scoreType === 'mot'
          ? evaluateCriteria(reportAggregate ?? null, 'aggregate', 'secular', enrollment.circular_class_id, gradingCriteria, 'comment') || getGradingRemarkForScores(sortedCircularSubjects.filter(row => row.is_core).map(row => row.score), schoolSettings?.grading_scale)
          : evaluateCriteria(reportAggregate ?? null, 'aggregate', 'secular', enrollment.circular_class_id, gradingCriteria, 'comment') || (division ? getHeadTeacherComment(division, sortedCircularSubjects.filter(row => row.is_core).map(row => row.score), schoolSettings?.grading_scale) : ''),
        position,
        total_students,
      },
      theology: curriculum === 'secular' ? null : theologySectionData,
      meta: {
        is_term_3: isTerm3,
        promotion_status,
        position,
        total_students,
      },
      signatures,
      settings: schoolSettings,
      debug: {debugInfo},
    }

    return withCors(request, NextResponse.json(reportData))
  } catch (err: any) {
    console.error('Report API GET error:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}

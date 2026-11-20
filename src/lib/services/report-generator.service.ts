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
  getDynamicTheologyPromotionText,
  getConductRemark,
  getClassTeacherReportComment,
  getHeadTeacherComment,
  getNurseryTeacherComment,
  getNurseryTheologySubjectRemark,
  getTheologyComment,
  getGradingRemarkForScore,
  resolveDistinctNurserySecularComments,
  resolveDistinctNurseryTheologyComments,
} from '@/lib/grading'
import { evaluateCriteria, GradingCriterion } from '@/lib/grading-engine'
import { findReconciledMark, ReconciledMarkEntry } from '@/lib/marks-reconciliation'

export interface SubjectRowSecular {
  subject_name: string
  bot_score: number | null
  mot_score: number | null
  eot_score: number | null
  bot_grade_display: string | null
  mot_grade_display: string | null
  eot_grade_display: string | null
  score: number | null
  grade_display: string
  remark: string
  is_core: boolean
  teacher_initials: string
}

export interface SubjectRowTheology {
  subject_name_arabic: string
  mot_score: number | null
  eot_score: number | null
  mot_grade_display: string | null
  eot_grade_display: string | null
  score: number | null
  grade_display: string
  theology_remark: string | null
}

const SECULAR_SUBJECT_ORDER: Record<string, string[]> = {
  lower_primary: ['ENG', 'MATH', 'LIT I', 'LIT II', 'I.R.E'],
  upper_primary: ['ENG', 'MATH', 'SCI', 'SST', 'COMP'],
}

const THEOLOGY_SUBJECT_ORDER = ['القرآن الكريم', 'اللغة العربية', 'الفقه', 'التربية الإسلامية']

/**
 * Builds and sorts secular subject rows from reconciled marks and criteria overrides.
 */
export function buildSecularSubjectRows({
  circularSubjects,
  circularMarks,
  studentId,
  enrollmentId,
  circularClassId,
  scoreType,
  sectionType,
  schoolSettings,
  gradingCriteria = [],
  teacherInitialsMap = {},
}: {
  circularSubjects: Array<{ id: string; subject_name: string }>
  circularMarks: ReconciledMarkEntry[]
  studentId: string | null
  enrollmentId: string
  circularClassId: string | null
  scoreType: 'bot' | 'mot' | 'eot'
  sectionType: string
  schoolSettings: any
  gradingCriteria?: GradingCriterion[]
  teacherInitialsMap?: Record<string, string>
}): SubjectRowSecular[] {
  const isNursery = sectionType === 'nursery'

  const rows = (circularSubjects || []).map((subject) => {
    const existing = findReconciledMark(circularMarks || [], {
      studentId,
      enrollmentId,
      subjectId: subject.id,
      subjectName: subject.subject_name,
      curriculum: 'secular',
    })

    const score =
      scoreType === 'mot'
        ? existing?.mot_score ?? null
        : scoreType === 'bot'
          ? existing?.bot_score ?? null
          : existing?.eot_score ?? null

    const numericScore = typeof score === 'number' && Number.isFinite(score) ? score : null

    const defaultGrade =
      numericScore !== null
        ? isNursery
          ? getNurseryGrade(numericScore).grade
          : getGradeDisplay(getSubjectGradeNumber(numericScore, schoolSettings?.grading_scale))
        : '—'

    const defaultRemark =
      numericScore !== null
        ? isNursery
          ? getNurseryGrade(numericScore).remark
          : scoreType === 'mot'
            ? getGradingRemarkForScore(numericScore, schoolSettings?.grading_scale)
            : getSubjectRemark(
                getSubjectGradeNumber(numericScore, schoolSettings?.grading_scale),
                schoolSettings?.grading_scale
              )
        : ''

    const overrideGrade = evaluateCriteria(
      numericScore,
      'subject_score',
      'secular',
      circularClassId,
      gradingCriteria,
      'grade_label'
    )
    const overrideRemark = evaluateCriteria(
      numericScore,
      'subject_score',
      'secular',
      circularClassId,
      gradingCriteria,
      'comment'
    )

    const motNumeric =
      typeof existing?.mot_score === 'number' && Number.isFinite(existing.mot_score)
        ? existing.mot_score
        : null
    const eotNumeric =
      typeof existing?.eot_score === 'number' && Number.isFinite(existing.eot_score)
        ? existing.eot_score
        : null

    const defaultMotGrade =
      motNumeric !== null
        ? isNursery
          ? getNurseryGrade(motNumeric).grade
          : getGradeDisplay(getSubjectGradeNumber(motNumeric, schoolSettings?.grading_scale))
        : null
    const defaultMotRemark =
      motNumeric !== null
        ? isNursery
          ? getNurseryGrade(motNumeric).remark
          : getSubjectRemark(
              getSubjectGradeNumber(motNumeric, schoolSettings?.grading_scale),
              schoolSettings?.grading_scale
            )
        : null
    const overrideMotGrade = evaluateCriteria(
      motNumeric,
      'subject_score',
      'secular',
      circularClassId,
      gradingCriteria,
      'grade_label'
    )
    const overrideMotRemark = evaluateCriteria(
      motNumeric,
      'subject_score',
      'secular',
      circularClassId,
      gradingCriteria,
      'comment'
    )

    const defaultEotGrade =
      eotNumeric !== null
        ? isNursery
          ? getNurseryGrade(eotNumeric).grade
          : getGradeDisplay(getSubjectGradeNumber(eotNumeric, schoolSettings?.grading_scale))
        : null
    const defaultEotRemark =
      eotNumeric !== null
        ? isNursery
          ? getNurseryGrade(eotNumeric).remark
          : getSubjectRemark(
              getSubjectGradeNumber(eotNumeric, schoolSettings?.grading_scale),
              schoolSettings?.grading_scale
            )
        : null
    const overrideEotGrade = evaluateCriteria(
      eotNumeric,
      'subject_score',
      'secular',
      circularClassId,
      gradingCriteria,
      'grade_label'
    )
    const overrideEotRemark = evaluateCriteria(
      eotNumeric,
      'subject_score',
      'secular',
      circularClassId,
      gradingCriteria,
      'comment'
    )

    const specificInitials = circularClassId
      ? teacherInitialsMap[`${sectionType}_${subject.id}_${circularClassId}`]
      : undefined
    const generalInitials = teacherInitialsMap[`${sectionType}_${subject.id}`]

    return {
      subject_name: subject.subject_name,
      bot_score: existing?.bot_score ?? null,
      mot_score: existing?.mot_score ?? null,
      eot_score: existing?.eot_score ?? null,
      bot_grade_display:
        existing?.bot_score != null
          ? isNursery
            ? getNurseryGrade(existing.bot_score).grade
            : getGradeDisplay(getSubjectGradeNumber(existing.bot_score, schoolSettings?.grading_scale))
          : null,
      mot_grade_display: overrideMotGrade || defaultMotGrade,
      eot_grade_display: overrideEotGrade || defaultEotGrade,
      score: numericScore,
      grade_display: overrideGrade || defaultGrade,
      remark: overrideRemark || defaultRemark,
      is_core: isCoreSubject(subject.subject_name, sectionType),
      teacher_initials: specificInitials || generalInitials || '',
    }
  })

  const correctOrder = SECULAR_SUBJECT_ORDER[sectionType] || []
  return rows.sort((a, b) => {
    const aIndex = correctOrder.indexOf(a.subject_name)
    const bIndex = correctOrder.indexOf(b.subject_name)
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return 0
  })
}

/**
 * Builds and sorts theology subject rows from reconciled marks and criteria overrides.
 */
export function buildTheologySubjectRows({
  theologySubjects,
  theologyMarks,
  studentId,
  enrollmentId,
  theologyClassId,
  scoreType,
  isTheologyNursery,
  schoolSettings,
  gradingCriteria = [],
}: {
  theologySubjects: Array<{ id: string; subject_name_arabic: string }>
  theologyMarks: ReconciledMarkEntry[]
  studentId: string | null
  enrollmentId: string
  theologyClassId: string | null
  scoreType: 'bot' | 'mot' | 'eot'
  isTheologyNursery: boolean
  schoolSettings: any
  gradingCriteria?: GradingCriterion[]
}): SubjectRowTheology[] {
  const rows = (theologySubjects || []).map((subject) => {
    const existing = findReconciledMark(theologyMarks || [], {
      studentId,
      enrollmentId,
      subjectId: subject.id,
      subjectName: subject.subject_name_arabic,
      curriculum: 'theology',
    })

    const score =
      scoreType === 'mot' ? existing?.mot_score ?? null : existing?.eot_score ?? null

    const numericScore = typeof score === 'number' && Number.isFinite(score) ? score : null

    const defaultGrade =
      numericScore !== null
        ? getTheologyGradeDisplay(numericScore, schoolSettings?.theology_grading_scale)
        : '—'
    const overrideGrade = evaluateCriteria(
      numericScore,
      'subject_score',
      'theology',
      theologyClassId,
      gradingCriteria,
      'grade_label'
    )
    const grade_display = overrideGrade || defaultGrade

    const defaultMotGrade =
      typeof existing?.mot_score === 'number' && Number.isFinite(existing.mot_score)
        ? getTheologyGradeDisplay(existing.mot_score, schoolSettings?.theology_grading_scale)
        : null
    const overrideMotGrade = evaluateCriteria(
      existing?.mot_score ?? null,
      'subject_score',
      'theology',
      theologyClassId,
      gradingCriteria,
      'grade_label'
    )

    const defaultEotGrade =
      typeof existing?.eot_score === 'number' && Number.isFinite(existing.eot_score)
        ? getTheologyGradeDisplay(existing.eot_score, schoolSettings?.theology_grading_scale)
        : null
    const overrideEotGrade = evaluateCriteria(
      existing?.eot_score ?? null,
      'subject_score',
      'theology',
      theologyClassId,
      gradingCriteria,
      'grade_label'
    )

    const defaultRemark =
      existing?.eot_score != null
        ? getTheologySubjectRemark(
            getTheologyGradeNumber(existing.eot_score, schoolSettings?.theology_grading_scale),
            schoolSettings?.theology_grading_scale
          )
        : existing?.mot_score != null
          ? getTheologySubjectRemark(
              getTheologyGradeNumber(existing.mot_score, schoolSettings?.theology_grading_scale),
              schoolSettings?.theology_grading_scale
            )
          : null

    const overrideRemark = evaluateCriteria(
      numericScore,
      'subject_score',
      'theology',
      theologyClassId,
      gradingCriteria,
      'comment'
    )

    const rawTheoRemark = overrideRemark || defaultRemark
    const resolvedTheoRemark = isTheologyNursery
      ? getNurseryTheologySubjectRemark(
          numericScore ?? existing?.eot_score ?? existing?.mot_score ?? null,
          rawTheoRemark
        )
      : rawTheoRemark

    return {
      subject_name_arabic: subject.subject_name_arabic,
      mot_score: existing?.mot_score ?? null,
      eot_score: existing?.eot_score ?? null,
      mot_grade_display: overrideMotGrade || defaultMotGrade,
      eot_grade_display: overrideEotGrade || defaultEotGrade,
      score: numericScore,
      grade_display,
      theology_remark: resolvedTheoRemark,
    }
  })

  return rows.sort((a, b) => {
    const aIndex = THEOLOGY_SUBJECT_ORDER.indexOf(a.subject_name_arabic)
    const bIndex = THEOLOGY_SUBJECT_ORDER.indexOf(b.subject_name_arabic)
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return 0
  })
}

/**
 * Computes secular aggregates, division, and totals.
 */
export function computeSecularAggregates({
  sortedCircularSubjects,
  sectionType,
  className,
  scoreType,
  schoolSettings,
}: {
  sortedCircularSubjects: SubjectRowSecular[]
  sectionType: string
  className?: string
  scoreType: 'bot' | 'mot' | 'eot'
  schoolSettings: any
}) {
  const isNursery = sectionType === 'nursery'

  const aggregateMarks = sortedCircularSubjects
    .filter((row) => typeof row.eot_score === 'number')
    .map((row) => ({ subject_name: row.subject_name, score: row.eot_score as number }))

  const motAggregateMarks = sortedCircularSubjects
    .filter((row) => typeof row.mot_score === 'number')
    .map((row) => ({ subject_name: row.subject_name, score: row.mot_score as number }))

  const botAggregateMarks = sortedCircularSubjects
    .filter((row) => typeof row.bot_score === 'number')
    .map((row) => ({ subject_name: row.subject_name, score: row.bot_score as number }))

  const aggregate = isNursery
    ? null
    : calculateAggregate(aggregateMarks, sectionType, schoolSettings?.grading_scale)
  const mot_aggregate = isNursery
    ? null
    : calculateAggregate(motAggregateMarks, sectionType, schoolSettings?.grading_scale)
  const bot_aggregate = isNursery
    ? null
    : calculateAggregate(botAggregateMarks, sectionType, schoolSettings?.grading_scale)

  const reportAggregate =
    scoreType === 'mot' ? mot_aggregate : scoreType === 'bot' ? bot_aggregate : aggregate

  const division =
    reportAggregate !== null
      ? getDivision(reportAggregate, schoolSettings?.division_boundaries)
      : null

  const bot_total = sortedCircularSubjects
    .filter((row) => isGradableSubject(row.subject_name, className))
    .reduce((sum, row) => sum + (typeof row.bot_score === 'number' ? row.bot_score : 0), 0)

  const mot_total = sortedCircularSubjects
    .filter((row) => isGradableSubject(row.subject_name, className))
    .reduce((sum, row) => sum + (typeof row.mot_score === 'number' ? row.mot_score : 0), 0)

  const eot_total = sortedCircularSubjects
    .filter((row) => isGradableSubject(row.subject_name, className))
    .reduce((sum, row) => sum + (typeof row.eot_score === 'number' ? row.eot_score : 0), 0)

  const targetTotal = scoreType === 'mot' ? mot_total : scoreType === 'bot' ? bot_total : eot_total

  return {
    aggregate,
    mot_aggregate,
    bot_aggregate,
    reportAggregate,
    division,
    bot_total,
    mot_total,
    eot_total,
    targetTotal,
  }
}

/**
 * Computes theology aggregate and division from sorted theology subjects.
 */
export function computeTheologyAggregates({
  sortedTheologySubjects,
  schoolSettings,
}: {
  sortedTheologySubjects: SubjectRowTheology[]
  schoolSettings: any
}) {
  const theologyAggregate = calculateTheologyAggregateFromMarks(
    sortedTheologySubjects,
    schoolSettings?.theology_grading_scale
  )

  const theologyDivision =
    theologyAggregate !== null
      ? getTheologyDivision(theologyAggregate, schoolSettings?.theology_division_boundaries)
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

  return {
    theologyAggregate,
    theologyDivision,
    theoTotal,
    theoMotTotal,
    theoEotTotal,
  }
}

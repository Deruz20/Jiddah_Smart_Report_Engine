import {
  CANDIDATE_NA_BADGE,
  DEFAULT_HUB_SECTIONS,
  doesExamApplyToClassInTerm,
  formatClassDisplayName,
  mapClassesToSections,
  type CandidateClassExclusionRule,
  type ClassLikeRecord,
  type ExamPhase,
  type HubCurriculum,
  type HubSectionDefinition,
  type HubSectionId,
  type UnmappedClassWarning,
} from './academic-sections'
import {
  computeHubCohortMetrics,
  getSubjectsForHubClass,
  type HubCohortComputationResult,
  type HubStudentRow,
  type HubSubjectRecord,
  type MissingMarksEntry,
} from './hub-cohort-engine'
import { isNurseryClass } from './grading'
import type {
  DivisionBoundaryItem,
  GradingBand,
  MarksLocksConfig,
  TheologyDivisionBoundaryItem,
} from './school-settings-helper'

export interface HubGradingConfig {
  grading_scale?: GradingBand[]
  division_boundaries?: DivisionBoundaryItem[]
  theology_grading_scale?: GradingBand[]
  theology_division_boundaries?: TheologyDivisionBoundaryItem[]
  hub_sections?: HubSectionDefinition[]
  candidate_class_rules?: CandidateClassExclusionRule[]
}

export type DetailedReportScope = 'school' | 'section' | 'class'

export const DEFAULT_SUPPORT_THRESHOLD = 50
export const MIN_SUPPORT_THRESHOLD = 35
export const MAX_SUPPORT_THRESHOLD = 65

export function clampSupportThreshold(value: unknown): number {
  if (value === null || value === undefined || value === '') return DEFAULT_SUPPORT_THRESHOLD
  const num = Number(value)
  if (!Number.isFinite(num)) return DEFAULT_SUPPORT_THRESHOLD
  return Math.max(MIN_SUPPORT_THRESHOLD, Math.min(MAX_SUPPORT_THRESHOLD, Math.round(num)))
}

export interface LearnerReportSummary {
  id: string
  studentId: string
  name: string
  arabicName: string
  admissionNumber: string
  gender: string
  classId: string
  className: string
  sectionId: HubSectionId | null
  total: number | null
  normalizedScore: number | null
  average: number | null
  aggregate: number | null
  division: string
  position: number | string
  expectedSubjectCount: number
  satSubjectCount: number
  isCompleteMarks: boolean
  isCandidateExcluded: boolean
  candidateBadge: string | null
  missingSubjects: string[]
  bot_score?: string | number | null
  mot_score?: string | number | null
  eot_score?: string | number | null
  overall_total?: number | null
  overall_average?: string | number | null
}

export interface SubjectClassComparisonCell {
  classId: string
  className: string
  mean: number | null
  passRate: number | null
  satCount: number
  expectedCount: number
  candidateExcluded: boolean
}

export interface SubjectReportRow {
  subjectId: string
  subjectName: string
  subjectNameArabic: string
  mean: number | null
  median: number | null
  highest: number | null
  lowest: number | null
  passRate: number | null
  satCount: number
  expectedCount: number
  missingCount: number
  isStrongest: boolean
  isWeakest: boolean
  byClass: SubjectClassComparisonCell[]
}

export interface ClassComparisonRow {
  classId: string
  className: string
  arabicName?: string
  englishName?: string
  sectionId: HubSectionId | null
  sectionLabel: string
  sectionLabelArabic: string
  totalEnrolled: number
  satComplete: number
  satPartial: number
  absentOrNoMarks: number
  incompleteCount: number
  completionPct: number
  meanPct: number | null
  medianPct: number | null
  highestPct: number | null
  lowestPct: number | null
  meanTotal: number | null
  highestTotal: number | null
  lowestTotal: number | null
  passRatePct: number | null
  needsSupportCount: number
  divCounts: {
    I: number
    II: number
    III: number
    IV: number
    U: number
    unranked: number
  }
  candidateExcluded: boolean
  candidateBadge: string | null
}

export interface SectionComparisonRow {
  sectionId: HubSectionId
  label: string
  labelArabic: string
  classCount: number
  activeNonExcludedClassCount: number
  totalEnrolled: number
  satComplete: number
  incompleteCount: number
  completionPct: number
  candidateExcludedCount: number
  meanPct: number | null
  medianPct: number | null
  highestPct: number | null
  lowestPct: number | null
  passRatePct: number | null
  needsSupportCount: number
  topLearner: {
    studentId: string
    name: string
    arabicName: string
    className: string
    normalizedScore: number
  } | null
}

export interface GenderSplitRow {
  genderKey: 'male' | 'female' | 'unspecified'
  label: string
  labelArabic: string
  enrolledCount: number
  satCompleteCount: number
  meanPct: number | null
  medianPct: number | null
  passRatePct: number | null
  needsSupportCount: number
}

export interface TrendLearnerDelta {
  studentId: string
  name: string
  arabicName: string
  className: string
  previousPct: number
  currentPct: number
  deltaPct: number
  previousDivision: string
  currentDivision: string
}

export interface TrendComparisonBlock {
  kind: 'previous_exam' | 'previous_term'
  available: boolean
  reason?: string
  reasonArabic?: string
  baselineLabel: string
  baselineLabelArabic: string
  previousMeanPct: number | null
  currentMeanPct: number | null
  deltaMeanPct: number | null
  previousPassRatePct: number | null
  currentPassRatePct: number | null
  deltaPassRatePct: number | null
  previousSatCount: number
  currentSatCount: number
  matchedLearnerCount: number
  improvedLearners: TrendLearnerDelta[]
  declinedLearners: TrendLearnerDelta[]
}

export interface CycleCompletenessClassRow {
  classId: string
  className: string
  sectionId: HubSectionId | null
  candidateExcluded: boolean
  candidateBadge: string | null
  totalEnrolled: number
  marksCompleteCount: number
  marksCompletionPct: number
  remarksReadyCount: number
  remarksReadyPct: number
  conductReadyCount: number | null
  conductReadyPct: number | null
  conductStatusNote: string
  conductStatusNoteArabic: string
  examLocked: boolean
}

export interface OutOfRangeScoreFlag {
  enrollmentId: string
  studentName: string
  className: string
  subjectId: string
  subjectName: string
  field: 'bot_score' | 'mot_score' | 'eot_score'
  score: number
}

export interface DuplicateMarkFlag {
  enrollmentId: string
  studentName: string
  className: string
  subjectId: string
  subjectName: string
  rowCount: number
}

export interface DeterministicInsight {
  id: string
  category: 'cohort' | 'performance' | 'subjects' | 'support' | 'trend' | 'comparison' | 'quality'
  severity: 'neutral' | 'positive' | 'warning'
  title: string
  titleArabic: string
  text: string
  textArabic: string
}

export interface OmittedMetricNote {
  key: string
  label: string
  labelArabic: string
  reason: string
  reasonArabic: string
}

export interface DetailedReportResult {
  meta: {
    curriculum: HubCurriculum
    scope: DetailedReportScope
    sectionId: HubSectionId | null
    classId: string | null
    scopeLabel: string
    scopeLabelArabic: string
    termId: string
    termLabel: string
    termNumber: number
    academicYear: number
    examPhase: ExamPhase
    supportThreshold: number
    isNormalized: boolean
    rankingMethodLabel: string
    rankingMethodLabelArabic: string
    generatedAt: string
    examLocked: boolean
  }
  cohort: {
    totalEnrolled: number
    satComplete: number
    satPartial: number
    absentOrNoMarks: number
    incompleteTotal: number
    completionPct: number
    candidateExcludedCount: number
    candidateExclusions: Array<{
      classId: string
      className: string
      badge: string
      enrolled: number
    }>
    missingByClass: Array<{
      classId: string
      className: string
      sectionId: HubSectionId | null
      enrolled: number
      satComplete: number
      missingCount: number
      completionPct: number
      candidateExcluded: boolean
      candidateBadge: string | null
    }>
    missingBySubject: Array<{
      subjectId: string
      subjectName: string
      subjectNameArabic: string
      expectedCount: number
      satCount: number
      missingCount: number
      completionPct: number
    }>
    missingLearners: MissingMarksEntry[]
  }
  performance: {
    n: number
    meanPct: number | null
    medianPct: number | null
    highestPct: number | null
    lowestPct: number | null
    rangePct: number | null
    q1Pct: number | null
    q3Pct: number | null
    iqrPct: number | null
    stdDevPct: number | null
    meanTotal: number | null
    highestTotal: number | null
    lowestTotal: number | null
    passRatePct: number | null
    benchmark50PassRatePct: number | null
    divisionDistribution: Array<{
      key: string
      label: string
      labelArabic: string
      count: number
      pct: number
    }>
    nurseryGradeDistribution: Array<{
      grade: 'A' | 'B' | 'C' | 'D' | 'E'
      count: number
      pct: number
    }> | null
    hasNurseryLearners: boolean
    hasPrimaryLearners: boolean
  }
  subjects: {
    orderedSubjects: SubjectReportRow[]
    strongestSubject: SubjectReportRow | null
    weakestSubject: SubjectReportRow | null
    classesInMatrix: Array<{
      classId: string
      className: string
      candidateExcluded: boolean
      candidateBadge: string | null
    }>
  }
  learners: {
    top10: LearnerReportSummary[]
    eligibleLearners: LearnerReportSummary[]
    cohortStudents?: LearnerReportSummary[]
    needsSupport: LearnerReportSummary[]
    supportThreshold: number
    needsSupportDefinition: string
    needsSupportDefinitionArabic: string
  }
  trends: {
    previousExam: TrendComparisonBlock
    previousTerm: TrendComparisonBlock
  }
  comparisons: {
    classVsClass: ClassComparisonRow[]
    sectionVsSection: SectionComparisonRow[]
    sectionComparisonNote: string | null
    sectionComparisonNoteArabic: string | null
  }
  genderSplit: {
    capturedCount: number
    missingGenderCount: number
    rows: GenderSplitRow[]
  }
  cycleCompleteness: {
    examLocked: boolean
    remarksPolicyNote: string
    remarksPolicyNoteArabic: string
    byClass: CycleCompletenessClassRow[]
    totals: {
      totalEnrolled: number
      marksCompleteCount: number
      marksCompletionPct: number
      remarksReadyCount: number
      remarksReadyPct: number
      conductApplicableCount: number
      conductReadyCount: number
      conductReadyPct: number | null
    }
  }
  dataQuality: {
    outOfRangeScores: OutOfRangeScoreFlag[]
    duplicateMarkRows: DuplicateMarkFlag[]
    unmappedClasses: UnmappedClassWarning[]
    missingMarksStudentsCount: number
    totalFlagCount: number
  }
  omittedMetrics: OmittedMetricNote[]
  insights: DeterministicInsight[]
  executivePacket: ExecutiveBreakdownPacket
}

export interface ExecutiveSectionMatrixClassColumn {
  classId: string
  className: string
  classNameArabic: string
  candidateExcluded: boolean
  counts: { I: number; II: number; III: number; IV: number; U: number; total: number }
}

export interface ExecutiveSectionMatrix {
  sectionId: HubSectionId
  label: string
  labelArabic: string
  classes: ExecutiveSectionMatrixClassColumn[]
  rowTotals: { I: number; II: number; III: number; IV: number; U: number; total: number }
  rowPcts: { I: number; II: number; III: number; IV: number; U: number }
}

export interface ExecutiveSectionTopAchievers {
  sectionId: HubSectionId
  label: string
  labelArabic: string
  learners: Array<{
    rank: number
    name: string
    arabicName: string | null
    className: string
    normalizedScore: number
  }>
}

export interface ExecutiveBreakdownPacket {
  sectionMatrices: ExecutiveSectionMatrix[]
  topAchieversBySection: ExecutiveSectionTopAchievers[]
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function computeMedian(sortedAsc: number[]): number | null {
  if (sortedAsc.length === 0) return null
  const mid = Math.floor(sortedAsc.length / 2)
  if (sortedAsc.length % 2 === 1) {
    return round2(sortedAsc[mid])
  }
  return round2((sortedAsc[mid - 1] + sortedAsc[mid]) / 2)
}

function computeQuartile(sortedAsc: number[], q: number): number | null {
  if (sortedAsc.length === 0) return null
  if (sortedAsc.length === 1) return round2(sortedAsc[0])
  const pos = (sortedAsc.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (sortedAsc[base + 1] !== undefined) {
    return round2(sortedAsc[base] + rest * (sortedAsc[base + 1] - sortedAsc[base]))
  }
  return round2(sortedAsc[base])
}

function computeStdDev(values: number[], mean: number): number | null {
  if (values.length === 0) return null
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length
  return round2(Math.sqrt(variance))
}

function normalizeGenderBucket(rawGender: string | null | undefined): 'male' | 'female' | 'unspecified' {
  const g = String(rawGender ?? '').trim().toLowerCase()
  if (g === 'm' || g === 'male' || g === 'boy' || g === 'ذكر') return 'male'
  if (g === 'f' || g === 'female' || g === 'girl' || g === 'أنثى' || g === 'انثى') return 'female'
  return 'unspecified'
}

function isStudentPassedRow(row: HubStudentRow, curriculum: HubCurriculum): boolean {
  if (!row.isCompleteMarks || row.isCandidateExcluded || row.normalizedScore === null) return false
  if (curriculum === 'theology') {
    return row.division !== 'راسب' && row.division !== '-'
  }
  if (row.sectionId === 'nursery') {
    return row.division === 'Grade A' || row.division === 'Grade B' || row.division === 'Grade C' || row.normalizedScore >= 50
  }
  return row.division === 'I' || row.division === 'II' || row.division === 'III' || row.division === 'IV'
}

export function toLearnerSummary(row: HubStudentRow): LearnerReportSummary {
  return {
    id: row.id,
    studentId: row.student_id,
    name: row.name,
    arabicName: row.arabic_name,
    admissionNumber: row.admission_number,
    gender: row.gender,
    classId: row.classId,
    className: row.className,
    sectionId: row.sectionId,
    total: row.total,
    normalizedScore: row.normalizedScore,
    average: row.average,
    aggregate: row.aggregate,
    division: row.division,
    position: row.position,
    expectedSubjectCount: row.expectedSubjectCount,
    satSubjectCount: row.satSubjectCount,
    isCompleteMarks: row.isCompleteMarks,
    isCandidateExcluded: row.isCandidateExcluded,
    candidateBadge: row.candidateBadge,
    missingSubjects: row.missingSubjects,
  }
}

export function filterNeedsSupportLearners(
  learners: LearnerReportSummary[],
  curriculum: HubCurriculum,
  thresholdPct: number
): LearnerReportSummary[] {
  const threshold = clampSupportThreshold(thresholdPct)
  return learners
    .filter((s) => {
      if (s.isCandidateExcluded || !s.isCompleteMarks || s.normalizedScore === null) return false
      if (threshold < DEFAULT_SUPPORT_THRESHOLD) {
        return s.normalizedScore < threshold
      }
      const isFailingDiv =
        curriculum === 'theology' ? s.division === 'راسب' : s.division === 'U'
      return s.normalizedScore < threshold || isFailingDiv
    })
    .sort((a, b) => {
      const scoreDiff = (a.normalizedScore ?? 0) - (b.normalizedScore ?? 0)
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff
      const clsCmp = a.className.localeCompare(b.className)
      if (clsCmp !== 0) return clsCmp
      return a.name.localeCompare(b.name)
    })
}

export function getNeedsSupportDefinition(curriculum: HubCurriculum, thresholdPct: number): {
  en: string
  ar: string
} {
  const t = clampSupportThreshold(thresholdPct)
  if (t < DEFAULT_SUPPORT_THRESHOLD) {
    return {
      en: `Complete non-excluded learners with normalized average < ${t}% (adjusted threshold; default < 50% / Div U).`,
      ar: `التلاميذ مكتملو الدرجات (غير المستثنين) بمعدل نسبي أقل من ${t}٪.`,
    }
  }
  const failDivEn = curriculum === 'theology' ? 'راسب' : 'Division U'
  const failDivAr = curriculum === 'theology' ? 'تقدير راسب' : 'التقدير U'
  return {
    en: `Complete non-excluded learners with normalized average < ${t}% or ${failDivEn}.`,
    ar: `التلاميذ مكتملو الدرجات (غير المستثنين) بمعدل نسبي أقل من ${t}٪ أو ${failDivAr}.`,
  }
}

function buildTrendBlock(params: {
  kind: 'previous_exam' | 'previous_term'
  curriculum: HubCurriculum
  currentCohort: HubCohortComputationResult
  baselineCohort: HubCohortComputationResult | null
  baselineLabel: string
  baselineLabelArabic: string
  unavailableReason?: string
  unavailableReasonArabic?: string
}): TrendComparisonBlock {
  const {
    kind,
    curriculum,
    currentCohort,
    baselineCohort,
    baselineLabel,
    baselineLabelArabic,
    unavailableReason,
    unavailableReasonArabic,
  } = params

  const currentEligible = currentCohort.students.filter(
    (s) => !s.isCandidateExcluded && s.isCompleteMarks && s.normalizedScore !== null
  )
  const currentMeanPct =
    currentEligible.length > 0 ? currentCohort.summary.meanNormalizedPct : null
  const currentPassCount = currentEligible.filter((s) => isStudentPassedRow(s, curriculum)).length
  const currentPassRatePct =
    currentEligible.length > 0 ? round1((currentPassCount / currentEligible.length) * 100) : null

  if (!baselineCohort) {
    return {
      kind,
      available: false,
      reason: unavailableReason || 'No comparison mark data found for baseline period.',
      reasonArabic: unavailableReasonArabic || 'لا توجد بيانات مقارنة متاحة للفترة المرجعية.',
      baselineLabel,
      baselineLabelArabic,
      previousMeanPct: null,
      currentMeanPct,
      deltaMeanPct: null,
      previousPassRatePct: null,
      currentPassRatePct,
      deltaPassRatePct: null,
      previousSatCount: 0,
      currentSatCount: currentEligible.length,
      matchedLearnerCount: 0,
      improvedLearners: [],
      declinedLearners: [],
    }
  }

  const prevEligible = baselineCohort.students.filter(
    (s) => !s.isCandidateExcluded && s.isCompleteMarks && s.normalizedScore !== null
  )

  if (prevEligible.length === 0) {
    return {
      kind,
      available: false,
      reason:
        unavailableReason ||
        `No complete learner scores recorded for ${baselineLabel}.`,
      reasonArabic:
        unavailableReasonArabic ||
        `لا توجد درجات مكتملة مسجلة في ${baselineLabelArabic}.`,
      baselineLabel,
      baselineLabelArabic,
      previousMeanPct: null,
      currentMeanPct,
      deltaMeanPct: null,
      previousPassRatePct: null,
      currentPassRatePct,
      deltaPassRatePct: null,
      previousSatCount: 0,
      currentSatCount: currentEligible.length,
      matchedLearnerCount: 0,
      improvedLearners: [],
      declinedLearners: [],
    }
  }

  const prevMeanPct = baselineCohort.summary.meanNormalizedPct
  const prevPassCount = prevEligible.filter((s) => isStudentPassedRow(s, curriculum)).length
  const prevPassRatePct = round1((prevPassCount / prevEligible.length) * 100)

  const prevByStudentId = new Map<string, HubStudentRow>()
  for (const r of prevEligible) {
    if (r.student_id) prevByStudentId.set(String(r.student_id), r)
  }

  const deltas: TrendLearnerDelta[] = []
  for (const cur of currentEligible) {
    const prev = prevByStudentId.get(String(cur.student_id))
    if (!prev || prev.normalizedScore === null || cur.normalizedScore === null) continue
    const deltaPct = round2(cur.normalizedScore - prev.normalizedScore)
    deltas.push({
      studentId: cur.student_id,
      name: cur.name,
      arabicName: cur.arabic_name,
      className: cur.className,
      previousPct: round2(prev.normalizedScore),
      currentPct: round2(cur.normalizedScore),
      deltaPct,
      previousDivision: prev.division,
      currentDivision: cur.division,
    })
  }

  const improvedLearners = [...deltas]
    .filter((d) => d.deltaPct > 0)
    .sort((a, b) => b.deltaPct - a.deltaPct || b.currentPct - a.currentPct)
    .slice(0, 5)

  const declinedLearners = [...deltas]
    .filter((d) => d.deltaPct < 0)
    .sort((a, b) => a.deltaPct - b.deltaPct || a.currentPct - b.currentPct)
    .slice(0, 5)

  return {
    kind,
    available: true,
    baselineLabel,
    baselineLabelArabic,
    previousMeanPct: prevMeanPct,
    currentMeanPct,
    deltaMeanPct:
      currentMeanPct !== null && prevMeanPct !== null
        ? round2(currentMeanPct - prevMeanPct)
        : null,
    previousPassRatePct: prevPassRatePct,
    currentPassRatePct,
    deltaPassRatePct:
      currentPassRatePct !== null ? round1(currentPassRatePct - prevPassRatePct) : null,
    previousSatCount: prevEligible.length,
    currentSatCount: currentEligible.length,
    matchedLearnerCount: deltas.length,
    improvedLearners,
    declinedLearners,
  }
}

export function generateDeterministicInsights(report: Omit<DetailedReportResult, 'insights'>): DeterministicInsight[] {
  const insights: DeterministicInsight[] = []
  const { meta, cohort, performance, subjects, learners, trends, comparisons, dataQuality } = report

  const scopeTitle = meta.scopeLabel
  const scopeTitleAr = meta.scopeLabelArabic

  // 1. Cohort participation & P.7 guard
  const candidateNoteEn =
    cohort.candidateExcludedCount > 0
      ? ` P.7 Term 3 EOT candidate exclusion applied (${cohort.candidateExcludedCount} learner(s) marked N/A — candidate class).`
      : ''
  const candidateNoteAr =
    cohort.candidateExcludedCount > 0
      ? ` تم استثناء تلاميذ الصف السابع (P.7) في اختبار EOT للفترة الثالثة (${cohort.candidateExcludedCount} تلميذ بشارة N/A — candidate class).`
      : ''

  const learnerCompletionPct =
    cohort.totalEnrolled > 0 ? round1((cohort.satComplete / cohort.totalEnrolled) * 100) : 0

  insights.push({
    id: 'cohort-participation',
    category: 'cohort',
    severity: cohort.completionPct >= 80 ? 'positive' : cohort.completionPct > 0 ? 'warning' : 'neutral',
    title: 'Cohort Completeness',
    titleArabic: 'اكتمال درجات الفوج',
    text: `In ${scopeTitle} (${meta.termLabel}, ${meta.examPhase.toUpperCase()}), ${cohort.satComplete} of ${cohort.totalEnrolled} active non-candidate learner(s) (${learnerCompletionPct}%) have complete marks (mark-slot completion: ${cohort.completionPct}%).${candidateNoteEn}`,
    textArabic: `في ${scopeTitleAr} (${meta.termLabel}، ${meta.examPhase.toUpperCase()})، أكمل ${cohort.satComplete} من أصل ${cohort.totalEnrolled} تلميذ نشط غير مستثنى (${learnerCompletionPct}٪) جميع المواد (اكتمال الدرجات: ${cohort.completionPct}٪).${candidateNoteAr}`,
  })

  // 2. Overall Performance
  if (performance.n > 0 && performance.meanPct !== null) {
    const iqrTxt = performance.iqrPct !== null ? `, IQR ${performance.iqrPct} pp` : ''
    const passTxt = performance.passRatePct !== null ? `, pass rate ${performance.passRatePct}%` : ''
    insights.push({
      id: 'performance-summary',
      category: 'performance',
      severity: (performance.passRatePct ?? 0) >= 75 ? 'positive' : 'neutral',
      title: 'Overall Performance & Spread',
      titleArabic: 'الأداء العام والتشتت',
      text: `Across complete learners (n = ${performance.n}), mean normalized average is ${performance.meanPct}% (median ${performance.medianPct}%${iqrTxt}, range ${performance.lowestPct}%–${performance.highestPct}%${passTxt}).`,
      textArabic: `لدى التلاميذ مكتملي الدرجات (العدد = ${performance.n})، بلغ المتوسط العام ${performance.meanPct}٪ (الوسيط ${performance.medianPct}٪، المدى ${performance.lowestPct}٪–${performance.highestPct}٪، نسبة النجاح ${performance.passRatePct ?? 0}٪).`,
    })
  } else {
    insights.push({
      id: 'performance-empty',
      category: 'performance',
      severity: 'neutral',
      title: 'No Complete Assessments Yet',
      titleArabic: 'لا توجد تقييمات مكتملة بعد',
      text: `Zero learners currently have complete ${meta.examPhase.toUpperCase()} marks in ${scopeTitle} (n = 0). Averages and ranks remain uncomputed to prevent zero-filling distortion.`,
      textArabic: `لا يوجد تلاميذ مكتملو الدرجات في ${scopeTitleAr} (${meta.examPhase.toUpperCase()})، لذا لم تُحسب المتوسطات تجنباً لتشويه النتائج بالأصفار.`,
    })
  }

  // 3. Strongest vs Weakest Subject
  if (subjects.strongestSubject && subjects.weakestSubject && subjects.strongestSubject.mean !== null && subjects.weakestSubject.mean !== null) {
    if (subjects.strongestSubject.subjectId === subjects.weakestSubject.subjectId) {
      const s = subjects.strongestSubject
      insights.push({
        id: 'subject-single',
        category: 'subjects',
        severity: 'neutral',
        title: 'Subject Benchmark',
        titleArabic: 'مؤشر المادة الدراسية',
        text: `${s.subjectName} recorded a mean of ${s.mean}% (pass rate ${s.passRate ?? 0}%, n = ${s.satCount}).`,
        textArabic: `حققت مادة ${s.subjectNameArabic || s.subjectName} متوسط ${s.mean}٪ (نسبة النجاح ${s.passRate ?? 0}٪، العدد = ${s.satCount}).`,
      })
    } else {
      const hi = subjects.strongestSubject
      const lo = subjects.weakestSubject
      const gap = round1(hi.mean - lo.mean)
      insights.push({
        id: 'subject-gap',
        category: 'subjects',
        severity: gap >= 15 ? 'warning' : 'positive',
        title: 'Subject Strength & Gap',
        titleArabic: 'أقوى وأضعف مادة دراسية',
        text: `Strongest subject is ${hi.subjectName} (mean ${hi.mean}%, pass ${hi.passRate ?? 0}%, n = ${hi.satCount}); weakest is ${lo.subjectName} (mean ${lo.mean}%, pass ${lo.passRate ?? 0}%, n = ${lo.satCount}) — a ${gap} pp spread.`,
        textArabic: `أعلى مادة هي ${hi.subjectNameArabic || hi.subjectName} (متوسط ${hi.mean}٪، نجاح ${hi.passRate ?? 0}٪، العدد = ${hi.satCount})، وأدنى مادة هي ${lo.subjectNameArabic || lo.subjectName} (متوسط ${lo.mean}٪، نجاح ${lo.passRate ?? 0}٪، العدد = ${lo.satCount}) بفارق ${gap} نقطة مئوية.`,
      })
    }
  }

  // 4. Needs Support intervention count
  if (performance.n > 0) {
    const pctSupport = round1((learners.needsSupport.length / performance.n) * 100)
    const lowestLearner = learners.needsSupport[0]
    const lowestDetailEn = lowestLearner
      ? ` Lowest score: ${lowestLearner.name} (${lowestLearner.className}, ${lowestLearner.normalizedScore}%).`
      : ''
    const lowestDetailAr = lowestLearner
      ? ` أدنى معدل: ${lowestLearner.arabicName || lowestLearner.name} (${lowestLearner.className}، ${lowestLearner.normalizedScore}٪).`
      : ''
    insights.push({
      id: 'needs-support',
      category: 'support',
      severity: learners.needsSupport.length > 0 ? 'warning' : 'positive',
      title: `Needs Support (< ${learners.supportThreshold}%)`,
      titleArabic: `بحاجة إلى دعم (أقل من ${learners.supportThreshold}٪)`,
      text: `${learners.needsSupport.length} learner(s) (${pctSupport}% of complete cohort n = ${performance.n}) fall below the ${learners.supportThreshold}% threshold.${lowestDetailEn}`,
      textArabic: `${learners.needsSupport.length} تلميذ (${pctSupport}٪ من الفوج المكتمل، العدد = ${performance.n}) دون عتبة ${learners.supportThreshold}٪.${lowestDetailAr}`,
    })
  }

  // 5. Trends (Previous Exam & Previous Term)
  if (trends.previousExam.available && trends.previousExam.deltaMeanPct !== null) {
    const t = trends.previousExam
    const sign = t.deltaMeanPct >= 0 ? '+' : ''
    insights.push({
      id: 'trend-prev-exam',
      category: 'trend',
      severity: t.deltaMeanPct >= 0 ? 'positive' : 'warning',
      title: `Trend vs ${t.baselineLabel}`,
      titleArabic: `المقارنة مع ${t.baselineLabelArabic}`,
      text: `Mean shifted by ${sign}${t.deltaMeanPct} pp vs ${t.baselineLabel} (${t.previousMeanPct}% → ${t.currentMeanPct}%, matched n = ${t.matchedLearnerCount}).`,
      textArabic: `تغيّر المتوسط بمقدار ${sign}${t.deltaMeanPct} نقطة مئوية مقارنة بـ ${t.baselineLabelArabic} (${t.previousMeanPct}٪ ← ${t.currentMeanPct}٪، عدد التلاميذ المتطابقين = ${t.matchedLearnerCount}).`,
    })
  }
  if (trends.previousTerm.available && trends.previousTerm.deltaMeanPct !== null) {
    const t = trends.previousTerm
    const sign = t.deltaMeanPct >= 0 ? '+' : ''
    insights.push({
      id: 'trend-prev-term',
      category: 'trend',
      severity: t.deltaMeanPct >= 0 ? 'positive' : 'warning',
      title: `Trend vs ${t.baselineLabel}`,
      titleArabic: `المقارنة مع ${t.baselineLabelArabic}`,
      text: `Year-on-term mean changed by ${sign}${t.deltaMeanPct} pp vs ${t.baselineLabel} (${t.previousMeanPct}% → ${t.currentMeanPct}%, matched n = ${t.matchedLearnerCount}).`,
      textArabic: `تغيّر المتوسط بمقدار ${sign}${t.deltaMeanPct} نقطة مئوية مقارنة بـ ${t.baselineLabelArabic} (${t.previousMeanPct}٪ ← ${t.currentMeanPct}٪، المتطابقون = ${t.matchedLearnerCount}).`,
    })
  }

  // 6. Class vs Class comparison
  const scoredClasses = comparisons.classVsClass.filter((c) => !c.candidateExcluded && c.satComplete > 0 && c.meanPct !== null)
  if (scoredClasses.length >= 2) {
    const sorted = [...scoredClasses].sort((a, b) => (b.meanPct ?? 0) - (a.meanPct ?? 0))
    const topC = sorted[0]
    const botC = sorted[sorted.length - 1]
    const gap = round2((topC.meanPct ?? 0) - (botC.meanPct ?? 0))
    insights.push({
      id: 'class-comparison-gap',
      category: 'comparison',
      severity: gap >= 15 ? 'warning' : 'neutral',
      title: 'Inter-Class Performance Gap',
      titleArabic: 'الفجوة بين الصفوف',
      text: `Highest class mean is ${topC.className} (${topC.meanPct}%, n = ${topC.satComplete}); lowest is ${botC.className} (${botC.meanPct}%, n = ${botC.satComplete}) — a ${gap} pp spread.`,
      textArabic: `أعلى صف في المتوسط هو ${topC.className} (${topC.meanPct}٪، العدد = ${topC.satComplete})، وأدناه هو ${botC.className} (${botC.meanPct}٪، العدد = ${botC.satComplete}) بفارق ${gap} نقطة مئوية.`,
    })
  }

  // 7. Data quality summary if any flags exist
  if (dataQuality.totalFlagCount > 0) {
    insights.push({
      id: 'data-quality-flags',
      category: 'quality',
      severity: 'warning',
      title: 'Data-Quality Attention Required',
      titleArabic: 'تنبيهات جودة البيانات',
      text: `Detected ${dataQuality.missingMarksStudentsCount} learner(s) with incomplete marks, ${dataQuality.outOfRangeScores.length} out-of-range score(s), ${dataQuality.duplicateMarkRows.length} duplicate mark key(s), and ${dataQuality.unmappedClasses.length} unmapped class(es).`,
      textArabic: `تم رصد ${dataQuality.missingMarksStudentsCount} تلميذ بدرجات ناقصة، و${dataQuality.outOfRangeScores.length} درجة خارج النطاق، و${dataQuality.duplicateMarkRows.length} صفوف درجات مكررة، و${dataQuality.unmappedClasses.length} صف غير مصنف.`,
    })
  }

  return insights
}

export interface ComputeDetailedReportParams {
  curriculum: HubCurriculum
  scope: DetailedReportScope
  sectionId?: HubSectionId | null
  classId?: string | null
  termId: string
  termLabel: string
  termNumber: number
  academicYear: number
  examPhase: ExamPhase
  supportThreshold?: number
  classes: Array<ClassLikeRecord & { id: string }>
  enrollments: any[]
  marks: any[]
  rawMarksForQuality?: any[]
  subjects: any[]
  gradingConfig?: HubGradingConfig | null
  marksLocks?: Partial<MarksLocksConfig> | null
  sectionsConfig?: HubSectionDefinition[] | null
  candidateRules?: CandidateClassExclusionRule[] | null
  previousExamBaseline?: {
    available?: boolean
    examPhase: ExamPhase
    label: string
    labelArabic: string
    marks: any[]
    unavailableReason?: string
    unavailableReasonArabic?: string
  } | null
  previousTermBaseline?: {
    available?: boolean
    termId?: string
    termNumber?: number
    examPhase: ExamPhase
    label: string
    labelArabic: string
    enrollments: any[]
    marks: any[]
    unavailableReason?: string
    unavailableReasonArabic?: string
  } | null
}

export function computeHubDetailedReport(params: ComputeDetailedReportParams): DetailedReportResult {
  const {
    curriculum,
    scope,
    sectionId = null,
    classId = null,
    termId,
    termLabel,
    termNumber,
    academicYear,
    examPhase,
    classes,
    enrollments,
    marks,
    rawMarksForQuality,
    subjects,
    gradingConfig,
    marksLocks,
    sectionsConfig,
    candidateRules,
    previousExamBaseline,
    previousTermBaseline,
  } = params

  const supportThreshold = clampSupportThreshold(params.supportThreshold)
  const effectiveSections =
    Array.isArray(sectionsConfig) && sectionsConfig.length > 0 ? sectionsConfig : DEFAULT_HUB_SECTIONS
  const mapping = mapClassesToSections(classes, curriculum, effectiveSections, candidateRules)

  const targetClasses =
    scope === 'class' && classId
      ? classes.filter((c) => String(c.id) === String(classId))
      : scope === 'section' && sectionId
        ? mapping.bySection[sectionId] || []
        : classes

  const classIdField = curriculum === 'theology' ? 'theology_class_id' : 'circular_class_id'
  const targetClassIds = new Set(targetClasses.map((c) => String(c.id)))

  // Strictly exclude archived students defensively even if caller passes unfiltered list
  const scopedEnrollments = (enrollments || []).filter((e) => {
    const stu = Array.isArray(e?.students) ? e.students[0] : e?.students
    if (stu?.is_archived) return false
    return targetClassIds.has(String(e?.[classIdField] ?? ''))
  })

  const resolvedGradingConfig = {
    ...(gradingConfig || {}),
    hub_sections: gradingConfig?.hub_sections || effectiveSections,
    ...(candidateRules ? { candidate_class_rules: candidateRules } : {}),
  }

  // Phase 3 single source of truth for cohort numbers, Top 10, missing marks, P.7 exclusions!
  const cohort = computeHubCohortMetrics({
    curriculum,
    mode: scope === 'class' ? 'class' : 'section',
    sectionId: scope === 'section' ? sectionId : null,
    classes: targetClasses,
    enrollments: scopedEnrollments,
    marks,
    subjects,
    examPhase,
    termNumber,
    termLabel,
    gradingConfig: resolvedGradingConfig,
  })

  const classById = new Map(targetClasses.map((c) => [String(c.id), c]))
  const subjectById = new Map((subjects || []).map((s) => [String(s.id), s]))
  const scoreField = `${examPhase}_score` as 'bot_score' | 'mot_score' | 'eot_score'

  // Scope labels
  let scopeLabel = curriculum === 'theology' ? 'Whole School (Theology)' : 'Whole School (Secular)'
  let scopeLabelArabic = curriculum === 'theology' ? 'كامل المدرسة (العلوم الشرعية)' : 'كامل المدرسة (العام)'
  if (scope === 'section' && sectionId) {
    const secDef = effectiveSections.find((s) => s.id === sectionId)
    scopeLabel = secDef ? `${secDef.label} Section` : sectionId
    scopeLabelArabic = secDef ? secDef.label_arabic : sectionId
  } else if (scope === 'class' && targetClasses[0]) {
    const clsName = formatClassDisplayName(targetClasses[0], curriculum)
    scopeLabel = clsName
    scopeLabelArabic = targetClasses[0].class_name_arabic || clsName
  }

  const allSummaries = cohort.students.map(toLearnerSummary)
  const phaseMap = new Map<
    string,
    { botSum: number; botCount: number; motSum: number; motCount: number; eotSum: number; eotCount: number }
  >()
  for (const m of marks || []) {
    const eid = String(m?.enrollment_id || '')
    if (!eid) continue
    let entry = phaseMap.get(eid)
    if (!entry) {
      entry = { botSum: 0, botCount: 0, motSum: 0, motCount: 0, eotSum: 0, eotCount: 0 }
      phaseMap.set(eid, entry)
    }
    if (typeof m?.bot_score === 'number' && Number.isFinite(m.bot_score)) {
      entry.botSum += m.bot_score
      entry.botCount += 1
    }
    if (typeof m?.mot_score === 'number' && Number.isFinite(m.mot_score)) {
      entry.motSum += m.mot_score
      entry.motCount += 1
    }
    if (typeof m?.eot_score === 'number' && Number.isFinite(m.eot_score)) {
      entry.eotSum += m.eot_score
      entry.eotCount += 1
    }
  }
  const cohortStudents: LearnerReportSummary[] = allSummaries.map((st) => {
    const p = phaseMap.get(String(st.id))
    const botVal = p && p.botCount > 0 ? Math.round(p.botSum) : null
    const motVal = p && p.motCount > 0 ? Math.round(p.motSum) : null
    const eotVal = p && p.eotCount > 0 ? Math.round(p.eotSum) : null
    const botAvg = p && p.botCount > 0 ? Math.round(p.botSum / p.botCount) : null
    const motAvg = p && p.motCount > 0 ? Math.round(p.motSum / p.motCount) : null
    const eotAvg = p && p.eotCount > 0 ? Math.round(p.eotSum / p.eotCount) : null
    const overallVal =
      botVal !== null || motVal !== null || eotVal !== null
        ? (botVal ?? 0) + (motVal ?? 0) + (eotVal ?? 0)
        : st.total ?? null
    const overallAvg =
      st.normalizedScore != null
        ? `${Math.round(st.normalizedScore)}%`
        : st.average != null
          ? `${Math.round(st.average)}%`
          : null
    return {
      ...st,
      bot_score: botVal !== null ? `${botVal} (${botAvg}%)` : null,
      mot_score: motVal !== null ? `${motVal} (${motAvg}%)` : null,
      eot_score: eotVal !== null ? `${eotVal} (${eotAvg}%)` : null,
      overall_total: overallVal,
      overall_average: overallAvg,
    }
  })
  const eligibleRows = cohort.students.filter(
    (s) => !s.isCandidateExcluded && s.isCompleteMarks && s.normalizedScore !== null
  )
  const eligibleSummaries = eligibleRows.map(toLearnerSummary)
  const top10 = cohort.top10.map(toLearnerSummary)
  const needsSupport = filterNeedsSupportLearners(eligibleSummaries, curriculum, supportThreshold)
  const supportDef = getNeedsSupportDefinition(curriculum, supportThreshold)

  // Performance distribution over complete eligible learners
  const sortedPcts = eligibleRows
    .map((s) => s.normalizedScore as number)
    .sort((a, b) => a - b)

  const n = sortedPcts.length
  const meanPct = n > 0 ? round2(sortedPcts.reduce((a, b) => a + b, 0) / n) : null
  const medianPct = computeMedian(sortedPcts)
  const highestPct = n > 0 ? round2(sortedPcts[n - 1]) : null
  const lowestPct = n > 0 ? round2(sortedPcts[0]) : null
  const rangePct = highestPct !== null && lowestPct !== null ? round2(highestPct - lowestPct) : null
  const q1Pct = computeQuartile(sortedPcts, 0.25)
  const q3Pct = computeQuartile(sortedPcts, 0.75)
  const iqrPct = q1Pct !== null && q3Pct !== null ? round2(q3Pct - q1Pct) : null
  const stdDevPct = meanPct !== null ? computeStdDev(sortedPcts, meanPct) : null

  const passedPolicyCount = eligibleRows.filter((s) => isStudentPassedRow(s, curriculum)).length
  const benchmark50Count = eligibleRows.filter((s) => (s.normalizedScore ?? 0) >= 50).length
  const passRatePct = n > 0 ? round1((passedPolicyCount / n) * 100) : null
  const benchmark50PassRatePct = n > 0 ? round1((benchmark50Count / n) * 100) : null

  const hasNurseryLearners =
    curriculum === 'secular' && cohort.students.some((s) => !s.isCandidateExcluded && s.sectionId === 'nursery')
  const hasPrimaryLearners =
    curriculum === 'theology' || cohort.students.some((s) => !s.isCandidateExcluded && s.sectionId !== 'nursery')

  const divisionKeys =
    curriculum === 'theology'
      ? [
          { key: 'ممتاز', label: 'Mumtaz (Div I)', labelArabic: 'ممتاز' },
          { key: 'جيد جداً', label: 'Jayyid Jiddan (Div II)', labelArabic: 'جيد جداً' },
          { key: 'جيد', label: 'Jayyid (Div III)', labelArabic: 'جيد' },
          { key: 'مقبول', label: 'Maqbul (Div IV)', labelArabic: 'مقبول' },
          { key: 'راسب', label: 'Rasib (Div U)', labelArabic: 'راسب' },
        ]
      : [
          { key: 'I', label: 'Division I', labelArabic: 'الدرجة الأولى' },
          { key: 'II', label: 'Division II', labelArabic: 'الدرجة الثانية' },
          { key: 'III', label: 'Division III', labelArabic: 'الدرجة الثالثة' },
          { key: 'IV', label: 'Division IV', labelArabic: 'الدرجة الرابعة' },
          { key: 'U', label: 'Division U', labelArabic: 'غير مصنف (U)' },
        ]

  const primaryEligibleCount = eligibleRows.filter(
    (s) => curriculum === 'theology' || s.sectionId !== 'nursery'
  ).length

  const divisionDistribution = divisionKeys.map((d) => {
    const count = eligibleRows.filter((s) => {
      if (curriculum === 'secular' && s.sectionId === 'nursery') return false
      if (d.key === 'جيد جداً') {
        return s.division === 'جيد جداً' || s.division === 'جيد جدا'
      }
      return s.division === d.key
    }).length
    const pct = primaryEligibleCount > 0 ? round1((count / primaryEligibleCount) * 100) : 0
    return { ...d, count, pct }
  })

  const nurseryEligible = eligibleRows.filter((s) => curriculum === 'secular' && s.sectionId === 'nursery')
  const nurseryGradeDistribution = hasNurseryLearners
    ? (['A', 'B', 'C', 'D', 'E'] as const).map((g) => {
        const count = cohort.summary.nurseryGradeCounts[g] ?? 0
        const pct = nurseryEligible.length > 0 ? round1((count / nurseryEligible.length) * 100) : 0
        return { grade: g, count, pct }
      })
    : null

  // Cohort counts
  const satPartial = cohort.students.filter(
    (s) => !s.isCandidateExcluded && !s.isCompleteMarks && s.satSubjectCount > 0
  ).length
  const absentOrNoMarks = cohort.students.filter(
    (s) => !s.isCandidateExcluded && s.satSubjectCount === 0
  ).length

  // Per-class applicability cache
  const classAppMap = new Map<string, ReturnType<typeof doesExamApplyToClassInTerm>>()
  for (const cls of targetClasses) {
    classAppMap.set(
      String(cls.id),
      doesExamApplyToClassInTerm(
        {
          ...cls,
          curriculum,
          examType: examPhase,
          termNumber,
        },
        candidateRules
      )
    )
  }

  // Class vs Class comparison rows
  const classVsClass: ClassComparisonRow[] = cohort.classBreakdown.map((cb) => {
    const classRows = cohort.students.filter((s) => s.classId === cb.classId)
    const classEligible = classRows.filter(
      (s) => !s.isCandidateExcluded && s.isCompleteMarks && s.normalizedScore !== null
    )
    const clsPcts = classEligible
      .map((s) => s.normalizedScore as number)
      .sort((a, b) => a - b)
    const clsTotals = classEligible
      .map((s) => s.total as number)
      .filter((t) => typeof t === 'number' && !Number.isNaN(t))
      .sort((a, b) => a - b)

    const clsPartial = classRows.filter(
      (s) => !s.isCandidateExcluded && !s.isCompleteMarks && s.satSubjectCount > 0
    ).length
    const clsNoMarks = classRows.filter(
      (s) => !s.isCandidateExcluded && s.satSubjectCount === 0
    ).length

    const secDef = effectiveSections.find((s) => s.id === cb.sectionId)
    const clsNeedsSupport = filterNeedsSupportLearners(
      classEligible.map(toLearnerSummary),
      curriculum,
      supportThreshold
    ).length

    return {
      classId: cb.classId,
      className: cb.className,
      arabicName: cb.arabicName,
      englishName: cb.englishName,
      sectionId: cb.sectionId,
      sectionLabel: secDef?.label || 'Unmapped',
      sectionLabelArabic: secDef?.label_arabic || 'غير مصنف',
      totalEnrolled: cb.totalEnrolled,
      satComplete: cb.satComplete,
      satPartial: clsPartial,
      absentOrNoMarks: clsNoMarks,
      incompleteCount: cb.incompleteCount,
      completionPct: cb.completionPct ?? 0,
      meanPct: clsPcts.length > 0 ? round2(clsPcts.reduce((a, b) => a + b, 0) / clsPcts.length) : null,
      medianPct: computeMedian(clsPcts),
      highestPct: clsPcts.length > 0 ? round2(clsPcts[clsPcts.length - 1]) : null,
      lowestPct: clsPcts.length > 0 ? round2(clsPcts[0]) : null,
      meanTotal: cb.isCandidateExcluded || clsTotals.length === 0 ? null : cb.meanTotal,
      highestTotal: cb.isCandidateExcluded || clsTotals.length === 0 ? null : clsTotals[clsTotals.length - 1],
      lowestTotal: cb.isCandidateExcluded || clsTotals.length === 0 ? null : clsTotals[0],
      passRatePct: cb.isCandidateExcluded || classEligible.length === 0 ? null : cb.passRate,
      needsSupportCount: clsNeedsSupport,
      divCounts: cb.divCounts,
      candidateExcluded: cb.isCandidateExcluded,
      candidateBadge: cb.candidateBadge,
    }
  })

  // Missing by class
  const missingByClass = classVsClass.map((c) => ({
    classId: c.classId,
    className: c.className,
    sectionId: c.sectionId,
    enrolled: c.totalEnrolled,
    satComplete: c.satComplete,
    missingCount: c.candidateExcluded ? 0 : c.incompleteCount,
    completionPct: c.completionPct,
    candidateExcluded: c.candidateExcluded,
    candidateBadge: c.candidateBadge,
  }))

  // Section vs Section comparison (school scope or multiple sections)
  const sectionIdsInScope = new Set(targetClasses.map((c) => mapping.classToSection[String(c.id)]).filter(Boolean))
  const sectionVsSection: SectionComparisonRow[] = []
  if (scope === 'school' || sectionIdsInScope.size > 1) {
    for (const secDef of effectiveSections) {
      const secClasses = targetClasses.filter((c) => mapping.classToSection[String(c.id)] === secDef.id)
      if (secClasses.length === 0) continue

      const secRows = cohort.students.filter((s) => s.sectionId === secDef.id)
      const secNonExcl = secRows.filter((s) => !s.isCandidateExcluded)
      const secExclCount = secRows.filter((s) => s.isCandidateExcluded).length
      const secEligible = secNonExcl
        .filter((s) => s.isCompleteMarks && s.normalizedScore !== null)
        .sort((a, b) => (b.normalizedScore ?? 0) - (a.normalizedScore ?? 0))

      const secPcts = secEligible.map((s) => s.normalizedScore as number).sort((a, b) => a - b)
      const secPass = secEligible.filter((s) => isStudentPassedRow(s, curriculum)).length
      const secIncomplete = secNonExcl.length - secEligible.length
      const secCompletionPct = secNonExcl.length > 0 ? round1((secEligible.length / secNonExcl.length) * 100) : 0
      const secNeedsSupport = filterNeedsSupportLearners(
        secEligible.map(toLearnerSummary),
        curriculum,
        supportThreshold
      ).length

      const topRow = secEligible[0] || null
      sectionVsSection.push({
        sectionId: secDef.id,
        label: secDef.label,
        labelArabic: secDef.label_arabic,
        classCount: secClasses.length,
        activeNonExcludedClassCount: secClasses.filter((c) => classAppMap.get(String(c.id))?.applies !== false).length,
        totalEnrolled: secNonExcl.length,
        satComplete: secEligible.length,
        incompleteCount: secIncomplete,
        completionPct: secCompletionPct,
        candidateExcludedCount: secExclCount,
        meanPct: secPcts.length > 0 ? round2(secPcts.reduce((a, b) => a + b, 0) / secPcts.length) : null,
        medianPct: computeMedian(secPcts),
        highestPct: secPcts.length > 0 ? round2(secPcts[secPcts.length - 1]) : null,
        lowestPct: secPcts.length > 0 ? round2(secPcts[0]) : null,
        passRatePct: secEligible.length > 0 ? round1((secPass / secEligible.length) * 100) : null,
        needsSupportCount: secNeedsSupport,
        topLearner: topRow
          ? {
              studentId: topRow.student_id,
              name: topRow.name,
              arabicName: topRow.arabic_name,
              className: topRow.className,
              normalizedScore: round2(topRow.normalizedScore as number),
            }
          : null,
      })
    }
  }

  // Subjects metrics + Subject x Class matrix + Missing by Subject
  const orderedSubjectsRaw = cohort.orderedSubjects
  const nonExcludedClasses = targetClasses.filter((c) => classAppMap.get(String(c.id))?.applies !== false)
  const expectedSubjectsByClassId = new Map<string, HubSubjectRecord[]>()
  for (const cls of nonExcludedClasses) {
    expectedSubjectsByClassId.set(String(cls.id), getSubjectsForHubClass(cls, subjects, curriculum))
  }

  const subjectReportRows: SubjectReportRow[] = orderedSubjectsRaw.map((sub) => {
    const scoresAll: number[] = []
    let expectedTotalForSub = 0
    let satTotalForSub = 0

    const byClass: SubjectClassComparisonCell[] = targetClasses.map((cls) => {
      const cid = String(cls.id)
      const app = classAppMap.get(cid)
      const clsName = formatClassDisplayName(cls, curriculum)
      if (app && !app.applies) {
        return {
          classId: cid,
          className: clsName,
          mean: null,
          passRate: null,
          satCount: 0,
          expectedCount: 0,
          candidateExcluded: true,
        }
      }
      const clsSubjects = expectedSubjectsByClassId.get(cid) || []
      const appliesToClass = clsSubjects.some((s) => s.id === sub.id)
      const clsStudents = cohort.students.filter((st) => st.classId === cid && !st.isCandidateExcluded)
      if (!appliesToClass) {
        return {
          classId: cid,
          className: clsName,
          mean: null,
          passRate: null,
          satCount: 0,
          expectedCount: 0,
          candidateExcluded: false,
        }
      }
      expectedTotalForSub += clsStudents.length
      const clsSubScores: number[] = []
      for (const st of clsStudents) {
        const sc = st.subjectScores[sub.id]
        if (typeof sc === 'number' && !Number.isNaN(sc)) {
          clsSubScores.push(sc)
          scoresAll.push(sc)
          satTotalForSub++
        }
      }
      const clsMean =
        clsSubScores.length > 0 ? round1(clsSubScores.reduce((a, b) => a + b, 0) / clsSubScores.length) : null
      const clsPass =
        clsSubScores.length > 0
          ? Math.round((clsSubScores.filter((v) => v >= 50).length / clsSubScores.length) * 100)
          : null
      return {
        classId: cid,
        className: clsName,
        mean: clsMean,
        passRate: clsPass,
        satCount: clsSubScores.length,
        expectedCount: clsStudents.length,
        candidateExcluded: false,
      }
    })

    const sortedScores = [...scoresAll].sort((a, b) => a - b)
    const mean = sortedScores.length > 0 ? round1(sortedScores.reduce((a, b) => a + b, 0) / sortedScores.length) : null
    const median = computeMedian(sortedScores)
    const highest = sortedScores.length > 0 ? sortedScores[sortedScores.length - 1] : null
    const lowest = sortedScores.length > 0 ? sortedScores[0] : null
    const passRate =
      sortedScores.length > 0
        ? round1((sortedScores.filter((v) => v >= 50).length / sortedScores.length) * 100)
        : null

    return {
      subjectId: sub.id,
      subjectName: sub.subject_name,
      subjectNameArabic: sub.subject_name_arabic || sub.subject_name,
      mean,
      median,
      highest,
      lowest,
      passRate,
      satCount: satTotalForSub,
      expectedCount: expectedTotalForSub,
      missingCount: Math.max(0, expectedTotalForSub - satTotalForSub),
      isStrongest: false,
      isWeakest: false,
      byClass,
    }
  })

  const scoredSubjects = subjectReportRows
    .filter((s) => s.satCount > 0 && s.mean !== null)
    .sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0) || (b.passRate ?? 0) - (a.passRate ?? 0))

  let strongestSubject: SubjectReportRow | null = null
  let weakestSubject: SubjectReportRow | null = null
  if (scoredSubjects.length > 0) {
    const hiId = scoredSubjects[0].subjectId
    const loId = scoredSubjects[scoredSubjects.length - 1].subjectId
    for (const row of subjectReportRows) {
      if (row.subjectId === hiId) {
        row.isStrongest = true
        strongestSubject = row
      }
      if (row.subjectId === loId) {
        row.isWeakest = true
        weakestSubject = row
      }
    }
  }

  const missingBySubject = subjectReportRows.map((s) => ({
    subjectId: s.subjectId,
    subjectName: s.subjectName,
    subjectNameArabic: s.subjectNameArabic,
    expectedCount: s.expectedCount,
    satCount: s.satCount,
    missingCount: s.missingCount,
    completionPct: s.expectedCount > 0 ? round1((s.satCount / s.expectedCount) * 100) : 100,
  }))

  // Gender split (strictly from captured students.gender)
  const genderBuckets: Record<'male' | 'female' | 'unspecified', HubStudentRow[]> = {
    male: [],
    female: [],
    unspecified: [],
  }
  for (const row of cohort.students) {
    if (row.isCandidateExcluded) continue
    const b = normalizeGenderBucket(row.gender)
    genderBuckets[b].push(row)
  }

  const buildGenderRow = (
    key: 'male' | 'female' | 'unspecified',
    label: string,
    labelArabic: string
  ): GenderSplitRow => {
    const rows = genderBuckets[key]
    const comp = rows.filter((r) => r.isCompleteMarks && r.normalizedScore !== null)
    const pcts = comp.map((r) => r.normalizedScore as number).sort((a, b) => a - b)
    const passCount = comp.filter((r) => isStudentPassedRow(r, curriculum)).length
    const supportCount = filterNeedsSupportLearners(comp.map(toLearnerSummary), curriculum, supportThreshold).length
    return {
      genderKey: key,
      label,
      labelArabic,
      enrolledCount: rows.length,
      satCompleteCount: comp.length,
      meanPct: pcts.length > 0 ? round2(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
      medianPct: computeMedian(pcts),
      passRatePct: comp.length > 0 ? round1((passCount / comp.length) * 100) : null,
      needsSupportCount: supportCount,
    }
  }

  const genderRows: GenderSplitRow[] = []
  if (genderBuckets.male.length > 0) genderRows.push(buildGenderRow('male', 'Male', 'الذكور'))
  if (genderBuckets.female.length > 0) genderRows.push(buildGenderRow('female', 'Female', 'الإناث'))
  if (genderBuckets.unspecified.length > 0 && (genderBuckets.male.length > 0 || genderBuckets.female.length > 0)) {
    genderRows.push(buildGenderRow('unspecified', 'Gender Not Recorded', 'غير محدد'))
  }
  const genderCapturedCount = genderBuckets.male.length + genderBuckets.female.length
  const genderMissingCount = genderBuckets.unspecified.length

  // Trends: previousExam & previousTerm
  let prevExamCohort: HubCohortComputationResult | null = null
  if (previousExamBaseline && previousExamBaseline.available !== false && Array.isArray(previousExamBaseline.marks)) {
    prevExamCohort = computeHubCohortMetrics({
      curriculum,
      mode: scope === 'class' ? 'class' : 'section',
      sectionId: scope === 'section' ? sectionId : null,
      classes: targetClasses,
      enrollments: scopedEnrollments,
      marks: previousExamBaseline.marks,
      subjects,
      examPhase: previousExamBaseline.examPhase,
      termNumber,
      termLabel,
      gradingConfig: resolvedGradingConfig,
    })
  }

  const previousExamTrend = buildTrendBlock({
    kind: 'previous_exam',
    curriculum,
    currentCohort: cohort,
    baselineCohort: prevExamCohort,
    baselineLabel: previousExamBaseline?.label || 'Previous Exam',
    baselineLabelArabic: previousExamBaseline?.labelArabic || 'الاختبار السابق',
    unavailableReason: previousExamBaseline?.unavailableReason,
    unavailableReasonArabic: previousExamBaseline?.unavailableReasonArabic,
  })

  let prevTermCohort: HubCohortComputationResult | null = null
  if (previousTermBaseline && previousTermBaseline.available !== false && Array.isArray(previousTermBaseline.marks)) {
    const prevTermEnrollments = (previousTermBaseline.enrollments || []).filter((e) => {
      const stu = Array.isArray(e?.students) ? e.students[0] : e?.students
      if (stu?.is_archived) return false
      return targetClassIds.has(String(e?.[classIdField] ?? ''))
    })
    prevTermCohort = computeHubCohortMetrics({
      curriculum,
      mode: scope === 'class' ? 'class' : 'section',
      sectionId: scope === 'section' ? sectionId : null,
      classes: targetClasses,
      enrollments: prevTermEnrollments.length > 0 ? prevTermEnrollments : scopedEnrollments,
      marks: previousTermBaseline.marks,
      subjects,
      examPhase: previousTermBaseline.examPhase,
      termNumber: previousTermBaseline.termNumber ?? Math.max(1, termNumber - 1),
      termLabel: previousTermBaseline.label,
      gradingConfig: resolvedGradingConfig,
    })
  }

  const previousTermTrend = buildTrendBlock({
    kind: 'previous_term',
    curriculum,
    currentCohort: cohort,
    baselineCohort: prevTermCohort,
    baselineLabel: previousTermBaseline?.label || 'Previous Term',
    baselineLabelArabic: previousTermBaseline?.labelArabic || 'الفترة السابقة',
    unavailableReason: previousTermBaseline?.unavailableReason,
    unavailableReasonArabic: previousTermBaseline?.unavailableReasonArabic,
  })

  // Cycle Completeness (Marks, Remarks Readiness, Conduct Readiness, Exam Lock)
  const examLocked = Boolean(
    examPhase === 'bot'
      ? marksLocks?.bot_locked
      : examPhase === 'mot'
        ? marksLocks?.mot_locked
        : marksLocks?.eot_locked
  )

  let conductApplicableTotal = 0
  let conductReadyTotal = 0
  const cycleByClass: CycleCompletenessClassRow[] = classVsClass.map((c) => {
    const clsRecord = classById.get(c.classId)
    const isClsNursery =
      curriculum === 'secular' &&
      (c.sectionId === 'nursery' || (clsRecord ? isNurseryClass(clsRecord.class_name || clsRecord.name) : false))

    const remarksReadyCount = c.candidateExcluded ? 0 : c.satComplete
    const remarksReadyPct = c.candidateExcluded
      ? 0
      : c.totalEnrolled > 0
        ? round1((remarksReadyCount / c.totalEnrolled) * 100)
        : 0

    let conductReadyCount: number | null = null
    let conductReadyPct: number | null = null
    let conductStatusNote = ''
    let conductStatusNoteArabic = ''

    if (c.candidateExcluded) {
      conductStatusNote = c.candidateBadge || CANDIDATE_NA_BADGE
      conductStatusNoteArabic = c.candidateBadge || CANDIDATE_NA_BADGE
    } else if (curriculum === 'theology') {
      conductStatusNote = 'Not tracked in Theology reports'
      conductStatusNoteArabic = 'غير مفعل في تقارير العلوم الشرعية'
    } else if (examPhase === 'mot') {
      conductStatusNote = 'Suppressed on MOT (school policy)'
      conductStatusNoteArabic = 'مخفي في اختبار منتصف الفترة (MOT)'
    } else if (isClsNursery) {
      conductStatusNote = 'Nursery uses teacher narrative only'
      conductStatusNoteArabic = 'الروضة تعتمد تعليق المعلمة فقط'
    } else {
      conductApplicableTotal += c.totalEnrolled
      conductReadyTotal += c.satComplete
      conductReadyCount = c.satComplete
      conductReadyPct = c.totalEnrolled > 0 ? round1((c.satComplete / c.totalEnrolled) * 100) : 0
      conductStatusNote = 'Derived automatically when marks complete'
      conductStatusNoteArabic = 'يُشتق تلقائياً عند اكتمال الدرجات'
    }

    return {
      classId: c.classId,
      className: c.className,
      sectionId: c.sectionId,
      candidateExcluded: c.candidateExcluded,
      candidateBadge: c.candidateBadge,
      totalEnrolled: c.totalEnrolled,
      marksCompleteCount: c.candidateExcluded ? 0 : c.satComplete,
      marksCompletionPct: c.candidateExcluded ? 0 : c.completionPct,
      remarksReadyCount,
      remarksReadyPct,
      conductReadyCount,
      conductReadyPct,
      conductStatusNote,
      conductStatusNoteArabic,
      examLocked,
    }
  })

  // Data-quality flags (out-of-range scores, duplicate rows, missing marks, unmapped classes)
  const qualitySourceMarks = Array.isArray(rawMarksForQuality) ? rawMarksForQuality : marks
  const enrollmentRowById = new Map<string, HubStudentRow>()
  const enrollmentRowByStudentId = new Map<string, HubStudentRow>()
  for (const st of cohort.students) {
    enrollmentRowById.set(st.id, st)
    if (st.student_id) enrollmentRowByStudentId.set(st.student_id, st)
  }

  const outOfRangeScores: OutOfRangeScoreFlag[] = []
  const pairCounts = new Map<string, { count: number; enrollmentId: string; studentName: string; className: string; subjectId: string; subjectName: string }>()

  for (const m of qualitySourceMarks || []) {
    const eid = String(m?.enrollment_id || '')
    const st = enrollmentRowById.get(eid) || (m?.student_id ? enrollmentRowByStudentId.get(String(m.student_id)) : undefined)
    if (!st) continue

    const subId = String(m?.theology_subject_id || m?.subject_id || '')
    const subRec = subjectById.get(subId)
    const subName = subRec?.subject_name_arabic || subRec?.subject_name || subId || 'Unknown Subject'

    const val = m?.[scoreField]
    if (typeof val === 'number' && !Number.isNaN(val) && (val < 0 || val > 100)) {
      outOfRangeScores.push({
        enrollmentId: st.id,
        studentName: st.name,
        className: st.className,
        subjectId: subId,
        subjectName: subName,
        field: scoreField,
        score: val,
      })
    }

    if (subId) {
      const pairKey = `${st.id}:${subId}`
      const existing = pairCounts.get(pairKey)
      if (!existing) {
        pairCounts.set(pairKey, {
          count: 1,
          enrollmentId: st.id,
          studentName: st.name,
          className: st.className,
          subjectId: subId,
          subjectName: subName,
        })
      } else {
        existing.count += 1
      }
    }
  }

  const duplicateMarkRows: DuplicateMarkFlag[] = []
  for (const entry of pairCounts.values()) {
    if (entry.count > 1) {
      duplicateMarkRows.push({
        enrollmentId: entry.enrollmentId,
        studentName: entry.studentName,
        className: entry.className,
        subjectId: entry.subjectId,
        subjectName: entry.subjectName,
        rowCount: entry.count,
      })
    }
  }

  const relevantUnmapped =
    scope === 'school'
      ? mapping.unmappedClasses
      : scope === 'class' && classId
        ? mapping.unmappedClasses.filter((u) => u.id === classId)
        : []

  const totalFlagCount =
    outOfRangeScores.length +
    duplicateMarkRows.length +
    relevantUnmapped.length +
    cohort.missingMarksList.length

  // Omitted metrics transparency list (only report what truly cannot be sourced from DB)
  const omittedMetrics: OmittedMetricNote[] = [
    {
      key: 'manual_remarks_table',
      label: 'Per-Student Manual Remark / Conduct Override Table',
      labelArabic: 'سجلات تعديلات الملاحظات والسلوك اليدوية لكل تلميذ',
      reason:
        'Report-card remarks and conduct are dynamically derived at render time from school rubric rules (division_boundaries / grading_criteria) once marks are complete; no separate per-student comment table exists in DB.',
      reasonArabic:
        'الملاحظات والسلوك تُولد تلقائياً عند إصدار الشهادة وفق ضوابط التقدير المعتمدة عند اكتمال الدرجات؛ لا يوجد جدول منفصل لتخزين ملاحظات يدوية فردية.',
    },
  ]

  if (curriculum === 'theology' && examPhase === 'bot') {
    omittedMetrics.push({
      key: 'theology_bot_column',
      label: 'Theology Beginning-of-Term (BOT) Marks',
      labelArabic: 'درجات بداية الفترة (BOT) للعلوم الشرعية',
      reason:
        'The theology_marks database schema tracks mot_score and eot_score only (no bot_score column). Select MOT or EOT for Theology analysis.',
      reasonArabic:
        'جدول درجات العلوم الشرعية يسجل درجات منتصف الفترة (MOT) ونهاية الفترة (EOT) فقط.',
    })
  }

  if (genderCapturedCount === 0 && cohort.summary.totalCandidates > 0) {
    omittedMetrics.push({
      key: 'gender_split_unrecorded',
      label: 'Gender Performance Split',
      labelArabic: 'توزيع الأداء حسب النوع',
      reason: 'No gender values are populated on students.gender for learners in this scope.',
      reasonArabic: 'لم تُسجَّل بيانات النوع للتلاميذ في هذا النطاق.',
    })
  }

  if (scope === 'class') {
    omittedMetrics.push({
      key: 'section_vs_section_single_class',
      label: 'Section vs Section Comparison',
      labelArabic: 'المقارنة بين الأقسام',
      reason: 'Single class selected; switch to Whole School scope (leadership roles) to compare Nursery, Lower Primary, and Upper Primary.',
      reasonArabic: 'تم اختيار صف واحد؛ اختر نطاق المدرسة كاملة لمقارنة الأقسام.',
    })
  }

  const sectionComparisonNote =
    sectionVsSection.length > 0
      ? null
      : scope === 'section'
        ? 'Section scope active; switch to Whole School scope to compare across Nursery, Lower Primary, and Upper Primary.'
        : 'Single-class scope active; select Section or Whole School scope (where permitted) for cross-class / cross-section comparisons.'
  const sectionComparisonNoteArabic =
    sectionVsSection.length > 0
      ? null
      : scope === 'section'
        ? 'النطاق الحالي يغطي قسماً واحداً؛ اختر نطاق المدرسة كاملة لمقارنة جميع الأقسام.'
        : 'النطاق الحالي يغطي صفاً واحداً؛ اختر القسم أو المدرسة كاملة عند توفر الصلاحية.'

  // Executive Breakdown Packet: Section Grade Distribution Matrices & Top 3 Achievers per Section
  const executiveSectionOrder: HubSectionId[] = ['nursery', 'lower_primary', 'upper_primary']
  const orderedExecutiveSections = [
    ...executiveSectionOrder
      .map((id) => effectiveSections.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    ...effectiveSections.filter((s) => !executiveSectionOrder.includes(s.id)),
  ]

  const sectionMatrices: ExecutiveSectionMatrix[] = []
  const topAchieversBySection: ExecutiveSectionTopAchievers[] = []

  for (const secDef of orderedExecutiveSections) {
    const secClassRows = classVsClass.filter((c) => c.sectionId === secDef.id)
    if (secClassRows.length === 0) continue

    const classCols: ExecutiveSectionMatrixClassColumn[] = secClassRows.map((c) => {
      const counts = c.candidateExcluded
        ? { I: 0, II: 0, III: 0, IV: 0, U: 0, total: 0 }
        : {
            I: c.divCounts.I,
            II: c.divCounts.II,
            III: c.divCounts.III,
            IV: c.divCounts.IV,
            U: c.divCounts.U,
            total: c.divCounts.I + c.divCounts.II + c.divCounts.III + c.divCounts.IV + c.divCounts.U,
          }
      return {
        classId: c.classId,
        className: c.englishName || c.className,
        classNameArabic: c.arabicName || c.className,
        candidateExcluded: c.candidateExcluded,
        counts,
      }
    })

    const rowTotals = classCols.reduce(
      (acc, col) => ({
        I: acc.I + col.counts.I,
        II: acc.II + col.counts.II,
        III: acc.III + col.counts.III,
        IV: acc.IV + col.counts.IV,
        U: acc.U + col.counts.U,
        total: acc.total + col.counts.total,
      }),
      { I: 0, II: 0, III: 0, IV: 0, U: 0, total: 0 }
    )

    const pct = (val: number) => (rowTotals.total > 0 ? round1((val / rowTotals.total) * 100) : 0)

    sectionMatrices.push({
      sectionId: secDef.id,
      label: secDef.label,
      labelArabic: secDef.label_arabic,
      classes: classCols,
      rowTotals,
      rowPcts: {
        I: pct(rowTotals.I),
        II: pct(rowTotals.II),
        III: pct(rowTotals.III),
        IV: pct(rowTotals.IV),
        U: pct(rowTotals.U),
      },
    })

    const secTopLearners = cohort.students
      .filter((s) => s.sectionId === secDef.id && !s.isCandidateExcluded && s.isCompleteMarks && s.normalizedScore !== null)
      .sort((a, b) => (b.normalizedScore ?? 0) - (a.normalizedScore ?? 0) || (b.total ?? 0) - (a.total ?? 0))
      .slice(0, 3)
      .map((s, idx) => ({
        rank: idx + 1,
        name: s.name,
        arabicName: s.arabic_name || null,
        className: s.className,
        normalizedScore: round1(s.normalizedScore as number),
      }))

    topAchieversBySection.push({
      sectionId: secDef.id,
      label: secDef.label,
      labelArabic: secDef.label_arabic,
      learners: secTopLearners,
    })
  }

  const partialReport: Omit<DetailedReportResult, 'insights'> = {
    meta: {
      curriculum,
      scope,
      sectionId: scope === 'section' ? sectionId : null,
      classId: scope === 'class' ? classId : null,
      scopeLabel,
      scopeLabelArabic,
      termId,
      termLabel,
      termNumber,
      academicYear,
      examPhase,
      supportThreshold,
      isNormalized: cohort.isNormalizedRanking || scope === 'school',
      rankingMethodLabel: cohort.rankingMethodLabel,
      rankingMethodLabelArabic: cohort.rankingMethodLabelArabic,
      generatedAt: new Date().toISOString(),
      examLocked,
    },
    cohort: {
      totalEnrolled: cohort.summary.totalCandidates,
      satComplete: cohort.summary.satCandidates,
      satPartial,
      absentOrNoMarks,
      incompleteTotal: cohort.summary.incompleteCandidates,
      completionPct: cohort.summary.completionPct,
      candidateExcludedCount: cohort.summary.candidateExcludedStudents,
      candidateExclusions: cohort.candidateExclusions,
      missingByClass,
      missingBySubject,
      missingLearners: cohort.missingMarksList,
    },
    performance: {
      n,
      meanPct,
      medianPct,
      highestPct,
      lowestPct,
      rangePct,
      q1Pct,
      q3Pct,
      iqrPct,
      stdDevPct,
      meanTotal: n > 0 ? cohort.summary.classAverageTotal : null,
      highestTotal: n > 0 ? cohort.summary.highestTotal : null,
      lowestTotal: n > 0 ? cohort.summary.lowestTotal : null,
      passRatePct,
      benchmark50PassRatePct,
      divisionDistribution,
      nurseryGradeDistribution,
      hasNurseryLearners,
      hasPrimaryLearners,
    },
    subjects: {
      orderedSubjects: subjectReportRows,
      strongestSubject,
      weakestSubject,
      classesInMatrix: classVsClass.map((c) => ({
        classId: c.classId,
        className: c.className,
        candidateExcluded: c.candidateExcluded,
        candidateBadge: c.candidateBadge,
      })),
    },
    learners: {
      top10,
      eligibleLearners: eligibleSummaries,
      cohortStudents,
      needsSupport,
      supportThreshold,
      needsSupportDefinition: supportDef.en,
      needsSupportDefinitionArabic: supportDef.ar,
    },
    trends: {
      previousExam: previousExamTrend,
      previousTerm: previousTermTrend,
    },
    comparisons: {
      classVsClass,
      sectionVsSection,
      sectionComparisonNote,
      sectionComparisonNoteArabic,
    },
    genderSplit: {
      capturedCount: genderCapturedCount,
      missingGenderCount: genderMissingCount,
      rows: genderRows,
    },
    cycleCompleteness: {
      examLocked,
      remarksPolicyNote:
        curriculum === 'theology'
          ? 'Theology comments derive dynamically from gender and division rubrics upon complete marks; conduct remarks are not part of Theology sheets.'
          : examPhase === 'mot'
            ? 'Class/Head Teacher remarks derive dynamically from rubric bands when marks are complete. Conduct remark is suppressed on MOT reports per school policy.'
            : 'Remarks and conduct derive dynamically from division_boundaries / grading_criteria rubrics once all subject marks are entered.',
      remarksPolicyNoteArabic:
        curriculum === 'theology'
          ? 'تُشتق ملاحظات المعلم تلقائياً من التقدير والنوع عند اكتمال الدرجات.'
          : examPhase === 'mot'
            ? 'تُشتق ملاحظات المعلم والمدير عند اكتمال الدرجات، ويُخفى تقييم السلوك في اختبار منتصف الفترة (MOT).'
            : 'تُشتق الملاحظات وتقييم السلوك تلقائياً عند اكتمال الدرجات وفق ضوابط التقدير.',
      byClass: cycleByClass,
      totals: {
        totalEnrolled: cohort.summary.totalCandidates,
        marksCompleteCount: cohort.summary.satCandidates,
        marksCompletionPct: cohort.summary.completionPct,
        remarksReadyCount: cohort.summary.satCandidates,
        remarksReadyPct: cohort.summary.completionPct,
        conductApplicableCount: conductApplicableTotal,
        conductReadyCount: conductReadyTotal,
        conductReadyPct:
          conductApplicableTotal > 0 ? round1((conductReadyTotal / conductApplicableTotal) * 100) : null,
      },
    },
    dataQuality: {
      outOfRangeScores,
      duplicateMarkRows,
      unmappedClasses: relevantUnmapped,
      missingMarksStudentsCount: cohort.missingMarksList.length,
      totalFlagCount,
    },
    omittedMetrics,
    executivePacket: {
      sectionMatrices,
      topAchieversBySection,
    },
  }

  return {
    ...partialReport,
    insights: generateDeterministicInsights(partialReport),
  }
}

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""'
  let str = String(val)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return `"${str}"`
}

export function buildDetailedReportCsv(
  report: DetailedReportResult,
  activeSupportThreshold?: number
): string {
  try {
    const threshold = clampSupportThreshold(activeSupportThreshold ?? report?.learners?.supportThreshold)
    const needsSupport = filterNeedsSupportLearners(
      report?.learners?.eligibleLearners ?? [],
      report?.meta?.curriculum ?? 'secular',
      threshold
    )

  const lines: string[] = []
  const row = (cells: unknown[]) => lines.push(cells.map(escapeCsvCell).join(','))

  row([`JIDDAH DETAILED ${report.meta.curriculum.toUpperCase()} REPORT`])
  row(['Scope', report.meta.scopeLabel, 'Term', report.meta.termLabel, 'Year', report.meta.academicYear, 'Exam', report.meta.examPhase.toUpperCase()])
  lines.push('')

  row(['SECTION 1: COHORT & PERFORMANCE SUMMARY'])
  row(['Metric', 'Value', 'Definition / Scope'])
  row(['Total Active Non-Candidate Learners', report.cohort.totalEnrolled, 'Excludes archived students & P.7 Term 3 EOT'])
  row(['Sat Complete Marks', report.cohort.satComplete, 'Learners with all expected subjects entered'])
  row(['Incomplete / Partial Marks', report.cohort.incompleteTotal, `${report.cohort.satPartial} partial, ${report.cohort.absentOrNoMarks} zero subjects`])
  row(['Marks Completion %', `${report.cohort.completionPct}%`, 'Complete / Total Active Non-Candidate'])
  row(['P.7 Candidate Excluded (N/A)', report.cohort.candidateExcludedCount, 'N/A — candidate class'])
  row(['Mean Normalized %', report.performance.meanPct ?? 'N/A', `n = ${report.performance.n}`])
  row(['Median %', report.performance.medianPct ?? 'N/A', `n = ${report.performance.n}`])
  row(['Highest %', report.performance.highestPct ?? 'N/A', `n = ${report.performance.n}`])
  row(['Lowest %', report.performance.lowestPct ?? 'N/A', `n = ${report.performance.n}`])
  row(['IQR (pp)', report.performance.iqrPct ?? 'N/A', 'Q3 - Q1'])
  row(['Pass Rate %', report.performance.passRatePct !== null ? `${report.performance.passRatePct}%` : 'N/A', 'Policy pass rate (Div I-IV / Grade A-C)'])
  lines.push('')

  row(['SECTION 2: DETERMINISTIC INSIGHTS'])
  for (const ins of report.insights) {
    row([ins.title, ins.text])
  }
  lines.push('')

  row(['SECTION 3: CLASS VS CLASS COMPARISON'])
  row(['Class', 'Section', 'Enrolled', 'Sat Complete', 'Missing', 'Completion %', 'Mean %', 'Median %', 'Pass Rate %', `Needs Support (<${threshold}%)`, 'Status'])
  for (const c of report.comparisons.classVsClass) {
    row([
      c.className,
      c.sectionLabel,
      c.totalEnrolled,
      c.satComplete,
      c.incompleteCount,
      `${c.completionPct}%`,
      c.meanPct ?? 'N/A',
      c.medianPct ?? 'N/A',
      c.passRatePct ?? 'N/A',
      c.needsSupportCount,
      c.candidateExcluded ? c.candidateBadge || CANDIDATE_NA_BADGE : 'Active',
    ])
  }
  lines.push('')

  if (report.comparisons.sectionVsSection.length > 0) {
    row(['SECTION 4: SECTION VS SECTION COMPARISON'])
    row(['Section', 'Classes', 'Enrolled', 'Sat Complete', 'Completion %', 'Mean %', 'Median %', 'Pass Rate %', 'P.7 Excluded'])
    for (const sec of report.comparisons.sectionVsSection) {
      row([
        sec.label,
        sec.classCount,
        sec.totalEnrolled,
        sec.satComplete,
        `${sec.completionPct}%`,
        sec.meanPct ?? 'N/A',
        sec.medianPct ?? 'N/A',
        sec.passRatePct ?? 'N/A',
        sec.candidateExcludedCount,
      ])
    }
    lines.push('')
  }

  row(['SECTION 5: SUBJECT BREAKDOWN'])
  row(['Subject', 'Sat', 'Expected', 'Missing', 'Mean %', 'Median %', 'High', 'Low', 'Pass Rate %'])
  for (const sub of report.subjects.orderedSubjects) {
    row([
      sub.subjectName,
      sub.satCount,
      sub.expectedCount,
      sub.missingCount,
      sub.mean ?? 'N/A',
      sub.median ?? 'N/A',
      sub.highest ?? 'N/A',
      sub.lowest ?? 'N/A',
      sub.passRate ?? 'N/A',
    ])
  }
  lines.push('')

    row(['SECTION 6: TOP 10 MERIT ROLL'])
    row(['Rank', 'Student', 'Adm No', 'Class', 'Normalized %', 'Total', 'Aggregate', 'Division'])
    for (const st of report?.learners?.top10 ?? []) {
      row([st?.position ?? '-', st?.name ?? '-', st?.admissionNumber || '-', st?.className ?? '-', st?.normalizedScore ?? '-', st?.total ?? '-', st?.aggregate ?? '-', st?.division ?? '-'])
    }
    lines.push('')

    row(['SECTION 6B: CURRENT-TERM COHORT MASTER SHEET (BOT, MOT, EOT)'])
    row(['Student Name', 'Class', 'BOT (Marks/Grade)', 'MOT (Marks/Grade)', 'EOT (Marks/Grade)', 'Overall Average', 'Aggregate Score', 'Division', 'Class Rank'])
    for (const st of report?.learners?.cohortStudents ?? report?.learners?.eligibleLearners ?? []) {
      row([
        st?.name ?? '-',
        st?.className ?? '-',
        st?.bot_score ?? '--',
        st?.mot_score ?? '--',
        st?.eot_score ?? '--',
        st?.overall_average ?? (st?.normalizedScore != null ? `${Math.round(st.normalizedScore)}%` : '--'),
        st?.aggregate ?? '--',
        st?.division || '--',
        st?.position ?? '--',
      ])
    }
    lines.push('')

  row([`SECTION 7: NEEDS SUPPORT (< ${threshold}%)`])
  row(['Student', 'Adm No', 'Class', 'Normalized %', 'Total', 'Aggregate', 'Division'])
  for (const st of needsSupport) {
    row([st.name, st.admissionNumber || '-', st.className, st.normalizedScore ?? '-', st.total ?? '-', st.aggregate ?? '-', st.division])
  }
  lines.push('')

    row(['SECTION 8: DATA QUALITY & MISSING MARKS'])
    row(['Missing Marks Learners', report?.dataQuality?.missingMarksStudentsCount ?? 0, 'Out of Range Scores', report?.dataQuality?.outOfRangeScores?.length ?? 0, 'Duplicate Mark Rows', report?.dataQuality?.duplicateMarkRows?.length ?? 0, 'Unmapped Classes', report?.dataQuality?.unmappedClasses?.length ?? 0])
    for (const m of report?.cohort?.missingLearners ?? []) {
      row([m?.studentName ?? '-', m?.className ?? '-', `${m?.satCount ?? 0}/${m?.expectedCount ?? 0}`, (m?.missingSubjects ?? []).join('; ')])
    }

    return lines.join('\n')
  } catch (err) {
    console.error('buildDetailedReportCsv fallback error:', err)
    return 'Student Name,Class,Status\nNo data available,,'
  }
}

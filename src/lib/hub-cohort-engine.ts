import {
  calculateAggregate,
  calculateTheologyAggregateFromMarks,
  getDivision,
  getGradeDisplay,
  getNurseryGrade,
  getSubjectGradeNumber,
  getTheologyDivision,
  isGradableSubject,
  isNurseryClass,
} from './grading'
import type {
  DivisionBoundaryItem,
  GradingBand,
  TheologyDivisionBoundaryItem,
} from './school-settings-helper'
import { computeConfigurableRankings, computeStandardRankings } from './ranking'
import {
  canonicalSecularSubjectCode,
  canonicalTheologySubjectCode,
  findReconciledMark,
} from './marks-reconciliation'
import {
  CANDIDATE_NA_BADGE,
  doesExamApplyToClassInTerm,
  formatClassDisplayName,
  mapClassesToSections,
  resolveCanonicalClassCode,
  type CandidateClassExclusionRule,
  type ClassLikeRecord,
  type ExamApplicabilityResult,
  type ExamPhase,
  type HubCurriculum,
  type HubSectionDefinition,
  type HubSectionId,
  type UnmappedClassWarning,
} from './academic-sections'

export interface HubSubjectRecord {
  id: string
  subject_name?: string | null
  subject_name_arabic?: string | null
  section?: string | null
  level?: string | number | null
  sort_order?: number | null
  max_score?: number | null
}

const SECULAR_CANONICAL_ORDER = [
  'english',
  'eng',
  'mathematics',
  'math',
  'mtc',
  'science',
  'integrated science',
  'sci',
  'social studies',
  'sst',
  'literacy 1',
  'lit i',
  'lit 1',
  'literacy 2',
  'lit ii',
  'lit 2',
  'islamic religious education',
  'ire',
  'religious education',
  're',
]

const THEOLOGY_CANONICAL_ORDER = [
  'القرآن الكريم',
  'القرآن',
  'اللغة العربية',
  'الفقه والعبادات',
  'الفقه',
  'التوحيد والعقيدة',
  'التوحيد',
  'التربية الإسلامية',
  'التربية',
  'التاريخ والسيرة',
  'السيرة والآداب',
  'السيرة',
]

export function getSubjectsForHubClass(
  cls: ClassLikeRecord,
  allSubjects: HubSubjectRecord[],
  curriculum: HubCurriculum,
  sectionHint?: HubSectionId | null
): HubSubjectRecord[] {
  if (!Array.isArray(allSubjects) || allSubjects.length === 0) return []

  if (curriculum === 'theology') {
    const clsLvl =
      cls.level !== null && cls.level !== undefined && cls.level !== ''
        ? String(cls.level).trim().toLowerCase()
        : ''
    const canonicalCode = resolveCanonicalClassCode(cls, 'theology')
    const codeDigit = canonicalCode?.match(/^THEO_([1-7])$/)?.[1] || ''
    const isNurseryTheo =
      canonicalCode === 'BABY' ||
      canonicalCode === 'MIDDLE' ||
      canonicalCode === 'TOP' ||
      canonicalCode === 'RAUDHA' ||
      sectionHint === 'nursery'
    const effectiveSection =
      sectionHint === 'nursery' || isNurseryTheo
        ? 'raudha'
        : sectionHint === 'lower_primary'
          ? 'ibtidaai_lower'
          : sectionHint === 'upper_primary'
            ? 'ibtidaai_upper'
            : ''

    // Tier 1: exact class level / canonical digit match (or nursery raudha tokens)
    const exactMatched = allSubjects.filter((s) => {
      const sLvl =
        s.level !== null && s.level !== undefined && s.level !== ''
          ? String(s.level).trim().toLowerCase()
          : ''
      const sSec = String(s.section ?? '').trim().toLowerCase()
      if (!sLvl && !sSec) return true
      if (isNurseryTheo && (sLvl === 'raudha' || sSec === 'raudha' || sLvl === '0' || sSec === '0' || sLvl === 'nursery' || sSec === 'nursery')) {
        return true
      }
      if (clsLvl && (sLvl === clsLvl || (!sLvl && sSec === clsLvl))) return true
      if (codeDigit && (sLvl === codeDigit || (!sLvl && sSec === codeDigit))) return true
      return false
    })

    const matched =
      exactMatched.length > 0
        ? exactMatched
        : allSubjects.filter((s) => {
            const sLvl =
              s.level !== null && s.level !== undefined && s.level !== ''
                ? String(s.level).trim().toLowerCase()
                : ''
            const sSec = String(s.section ?? '').trim().toLowerCase()
            if (!sLvl && !sSec) return true
            if (effectiveSection && (sLvl === effectiveSection || sSec === effectiveSection)) return true
            return false
          })

    return [...matched].sort((a, b) => {
      const nameA = a.subject_name_arabic || a.subject_name || ''
      const nameB = b.subject_name_arabic || b.subject_name || ''
      let aIdx = THEOLOGY_CANONICAL_ORDER.findIndex((t) => nameA.includes(t))
      let bIdx = THEOLOGY_CANONICAL_ORDER.findIndex((t) => nameB.includes(t))
      if (aIdx === -1) aIdx = 999
      if (bIdx === -1) bIdx = 999
      if (aIdx !== bIdx) return aIdx - bIdx
      return (a.sort_order ?? 999) - (b.sort_order ?? 999)
    })
  }

  // Secular
  const secToken = String(sectionHint || cls.section || '').trim().toLowerCase()
  const className = String(cls.class_name ?? cls.name ?? '')
  const matched = allSubjects.filter((s) => {
    const sSec = String(s.section ?? '').trim().toLowerCase()
    const sectionMatches = !sSec || !secToken || sSec === secToken
    return sectionMatches && isGradableSubject(s.subject_name || '', className)
  })

  return [...matched].sort((a, b) => {
    const nameA = (a.subject_name || '').toLowerCase()
    const nameB = (b.subject_name || '').toLowerCase()
    let aIdx = SECULAR_CANONICAL_ORDER.findIndex((t) => nameA.includes(t))
    let bIdx = SECULAR_CANONICAL_ORDER.findIndex((t) => nameB.includes(t))
    if (aIdx === -1) aIdx = 999
    if (bIdx === -1) bIdx = 999
    if (aIdx !== bIdx) return aIdx - bIdx
    return nameA.localeCompare(nameB)
  })
}

export interface HubStudentRow {
  id: string
  student_id: string
  name: string
  arabic_name: string
  admission_number: string
  gender: string
  classId: string
  className: string
  sectionId: HubSectionId | null
  expectedSubjectCount: number
  satSubjectCount: number
  maxPossibleTotal: number
  missingSubjects: string[]
  isCompleteMarks: boolean
  isCandidateExcluded: boolean
  candidateBadge: string | null
  total: number | null
  normalizedScore: number | null
  average: number | null
  aggregate: number | null
  division: string
  subjectScores: Record<string, number | null>
  subjectGrades: Record<string, string | null>
  rank: number | string
  position: number | string
}

export interface MissingMarksEntry {
  enrollmentId: string
  studentId: string
  studentName: string
  arabicName: string
  admissionNumber: string
  classId: string
  className: string
  satCount: number
  expectedCount: number
  missingCount: number
  missingSubjects: string[]
}

export interface ClassBreakdownSummary {
  classId: string
  className: string
  arabicName?: string
  englishName?: string
  sectionId: HubSectionId | null
  totalEnrolled: number
  satComplete: number
  incompleteCount: number
  missingMarkSlots: number
  isCandidateExcluded: boolean
  candidateBadge: string | null
  candidateReason: string | null
  meanTotal: number | null
  meanPct: number | null
  passRate: number | null
  completionPct: number | null
  expectedSubjectCount: number
  maxPossibleTotal: number
  divCounts: { I: number; II: number; III: number; IV: number; U: number; unranked: number }
}

export interface HubCohortComputationResult {
  curriculum: HubCurriculum
  mode: 'class' | 'section'
  sectionId: HubSectionId | null
  orderedSubjects: HubSubjectRecord[]
  students: HubStudentRow[]
  top10: HubStudentRow[]
  missingMarksList: MissingMarksEntry[]
  classBreakdown: ClassBreakdownSummary[]
  unmappedClasses: UnmappedClassWarning[]
  candidateExclusions: Array<{ classId: string; className: string; badge: string; reason: string; enrolled: number }>
  isSingleClassCandidateExcluded: boolean
  candidateExclusionBadge: string | null
  candidateExclusionReason: string | null
  isNormalizedRanking: boolean
  hasHeterogeneousSubjects: boolean
  rankingMethodLabel: string
  rankingMethodLabelArabic: string
  summary: {
    subjectStats: Record<string, { avg: number; highest: number; lowest: number; passRate: number; count: number }>
    classAverageTotal: number
    meanNormalizedPct: number | null
    highestTotal: number
    lowestTotal: number
    divCounts: { I: number; II: number; III: number; IV: number; U: number; unranked: number }
    nurseryGradeCounts: Record<'A' | 'B' | 'C' | 'D' | 'E', number>
    nurseryOverallAvg: number
    nurseryExcellenceCount: number
    nurseryExcellencePct: number
    totalCandidates: number
    satCandidates: number
    incompleteCandidates: number
    candidateExcludedStudents: number
    completionPct: number
  }
}

export function computeHubCohortMetrics(params: {
  curriculum: HubCurriculum
  mode: 'class' | 'section'
  sectionId?: HubSectionId | null
  classes: Array<ClassLikeRecord & { id: string }>
  enrollments: any[]
  marks: any[]
  subjects: HubSubjectRecord[]
  examPhase: ExamPhase
  termNumber?: number | null
  termLabel?: string | null
  gradingConfig?: {
    grading_scale?: GradingBand[]
    division_boundaries?: DivisionBoundaryItem[]
    theology_grading_scale?: GradingBand[]
    theology_division_boundaries?: TheologyDivisionBoundaryItem[]
    hub_sections?: HubSectionDefinition[]
    candidate_class_rules?: CandidateClassExclusionRule[]
  }
}): HubCohortComputationResult {
  const {
    curriculum,
    mode,
    sectionId = null,
    classes,
    enrollments,
    marks,
    subjects,
    examPhase,
    termNumber,
    termLabel,
    gradingConfig,
  } = params

  const mapping = mapClassesToSections(
    classes,
    curriculum,
    gradingConfig?.hub_sections,
    gradingConfig?.candidate_class_rules
  )

  const targetClasses =
    mode === 'section' && sectionId
      ? classes.filter((c) => mapping.classToSection[String(c.id)] === sectionId)
      : classes

  const resolveUnionKey = (sub: HubSubjectRecord): string => {
    const rawName =
      curriculum === 'theology'
        ? sub.subject_name_arabic || sub.subject_name || ''
        : sub.subject_name || sub.subject_name_arabic || ''
    const code =
      curriculum === 'theology'
        ? canonicalTheologySubjectCode(rawName)
        : canonicalSecularSubjectCode(rawName)
    if (code) return `${curriculum}:${code}`
    const normalizedName = String(rawName)
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
    return normalizedName ? `${curriculum}:name:${normalizedName}` : `id:${sub.id}`
  }

  const classApplicability = new Map<string, ExamApplicabilityResult>()
  const classSubjectsMap = new Map<string, HubSubjectRecord[]>()
  const unionSubjectMap = new Map<string, HubSubjectRecord>()
  const canonicalUnionIdBySubId = new Map<string, string>()

  const applicableSignatures = new Set<string>()
  const candidateExclusions: Array<{
    classId: string
    className: string
    badge: string
    reason: string
    enrolled: number
  }> = []

  for (const cls of targetClasses) {
    const cid = String(cls.id)
    const mappedSectionId = mapping.classToSection[cid] ?? sectionId
    const app = doesExamApplyToClassInTerm(
      {
        ...cls,
        id: cid,
        classId: cid,
        curriculum,
        examType: examPhase,
        termNumber,
        termLabel,
      },
      gradingConfig?.candidate_class_rules
    )
    classApplicability.set(cid, app)

    const clsSubjects = getSubjectsForHubClass(cls, subjects, curriculum, mappedSectionId)
    classSubjectsMap.set(cid, clsSubjects)

    if (app.applies) {
      const seenKeysInClass = new Set<string>()
      const clsCanonicalKeys: string[] = []
      for (const s of clsSubjects) {
        let uKey = resolveUnionKey(s)
        if (seenKeysInClass.has(uKey)) {
          uKey = `${uKey}::${s.id}`
        }
        seenKeysInClass.add(uKey)
        clsCanonicalKeys.push(uKey)
        if (!unionSubjectMap.has(uKey)) {
          unionSubjectMap.set(uKey, s)
        }
        const canonicalSub = unionSubjectMap.get(uKey)!
        canonicalUnionIdBySubId.set(s.id, canonicalSub.id)
      }
      const maxSum = clsSubjects.reduce((acc, s) => acc + (Number(s.max_score) || 100), 0)
      const sigIds = clsCanonicalKeys.sort().join(',')
      applicableSignatures.add(`${clsSubjects.length}:${maxSum}:${sigIds}`)
    }
  }

  if (unionSubjectMap.size === 0 && targetClasses.length === 1) {
    const onlySubs = classSubjectsMap.get(String(targetClasses[0].id)) ?? []
    for (const s of onlySubs) {
      const uKey = `id:${s.id}`
      unionSubjectMap.set(uKey, s)
      canonicalUnionIdBySubId.set(s.id, s.id)
    }
  }

  const orderedSubjects = Array.from(unionSubjectMap.values())
  const hasHeterogeneousSubjects = applicableSignatures.size > 1
  const isNormalizedRanking = mode === 'section' && (hasHeterogeneousSubjects || targetClasses.length > 1)

  const scoreKey = `${examPhase}_score` as 'bot_score' | 'mot_score' | 'eot_score'

  const allRows: HubStudentRow[] = []
  const missingMarksList: MissingMarksEntry[] = []
  const classBreakdown: ClassBreakdownSummary[] = []

  let singleClassApp: ExamApplicabilityResult | null = null
  if (mode === 'class' && targetClasses.length === 1) {
    singleClassApp = classApplicability.get(String(targetClasses[0].id)) ?? null
  }

  for (const cls of targetClasses) {
    const cid = String(cls.id)
    const className = formatClassDisplayName(cls, curriculum)
    const mappedSecId = mapping.classToSection[cid] ?? null
    const app = classApplicability.get(cid)!
    const clsSubjects = classSubjectsMap.get(cid) ?? []
    const clsEnrollments = enrollments.filter((e) =>
      curriculum === 'theology' ? String(e.theology_class_id) === cid : String(e.circular_class_id) === cid
    )

    if (!app.applies) {
      candidateExclusions.push({
        classId: cid,
        className,
        badge: app.badge || CANDIDATE_NA_BADGE,
        reason: app.reason || 'P.7 candidates sit PLE / IPLE and have no Term 3 EOT.',
        enrolled: clsEnrollments.length,
      })

      classBreakdown.push({
        classId: cid,
        className,
        arabicName: cls.class_name_arabic ?? undefined,
        englishName: cls.class_name_english ?? undefined,
        sectionId: mappedSecId,
        totalEnrolled: clsEnrollments.length,
        satComplete: 0,
        incompleteCount: 0,
        missingMarkSlots: 0,
        isCandidateExcluded: true,
        candidateBadge: app.badge || CANDIDATE_NA_BADGE,
        candidateReason: app.reason,
        meanTotal: null,
        meanPct: null,
        passRate: null,
        completionPct: null,
        expectedSubjectCount: 0,
        maxPossibleTotal: 0,
        divCounts: { I: 0, II: 0, III: 0, IV: 0, U: 0, unranked: 0 },
      })

      for (const enrollment of clsEnrollments) {
        const studentObj = enrollment.students || {}
        allRows.push({
          id: enrollment.id,
          student_id: enrollment.student_id,
          name: studentObj.name || 'Unknown Student',
          arabic_name: studentObj.arabic_name || '',
          admission_number: studentObj.admission_number || '',
          gender: studentObj.gender || '',
          classId: cid,
          className,
          sectionId: mappedSecId,
          expectedSubjectCount: 0,
          satSubjectCount: 0,
          maxPossibleTotal: 0,
          missingSubjects: [],
          isCompleteMarks: false,
          isCandidateExcluded: true,
          candidateBadge: app.badge || CANDIDATE_NA_BADGE,
          total: null,
          normalizedScore: null,
          average: null,
          aggregate: null,
          division: app.badge || CANDIDATE_NA_BADGE,
          subjectScores: {},
          subjectGrades: {},
          rank: '-',
          position: '-',
        })
      }
      continue
    }

    const clsIsNursery =
      curriculum === 'secular' &&
      (mappedSecId === 'nursery' ||
        String(cls.section ?? '').toLowerCase() === 'nursery' ||
        isNurseryClass(cls.class_name ?? cls.name))
    const clsSectionToken = String(cls.section || mappedSecId || '').toLowerCase()

    let satCompleteCount = 0
    let incompleteCount = 0
    let missingSlotCount = 0
    let passedCount = 0
    const completeTotals: number[] = []
    const completePcts: number[] = []
    const clsDivCounts = { I: 0, II: 0, III: 0, IV: 0, U: 0, unranked: 0 }

    const expectedCount = clsSubjects.length
    const maxPossibleTotal = clsSubjects.reduce((acc, s) => acc + (Number(s.max_score) || 100), 0)

    for (const enrollment of clsEnrollments) {
      const eMarks = marks.filter(
        (m) => m.enrollment_id === enrollment.id || (m.student_id && m.student_id === enrollment.student_id)
      )
      const subjectScores: Record<string, number | null> = {}
      const subjectGrades: Record<string, string | null> = {}
      const missingSubNames: string[] = []
      const scoresForSecularAgg: { subject_name: string; score: number }[] = []
      const aggInputsTheology: { subject_name?: string; subject_name_arabic?: string; score: number | null }[] = []

      let total = 0
      let satMaxSum = 0
      let satCount = 0

      for (const sub of clsSubjects) {
        const subName =
          curriculum === 'theology'
            ? sub.subject_name_arabic || sub.subject_name
            : sub.subject_name
        const mark = findReconciledMark(eMarks, {
          studentId: enrollment.student_id,
          enrollmentId: enrollment.id,
          subjectId: sub.id,
          subjectName: subName,
          curriculum,
        })
        const rawScore = mark?.[scoreKey]
        const numericScore =
          rawScore != null && String(rawScore) !== '' && !isNaN(Number(rawScore)) ? Number(rawScore) : null
        const targetSubId = canonicalUnionIdBySubId.get(sub.id) ?? sub.id
        subjectScores[targetSubId] = numericScore
        const subLabel =
          curriculum === 'theology'
            ? String(sub.subject_name_arabic || sub.subject_name || 'Subject')
            : String(sub.subject_name || 'Subject')

        if (numericScore != null) {
          total += numericScore
          satMaxSum += Number(sub.max_score) || 100
          satCount++
          if (curriculum === 'secular') {
            if (clsIsNursery) {
              subjectGrades[targetSubId] = getNurseryGrade(numericScore).grade
            } else {
              const gNum = getSubjectGradeNumber(numericScore, gradingConfig?.grading_scale)
              subjectGrades[targetSubId] = getGradeDisplay(gNum)
            }
            scoresForSecularAgg.push({ subject_name: String(sub.subject_name || ''), score: numericScore })
          } else {
            subjectGrades[targetSubId] = null
          }
        } else {
          subjectGrades[targetSubId] = null
          missingSubNames.push(subLabel)
        }

        if (curriculum === 'theology') {
          aggInputsTheology.push({
            subject_name: sub.subject_name ?? undefined,
            subject_name_arabic: sub.subject_name_arabic ?? undefined,
            score: numericScore,
          })
        }
      }

      const hasAllSubjects = expectedCount > 0 && satCount === expectedCount && missingSubNames.length === 0
      const normalizedScore =
        hasAllSubjects && satMaxSum > 0
          ? Math.round((total / satMaxSum) * 10000) / 100
          : null

      let agg: number | null = null
      let div = '-'
      if (satCount > 0) {
        if (curriculum === 'secular') {
          if (!clsIsNursery) {
            agg = calculateAggregate(scoresForSecularAgg, clsSectionToken, gradingConfig?.grading_scale)
            div = agg !== null ? getDivision(agg, gradingConfig?.division_boundaries) : 'U'
          }
        } else {
          agg = calculateTheologyAggregateFromMarks(aggInputsTheology, gradingConfig?.theology_grading_scale)
          div = agg !== null ? getTheologyDivision(agg, gradingConfig?.theology_division_boundaries) : 'راسب'
        }
      }

      const studentObj = enrollment.students || {}
      const studentName = String(studentObj.name || 'Unknown Student')
      const arabicName = String(studentObj.arabic_name || '')
      const admNo = String(studentObj.admission_number || '')

      if (hasAllSubjects && normalizedScore !== null) {
        satCompleteCount++
        completeTotals.push(total)
        completePcts.push(normalizedScore)
        if (curriculum === 'secular') {
          if (clsIsNursery) {
            const g = getNurseryGrade(Math.round(normalizedScore)).grade
            if (g === 'A' || g === 'B' || g === 'C') passedCount++
          } else {
            if (div === 'I' || div === 'II' || div === 'III' || div === 'IV') passedCount++
            if (div === 'I') clsDivCounts.I++
            else if (div === 'II') clsDivCounts.II++
            else if (div === 'III') clsDivCounts.III++
            else if (div === 'IV') clsDivCounts.IV++
            else clsDivCounts.U++
          }
        } else {
          if (div !== 'راسب' && div !== '-') passedCount++
          if (div === 'ممتاز') clsDivCounts.I++
          else if (div === 'جيد جداً' || div === 'جيد جدا') clsDivCounts.II++
          else if (div === 'جيد') clsDivCounts.III++
          else if (div === 'مقبول') clsDivCounts.IV++
          else clsDivCounts.U++
        }
      } else {
        clsDivCounts.unranked++
        if (expectedCount > 0) {
          incompleteCount++
          missingSlotCount += missingSubNames.length
          missingMarksList.push({
            enrollmentId: enrollment.id,
            studentId: enrollment.student_id,
            studentName,
            arabicName,
            admissionNumber: admNo,
            classId: cid,
            className,
            satCount,
            expectedCount,
            missingCount: missingSubNames.length,
            missingSubjects: missingSubNames,
          })
        }
      }

      allRows.push({
        id: enrollment.id,
        student_id: enrollment.student_id,
        name: studentName,
        arabic_name: arabicName,
        admission_number: admNo,
        gender: String(studentObj.gender || ''),
        classId: cid,
        className,
        sectionId: mappedSecId,
        expectedSubjectCount: expectedCount,
        satSubjectCount: satCount,
        maxPossibleTotal,
        missingSubjects: missingSubNames,
        isCompleteMarks: hasAllSubjects,
        isCandidateExcluded: false,
        candidateBadge: null,
        total: satCount > 0 ? total : null,
        normalizedScore,
        average: normalizedScore,
        aggregate: agg,
        division: div,
        subjectScores,
        subjectGrades,
        rank: '-',
        position: '-',
      })
    }

    const totalPossibleSlots = clsEnrollments.length * expectedCount
    const enteredSlots = totalPossibleSlots - missingSlotCount
    const completionPct =
      totalPossibleSlots > 0 ? Math.round((enteredSlots / totalPossibleSlots) * 100) : 0

    classBreakdown.push({
      classId: cid,
      className,
      arabicName: cls.class_name_arabic ?? undefined,
      englishName: cls.class_name_english ?? undefined,
      sectionId: mappedSecId,
      totalEnrolled: clsEnrollments.length,
      satComplete: satCompleteCount,
      incompleteCount,
      missingMarkSlots: missingSlotCount,
      isCandidateExcluded: false,
      candidateBadge: null,
      candidateReason: null,
      meanTotal:
        completeTotals.length > 0
          ? Math.round(completeTotals.reduce((a, b) => a + b, 0) / completeTotals.length)
          : null,
      meanPct:
        completePcts.length > 0
          ? Math.round((completePcts.reduce((a, b) => a + b, 0) / completePcts.length) * 10) / 10
          : null,
      passRate: satCompleteCount > 0 ? Math.round((passedCount / satCompleteCount) * 100) : null,
      completionPct,
      expectedSubjectCount: expectedCount,
      maxPossibleTotal,
      divCounts: clsDivCounts,
    })
  }

  // Rank strictly over eligible, non-excluded students with complete marks (no zero-filling!).
  const rankCandidates = allRows.map((row) => ({
    ...row,
    total: row.isCandidateExcluded || !row.isCompleteMarks ? null : row.total,
    average: row.isCandidateExcluded || !row.isCompleteMarks ? null : row.normalizedScore,
  }))

  const rankedRaw = isNormalizedRanking
    ? computeConfigurableRankings(rankCandidates, {
        method: 'standard',
        basis: 'average',
        tiebreak: 'none',
        show_rank: true,
      })
    : computeStandardRankings(rankCandidates)

  const rankedStudents: HubStudentRow[] = rankedRaw.map((p) => {
    const orig = allRows.find((r) => r.id === p.id)
    return {
      ...p,
      total: orig ? orig.total : p.total,
      rank: p.rank,
      position: p.rank,
    }
  })

  const eligibleRanked = rankedStudents.filter(
    (s) => !s.isCandidateExcluded && s.isCompleteMarks && s.position !== '-' && s.normalizedScore !== null
  )
  const top10 = eligibleRanked.slice(0, 10)

  const nonExcludedRows = rankedStudents.filter((s) => !s.isCandidateExcluded)
  const subjectStats: Record<
    string,
    { avg: number; highest: number; lowest: number; passRate: number; count: number }
  > = {}

  for (const sub of orderedSubjects) {
    const scores = nonExcludedRows
      .map((st) => st.subjectScores[sub.id])
      .filter((s): s is number => typeof s === 'number' && !isNaN(s))

    if (scores.length > 0) {
      const sum = scores.reduce((a, b) => a + b, 0)
      const avg = Math.round(sum / scores.length)
      const highest = Math.max(...scores)
      const lowest = Math.min(...scores)
      const passCount = scores.filter((s) => s >= 50).length
      const passRate = Math.round((passCount / scores.length) * 100)
      subjectStats[sub.id] = { avg, highest, lowest, passRate, count: scores.length }
    } else {
      subjectStats[sub.id] = { avg: 0, highest: 0, lowest: 0, passRate: 0, count: 0 }
    }
  }

  const completeTotals = eligibleRanked
    .map((s) => s.total)
    .filter((t): t is number => typeof t === 'number' && !isNaN(t))
  const completeNormalized = eligibleRanked
    .map((s) => s.normalizedScore)
    .filter((t): t is number => typeof t === 'number' && !isNaN(t))

  const classAverageTotal =
    completeTotals.length > 0
      ? Math.round(completeTotals.reduce((a, b) => a + b, 0) / completeTotals.length)
      : 0
  const meanNormalizedPct =
    completeNormalized.length > 0
      ? Math.round((completeNormalized.reduce((a, b) => a + b, 0) / completeNormalized.length) * 10) / 10
      : null
  const highestTotal = completeTotals.length > 0 ? Math.max(...completeTotals) : 0
  const lowestTotal = completeTotals.length > 0 ? Math.min(...completeTotals) : 0

  const divCounts = {
    I: nonExcludedRows.filter((s) => s.isCompleteMarks && (s.division === 'I' || s.division === 'ممتاز')).length,
    II: nonExcludedRows.filter(
      (s) => s.isCompleteMarks && (s.division === 'II' || s.division === 'جيد جداً' || s.division === 'جيد جدا')
    ).length,
    III: nonExcludedRows.filter((s) => s.isCompleteMarks && (s.division === 'III' || s.division === 'جيد')).length,
    IV: nonExcludedRows.filter((s) => s.isCompleteMarks && (s.division === 'IV' || s.division === 'مقبول')).length,
    U: nonExcludedRows.filter((s) => s.isCompleteMarks && (s.division === 'U' || s.division === 'راسب')).length,
    unranked: nonExcludedRows.filter((s) => !s.isCompleteMarks).length,
  }

  const nurseryGradeCounts: Record<'A' | 'B' | 'C' | 'D' | 'E', number> = { A: 0, B: 0, C: 0, D: 0, E: 0 }
  let nurseryTotalPctSum = 0
  let nurseryScoredCount = 0
  for (const st of eligibleRanked) {
    if (st.normalizedScore !== null) {
      const avg = Math.round(st.normalizedScore)
      const g = getNurseryGrade(avg).grade
      nurseryGradeCounts[g]++
      nurseryTotalPctSum += avg
      nurseryScoredCount++
    }
  }
  const nurseryOverallAvg = nurseryScoredCount > 0 ? Math.round(nurseryTotalPctSum / nurseryScoredCount) : 0
  const nurseryExcellenceCount = nurseryGradeCounts.A + nurseryGradeCounts.B
  const nurseryExcellencePct =
    eligibleRanked.length > 0 ? Math.round((nurseryExcellenceCount / eligibleRanked.length) * 100) : 0

  const activeSlotsExpected = classBreakdown
    .filter((c) => !c.isCandidateExcluded)
    .reduce((acc, c) => acc + c.totalEnrolled * c.expectedSubjectCount, 0)
  const activeSlotsMissing = classBreakdown
    .filter((c) => !c.isCandidateExcluded)
    .reduce((acc, c) => acc + c.missingMarkSlots, 0)
  const completionPct =
    activeSlotsExpected > 0
      ? Math.round(((activeSlotsExpected - activeSlotsMissing) / activeSlotsExpected) * 100)
      : 0

  const rankingMethodLabel = isNormalizedRanking
    ? hasHeterogeneousSubjects
      ? 'Normalized Avg % over subjects sat (classes differ in subjects/max marks; ties: 1, 2, 2, 4; missing marks excluded)'
      : 'Section Ranking by Normalized Avg % over subjects sat (ties: 1, 2, 2, 4; missing marks excluded)'
    : 'Class Ranking by Total Score over expected subjects (ties: 1, 2, 2, 4; missing marks excluded)'

  const rankingMethodLabelArabic = isNormalizedRanking
    ? hasHeterogeneousSubjects
      ? 'الترتيب المعياري: النسبة المئوية لمتوسط المواد الممتحنة (لتفاوت عدد المواد بين الصفوف؛ تستبعد الدرجات الناقصة)'
      : 'ترتيب القسم: النسبة المئوية لمتوسط المواد الممتحنة (تستبعد الدرجات الناقصة)'
    : 'ترتيب الفصل: مجموع الدرجات في المواد المقررة (تستبعد الدرجات الناقصة)'

  const isSingleClassCandidateExcluded = Boolean(singleClassApp && !singleClassApp.applies)

  return {
    curriculum,
    mode,
    sectionId,
    orderedSubjects,
    students: rankedStudents,
    top10,
    missingMarksList,
    classBreakdown,
    unmappedClasses: mapping.unmappedClasses,
    candidateExclusions,
    isSingleClassCandidateExcluded,
    candidateExclusionBadge: isSingleClassCandidateExcluded
      ? singleClassApp?.badge || CANDIDATE_NA_BADGE
      : null,
    candidateExclusionReason: isSingleClassCandidateExcluded ? singleClassApp?.reason || null : null,
    isNormalizedRanking,
    hasHeterogeneousSubjects,
    rankingMethodLabel,
    rankingMethodLabelArabic,
    summary: {
      subjectStats,
      classAverageTotal,
      meanNormalizedPct,
      highestTotal,
      lowestTotal,
      divCounts,
      nurseryGradeCounts,
      nurseryOverallAvg,
      nurseryExcellenceCount,
      nurseryExcellencePct,
      totalCandidates: nonExcludedRows.length,
      satCandidates: eligibleRanked.length,
      incompleteCandidates: nonExcludedRows.length - eligibleRanked.length,
      candidateExcludedStudents: rankedStudents.length - nonExcludedRows.length,
      completionPct,
    },
  }
}

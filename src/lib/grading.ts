import { DEFAULT_GRADING_BANDS, type GradingBand } from './school-settings-helper.ts'

export type GradeCode = 'D1' | 'D2' | 'C3' | 'C4' | 'C5' | 'C6' | 'P7' | 'P8' | 'F9'
export type Division = 'I' | 'II' | 'III' | 'IV' | 'U'
export type NurseryGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export type PromotionStatus = 'Promote' | 'Probation' | 'Repeat' | 'Try Next Class'

// UNEB subject grade (1-9) from mark (Secular)
export function getSubjectGradeNumber(mark: number): number {
  if (mark >= 85) return 1
  if (mark >= 75) return 2
  if (mark >= 70) return 3
  if (mark >= 60) return 4
  if (mark >= 55) return 5
  if (mark >= 50) return 6
  if (mark >= 40) return 7
  if (mark >= 35) return 8
  return 9
}

// Display format D1-F9
export function getGradeDisplay(gradeNum: number): GradeCode {
  const map: Record<number, GradeCode> = {
    1: 'D1',
    2: 'D2',
    3: 'C3',
    4: 'C4',
    5: 'C5',
    6: 'C6',
    7: 'P7',
    8: 'P8',
    9: 'F9',
  }
  return map[gradeNum] ?? 'F9'
}

/**
 * Official Theology Grading Scale (2026 Standards):
 * 85-100: D1 (1)
 * 75-84:  D2 (2)
 * 65-74:  C3 (3)
 * 60-64:  C4 (4)
 * 55-59:  C5 (5)
 * 50-54:  C6 (6)
 * 40-49:  P7 (7)
 * 30-39:  P8 (8)
 * 0-29:   F9 (9)
 */
export function getTheologyGradeNumber(
  mark: number,
  customBands?: { min: number; max: number; grade: string }[]
): number {
  if (customBands && customBands.length > 0) {
    for (let i = 0; i < customBands.length; i++) {
      const b = customBands[i];
      if (mark >= b.min && mark <= b.max) {
        const num = parseInt(String(b.grade).replace(/\D/g, ''), 10);
        return !isNaN(num) ? num : i + 1;
      }
    }
  }

  if (mark >= 85) return 1
  if (mark >= 75) return 2
  if (mark >= 65) return 3
  if (mark >= 60) return 4
  if (mark >= 55) return 5
  if (mark >= 50) return 6
  if (mark >= 40) return 7
  if (mark >= 30) return 8
  return 9
}

export function getTheologyGradeDisplay(
  mark: number,
  customBands?: { min: number; max: number; grade: string }[]
): GradeCode {
  if (customBands && customBands.length > 0) {
    for (const b of customBands) {
      if (mark >= b.min && mark <= b.max) {
        return (b.grade as GradeCode) || 'F9'
      }
    }
  }
  return getGradeDisplay(getTheologyGradeNumber(mark))
}

export const CORE_SUBJECTS_BY_SECTION: Record<string, string[][]> = {
  lower_primary: [
    ['English', 'ENG', 'Eng'],
    ['Mathematics', 'MATH', 'Math', 'Maths', 'MTC'],
    ['Literacy I', 'LIT I', 'LIT1', 'Lit I'],
    ['Literacy II', 'LIT II', 'LIT2', 'Lit II'],
  ],
  upper_primary: [
    ['English', 'ENG', 'Eng'],
    ['Mathematics', 'MATH', 'Math', 'Maths', 'MTC'],
    ['Science', 'SCI', 'Sci', 'SCIE', 'Scie'],
    ['Social Studies', 'SST', 'S.ST', 'Social St'],
  ],
}

function getCoreSubjectGroups(section?: string) {
  return section && CORE_SUBJECTS_BY_SECTION[section]
    ? CORE_SUBJECTS_BY_SECTION[section]
    : [...CORE_SUBJECTS_BY_SECTION.lower_primary, ...CORE_SUBJECTS_BY_SECTION.upper_primary]
}

export function isCoreSubject(subjectName: string, section?: string): boolean {
  const name = subjectName.trim().toLowerCase()
  const variants = getCoreSubjectGroups(section)
  return variants.some(group => group.some(v => v.toLowerCase() === name))
}

export function isGradableSubject(subjectName: string, className?: string): boolean {
  // Configurable non-gradable subjects via env variable
  const nonGradableEnv = process.env.NEXT_PUBLIC_NON_GRADABLE_SUBJECTS
    ? JSON.parse(process.env.NEXT_PUBLIC_NON_GRADABLE_SUBJECTS)
    : ['Computer'];

  const name = subjectName.trim().toLowerCase();

  if (nonGradableEnv.map((s: string) => s.toLowerCase()).includes(name)) {
    return false;
  }

  // Specific exception for "Top Class" and "Writing"
  if (className?.toLowerCase().includes('top') && name === 'writing') {
    return false;
  }

  return true;
}

export function getSubjectGradeNumberForAggregate(
  subjectName: string,
  marks: { subject_name: string; score: number }[]
): number | null {
  const name = subjectName.trim().toLowerCase()
  const found = marks.find(m => {
    if (typeof m.score !== 'number') return false
    const mName = m.subject_name.trim().toLowerCase()
    return getCoreSubjectGroups().some(group =>
      group.some(v => v.toLowerCase() === mName)
    ) && getCoreSubjectGroups().some(group =>
      group.some(v => v.toLowerCase() === name) &&
      group.some(v => v.toLowerCase() === mName)
    )
  })
  return found ? getSubjectGradeNumber(found.score) : null
}

// Aggregate from core subject marks
// Returns null if any core subject missing
export function calculateAggregate(
  marks: { subject_name: string; score: number }[],
  section: string
): number | null {
  const coreGroups = CORE_SUBJECTS_BY_SECTION[section]
  if (!coreGroups) return null
  const grades = coreGroups.map(variants => {
    const found = marks.find(m =>
      variants.some(v => v.toLowerCase() === m.subject_name.trim().toLowerCase()) &&
      typeof m.score === 'number'
    )
    return found ? getSubjectGradeNumber(found.score) : null
  })
  if (grades.some(g => g === null)) return null
  return grades.reduce((sum, g) => sum! + g!, 0) as number
}

// Theology aggregate from 4 subject scores
export function calculateTheologyAggregate(scores: number[], customBands?: any[]): number | null {
  if (scores.length !== 4 || scores.some((s) => s == null)) return null
  return scores.reduce((sum, s) => sum + getTheologyGradeNumber(s, customBands), 0)
}

// Division from aggregate (Roman numerals)
export function getDivision(aggregate: number): Division {
  if (aggregate <= 12) return 'I'
  if (aggregate <= 23) return 'II'
  if (aggregate <= 29) return 'III'
  if (aggregate <= 34) return 'IV'
  return 'U'
}

// Promotion (Term 3 only, based on division)
export function getPromotionStatus(division: Division, manualOverride?: 'Try Next Class'): PromotionStatus {
  if (manualOverride === 'Try Next Class') return 'Try Next Class'
  if (division === 'I' || division === 'II' || division === 'III') return 'Promote'
  if (division === 'IV') return 'Probation'
  return 'Repeat'
}

// Nursery grading
export function getNurseryGrade(mark: number): { grade: NurseryGrade; remark: string } {
  if (mark >= 90) return { grade: 'A', remark: 'Excellent' }
  if (mark >= 80) return { grade: 'B', remark: 'Very Good' }
  if (mark >= 70) return { grade: 'C', remark: 'Good' }
  if (mark >= 50) return { grade: 'D', remark: 'Fair' }
  return { grade: 'E', remark: 'Poor' }
}

type ReportCommentBands = Pick<GradingBand, 'grade' | 'min' | 'max' | 'remark'>[]

// Subject remarks for secular (primary)
export function getSubjectRemark(gradeNum: number, customBands?: ReportCommentBands): string {
  if (customBands && customBands.length > 0) {
    const code = getGradeDisplay(gradeNum)
    const band = customBands.find((b) => b.grade === code)
    if (band && band.remark) {
      return band.remark.trim()
    }
  }

  switch (gradeNum) {
    case 1: return 'Excellent'
    case 2: return 'Very Good'
    case 3: return 'Good'
    case 4: return 'Fairly Good'
    case 5: return 'Fair'
    case 6: return 'Average'
    case 7: return 'Below Average'
    case 8: return 'Poor'
    case 9: return 'Failed'
    default: return 'Failed'
  }
}

// Subject remarks for theology (IPLE)
export function getTheologySubjectRemark(gradeNum: number, customBands?: ReportCommentBands): string {
  if (customBands && customBands.length > 0) {
    const code = getGradeDisplay(gradeNum)
    const band = customBands.find((b) => b.grade === code)
    if (band && band.remark) {
      return band.remark.trim()
    }
  }

  switch (gradeNum) {
    case 1: return 'ممتاز' // Excellent
    case 2: return 'جيد جداً' // Very Good
    case 3: return 'جيد' // Good
    case 4: return 'جيد' // Good (or Fairly Good)
    case 5: return 'مقبول' // Acceptable / Fair
    case 6: return 'مقبول' // Acceptable / Fair
    case 7: return 'ضعيف' // Weak / Below Average
    case 8: return 'ضعيف جداً' // Very Weak / Poor
    case 9: return 'راسب' // Failed
    default: return 'راسب'
  }
}

function getReportCommentBand(
  scores: (number | null | undefined)[] | undefined,
  customBands: ReportCommentBands | undefined
) {
  const validScores = scores?.filter((score): score is number => typeof score === 'number' && Number.isFinite(score))
  if (!validScores?.length) return null

  const bands = (customBands?.length ? customBands : DEFAULT_GRADING_BANDS)
    .filter(band => Number.isFinite(band.min) && Number.isFinite(band.max))
    .sort((a, b) => b.min - a.min)
  if (!bands.length) return null

  const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length
  const bandIndex = bands.findIndex(band => average >= band.min)
  const index = bandIndex === -1 ? bands.length - 1 : bandIndex
  const tier = bands.length > 1 ? Math.round(index * 8 / (bands.length - 1)) : 0
  return { band: bands[index], tier }
}

function getBandRemark(band: Pick<GradingBand, 'grade' | 'min' | 'max' | 'remark'>) {
  return band.remark.trim() || band.grade
}

export function getGradingRemarkForScore(
  score: number | null | undefined,
  gradingBands?: ReportCommentBands
): string {
  if (typeof score !== 'number' || !Number.isFinite(score)) return ''
  const bands = (gradingBands?.length ? gradingBands : DEFAULT_GRADING_BANDS)
    .filter(band => Number.isFinite(band.min) && Number.isFinite(band.max))
    .sort((a, b) => b.min - a.min)
  const band = bands.find(candidate => score >= candidate.min && score <= candidate.max)
  return band?.remark.trim() ?? ''
}

export function getGradingRemarkForScores(
  scores: (number | null | undefined)[] | undefined,
  gradingBands?: ReportCommentBands
): string {
  const validScores = scores?.filter((score): score is number => typeof score === 'number' && Number.isFinite(score))
  if (!validScores?.length) return ''
  const average = validScores.reduce((sum, score) => sum + score, 0) / validScores.length
  return getGradingRemarkForScore(average, gradingBands)
}

export function getClassTeacherComment(
  division: string | null,
  scores?: (number | null | undefined)[],
  gradingBands?: ReportCommentBands
): string {
  const performance = getReportCommentBand(scores, gradingBands)
  if (performance) {
    const remark = getBandRemark(performance.band)
    if (performance.tier <= 1) return `${remark} performance. Keep it up!`
    if (performance.tier <= 3) return `${remark} performance. Keep working hard.`
    if (performance.tier <= 5) return `${remark} performance. More practice will help you improve.`
    if (performance.tier === 6) return `${remark} is needed. Practise regularly and ask for help.`
    if (performance.tier === 7) return `${remark}. Practise regularly and ask for support to improve.`
    return `${remark} performance. Work closely with your teachers to improve.`
  }

  switch (division) {
    case 'I': return 'Outstanding performance. Keep it up!'
    case 'II': return 'Very good performance. Keep it up.'
    case 'III': return 'Average performance. Keep practising to improve.'
    case 'IV': return 'Promising result. More effort will bring progress.'
    case 'U': return 'Strive harder. Practise regularly and ask for help.'
    default: return 'Keep practising and strive for improvement.'
  }
}

export function getHeadTeacherComment(
  division: string | null,
  scores?: (number | null | undefined)[],
  gradingBands?: ReportCommentBands
): string {
  const performance = getReportCommentBand(scores, gradingBands)
  if (performance) {
    const remark = getBandRemark(performance.band)
    if (performance.tier === 0) return `${remark} result. Maintain this high standard.`
    if (performance.tier === 1) return `${remark} result. Continue working toward excellence.`
    if (performance.tier <= 3) return `${remark} result. Consistent practice will support further progress.`
    if (performance.tier <= 6) return `${remark}. Regular practice will help you make progress.`
    if (performance.tier === 7) return `${remark}. Work with your teachers to improve.`
    return `${remark} performance. Work closely with your teachers to make progress.`
  }

  switch (division) {
    case 'I': return 'Excellent achievement. Keep up the high standard.'
    case 'II': return 'Very good result. Continue working toward excellence.'
    case 'III': return 'Fair result. Consistent practice will help you improve.'
    case 'IV': return 'Promising result. Work harder to make stronger progress.'
    case 'U': return 'Strive harder. Seek support from your teachers.'
    default: return 'Continue working diligently toward improvement.'
  }
}

export function getClassTeacherReportComment({
  scoreType,
  termNumber,
  promotionStatus,
  gradingComment,
  division,
  scores,
  gradingBands,
}: {
  scoreType: 'bot' | 'mot' | 'eot'
  termNumber: number
  promotionStatus: string | null
  gradingComment: string | null
  division: string | null
  scores?: (number | null | undefined)[]
  gradingBands?: ReportCommentBands
}): string {
  if (scoreType === 'eot' && termNumber === 3 && promotionStatus) {
    if (promotionStatus === 'Promote') return 'Promoted to the next class.'
    if (promotionStatus === 'Repeat') return 'Advised to repeat the class.'
    return 'Try next class.'
  }

  if (gradingComment) return gradingComment
  if (scoreType === 'mot') {
    return getGradingRemarkForScores(scores, gradingBands)
  }
  return getClassTeacherComment(division, scores, gradingBands)
}

export function getConductRemark(division: string | null): string {
  switch (division) {
    case 'I': return 'Excellent conduct. Very impressive!'
    case 'II': return 'Very good conduct. Well done!'
    case 'III': return 'Good conduct. Keep it up.'
    case 'IV': return 'Fair conduct. Be more disciplined.'
    case 'U': return 'Needs to improve on general conduct.'
    default: return 'Good conduct.'
  }
}

export function getNurseryTeacherComment(grades: string[]): string {
  const gradeScore = (g: string) =>
    ({ A: 5, B: 4, C: 3, D: 2, E: 1 }[g] ?? 3)
  const avg = grades.reduce((s, g) => s + gradeScore(g), 0) / (grades.length || 1)
  if (avg >= 4.5) return 'Excellent learner. Very impressive!'
  if (avg >= 3.5) return 'Very good progress. Keep it up!'
  if (avg >= 2.5) return 'Good effort. Room for improvement.'
  if (avg >= 1.5) return 'Fair progress. Needs more practice.'
  return 'Needs significant support at home.'
}

/**
 * Official Theology Performance Remarks (الملاحظات from 2026 PDF specification):
 * Evaluates student total or percentage score, applying gender-sensitive Arabic remarks.
 * Configurable via Settings page (theology_remarks).
 */
export function getTheologyComment(
  scoreOrTotal: number | null,
  gender?: string | null,
  customRemarks?: { level: string; boys: string; girls: string }[]
): string {
  if (scoreOrTotal == null) return ''
  // If total score (> 100), assume 4 subjects to get average percentage
  const avg = scoreOrTotal > 100 ? scoreOrTotal / 4 : scoreOrTotal
  const isGirl = gender ? ['female', 'f', 'girl', 'بنت', 'أنثى'].includes(gender.trim().toLowerCase()) : false

  const remarks = customRemarks && customRemarks.length > 0 ? customRemarks : [
    { level: 'ممتاز', boys: 'جهد مميز،شكرا', girls: 'جهد مميز،شكرا' },
    { level: 'جيد جدا', boys: 'بقيت خطوة إلى الامتياز', girls: 'بقيت خطوة إلى الامتياز' },
    { level: 'جيد', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
    { level: 'مقبول', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
    { level: 'ضعيف', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
  ]

  let targetLevel = 'ضعيف'
  if (avg >= 85) targetLevel = 'ممتاز'
  else if (avg >= 75) targetLevel = 'جيد جدا'
  else if (avg >= 60) targetLevel = 'جيد'
  else if (avg >= 50) targetLevel = 'مقبول'
  else targetLevel = 'ضعيف'

  const normalizedTarget = targetLevel.trim()
  const match =
    remarks.find(r => r.level.trim() === normalizedTarget) ||
    remarks.find(r => r.level.replace(/\s+/g, '') === normalizedTarget.replace(/\s+/g, '')) ||
    remarks.find(r => {
      if (normalizedTarget === 'جيد') return r.level.includes('جيد') && !r.level.includes('جدا')
      return r.level.includes(normalizedTarget)
    })
  if (match) {
    return isGirl ? (match.girls || match.boys) : (match.boys || match.girls)
  }

  if (targetLevel === 'ممتاز') return 'جهد مميز،شكرا'
  if (targetLevel === 'جيد جدا') return 'بقيت خطوة إلى الامتياز'
  return isGirl ? 'أنتِ قادرة على الأفضل' : 'أنت قادر على الأفضل'
}

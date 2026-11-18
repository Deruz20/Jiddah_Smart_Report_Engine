import {
  extractGradePoint,
  getSubjectRemark as getCoreSubjectRemark,
  getTheologyGradeNumber,
  getTheologySubjectRemark as getCoreTheologySubjectRemark,
  getTheologyComment as getCoreTheologyComment,
} from './grading'

export function getSubjectRemark(grade: string): string {
  const num = extractGradePoint(grade)
  if (num !== null) {
    return getCoreSubjectRemark(num)
  }
  return '-'
}

export function getTeacherComment(averageScore: number, division?: string): string {
  let comment = ''

  if (averageScore >= 85) {
    comment = 'Outstanding performance. Keep it up.'
  } else if (averageScore >= 75) {
    comment = 'Very good performance.'
  } else if (averageScore >= 65) {
    comment = 'Good effort. Can improve further.'
  } else if (averageScore >= 50) {
    comment = 'Fair performance. Needs more consistency.'
  } else {
    comment = 'Needs serious improvement.'
  }

  if (division === 'Division 1') {
    comment += ' Top-tier performance.'
  } else if (division === 'Division 4' || division === 'Division U' || division === 'Ungraded (U)') {
    comment += ' Requires extra support.'
  }

  return comment
}

export function getNurseryRemark(grade: string): string {
  switch (grade) {
    case 'A': return 'Excellent progress'
    case 'B': return 'Very good progress'
    case 'C': return 'Good progress'
    case 'D': return 'Fair progress'
    case 'E': return 'Needs attention'
    default: return '-'
  }
}

/**
 * Official IPLE Theology Single-Subject Attainment Remarks:
 * Delegates to grading.ts (Distinction تفوق ١-٢, Credit جدارة ٣-٦, Pass اجتياز ٧-٨, Below Standard دون المستوى ٩).
 */
export function getTheologySubjectRemark(scoreOrGrade: number | string | null | undefined): string {
  if (scoreOrGrade === null || scoreOrGrade === undefined || scoreOrGrade === '') return '-'
  if (typeof scoreOrGrade === 'number') {
    if (Number.isNaN(scoreOrGrade)) return '-'
    const gradeNum = scoreOrGrade >= 1 && scoreOrGrade <= 9 && Number.isInteger(scoreOrGrade)
      ? scoreOrGrade
      : getTheologyGradeNumber(scoreOrGrade)
    return getCoreTheologySubjectRemark(gradeNum)
  }
  const s = String(scoreOrGrade).trim()
  const point = extractGradePoint(s)
  if (point !== null) {
    return getCoreTheologySubjectRemark(point)
  }
  const parsed = parseFloat(s)
  if (!Number.isNaN(parsed)) {
    return getCoreTheologySubjectRemark(getTheologyGradeNumber(parsed))
  }
  return '-'
}

/**
 * Official Theology Overall Teacher Comments (الملاحظات):
 * Delegates to getTheologyComment in grading.ts.
 */
export function getTheologyTeacherComment(
  scoreOrAvg: number | null | undefined,
  gender?: string | null,
  customRemarks?: { level: string; boys: string; girls: string }[],
  overallDivision?: string | null
): string {
  if ((scoreOrAvg == null || Number.isNaN(Number(scoreOrAvg))) && !overallDivision) return ''
  return getCoreTheologyComment(scoreOrAvg ?? null, gender, customRemarks, overallDivision)
}

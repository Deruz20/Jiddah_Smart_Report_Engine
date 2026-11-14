export function getSubjectRemark(grade: string): string {
  switch (grade) {
    case 'D1': return 'Excellent'
    case 'D2': return 'Very Good'
    case 'C3': return 'Good'
    case 'C4': return 'Fair'
    case 'C5': return 'Satisfactory'
    case 'C6': return 'Improving'
    case 'P7': return 'Needs effort'
    case 'P8': return 'Weak'
    case 'F9': return 'Poor'
    default: return '-'
  }
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
 * Official Theology Performance Remarks (from 2026 PDF Standards):
 * 85–100: ممتاز (Excellent)
 * 75–84:  جيد جداً (Very Good)
 * 60–74:  جيد (Good)
 * 50–59:  مقبول (Fair / Pass)
 * 0–49:   ضعيف (Weak)
 */
export function getTheologySubjectRemark(scoreOrGrade: number | string | null | undefined): string {
  if (scoreOrGrade === null || scoreOrGrade === undefined || scoreOrGrade === '') return '-'
  const num = typeof scoreOrGrade === 'number' ? scoreOrGrade : parseFloat(String(scoreOrGrade))
  if (Number.isNaN(num)) {
    const s = String(scoreOrGrade).trim()
    if (s === '1' || s.toLowerCase() === 'd1' || s === 'ممتاز') return 'ممتاز'
    if (s === '2' || s.toLowerCase() === 'd2' || s.includes('جيد جدا')) return 'جيد جداً'
    if (s === '3' || s === '4' || s.toLowerCase().startsWith('c') || s === 'جيد') return 'جيد'
    if (s === '5' || s === '6' || s.toLowerCase().startsWith('p') || s === 'مقبول') return 'مقبول'
    return 'ضعيف'
  }
  if (num >= 85) return 'ممتاز'
  if (num >= 75) return 'جيد جداً'
  if (num >= 60) return 'جيد'
  if (num >= 50) return 'مقبول'
  return 'ضعيف'
}

/**
 * Official Theology Performance Comments (الملاحظات from 2026 PDF Standards):
 * Gender-sensitive Arabic teacher remarks.
 */
export function getTheologyTeacherComment(
  scoreOrAvg: number | null | undefined,
  gender?: string | null,
  customRemarks?: { level: string; boys: string; girls: string }[]
): string {
  if (scoreOrAvg == null || Number.isNaN(Number(scoreOrAvg))) return ''
  const avg = Number(scoreOrAvg) > 100 ? Number(scoreOrAvg) / 4 : Number(scoreOrAvg)
  const isGirl = gender ? ['female', 'f', 'girl', 'بنت', 'أنثى'].includes(gender.trim().toLowerCase()) : false

  const defaults = [
    { level: 'ممتاز', boys: 'جهد مميز،شكرا', girls: 'جهد مميز،شكرا' },
    { level: 'جيد جدا', boys: 'بقيت خطوة إلى الامتياز', girls: 'بقيت خطوة إلى الامتياز' },
    { level: 'جيد', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
    { level: 'مقبول', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
    { level: 'ضعيف', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
  ]
  const list = customRemarks && customRemarks.length > 0 ? customRemarks : defaults

  let target = 'ضعيف'
  if (avg >= 85) target = 'ممتاز'
  else if (avg >= 75) target = 'جيد جدا'
  else if (avg >= 60) target = 'جيد'
  else if (avg >= 50) target = 'مقبول'

  const match = list.find(r => r.level.replace(/\s+/g, '') === target.replace(/\s+/g, ''))
  if (match) {
    return isGirl ? (match.girls || match.boys) : (match.boys || match.girls)
  }
  if (target === 'ممتاز') return 'جهد مميز،شكرا'
  if (target === 'جيد جدا') return 'بقيت خطوة إلى الامتياز'
  return isGirl ? 'أنتِ قادرة على الأفضل' : 'أنت قادر على الأفضل'
}

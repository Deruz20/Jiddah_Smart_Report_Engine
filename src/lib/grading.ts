export type GradeCode = 'D1' | 'D2' | 'C3' | 'C4' | 'C5' | 'C6' | 'P7' | 'P8' | 'F9'
export type Division = 'I' | 'II' | 'III' | 'IV' | 'U'
export type NurseryGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export type PromotionStatus = 'Promote' | 'Probation' | 'Repeat' | 'Try Next Class'

// UNEB subject grade (1-9) from mark
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
    ['Science', 'SCI', 'Sci'],
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
    : ['Computer', 'COMP'];
    
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
export function calculateTheologyAggregate(scores: number[]): number | null {
  if (scores.length !== 4 || scores.some((s) => s == null)) return null
  return scores.reduce((sum, s) => sum + getSubjectGradeNumber(s), 0)
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

// Subject remarks for secular (primary)
export function getSubjectRemark(gradeNum: number): string {
  switch(gradeNum) {
    case 1: return 'Excellent'
    case 2: return 'Very Good'
    case 3: return 'Good'
    case 4: return 'Fairly Good'
    case 5: return 'Fair'
    case 6: return 'Average'
    case 7: return 'Trying'
    case 8: return 'More Effort Needed'
    case 9: return 'Requires Assistance'
    default: return 'Requires Assistance'
  }
}

// Subject remarks for theology (IPLE)
export function getTheologySubjectRemark(gradeNum: number): string {
  switch(gradeNum) {
    case 1: return 'ممتاز' // Excellent
    case 2: return 'جيد جداً' // Very Good
    case 3: return 'جيد' // Good
    case 4: return 'جيد' // Good (or Fairly Good)
    case 5: return 'مقبول' // Acceptable / Fair
    case 6: return 'مقبول' // Acceptable / Fair
    case 7: return 'يحتاج للتركيز' // Needs focus
    case 8: return 'يحتاج مساعدة' // Needs help
    case 9: return 'ينصح بالمراجعة' // Advised to review
    default: return 'يحتاج للتركيز'
  }
}

export function getClassTeacherComment(division: string | null): string {
  switch(division) {
    case 'I':   return 'An outstanding performance. Keep it up!'
    case 'II':  return 'Very good performance. Aim higher.'
    case 'III': return 'Good performance. More effort will yield better results.'
    case 'IV':  return 'Fairly good performance. Put in more effort.'
    case 'U':   return 'We encourage you to put in more effort next term.'
    default:    return 'Keep working hard.'
  }
}

export function getHeadTeacherComment(division: string | null): string {
  switch(division) {
    case 'I':   return 'An excellent result. Well done!'
    case 'II':  return 'A commendable performance. Keep aiming higher.'
    case 'III': return 'Satisfactory work. You have potential for more.'
    case 'IV':  return 'Fair effort. Stay focused on your studies.'
    case 'U':   return 'You can do better with more focus and hard work.'
    default:    return 'Continue to work diligently.'
  }
}

export function getConductRemark(division: string | null): string {
  switch(division) {
    case 'I':   return 'Excellent conduct. A very well-behaved student.'
    case 'II':  return 'Very good conduct. Well done!'
    case 'III': return 'Good conduct. Keep it up.'
    case 'IV':  return 'Fairly good conduct.'
    case 'U':   return 'We encourage better discipline next term.'
    default:    return 'Good conduct.'
  }
}

export function getNurseryTeacherComment(grades: string[]): string {
  const gradeScore = (g: string) =>
    ({A:5,B:4,C:3,D:2,E:1}[g] ?? 3)
  const avg = grades.reduce((s,g) => s + gradeScore(g), 0) / (grades.length || 1)
  if (avg >= 4.5) return 'A bright star! Keep exploring and growing.'
  if (avg >= 3.5) return 'A wonderful learner, doing very well.'
  if (avg >= 2.5) return 'Showing great promise, let us keep learning together.'
  if (avg >= 1.5) return 'Making lovely progress, keep playing and learning.'
  return 'Needs significant support at home.'
}

export function getTheologyComment(total: number | null): string {
  if (total == null) return ''
  if (total >= 360) return 'أداء ممتاز، بارك الله فيك.'
  if (total >= 320) return 'أداء جيد جداً، استمر في التقدم.'
  if (total >= 280) return 'أداء جيد، بمزيد من الجهد ستصل للأفضل.'
  if (total >= 200) return 'أداء مقبول، نرجو بذل المزيد من الجهد.'
  return 'نشجعك على المراجعة المستمرة لتحسين مستواك.'
}

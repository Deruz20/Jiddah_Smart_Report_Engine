/**
 * Student Religion & Exemption Resolver
 * Provides reliable detection of non-Muslim students and theology exemptions
 * across Hubs, Marks Entry, and Report Card routing.
 */

export interface StudentReligionContext {
  religion?: string | null
  is_muslim?: boolean | null
  theology_exempt?: boolean | null
  theology_status?: string | null
  theology_class_id?: string | null
  theology_class?: string | null
  theology_class_arabic?: string | null
  theology_class_english?: string | null
  theology_class_level?: string | null
  circular_class?: string | null
  class_name?: string | null
}

export interface ReportDataContext {
  theology?: {
    subjects?: any[]
    total?: number
    [key: string]: any
  } | null
  theologySectionData?: {
    subjects?: any[]
    [key: string]: any
  } | null
  student?: {
    religion?: string | null
    theology_class?: string | null
    theology_class_arabic?: string | null
    class_name?: string | null
    [key: string]: any
  } | null
}

const NON_MUSLIM_RELIGION_KEYWORDS = [
  'non-muslim',
  'non muslim',
  'christian',
  'catholic',
  'protestant',
  'anglican',
  'born again',
  'born-again',
  'pentecostal',
  'adventist',
  'sda',
  'seventh day adventist',
  'seventh-day adventist',
  'orthodox',
  'baptist',
  'lutheran',
  'evangelical',
  'presbyterian',
  'other',
]

const MUSLIM_RELIGION_KEYWORDS = ['muslim', 'islam', 'islamic', 'sunni', 'shia']

/**
 * Returns true if a student is confirmed or inferred to be Non-Muslim or theology-exempt.
 */
export function isNonMuslimStudent(
  student?: StudentReligionContext | null,
  reportData?: ReportDataContext | null
): boolean {
  if (!student && !reportData) return false

  // 1. Direct exemption flag
  if (student?.theology_exempt === true) return true
  if (student?.theology_status === 'not_applicable' || student?.theology_status === 'exempt') {
    return true
  }

  // 2. Check student religion string
  const rawReligion = (student?.religion || reportData?.student?.religion || '').trim().toLowerCase()
  if (rawReligion) {
    if (NON_MUSLIM_RELIGION_KEYWORDS.some((kw) => rawReligion.includes(kw))) {
      return true
    }
    if (MUSLIM_RELIGION_KEYWORDS.some((kw) => rawReligion.includes(kw))) {
      return false
    }
  }

  // 3. Explicit is_muslim boolean check
  if (student?.is_muslim === false) return true
  if (student?.is_muslim === true) return false

  // 4. Report data inspection: Primary student with Secular marks/class but zero theology enrollment/marks
  const theoClass =
    student?.theology_class_id ||
    student?.theology_class ||
    student?.theology_class_arabic ||
    student?.theology_class_english ||
    student?.theology_class_level ||
    reportData?.student?.theology_class ||
    reportData?.student?.theology_class_arabic

  const hasTheoClass = Boolean(
    theoClass &&
    theoClass !== '—' &&
    theoClass !== 'None' &&
    theoClass !== 'N/A' &&
    theoClass !== 'not_applicable'
  )

  const theoSubjects =
    reportData?.theology?.subjects ||
    reportData?.theologySectionData?.subjects ||
    []
  const hasTheoMarks =
    theoSubjects.length > 0 &&
    theoSubjects.some((s: any) => typeof s.score === 'number' || typeof s.eot_score === 'number' || typeof s.mot_score === 'number')

  // If student has explicit zero theology class AND zero theology marks in a Primary/Secular setting
  const className = (student?.circular_class || student?.class_name || reportData?.student?.class_name || '').toLowerCase()
  const isPrimary = className.includes('p.') || className.includes('primary')

  if (isPrimary && !hasTheoClass && !hasTheoMarks) {
    return true
  }

  return false
}

/**
 * Convenience helper returning whether a student is Muslim
 */
export function isMuslimStudent(
  student?: StudentReligionContext | null,
  reportData?: ReportDataContext | null
): boolean {
  return !isNonMuslimStudent(student, reportData)
}

/**
 * Helper to determine if a primary student report should route to the Secular A4 Portrait template.
 * Non-Muslim Primary students (P.1–P.6) and ALL P.7 students use the Secular A4 Portrait template.
 */
export function shouldUseSecularPortraitTemplate(
  student?: StudentReligionContext | null,
  reportData?: ReportDataContext | null
): boolean {
  const className = (student?.circular_class || student?.class_name || reportData?.student?.class_name || '').toLowerCase()
  const isP7 = className.includes('p.7') || className.includes('p7') || className.includes('primary 7')
  if (isP7) return true

  const isPrimary = className.includes('p.') || className.includes('primary')
  if (isPrimary && isNonMuslimStudent(student, reportData)) {
    return true
  }

  return false
}

/**
 * Dynamic report title for the Secular A4 Portrait template based on class level
 */
export function getSecularPortraitReportTitle(className?: string | null): string {
  const cn = (className || '').toUpperCase()
  if (cn.includes('P.7') || cn.includes('P7') || cn.includes('PRIMARY 7')) {
    return 'P.7 REPORT FORM – END OF TERM'
  }
  if (cn.includes('P.1') || cn.includes('P.2') || cn.includes('P.3') || cn.includes('PRIMARY 1') || cn.includes('PRIMARY 2') || cn.includes('PRIMARY 3')) {
    return 'LOWER REPORT FORM – END OF TERM'
  }
  if (cn.includes('P.4') || cn.includes('P.5') || cn.includes('P.6') || cn.includes('PRIMARY 4') || cn.includes('PRIMARY 5') || cn.includes('PRIMARY 6')) {
    return 'UPPER REPORT FORM – END OF TERM'
  }
  return 'PRIMARY REPORT FORM – END OF TERM'
}

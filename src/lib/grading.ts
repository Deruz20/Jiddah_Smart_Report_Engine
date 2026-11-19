import {
  DEFAULT_GRADING_BANDS,
  DEFAULT_DIVISION_BOUNDARIES,
  DEFAULT_THEOLOGY_GRADING_BANDS,
  DEFAULT_THEOLOGY_DIVISION_BOUNDARIES,
  DEFAULT_PROMOTION_COMMENTS,
  type GradingBand,
  type DivisionBoundaryItem,
  type TheologyDivisionBoundaryItem,
  type PromotionCommentsConfig,
} from './school-settings-helper'

export type GradeCode = 'D1' | 'D2' | 'C3' | 'C4' | 'C5' | 'C6' | 'P7' | 'P8' | 'F9'
export type TheologyGradeCode = 'ت١' | 'ت٢' | 'ج٣' | 'ج٤' | 'ج٥' | 'ج٦' | 'ن٧' | 'ن٨' | 'خ٩' | string
export type Division = 'I' | 'II' | 'III' | 'IV' | 'U'
export type TheologyDivision = 'ممتاز' | 'جيد جداً' | 'جيد' | 'مقبول' | 'راسب'
export type NurseryGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export type PromotionStatus = 'Promote' | 'Probation' | 'Repeat' | 'Try Next Class'

const ARABIC_INDIC_TO_ASCII: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
}

/**
 * Extracts numeric point value (1-9) from any grade label, supporting ASCII ('D1', '3')
 * and Arabic-Indic IPLE labels ('ت١', 'ج٣', 'خ٩').
 */
export function extractGradePoint(gradeValue: unknown): number | null {
  if (gradeValue == null) return null
  const normalized = String(gradeValue).replace(/[٠-٩]/g, (d) => ARABIC_INDIC_TO_ASCII[d] ?? d)
  const digits = normalized.replace(/\D/g, '')
  if (!digits) return null
  const num = parseInt(digits, 10)
  return Number.isFinite(num) && num >= 1 && num <= 9 ? num : null
}

// UNEB subject grade (1-9) from mark (Secular)
export function getSubjectGradeNumber(mark: number, customBands?: GradingBand[]): number {
  if (customBands && customBands.length > 0) {
    const sorted = [...customBands]
      .filter((b) => Number.isFinite(b.min) && Number.isFinite(b.max))
      .sort((a, b) => b.min - a.min)
    for (let i = 0; i < sorted.length; i++) {
      const b = sorted[i]
      if (mark >= b.min) {
        const num = extractGradePoint(b.grade)
        return num ?? i + 1
      }
    }
  }

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
    const sorted = [...customBands]
      .filter((b) => Number.isFinite(b.min) && Number.isFinite(b.max))
      .sort((a, b) => b.min - a.min)
    for (let i = 0; i < sorted.length; i++) {
      const b = sorted[i]
      if (mark >= b.min) {
        const num = extractGradePoint(b.grade)
        return num ?? i + 1
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

export function getTheologyGradeDisplayFromPoint(
  gradeNum: number,
  customBands?: { min: number; max: number; grade: string }[]
): TheologyGradeCode {
  const bands = customBands && customBands.length > 0 ? customBands : DEFAULT_THEOLOGY_GRADING_BANDS
  const match = bands.find((b) => extractGradePoint(b.grade) === gradeNum)
  if (match && match.grade) return match.grade
  const fallbackMap: Record<number, TheologyGradeCode> = {
    1: 'ت١',
    2: 'ت٢',
    3: 'ج٣',
    4: 'ج٤',
    5: 'ج٥',
    6: 'ج٦',
    7: 'ن٧',
    8: 'ن٨',
    9: 'خ٩',
  }
  return fallbackMap[gradeNum] ?? 'خ٩'
}

export function getTheologyGradeDisplay(
  mark: number,
  customBands?: { min: number; max: number; grade: string }[]
): TheologyGradeCode {
  const bands = customBands && customBands.length > 0 ? customBands : DEFAULT_THEOLOGY_GRADING_BANDS
  const sorted = [...bands]
    .filter((b) => Number.isFinite(b.min))
    .sort((a, b) => b.min - a.min)
  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i]
    if (mark >= b.min) {
      return b.grade || getTheologyGradeDisplayFromPoint(i + 1)
    }
  }
  return getTheologyGradeDisplayFromPoint(getTheologyGradeNumber(mark, customBands), customBands)
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
  section: string,
  customBands?: GradingBand[]
): number | null {
  const coreGroups = CORE_SUBJECTS_BY_SECTION[section]
  if (!coreGroups) return null
  const grades = coreGroups.map(variants => {
    const found = marks.find(m =>
      variants.some(v => v.toLowerCase() === m.subject_name.trim().toLowerCase()) &&
      typeof m.score === 'number'
    )
    return found ? getSubjectGradeNumber(found.score, customBands) : null
  })
  if (grades.some(g => g === null)) return null
  return grades.reduce((sum, g) => sum! + g!, 0) as number
}

export type TheologyAggregateMarkInput = {
  subject_name?: string | null
  subject_name_arabic?: string | null
  score?: number | null
}

// Official 4 IPLE core theology pillars (Qur'an, Lugha, Fiqh, Tarbiya/Tauheed/Siira)
export const CORE_THEOLOGY_SUBJECT_GROUPS: string[][] = [
  ['القرآن الكريم', 'القرآن', 'قرآن', 'القران', 'حفظ القرآن', 'تلاوة القرآن', 'quran', "qur'an"],
  ['اللغة العربية', 'العربية', 'النحو', 'الصرف', 'التعبير', 'اللغة', 'lugha', 'arabic'],
  ['الفقه والعبادات', 'الفقه الإسلامي', 'الفقه', 'فقه', 'fiqh', 'fiqhu'],
  ['التربية الإسلامية', 'التربية', 'tarbiya', 'التوحيد والعقيدة', 'التوحيد', 'العقيدة', 'tauheed', 'tawhid', 'الحديث الشريف', 'الحديث', 'hadith', 'التاريخ والسيرة', 'السيرة والآداب', 'السيرة', 'sira', 'siira'],
]

function matchesTheologyCoreSlot(subjectName: string, variants: string[]): number {
  const normalized = subjectName.trim().toLowerCase()
  if (!normalized) return -1
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i].toLowerCase()
    if (normalized === v || normalized.includes(v)) {
      return i
    }
  }
  return -1
}

export function resolveCoreTheologySubjects<T extends TheologyAggregateMarkInput>(marks: T[]): T[] {
  const used = new Set<number>()
  const picked: T[] = []

  for (const variants of CORE_THEOLOGY_SUBJECT_GROUPS) {
    let bestIdx = -1
    let bestPriority = Number.MAX_SAFE_INTEGER

    marks.forEach((m, idx) => {
      if (used.has(idx)) return
      const name = String(m.subject_name_arabic || m.subject_name || '')
      const p = matchesTheologyCoreSlot(name, variants)
      if (p !== -1 && p < bestPriority) {
        bestPriority = p
        bestIdx = idx
      }
    })

    if (bestIdx !== -1) {
      used.add(bestIdx)
      picked.push(marks[bestIdx])
    }
  }

  // Fallback for custom class rosters that only define 4 distinct subjects
  if (picked.length < 4 && marks.length === 4) {
    return marks
  }

  return picked
}

export function calculateTheologyAggregate(
  input: (number | null | undefined)[] | TheologyAggregateMarkInput[],
  customBands?: any[]
): number | null {
  if (!Array.isArray(input) || input.length === 0) return null

  const first = input[0]
  if (typeof first === 'object' && first !== null) {
    return calculateTheologyAggregateFromMarks(input as TheologyAggregateMarkInput[], customBands)
  }

  const scores = input as (number | null | undefined)[]
  if (scores.length !== 4 || scores.some((s) => typeof s !== 'number' || Number.isNaN(s))) {
    return null
  }
  return scores.reduce<number>((sum, s) => sum + getTheologyGradeNumber(s as number, customBands), 0)
}

export function calculateTheologyAggregateFromMarks(
  marks: TheologyAggregateMarkInput[],
  customBands?: any[]
): number | null {
  if (!Array.isArray(marks) || marks.length < 4) return null
  const coreSubjects = resolveCoreTheologySubjects(marks)
  if (coreSubjects.length !== 4) return null
  if (coreSubjects.some((m) => typeof m.score !== 'number' || Number.isNaN(m.score))) {
    return null
  }
  return coreSubjects.reduce(
    (sum, m) => sum + getTheologyGradeNumber(m.score as number, customBands),
    0
  )
}

// Division from aggregate (Secular Roman numerals I-IV, U)
export function getDivision(
  aggregate: number,
  customBoundaries?: Pick<DivisionBoundaryItem, 'division' | 'min' | 'max'>[]
): Division {
  if (!Number.isFinite(aggregate) || aggregate < 4) return 'U'
  const boundaries =
    Array.isArray(customBoundaries) && customBoundaries.length > 0
      ? customBoundaries
      : DEFAULT_DIVISION_BOUNDARIES
  const sorted = [...boundaries]
    .filter((b) => Number.isFinite(b.min) && Number.isFinite(b.max))
    .sort((a, b) => a.min - b.min)
  for (const b of sorted) {
    if (aggregate >= b.min && aggregate <= b.max) {
      return b.division
    }
  }
  return 'U'
}

// Overall IPLE Theology Division from 4-core-subject aggregate (4-12 = ممتاز, 13-23 = جيد جداً, etc.)
export function getTheologyDivision(
  aggregate: number,
  customBoundaries?: Pick<TheologyDivisionBoundaryItem, 'division' | 'min' | 'max'>[]
): TheologyDivision | string {
  if (!Number.isFinite(aggregate) || aggregate < 4) return 'راسب'
  const boundaries =
    Array.isArray(customBoundaries) && customBoundaries.length > 0
      ? customBoundaries
      : DEFAULT_THEOLOGY_DIVISION_BOUNDARIES
  const sorted = [...boundaries]
    .filter((b) => Number.isFinite(b.min) && Number.isFinite(b.max))
    .sort((a, b) => a.min - b.min)
  for (const b of sorted) {
    if (aggregate >= b.min && aggregate <= b.max) {
      return b.division
    }
  }
  return 'راسب'
}

export function getTheologyDivisionDetails(
  aggregate: number,
  customBoundaries?: TheologyDivisionBoundaryItem[]
): TheologyDivisionBoundaryItem {
  const boundaries =
    Array.isArray(customBoundaries) && customBoundaries.length > 0
      ? customBoundaries
      : DEFAULT_THEOLOGY_DIVISION_BOUNDARIES
  const matched = Number.isFinite(aggregate) && aggregate >= 4
    ? [...boundaries]
        .filter((b) => Number.isFinite(b.min) && Number.isFinite(b.max))
        .sort((a, b) => a.min - b.min)
        .find((b) => aggregate >= b.min && aggregate <= b.max)
    : undefined
  return (
    matched ||
    boundaries[boundaries.length - 1] ||
    DEFAULT_THEOLOGY_DIVISION_BOUNDARIES[DEFAULT_THEOLOGY_DIVISION_BOUNDARIES.length - 1]
  )
}

// Promotion (Term 3 only, based on division)
export function getPromotionStatus(division: Division, manualOverride?: 'Try Next Class'): PromotionStatus {
  if (manualOverride === 'Try Next Class') return 'Try Next Class'
  if (division === 'I' || division === 'II' || division === 'III') return 'Promote'
  if (division === 'IV') return 'Probation'
  return 'Repeat'
}

export const SECULAR_PROMOTION_MAP: Record<string, string> = {
  'baby': 'Middle Class',
  'middle': 'Top Class',
  'top': 'P.1',
  'nursery': 'P.1',
  'p.1': 'P.2',
  'p1': 'P.2',
  'primary 1': 'P.2',
  'p.2': 'P.3',
  'p2': 'P.3',
  'primary 2': 'P.3',
  'p.3': 'P.4',
  'p3': 'P.4',
  'primary 3': 'P.4',
  'p.4': 'P.5',
  'p4': 'P.5',
  'primary 4': 'P.5',
  'p.5': 'P.6',
  'p5': 'P.6',
  'primary 5': 'P.6',
  'p.6': 'P.7',
  'p6': 'P.7',
  'primary 6': 'P.7',
}

export const THEOLOGY_PROMOTION_MAP: Record<string, string> = {
  'الروضة السفلى': 'الروضة الوسطى',
  'الروضة الوسطى': 'الروضة العليا',
  'الروضة العليا': 'الصف الأول',
  'الروضة': 'الصف الأول',
  'الصف الأول': 'الصف الثاني',
  'الصف الاول': 'الصف الثاني',
  'الصف الثاني': 'الصف الثالث',
  'الصف الثالث': 'الصف الرابع',
  'الصف الرابع': 'الصف الخامس',
  'الصف الخامس': 'الصف السادس',
  'الصف السادس': 'الصف السابع',
}

export function resolveNextSecularClass(className?: string | null): { current: string; next: string | null } {
  const raw = (className ?? '').trim()
  const lower = raw.toLowerCase()
  if (!raw) return { current: 'current class', next: null }
  if (lower.includes('baby')) return { current: 'Baby Class', next: 'Middle Class' }
  if (lower.includes('middle')) return { current: 'Middle Class', next: 'Top Class' }
  if (lower.includes('top')) return { current: 'Top Class', next: 'P.1' }
  if (lower.includes('nursery')) return { current: 'Nursery', next: 'P.1' }
  for (const num of ['1', '2', '3', '4', '5', '6', '7']) {
    if (lower === num || lower.includes(`p.${num}`) || lower.includes(`p${num}`) || lower.includes(`primary ${num}`)) {
      const current = `P.${num}`
      const next = Number(num) < 7 ? `P.${Number(num) + 1}` : null
      return { current, next }
    }
  }
  return { current: raw, next: SECULAR_PROMOTION_MAP[lower] ?? null }
}

export function resolveNextTheologyClass(className?: string | null): { current: string; next: string | null } {
  const raw = (className ?? '').trim()
  if (!raw) return { current: 'الصف الحالي', next: null }
  for (const [key, nextVal] of Object.entries(THEOLOGY_PROMOTION_MAP)) {
    if (raw.includes(key)) {
      return { current: key, next: nextVal }
    }
  }
  const lower = raw.toLowerCase()
  if (lower.includes('nursery') || lower.includes('top')) return { current: 'الروضة', next: 'الصف الأول' }
  if (lower.includes('p.1') || lower.includes('p1')) return { current: 'الصف الأول', next: 'الصف الثاني' }
  if (lower.includes('p.2') || lower.includes('p2')) return { current: 'الصف الثاني', next: 'الصف الثالث' }
  if (lower.includes('p.3') || lower.includes('p3')) return { current: 'الصف الثالث', next: 'الصف الرابع' }
  if (lower.includes('p.4') || lower.includes('p4')) return { current: 'الصف الرابع', next: 'الصف الخامس' }
  if (lower.includes('p.5') || lower.includes('p5')) return { current: 'الصف الخامس', next: 'الصف السادس' }
  if (lower.includes('p.6') || lower.includes('p6')) return { current: 'الصف السادس', next: 'الصف السابع' }
  return { current: raw, next: null }
}

export function getDynamicSecularPromotionText(
  className: string | null | undefined,
  promotionStatus: string
): string {
  const { current, next } = resolveNextSecularClass(className)
  if (promotionStatus === 'Repeat') {
    return `ADVISED TO REPEAT ${current.toUpperCase()}.`
  }
  if (next) {
    return `PROMOTED TO ${next.toUpperCase()}.`
  }
  return promotionStatus === 'Probation' ? 'PROMOTED ON PROBATION.' : 'PROMOTED TO THE NEXT CLASS.'
}

export function getDynamicTheologyPromotionText(
  theologyClassName: string | null | undefined,
  isPromoted: boolean
): string {
  const { current, next } = resolveNextTheologyClass(theologyClassName)
  if (!isPromoted) {
    return `ينصح بإعادة ${current}`
  }
  if (next) {
    return `مترفع إلى ${next}`
  }
  return 'مترفع إلى الصف التالي'
}

/**
 * Canonical helper to detect Nursery / Pre-Primary classes and levels.
 * Detects baby, middle, top, nursery, pre-primary, kg, or ece (case-insensitive).
 */
export function isNurseryClass(classNameOrLevel?: string | null): boolean {
  if (!classNameOrLevel) return false
  const str = String(classNameOrLevel).trim().toLowerCase()
  return (
    str.includes('baby') ||
    str.includes('middle') ||
    str.includes('top') ||
    str.includes('nursery') ||
    str.includes('pre-primary') ||
    str.includes('pre primary') ||
    str.includes('kg') ||
    str.includes('ece')
  )
}

// Nursery grading (Official Jiddah Nursery Letter Scale)
export function getNurseryGrade(mark: number): { grade: NurseryGrade; remark: string } {
  if (mark >= 90) return { grade: 'A', remark: 'Excellent' }
  if (mark >= 80) return { grade: 'B', remark: 'Very Good' }
  if (mark >= 70) return { grade: 'C', remark: 'Good' }
  if (mark >= 50) return { grade: 'D', remark: 'Fair' }
  return { grade: 'E', remark: 'Emerging' }
}

export function computeNurseryBadge(score: number | null | undefined): {
  grade: NurseryGrade
  bg: string
  text: string
  remark: string
} | null {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return null
  const n = Number(score)
  if (n < 0 || n > 100) return null
  if (n >= 90) {
    return {
      grade: 'A',
      remark: 'Excellent',
      bg: 'bg-[#0D5C3A]/12 dark:bg-[#10B981]/20',
      text: 'text-[#0D5C3A] dark:text-[#34D399]',
    }
  }
  if (n >= 80) {
    return {
      grade: 'B',
      remark: 'Very Good',
      bg: 'bg-[#0284C7]/12 dark:bg-[#38BDF8]/20',
      text: 'text-[#0369A1] dark:text-[#7DD3FC]',
    }
  }
  if (n >= 70) {
    return {
      grade: 'C',
      remark: 'Good',
      bg: 'bg-[#D97706]/14 dark:bg-[#F59E0B]/20',
      text: 'text-[#B45309] dark:text-[#FCD34D]',
    }
  }
  if (n >= 50) {
    return {
      grade: 'D',
      remark: 'Fair',
      bg: 'bg-[#EA580C]/14 dark:bg-[#FB923C]/20',
      text: 'text-[#C2410C] dark:text-[#FDBA74]',
    }
  }
  return {
    grade: 'E',
    remark: 'Emerging',
    bg: 'bg-[#E11D48]/12 dark:bg-[#FB7185]/20',
    text: 'text-[#BE123C] dark:text-[#FDA4AF]',
  }
}

// Subject remarks for secular (primary)
// Falls back to DEFAULT_GRADING_BANDS when no customBands are supplied,
// so the remark always matches what is configured in the Settings page.
export function getSubjectRemark(gradeNum: number, customBands?: GradingBand[]): string {
  // Use supplied custom bands, or fall back to the canonical UNEB defaults.
  const bands = (customBands && customBands.length > 0) ? customBands : DEFAULT_GRADING_BANDS

  const match = bands.find((b) => {
    const num = parseInt(String(b.grade).replace(/\D/g, ''), 10)
    return num === gradeNum
  })
  if (match && match.remark && match.remark.trim()) {
    return match.remark.trim()
  }

  // Hard fallback that is exactly aligned with DEFAULT_UNEB_GRADING_BANDS
  switch (gradeNum) {
    case 1: return 'Excellent'
    case 2: return 'Very Good'
    case 3: return 'Good'
    case 4: return 'Quite Good'
    case 5: return 'Fairly Good'
    case 6: return 'Fair'
    case 7: return 'More Effort'
    case 8: return 'Work Harder'
    case 9: return 'Poor / Pull Up'
    default: return 'Poor / Pull Up'
  }
}

// Individual IPLE Subject performance descriptors (distinct from overall candidate divisions)
export function getTheologySubjectRemark(gradeNum: number, customTheologyBands?: any[]): string {
  const bands =
    customTheologyBands && customTheologyBands.length > 0
      ? customTheologyBands
      : DEFAULT_THEOLOGY_GRADING_BANDS

  const match = bands.find((b) => extractGradePoint(b.grade) === gradeNum)
  if (match && match.remark && String(match.remark).trim()) {
    return String(match.remark).trim()
  }

  switch (gradeNum) {
    case 1: return 'تفوق عالٍ'
    case 2: return 'تفوق'
    case 3: return 'جدارة عالية'
    case 4: return 'جدارة حسنة'
    case 5: return 'جدارة متوسطة'
    case 6: return 'جدارة أساسية'
    case 7: return 'اجتياز كافٍ'
    case 8: return 'اجتياز حدّي'
    case 9: return 'دون المستوى'
    default: return 'دون المستوى'
  }
}

type ReportCommentBands = Pick<GradingBand, 'grade' | 'min' | 'max' | 'remark'>[]

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
  gradingBands?: ReportCommentBands,
  divisionBoundaries?: DivisionBoundaryItem[]
): string {
  if (division && Array.isArray(divisionBoundaries) && divisionBoundaries.length > 0) {
    const matched = divisionBoundaries.find((b) => b.division === division)
    if (matched?.classTeacherComment?.trim()) {
      return matched.classTeacherComment.trim()
    }
  }

  const performance = getReportCommentBand(scores, gradingBands)
  if (performance) {
    if (performance.tier <= 1) return 'An excellent and well-deserved result. Keep up the high standard.'
    if (performance.tier <= 5) return 'A solid performance. Consistent revision and focus are required to maintain this standard.'
    if (performance.tier <= 7) return 'A fair attempt, but there is significant room for improvement. More parental support and serious revision are needed.'
    return 'A weak performance. Urgent academic intervention and strict parental follow-up are required next term.'
  }

  switch (division) {
    case 'I': return 'An excellent and well-deserved result. Keep up the high standard.'
    case 'II': return 'A solid performance. Consistent revision and focus are required to maintain this standard.'
    case 'III': return 'A solid performance. Consistent revision and focus are required to maintain this standard.'
    case 'IV': return 'A fair attempt, but there is significant room for improvement. More parental support and serious revision are needed.'
    case 'U': return 'A weak performance. Urgent academic intervention and strict parental follow-up are required next term.'
    default: return 'A solid performance. Consistent revision and focus are required to maintain this standard.'
  }
}

export function getHeadTeacherComment(
  division: string | null,
  scores?: (number | null | undefined)[],
  gradingBands?: ReportCommentBands,
  divisionBoundaries?: DivisionBoundaryItem[]
): string {
  if (division && Array.isArray(divisionBoundaries) && divisionBoundaries.length > 0) {
    const matched = divisionBoundaries.find((b) => b.division === division)
    if (matched?.headTeacherComment?.trim()) {
      return matched.headTeacherComment.trim()
    }
  }

  const performance = getReportCommentBand(scores, gradingBands)
  if (performance) {
    if (performance.tier <= 1) return 'An excellent and well-deserved result. Keep up the high standard.'
    if (performance.tier <= 5) return 'A solid performance. Consistent revision and focus are required to maintain this standard.'
    if (performance.tier <= 7) return 'A fair attempt, but there is significant room for improvement. More parental support and serious revision are needed.'
    return 'A weak performance. Urgent academic intervention and strict parental follow-up are required next term.'
  }

  switch (division) {
    case 'I': return 'An excellent and well-deserved result. Keep up the high standard.'
    case 'II': return 'A solid performance. Consistent revision and focus are required to maintain this standard.'
    case 'III': return 'A solid performance. Consistent revision and focus are required to maintain this standard.'
    case 'IV': return 'A fair attempt, but there is significant room for improvement. More parental support and serious revision are needed.'
    case 'U': return 'A weak performance. Urgent academic intervention and strict parental follow-up are required next term.'
    default: return 'A solid performance. Consistent revision and focus are required to maintain this standard.'
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
  divisionBoundaries,
  promotionComments,
  className,
  useDosRemarkOverrides = true,
}: {
  scoreType: 'bot' | 'mot' | 'eot'
  termNumber: number
  promotionStatus: string | null
  gradingComment: string | null
  division: string | null
  scores?: (number | null | undefined)[]
  gradingBands?: ReportCommentBands
  divisionBoundaries?: DivisionBoundaryItem[]
  promotionComments?: PromotionCommentsConfig
  className?: string | null
  useDosRemarkOverrides?: boolean
}): string {
  if (scoreType === 'eot' && termNumber === 3 && promotionStatus) {
    const pCfg = useDosRemarkOverrides ? promotionComments : undefined
    let promoText = getDynamicSecularPromotionText(className, promotionStatus)
    if (pCfg) {
      if (promotionStatus === 'Promote' && pCfg.promoted && pCfg.promoted !== DEFAULT_PROMOTION_COMMENTS.promoted) {
        promoText = pCfg.promoted
      } else if (promotionStatus === 'Repeat' && pCfg.repeat && pCfg.repeat !== DEFAULT_PROMOTION_COMMENTS.repeat) {
        promoText = pCfg.repeat
      } else if (promotionStatus === 'Probation' && pCfg.promoted_probation && pCfg.promoted_probation !== DEFAULT_PROMOTION_COMMENTS.promoted_probation) {
        promoText = pCfg.promoted_probation
      } else if (promotionStatus === 'Try Next Class' && pCfg.try_next_class && pCfg.try_next_class !== DEFAULT_PROMOTION_COMMENTS.try_next_class) {
        promoText = pCfg.try_next_class
      }
    }

    if (pCfg?.append_division_comment) {
      const divComment = getClassTeacherComment(division, scores, gradingBands, divisionBoundaries)
      if (divComment) {
        return `${promoText} ${divComment}`
      }
    }
    return promoText
  }

  if (gradingComment) return gradingComment
  if (scoreType === 'mot') {
    return getGradingRemarkForScores(scores, gradingBands)
  }
  return getClassTeacherComment(division, scores, gradingBands, divisionBoundaries)
}

export function getConductRemark(
  division: string | null,
  divisionBoundaries?: DivisionBoundaryItem[],
  defaultConduct?: string
): string {
  if (division && Array.isArray(divisionBoundaries) && divisionBoundaries.length > 0) {
    const matched = divisionBoundaries.find((b) => b.division === division)
    if (matched?.conductRemark?.trim()) {
      return matched.conductRemark.trim()
    }
  }

  switch (division) {
    case 'I': return 'Excellent conduct. Very impressive!'
    case 'II': return 'Very good conduct. Well done!'
    case 'III': return 'Good conduct. Keep it up.'
    case 'IV': return 'Fair conduct. Be more disciplined.'
    case 'U': return 'Needs to improve on general conduct.'
    default: return defaultConduct?.trim() || 'Good conduct.'
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
  return 'Developing steadily; needs gentle support and daily practice at home.'
}

/**
 * Official Theology Performance Remarks (الملاحظات from 2026 PDF specification):
 * Evaluates student total or percentage score, applying gender-sensitive Arabic remarks.
 * Configurable via Settings page (theology_remarks).
 */
export function getTheologyComment(
  scoreOrTotal: number | null,
  gender?: string | null,
  customRemarks?: { level: string; boys: string; girls: string }[],
  overallDivision?: string | null,
  subjectCount: number = 4
): string {
  if (scoreOrTotal == null && !overallDivision) return ''
  const divisor = Math.max(Number.isFinite(subjectCount) && subjectCount > 0 ? subjectCount : 4, 1)
  const avg = scoreOrTotal != null ? (scoreOrTotal > 100 ? scoreOrTotal / divisor : scoreOrTotal) : 0
  const isGirl = gender ? ['female', 'f', 'girl', 'بنت', 'أنثى'].includes(gender.trim().toLowerCase()) : false

  const remarks = customRemarks && customRemarks.length > 0 ? customRemarks : [
    { level: 'ممتاز', boys: 'جهد مميز،شكرا', girls: 'جهد مميز،شكرا' },
    { level: 'جيد جدا', boys: 'بقيت خطوة إلى الامتياز', girls: 'بقيت خطوة إلى الامتياز' },
    { level: 'جيد', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
    { level: 'مقبول', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
    { level: 'راسب', boys: 'أنت قادر على الأفضل', girls: 'أنتِ قادرة على الأفضل' },
  ]

  let targetLevel = 'راسب'
  if (overallDivision && overallDivision.trim() && overallDivision !== '-') {
    targetLevel = overallDivision.trim()
  } else if (avg >= 85) targetLevel = 'ممتاز'
  else if (avg >= 75) targetLevel = 'جيد جدا'
  else if (avg >= 60) targetLevel = 'جيد'
  else if (avg >= 50) targetLevel = 'مقبول'
  else targetLevel = 'راسب'

  const normalizeArabicKey = (s: string) =>
    s
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/\s+/g, '')
      .replace(/[أإآ]/g, 'ا')
  const normalizedTarget = normalizeArabicKey(targetLevel)
  const match =
    remarks.find(r => r.level.trim() === targetLevel.trim()) ||
    remarks.find(r => normalizeArabicKey(r.level) === normalizedTarget) ||
    remarks.find(r => {
      const nLevel = normalizeArabicKey(r.level)
      if ((normalizedTarget === 'راسب' || normalizedTarget === 'ضعيف') && (nLevel.includes('راسب') || nLevel.includes('ضعيف'))) {
        return true
      }
      if (normalizedTarget === 'جيد') return nLevel.includes('جيد') && !nLevel.includes('جدا')
      return nLevel.includes(normalizedTarget)
    })
  if (match) {
    return isGirl ? (match.girls || match.boys) : (match.boys || match.girls)
  }

  if (normalizedTarget === 'ممتاز') return 'جهد مميز،شكرا'
  if (normalizedTarget.includes('جيدجدا')) return 'بقيت خطوة إلى الامتياز'
  return isGirl ? 'أنتِ قادرة على الأفضل' : 'أنت قادر على الأفضل'
}

export function getNurseryTheologySubjectRemark(
  score: number | null | undefined,
  rawRemark?: string | null
): string {
  const num = typeof score === 'number' && Number.isFinite(score) ? score : null
  if (num !== null) {
    if (num >= 85) return 'ممتاز'
    if (num >= 75) return 'جيد جداً'
    if (num >= 65) return 'جيد'
    if (num >= 50) return 'مقبول'
    return 'يحتاج إلى متابعة وتشجيع'
  }
  const cleaned = String(rawRemark || '').trim()
  if (!cleaned) return ''
  if (cleaned === 'تفوق عالٍ' || cleaned === 'تفوق عال' || cleaned === 'تفوق') return 'ممتاز'
  if (cleaned === 'جدارة عالية') return 'جيد جداً'
  if (cleaned === 'جدارة حسنة' || cleaned === 'جدارة متوسطة') return 'جيد'
  if (cleaned === 'جدارة أساسية' || cleaned === 'اجتياز كافٍ' || cleaned === 'اجتياز حدّي') return 'مقبول'
  if (cleaned === 'دون المستوى' || cleaned === 'راسب' || cleaned === 'ضعيف') return 'يحتاج إلى متابعة وتشجيع'
  return cleaned
}

export function resolveDistinctNurserySecularComments({
  classRule,
  headRule,
  defaultComment,
  grades = [],
  isTerm3 = false,
}: {
  classRule?: string | null
  headRule?: string | null
  defaultComment?: string | null
  grades?: string[]
  isTerm3?: boolean
}): { classTeacherComment: string; headTeacherComment: string } {
  const classTeacherComment =
    (classRule && classRule.trim()) ||
    (defaultComment && defaultComment.trim()) ||
    'Shows wonderful curiosity and joyful participation in class activities. Keep shining!'

  const explicitHead = headRule && headRule.trim() ? headRule.trim() : ''
  const gradeScore = (g: string) => ({ A: 5, B: 4, C: 3, D: 2, E: 1 }[g] ?? 4)
  const avg = grades.length > 0 ? grades.reduce((s, g) => s + gradeScore(g), 0) / grades.length : 4

  const fallbackHead = isTerm3
    ? 'Impressive early-learning milestone achieved. Promoted with warm commendation.'
    : avg >= 3.5
      ? 'Delightful progress recorded across early learning domains. Keep soaring, little star!'
      : 'Encouraging steady growth this term. Thank you for partnering closely in the learner\'s foundation.'

  let headTeacherComment =
    explicitHead && explicitHead !== classTeacherComment ? explicitHead : fallbackHead

  if (headTeacherComment.trim() === classTeacherComment.trim()) {
    headTeacherComment = 'Impressive early-learning milestone achieved. Keep shining brightly!'
  }

  return { classTeacherComment, headTeacherComment }
}

export function resolveDistinctNurseryTheologyComments({
  teacherComment,
  headComment,
  gender,
}: {
  teacherComment?: string | null
  headComment?: string | null
  gender?: string | null
}): { teacherComment: string; headTeacherComment: string } {
  const isGirl = gender ? ['female', 'f', 'girl', 'بنت', 'أنثى'].includes(gender.trim().toLowerCase()) : false
  const resolvedTeacher =
    (teacherComment && teacherComment.trim()) ||
    'ما شاء الله، تفاعل ممتاز وتقدم رائع في الحفظ والتعلم، بارك الله فيك.'

  const explicitHead = headComment && headComment.trim() ? headComment.trim() : ''
  const fallbackHead = isGirl
    ? 'نتيجة مشرفة وجهد مبارك، نتمنى لها دوام التفوق والنجاح.'
    : 'نتيجة مشرفة وجهد مبارك، نتمنى له/لها دوام التفوق والنجاح.'

  let resolvedHead =
    explicitHead && explicitHead !== resolvedTeacher ? explicitHead : fallbackHead

  if (resolvedHead.trim() === resolvedTeacher.trim()) {
    resolvedHead = 'أداء طيب وجهد مشكور، مع أطيب التمنيات بمزيد من التقدم والتميز.'
  }

  return { teacherComment: resolvedTeacher, headTeacherComment: resolvedHead }
}

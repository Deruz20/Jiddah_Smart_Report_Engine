import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllSupabaseRows } from '@/lib/supabase-pagination'
import { getMarkScore } from '@/lib/mark-scores'

export interface ReconciledTermInfo {
  primaryTerm: any | null
  termIds: string[]
  termAliases: string[]
  academicYear: number
  termNumber: number
  label: string
}

export interface StudentReference {
  id: string
  enrollment_id?: string | null
  name?: string | null
  full_name?: string | null
  admission_number?: string | null
}

export interface ReconcileSecularOptions {
  studentIds?: string[]
  enrollmentIds?: string[]
  termIds: string[]
  termAliases?: string[]
  academicYear?: number
  students?: StudentReference[]
}

export interface ReconcileTheologyOptions {
  studentIds?: string[]
  enrollmentIds?: string[]
  termIds: string[]
  termAliases?: string[]
  academicYear?: number
  students?: StudentReference[]
}

export interface ReconciledMarkEntry {
  id?: string
  enrollment_id?: string | null
  student_id?: string | null
  subject_id: string
  subject_code?: string
  subject_name?: string
  bot_score: number | null
  mot_score: number | null
  eot_score: number | null
  source_table?: 'circular_marks' | 'marks' | 'theology_marks' | 'merged'
}

/**
 * Normalizes a student's full name by trimming, lowercasing,
 * and collapsing whitespace and punctuation for resilient fallback matching.
 */
export function normalizeStudentName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Maps secular subject names/aliases to a canonical subject code
 */
export function canonicalSecularSubjectCode(name: string | null | undefined): string {
  if (!name) return ''
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim()
  if (n.includes('eng') || n === 'english' || n === 'english language') return 'ENG'
  if (n.includes('math') || n.includes('mth') || n === 'mathematics') return 'MATH'
  if (n.includes('sci') || n.includes('science') || n.includes('integrated science')) return 'SCI'
  if (n.includes('sst') || n.includes('social studies') || n.includes('social')) return 'SST'
  if (n.includes('lit 1') || n.includes('lit i') || n.includes('literacy 1') || n.includes('literacy i') || n.includes('liti')) return 'LIT I'
  if (n.includes('lit 2') || n.includes('lit ii') || n.includes('literacy 2') || n.includes('literacy ii') || n.includes('litii')) return 'LIT II'
  if (n.includes('ire') || n.includes('islamic religious')) return 'IRE'
  if (n.includes('comp') || n.includes('computer')) return 'COMP'
  if (n.includes('writing') || n.includes('handwriting')) return 'WRITING'
  if (n.includes('reading')) return 'READING'
  if (n.includes('la1') || n.includes('la 1') || n.includes('learning area 1')) return 'LA1'
  if (n.includes('la2') || n.includes('la 2') || n.includes('learning area 2')) return 'LA2'
  if (n.includes('la3') || n.includes('la 3') || n.includes('learning area 3')) return 'LA3'
  if (n.includes('la4') || n.includes('la 4') || n.includes('learning area 4')) return 'LA4'
  if (n.includes('la5') || n.includes('la 5') || n.includes('learning area 5')) return 'LA5'
  return n.toUpperCase()
}

/**
 * Maps Arabic theology subject names to a canonical code
 */
export function canonicalTheologySubjectCode(name: string | null | undefined): string {
  if (!name) return ''
  const n = name.trim().replace(/\s+/g, ' ')
  if (n.includes('قرآن') || n.includes('قران')) return 'QURAN'
  if (n.includes('عرب')) return 'ARABIC'
  if (n.includes('فقه')) return 'FIQH'
  if (n.includes('تربية') || n.includes('توحيد') || n.includes('إسلام') || n.includes('اسلام') || n.includes('عقيدة')) return 'ISLAMIC_STUDIES'
  if (n.includes('تاريخ') || n.includes('سيرة') || n.includes('سيره')) return 'SIRAH_HISTORY'
  return n
}

/**
 * Resolves all sibling term UUIDs and textual aliases sharing the same
 * (academic_year, term_number) given any term identifier (UUID, number, or label).
 */
export async function resolveEquivalentTerms(
  supabase: SupabaseClient,
  termInput: string | number | null | undefined
): Promise<ReconciledTermInfo> {
  const isUuid = (val: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

  let primaryTerm: any = null

  if (termInput && typeof termInput === 'string' && isUuid(termInput)) {
    const { data } = await supabase
      .from('terms')
      .select('*')
      .eq('id', termInput)
      .maybeSingle()
    if (data) {
      primaryTerm = data
    }
  }

  if (!primaryTerm) {
    let termNumber: number | null = null
    if (typeof termInput === 'number') {
      termNumber = termInput
    } else if (typeof termInput === 'string') {
      const match = termInput.match(/([1-3])/)
      if (match) {
        termNumber = parseInt(match[1], 10)
      }
    }

    if (termNumber !== null) {
      const { data } = await supabase
        .from('terms')
        .select('*')
        .eq('term_number', termNumber)
        .order('is_current', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) {
        primaryTerm = data
      }
    }
  }

  if (!primaryTerm) {
    const { data } = await supabase
      .from('terms')
      .select('*')
      .eq('is_current', true)
      .maybeSingle()
    primaryTerm = data
  }

  if (!primaryTerm) {
    const { data } = await supabase
      .from('terms')
      .select('*')
      .order('academic_year', { ascending: false })
      .limit(1)
      .maybeSingle()
    primaryTerm = data
  }

  const academicYear = Number(primaryTerm?.academic_year || 2026)
  const termNumber = Number(primaryTerm?.term_number || 3)

  const { data: siblingTerms } = await supabase
    .from('terms')
    .select('id, term_number, academic_year, label, is_current')
    .eq('academic_year', academicYear)
    .eq('term_number', termNumber)

  const termIds = [...new Set([
    ...(primaryTerm?.id ? [primaryTerm.id] : []),
    ...(siblingTerms || []).map((t: any) => t.id)
  ])]

  const termAliases = [
    String(termNumber),
    `Term ${termNumber}`,
    `Term ${termNumber}, ${academicYear}`,
    `Term ${termNumber} (${academicYear})`,
    `Term ${termNumber} ${academicYear}`,
    primaryTerm?.label,
  ].filter((a): a is string => Boolean(a))

  return {
    primaryTerm,
    termIds,
    termAliases: [...new Set(termAliases)],
    academicYear,
    termNumber,
    label: primaryTerm?.label || `Term ${termNumber}, ${academicYear}`,
  }
}

/**
 * Universal Secular Marks Fetcher & Reconciler
 * Queries both `circular_marks` and legacy `marks` using `fetchAllSupabaseRows`,
 * reconciling duplicate enrollments, duplicate student rows, and subject UUID/code matches.
 */
export async function fetchAndReconcileSecularMarks(
  supabase: SupabaseClient,
  options: ReconcileSecularOptions
): Promise<ReconciledMarkEntry[]> {
  const { enrollmentIds = [], studentIds = [], termIds = [], students = [] } = options
  if (termIds.length === 0) return []

  const marksList: any[] = []

  // 1. Fetch from circular_marks by enrollment_id
  if (enrollmentIds.length > 0) {
    for (let i = 0; i < enrollmentIds.length; i += 100) {
      const chunk = enrollmentIds.slice(i, i + 100)
      const rows = await fetchAllSupabaseRows(() =>
        supabase
          .from('circular_marks')
          .select('*')
          .in('enrollment_id', chunk)
          .in('term_id', termIds)
      )
      marksList.push(...rows.map((r) => ({ ...r, _source: 'circular_marks' })))
    }
  }

  // Also query by student_id if provided
  if (studentIds.length > 0) {
    for (let i = 0; i < studentIds.length; i += 100) {
      const chunk = studentIds.slice(i, i + 100)
      const rows = await fetchAllSupabaseRows(() =>
        supabase
          .from('circular_marks')
          .select('*')
          .in('student_id', chunk)
          .in('term_id', termIds)
      )
      marksList.push(...rows.map((r) => ({ ...r, _source: 'circular_marks' })))
    }
  }

  // 2. Fetch from legacy marks table if it exists
  try {
    if (studentIds.length > 0) {
      for (let i = 0; i < studentIds.length; i += 100) {
        const chunk = studentIds.slice(i, i + 100)
        const rows = await fetchAllSupabaseRows(() =>
          supabase
            .from('marks')
            .select('*')
            .in('student_id', chunk)
            .in('term_id', termIds)
        )
        marksList.push(...rows.map((r) => ({ ...r, _source: 'marks' })))
      }
    } else if (enrollmentIds.length > 0) {
      for (let i = 0; i < enrollmentIds.length; i += 100) {
        const chunk = enrollmentIds.slice(i, i + 100)
        const rows = await fetchAllSupabaseRows(() =>
          supabase
            .from('marks')
            .select('*')
            .in('enrollment_id', chunk)
            .in('term_id', termIds)
        )
        marksList.push(...rows.map((r) => ({ ...r, _source: 'marks' })))
      }
    }
  } catch {
    // Legacy marks table may not exist in all environments
  }

  // Map student name / admission fallback
  const studentMap = new Map<string, StudentReference>()
  for (const s of students) {
    if (s.id) studentMap.set(s.id, s)
    if (s.enrollment_id) studentMap.set(s.enrollment_id, s)
  }

  // 3. Reconcile by student and subject
  const reconciledMap = new Map<string, ReconciledMarkEntry>()

  for (const raw of marksList) {
    const targetEnrollmentId = raw.enrollment_id || null
    const targetStudentId = raw.student_id || null
    const targetSubjectId = raw.subject_id || ''

    if (!targetSubjectId) continue

    // Key can be enrollment_id:subject_id or student_id:subject_id
    const key = targetEnrollmentId
      ? `${targetEnrollmentId}:${targetSubjectId}`
      : `${targetStudentId}:${targetSubjectId}`

    const botScore = getMarkScore(raw, 'bot')
    const motScore = getMarkScore(raw, 'mot')
    const eotScore = getMarkScore(raw, 'eot')

    const existing = reconciledMap.get(key)
    if (!existing) {
      reconciledMap.set(key, {
        id: raw.id,
        enrollment_id: targetEnrollmentId,
        student_id: targetStudentId,
        subject_id: targetSubjectId,
        bot_score: botScore,
        mot_score: motScore,
        eot_score: eotScore,
        source_table: raw._source,
      })
    } else {
      // Merge field by field: non-null retains, never overwriting real score with null
      if (existing.bot_score === null && botScore !== null) existing.bot_score = botScore
      if (existing.mot_score === null && motScore !== null) existing.mot_score = motScore
      if (existing.eot_score === null && eotScore !== null) existing.eot_score = eotScore
      existing.source_table = 'merged'
    }
  }

  return Array.from(reconciledMap.values())
}

/**
 * Universal Theology Marks Fetcher & Reconciler
 * Queries `theology_marks` using `fetchAllSupabaseRows`,
 * indexing across all resolved term IDs and normalizing theology marks.
 */
export async function fetchAndReconcileTheologyMarks(
  supabase: SupabaseClient,
  options: ReconcileTheologyOptions
): Promise<ReconciledMarkEntry[]> {
  const { enrollmentIds = [], studentIds = [], termIds = [] } = options
  if (termIds.length === 0) return []

  const marksList: any[] = []

  if (enrollmentIds.length > 0) {
    for (let i = 0; i < enrollmentIds.length; i += 100) {
      const chunk = enrollmentIds.slice(i, i + 100)
      const rows = await fetchAllSupabaseRows(() =>
        supabase
          .from('theology_marks')
          .select('*')
          .in('enrollment_id', chunk)
          .in('term_id', termIds)
      )
      marksList.push(...rows.map((r) => ({ ...r, _source: 'theology_marks' })))
    }
  }

  if (studentIds.length > 0) {
    for (let i = 0; i < studentIds.length; i += 100) {
      const chunk = studentIds.slice(i, i + 100)
      const rows = await fetchAllSupabaseRows(() =>
        supabase
          .from('theology_marks')
          .select('*')
          .in('student_id', chunk)
          .in('term_id', termIds)
      )
      marksList.push(...rows.map((r) => ({ ...r, _source: 'theology_marks' })))
    }
  }

  const reconciledMap = new Map<string, ReconciledMarkEntry>()

  for (const raw of marksList) {
    const targetEnrollmentId = raw.enrollment_id || null
    const targetStudentId = raw.student_id || null
    const targetSubjectId = raw.theology_subject_id || raw.subject_id || ''

    if (!targetSubjectId) continue

    const key = targetEnrollmentId
      ? `${targetEnrollmentId}:${targetSubjectId}`
      : `${targetStudentId}:${targetSubjectId}`

    const motScore = getMarkScore(raw, 'mot')
    const eotScore = getMarkScore(raw, 'eot')

    const existing = reconciledMap.get(key)
    if (!existing) {
      reconciledMap.set(key, {
        id: raw.id,
        enrollment_id: targetEnrollmentId,
        student_id: targetStudentId,
        subject_id: targetSubjectId,
        bot_score: null,
        mot_score: motScore,
        eot_score: eotScore,
        source_table: 'theology_marks',
      })
    } else {
      if (existing.mot_score === null && motScore !== null) existing.mot_score = motScore
      if (existing.eot_score === null && eotScore !== null) existing.eot_score = eotScore
    }
  }

  return Array.from(reconciledMap.values())
}

/**
 * Resilient lookup helper: looks up a mark for a student and subject,
 * falling back across enrollment_id vs student_id, and subject UUID vs subject code.
 */
export function findReconciledMark(
  reconciledMarks: ReconciledMarkEntry[],
  lookup: {
    studentId?: string | null
    enrollmentId?: string | null
    subjectId?: string | null
    subjectCode?: string | null
    subjectName?: string | null
  }
): ReconciledMarkEntry | undefined {
  const { studentId, enrollmentId, subjectId, subjectCode, subjectName } = lookup

  // 1. Exact enrollment_id + subject_id match
  if (enrollmentId && subjectId) {
    const m = reconciledMarks.find(
      (r) => r.enrollment_id === enrollmentId && r.subject_id === subjectId
    )
    if (m) return m
  }

  // 2. Exact student_id + subject_id match
  if (studentId && subjectId) {
    const m = reconciledMarks.find(
      (r) => r.student_id === studentId && r.subject_id === subjectId
    )
    if (m) return m
  }

  // 3. Fallback by canonical subject code
  const targetCode = subjectCode || canonicalSecularSubjectCode(subjectName)
  if (targetCode && (enrollmentId || studentId)) {
    const m = reconciledMarks.find((r) => {
      const matchOwner =
        (enrollmentId && r.enrollment_id === enrollmentId) ||
        (studentId && r.student_id === studentId)
      if (!matchOwner) return false
      const rCode = r.subject_code || canonicalSecularSubjectCode(r.subject_name)
      return rCode === targetCode
    })
    if (m) return m
  }

  return undefined
}

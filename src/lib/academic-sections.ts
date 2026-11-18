export type HubSectionId = 'nursery' | 'lower_primary' | 'upper_primary'
export type HubCurriculum = 'secular' | 'theology'
export type ExamPhase = 'bot' | 'mot' | 'eot'

export interface HubSectionDefinition {
  id: HubSectionId
  label: string
  label_arabic: string
  description: string
  circular_class_codes: string[]
  theology_class_codes: string[]
  circular_class_ids: string[]
  theology_class_ids: string[]
}

export interface CandidateClassExclusionRule {
  id: string
  class_codes: string[]
  class_ids: string[]
  excluded_term_numbers: number[]
  excluded_exam_types: ExamPhase[]
  display_badge: string
  reason: string
}

export const DEFAULT_HUB_SECTIONS: HubSectionDefinition[] = [
  {
    id: 'nursery',
    label: 'Nursery',
    label_arabic: 'قسم الروضة',
    description: 'Baby → Top (all nursery classes combined)',
    circular_class_codes: ['BABY', 'MIDDLE', 'TOP', 'NURSERY'],
    theology_class_codes: ['BABY', 'MIDDLE', 'TOP', 'RAUDHA', 'NURSERY'],
    circular_class_ids: [],
    theology_class_ids: [],
  },
  {
    id: 'lower_primary',
    label: 'Lower Primary',
    label_arabic: 'الابتدائية الدنيا',
    description: 'P.1 – P.3',
    circular_class_codes: ['P1', 'P2', 'P3'],
    theology_class_codes: ['THEO_1', 'THEO_2', 'THEO_3', 'IBTIDAAI_LOWER', 'P1', 'P2', 'P3'],
    circular_class_ids: [],
    theology_class_ids: [],
  },
  {
    id: 'upper_primary',
    label: 'Upper Primary',
    label_arabic: 'الابتدائية العليا',
    description: 'P.4 – P.7',
    circular_class_codes: ['P4', 'P5', 'P6', 'P7'],
    theology_class_codes: ['THEO_4', 'THEO_5', 'THEO_6', 'THEO_7', 'IBTIDAAI_UPPER', 'P4', 'P5', 'P6', 'P7'],
    circular_class_ids: [],
    theology_class_ids: [],
  },
]

export const CANDIDATE_NA_BADGE = 'N/A — candidate class'

export const DEFAULT_CANDIDATE_CLASS_RULES: CandidateClassExclusionRule[] = [
  {
    id: 'p7_ple_iple_term3_eot',
    class_codes: ['P7', 'THEO_7'],
    class_ids: [],
    excluded_term_numbers: [3],
    excluded_exam_types: ['eot'],
    display_badge: CANDIDATE_NA_BADGE,
    reason: 'P.7 candidates sit PLE / IPLE and do not take school Term 3 EOT.',
  },
]

export function normalizeHubSectionsConfig(raw: unknown): HubSectionDefinition[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_HUB_SECTIONS.map((s) => ({
      ...s,
      circular_class_codes: [...s.circular_class_codes],
      theology_class_codes: [...s.theology_class_codes],
      circular_class_ids: [...s.circular_class_ids],
      theology_class_ids: [...s.theology_class_ids],
    }))
  }

  return DEFAULT_HUB_SECTIONS.map((def) => {
    const incoming = raw.find((r: any) => r && String(r.id).trim().toLowerCase() === def.id)
    if (!incoming || typeof incoming !== 'object') return def
    return {
      id: def.id,
      label: typeof incoming.label === 'string' && incoming.label.trim() ? incoming.label.trim() : def.label,
      label_arabic:
        typeof incoming.label_arabic === 'string' && incoming.label_arabic.trim()
          ? incoming.label_arabic.trim()
          : def.label_arabic,
      description:
        typeof incoming.description === 'string' && incoming.description.trim()
          ? incoming.description.trim()
          : def.description,
      circular_class_codes:
        Array.isArray(incoming.circular_class_codes) && incoming.circular_class_codes.length > 0
          ? incoming.circular_class_codes.map((c: unknown) => String(c).trim().toUpperCase()).filter(Boolean)
          : [...def.circular_class_codes],
      theology_class_codes:
        Array.isArray(incoming.theology_class_codes) && incoming.theology_class_codes.length > 0
          ? incoming.theology_class_codes.map((c: unknown) => String(c).trim().toUpperCase()).filter(Boolean)
          : [...def.theology_class_codes],
      circular_class_ids: Array.isArray(incoming.circular_class_ids)
        ? incoming.circular_class_ids.map((id: unknown) => String(id).trim()).filter(Boolean)
        : [],
      theology_class_ids: Array.isArray(incoming.theology_class_ids)
        ? incoming.theology_class_ids.map((id: unknown) => String(id).trim()).filter(Boolean)
        : [],
    }
  })
}

export function normalizeCandidateClassRules(raw: unknown): CandidateClassExclusionRule[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_CANDIDATE_CLASS_RULES.map((r) => ({
      ...r,
      class_codes: [...r.class_codes],
      class_ids: [...r.class_ids],
      excluded_term_numbers: [...r.excluded_term_numbers],
      excluded_exam_types: [...r.excluded_exam_types],
    }))
  }

  const parsed: CandidateClassExclusionRule[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, any>
    const classCodes = Array.isArray(r.class_codes)
      ? r.class_codes.map((c: unknown) => String(c).trim().toUpperCase()).filter(Boolean)
      : []
    const classIds = Array.isArray(r.class_ids)
      ? r.class_ids.map((id: unknown) => String(id).trim()).filter(Boolean)
      : []
    const termNums = Array.isArray(r.excluded_term_numbers)
      ? r.excluded_term_numbers.map((n: unknown) => Number(n)).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 3)
      : []
    const exams = Array.isArray(r.excluded_exam_types)
      ? r.excluded_exam_types
          .map((e: unknown) => String(e).trim().toLowerCase())
          .filter((e: string): e is ExamPhase => e === 'bot' || e === 'mot' || e === 'eot')
      : []

    if ((classCodes.length > 0 || classIds.length > 0) && termNums.length > 0 && exams.length > 0) {
      parsed.push({
        id: typeof r.id === 'string' && r.id.trim() ? r.id.trim() : 'candidate_rule',
        class_codes: classCodes,
        class_ids: classIds,
        excluded_term_numbers: termNums,
        excluded_exam_types: exams,
        display_badge:
          typeof r.display_badge === 'string' && r.display_badge.trim()
            ? r.display_badge.trim()
            : CANDIDATE_NA_BADGE,
        reason:
          typeof r.reason === 'string' && r.reason.trim()
            ? r.reason.trim()
            : 'Candidate class excluded for this term exam.',
      })
    }
  }

  return parsed.length > 0 ? parsed : DEFAULT_CANDIDATE_CLASS_RULES
}

export interface ClassLikeRecord {
  id?: string | null
  code?: string | null
  class_name?: string | null
  name?: string | null
  section?: string | null
  class_name_arabic?: string | null
  class_name_english?: string | null
  level?: string | number | null
}

function parseArabicOrEnglishNumberCode(raw: string, prefix: 'P' | 'THEO_'): string | null {
  const s = raw.trim().toLowerCase()
  if (!s) return null

  const wordMap: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
  }

  const m = s.match(
    /^(?:p\.?\s*([1-7])|primary\s+([1-7]|one|two|three|four|five|six|seven))(?=$|\s|[-/()])/i
  )
  if (m) {
    const token = (m[1] || m[2] || '').toLowerCase()
    const num = /^\d$/.test(token) ? Number(token) : wordMap[token]
    if (num >= 1 && num <= 7) {
      return `${prefix}${num}`
    }
  }

  if (prefix === 'THEO_') {
    if (/^[1-7]$/.test(s)) {
      return `THEO_${s}`
    }
    const arabicOrdinals: Array<[string, number]> = [
      ['الصف الأول', 1],
      ['الصف الاول', 1],
      ['الأول', 1],
      ['الأولى', 1],
      ['الصف الثاني', 2],
      ['الثاني', 2],
      ['الثانية', 2],
      ['الصف الثالث', 3],
      ['الثالث', 3],
      ['الثالثة', 3],
      ['الصف الرابع', 4],
      ['الرابع', 4],
      ['الرابعة', 4],
      ['الصف الخامس', 5],
      ['الخامس', 5],
      ['الخامسة', 5],
      ['الصف السادس', 6],
      ['السادس', 6],
      ['السادسة', 6],
      ['الصف السابع', 7],
      ['السابع', 7],
      ['السابعة', 7],
    ]
    for (const [token, num] of arabicOrdinals) {
      if (s === token || s.startsWith(`${token} `)) {
        return `THEO_${num}`
      }
    }
  }

  return null
}

function parseNurseryCode(raw: string): string | null {
  const s = raw.trim().toLowerCase()
  if (!s) return null
  if (/^(baby(?:\s+class)?|kg\s*1|nursery\s*1|الروضة السفلى)(?=$|\s|[-/()])/i.test(s)) return 'BABY'
  if (/^(middle(?:\s+class)?|kg\s*2|nursery\s*2|الروضة الوسطى)(?=$|\s|[-/()])/i.test(s)) return 'MIDDLE'
  if (/^(top(?:\s+class)?|kg\s*3|nursery\s*3|الروضة العليا)(?=$|\s|[-/()])/i.test(s)) return 'TOP'
  if (/^(raudha|nursery|الروضة)(?=$|\s|[-/()])/i.test(s)) return 'RAUDHA'
  return null
}

/**
 * Resolves a class record into a deterministic canonical class code
 * using structured code/level fields rather than fuzzy substring name matching.
 */
export function resolveCanonicalClassCode(
  cls: ClassLikeRecord | null | undefined,
  curriculum: HubCurriculum
): string | null {
  if (!cls) return null

  if (typeof cls.code === 'string' && cls.code.trim()) {
    return cls.code.trim().toUpperCase()
  }

  if (curriculum === 'theology') {
    const eng = String(cls.class_name_english ?? cls.class_name ?? cls.name ?? '').trim()
    const ar = String(cls.class_name_arabic ?? '').trim()

    // Explicit nursery codes first so Nursery classes aren't pushed into Lower Primary by integer level=1
    const nurseryEng = parseNurseryCode(eng)
    if (nurseryEng) return nurseryEng
    const nurseryAr = parseNurseryCode(ar)
    if (nurseryAr) return nurseryAr

    const engNumCode = parseArabicOrEnglishNumberCode(eng, 'THEO_')
    if (engNumCode) return engNumCode
    const arNumCode = parseArabicOrEnglishNumberCode(ar, 'THEO_')
    if (arNumCode) return arNumCode

    if (cls.level !== null && cls.level !== undefined && cls.level !== '') {
      const lvlStr = String(cls.level).trim().toLowerCase()
      if (lvlStr === '0' || lvlStr === 'raudha' || lvlStr === 'nursery') return 'RAUDHA'
      if (lvlStr === 'ibtidaai_lower') return 'IBTIDAAI_LOWER'
      if (lvlStr === 'ibtidaai_upper') return 'IBTIDAAI_UPPER'
      if (/^[1-7]$/.test(lvlStr)) return `THEO_${lvlStr}`
    }

    return null
  }

  const rawName = String(cls.class_name ?? cls.name ?? '').trim()
  const nurseryCode = parseNurseryCode(rawName)
  if (nurseryCode) return nurseryCode === 'RAUDHA' ? 'NURSERY' : nurseryCode

  const primaryCode = parseArabicOrEnglishNumberCode(rawName, 'P')
  if (primaryCode) return primaryCode

  return null
}

export function resolveTermNumber(
  termNumber?: number | null,
  termLabel?: string | null
): number | null {
  if (typeof termNumber === 'number' && Number.isInteger(termNumber) && termNumber >= 1 && termNumber <= 3) {
    return termNumber
  }
  if (termNumber !== null && termNumber !== undefined) {
    const parsed = Number(termNumber)
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 3) return parsed
  }
  const label = String(termLabel ?? '').trim().toLowerCase()
  if (!label) return null
  if (/\bterm\s*3\b|\bt3\b|third\s+term|الفترة\s+الثالثة/.test(label)) return 3
  if (/\bterm\s*2\b|\bt2\b|second\s+term|الفترة\s+الثانية/.test(label)) return 2
  if (/\bterm\s*1\b|\bt1\b|first\s+term|الفترة\s+الأولى/.test(label)) return 1
  return null
}

export interface ExamApplicabilityInput extends ClassLikeRecord {
  classId?: string | null
  curriculum: HubCurriculum
  examType: ExamPhase | string | null | undefined
  termNumber?: number | null
  termLabel?: string | null
}

export interface ExamApplicabilityResult {
  applies: boolean
  isCandidateClass: boolean
  isExcludedExam: boolean
  canonicalClassCode: string | null
  badge: string
  reason: string | null
}

/**
 * Single central rule answering: "Does exam X apply to class Y in term Z?"
 * P.7 candidates (both Secular and Theology) sit PLE / IPLE and have NO Term 3 EOT.
 * Only Term 3 EOT is excluded.
 */
export function doesExamApplyToClassInTerm(
  input: ExamApplicabilityInput,
  rulesConfig?: CandidateClassExclusionRule[]
): ExamApplicabilityResult {
  const rules = normalizeCandidateClassRules(rulesConfig)
  const classId = input.classId ?? input.id ?? null
  const canonicalClassCode = resolveCanonicalClassCode(
    { ...input, id: classId },
    input.curriculum
  )
  const resolvedTermNum = resolveTermNumber(input.termNumber, input.termLabel)
  const exam = String(input.examType ?? '').trim().toLowerCase() as ExamPhase

  for (const rule of rules) {
    const matchesClassId = Boolean(classId && rule.class_ids.includes(classId))
    const matchesCode = Boolean(canonicalClassCode && rule.class_codes.includes(canonicalClassCode))
    if (!matchesClassId && !matchesCode) continue

    const matchesTerm = resolvedTermNum !== null && rule.excluded_term_numbers.includes(resolvedTermNum)
    const matchesExam = rule.excluded_exam_types.includes(exam)

    if (matchesTerm && matchesExam) {
      return {
        applies: false,
        isCandidateClass: true,
        isExcludedExam: true,
        canonicalClassCode,
        badge: rule.display_badge || CANDIDATE_NA_BADGE,
        reason: rule.reason,
      }
    }

    return {
      applies: true,
      isCandidateClass: true,
      isExcludedExam: false,
      canonicalClassCode,
      badge: '',
      reason: null,
    }
  }

  return {
    applies: true,
    isCandidateClass: false,
    isExcludedExam: false,
    canonicalClassCode,
    badge: '',
    reason: null,
  }
}

export function isCandidateClassRecord(
  cls: ClassLikeRecord | null | undefined,
  curriculum: HubCurriculum,
  rulesConfig?: CandidateClassExclusionRule[]
): boolean {
  if (!cls) return false
  return doesExamApplyToClassInTerm(
    {
      ...cls,
      curriculum,
      examType: 'eot',
      termNumber: 3,
    },
    rulesConfig
  ).isCandidateClass
}

export interface ClassSectionMapping<T extends ClassLikeRecord = ClassLikeRecord> {
  classItem: T
  classId: string
  label: string
  canonicalCode: string | null
  sectionId: HubSectionId | null
  sectionLabel: string | null
  isUnmapped: boolean
  isCandidateClass: boolean
  mappingSource: 'explicit_id' | 'canonical_code' | 'unmapped'
}

export interface UnmappedClassWarning {
  id: string
  label: string
  rawSectionOrLevel: string
  reason: string
}

export function formatClassDisplayName(cls: ClassLikeRecord, curriculum: HubCurriculum): string {
  if (curriculum === 'theology') {
    const ar = String(cls.class_name_arabic ?? '').trim()
    const en = String(cls.class_name_english ?? '').trim()
    if (ar && en) return `${ar} (${en})`
    return ar || en || 'Unnamed Theology Class'
  }
  return String(cls.class_name ?? cls.name ?? 'Unnamed Class').trim() || 'Unnamed Class'
}

/**
 * Maps classes to configured sections strictly by class id or canonical class code.
 * Never silently drops unmapped classes; emits explicit data-quality warnings instead.
 */
export function mapClassesToSections<T extends ClassLikeRecord & { id: string }>(
  classes: T[],
  curriculum: HubCurriculum,
  sectionsConfig?: HubSectionDefinition[],
  candidateRules?: CandidateClassExclusionRule[]
): {
  sections: HubSectionDefinition[]
  mappings: ClassSectionMapping<T>[]
  bySection: Record<HubSectionId, T[]>
  classToSection: Record<string, HubSectionId | null>
  unmappedClasses: UnmappedClassWarning[]
} {
  const sections = normalizeHubSectionsConfig(sectionsConfig)
  const bySection: Record<HubSectionId, T[]> = {
    nursery: [],
    lower_primary: [],
    upper_primary: [],
  }
  const classToSection: Record<string, HubSectionId | null> = {}
  const mappings: ClassSectionMapping<T>[] = []
  const unmappedClasses: UnmappedClassWarning[] = []

  for (const cls of classes) {
    const classId = String(cls.id)
    const label = formatClassDisplayName(cls, curriculum)
    const canonicalCode = resolveCanonicalClassCode(cls, curriculum)
    const isCand = isCandidateClassRecord(cls, curriculum, candidateRules)

    let matchedSection: HubSectionDefinition | undefined
    let mappingSource: 'explicit_id' | 'canonical_code' | 'unmapped' = 'unmapped'

    matchedSection = sections.find((sec) =>
      curriculum === 'theology'
        ? sec.theology_class_ids.includes(classId)
        : sec.circular_class_ids.includes(classId)
    )
    if (matchedSection) {
      mappingSource = 'explicit_id'
    } else if (canonicalCode) {
      matchedSection = sections.find((sec) =>
        curriculum === 'theology'
          ? sec.theology_class_codes.includes(canonicalCode)
          : sec.circular_class_codes.includes(canonicalCode)
      )
      if (matchedSection) {
        mappingSource = 'canonical_code'
      }
    }

    if (matchedSection) {
      bySection[matchedSection.id].push(cls)
      classToSection[classId] = matchedSection.id
      mappings.push({
        classItem: cls,
        classId,
        label,
        canonicalCode,
        sectionId: matchedSection.id,
        sectionLabel: matchedSection.label,
        isUnmapped: false,
        isCandidateClass: isCand,
        mappingSource,
      })
    } else {
      classToSection[classId] = null
      mappings.push({
        classItem: cls,
        classId,
        label,
        canonicalCode,
        sectionId: null,
        sectionLabel: null,
        isUnmapped: true,
        isCandidateClass: isCand,
        mappingSource: 'unmapped',
      })
      const rawHint =
        curriculum === 'theology'
          ? `level=${cls.level ?? 'null'}, ar=${cls.class_name_arabic ?? ''}, en=${cls.class_name_english ?? ''}`
          : `section=${cls.section ?? 'null'}, name=${cls.class_name ?? ''}`
      unmappedClasses.push({
        id: classId,
        label,
        rawSectionOrLevel: rawHint,
        reason: 'No matching class ID or canonical class code in Section configuration.',
      })
    }
  }

  return { sections, mappings, bySection, classToSection, unmappedClasses }
}

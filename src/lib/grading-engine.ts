export type GradingCriterion = {
  id: string
  curriculum?: 'secular' | 'theology' | null
  class_id: string | null
  metric_type?: 'subject_score' | 'total_score' | 'aggregate' | 'conduct' | 'head_comment' | string
  min_value?: number
  max_value?: number
  output_type?: 'grade_label' | 'comment'
  output_text?: string
  // Actual database columns on public.grading_criteria
  section?: string | null
  grade?: string | null
  min_score?: number | null
  max_score?: number | null
  remark?: string | null
}

/**
 * Normalizes either virtual GradingCriterion rows (used in unit tests/API payloads)
 * or raw public.grading_criteria DB rows (section, grade, min_score, max_score, min_value, max_value, remark).
 */
export function normalizeGradingCriterion(c: GradingCriterion) {
  let curriculum: 'secular' | 'theology' | null = c.curriculum ?? null
  if (!curriculum && c.section) {
    const s = String(c.section).trim().toLowerCase()
    if (s === 'theology') curriculum = 'theology'
    else if (s === 'secular' || s === 'circular') curriculum = 'secular'
  }

  let metric_type = c.metric_type || ''
  let output_type: 'grade_label' | 'comment' | '' = (c.output_type as any) || ''
  const gradeStr = typeof c.grade === 'string' ? c.grade.trim() : ''

  if ((!metric_type || !output_type) && gradeStr.includes(':')) {
    const [mPart, oPart] = gradeStr.split(':', 2)
    if (!metric_type) metric_type = mPart.trim()
    if (!output_type && (oPart === 'grade_label' || oPart === 'comment')) {
      output_type = oPart
    }
  }
  if (!metric_type) metric_type = 'subject_score'
  if (!output_type) output_type = c.remark ? 'comment' : 'grade_label'

  const min_value = Number(c.min_value ?? c.min_score ?? 0)
  const max_value = Number(c.max_value ?? c.max_score ?? 100)
  const output_text = String(c.output_text ?? c.remark ?? gradeStr ?? '')

  return {
    id: c.id,
    curriculum,
    class_id: c.class_id ?? null,
    metric_type,
    min_value,
    max_value,
    output_type,
    output_text,
  }
}

/**
 * Evaluates the given value against a list of criteria to find an overriding rule.
 */
export function evaluateCriteria(
  value: number | null | undefined,
  metricType: string,
  curriculum: 'secular' | 'theology',
  classId: string | null | undefined,
  criteriaList: GradingCriterion[],
  outputType: 'grade_label' | 'comment'
): string | null {
  if (value === null || value === undefined || !Array.isArray(criteriaList)) return null;

  const applicableRules = criteriaList
    .map(normalizeGradingCriterion)
    .filter((c) => {
      if (c.metric_type !== metricType) return false;
      if (c.output_type !== outputType) return false;
      if (c.curriculum !== null && c.curriculum !== curriculum) return false;
      if (c.class_id !== null && c.class_id !== '' && c.class_id !== classId) return false;
      return true;
    });

  // Prefer class-specific rules over school-wide null class_id rules
  const orderedRules = [
    ...applicableRules.filter((c) => c.class_id && c.class_id === classId),
    ...applicableRules.filter((c) => !c.class_id),
  ];

  const matchedRule = orderedRules.find(c => value >= c.min_value && value <= c.max_value);
  return matchedRule ? matchedRule.output_text : null;
}

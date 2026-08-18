export type GradingCriterion = {
  id: string
  curriculum: 'secular' | 'theology' | null
  class_id: string | null
  metric_type: 'subject_score' | 'total_score' | 'aggregate' | string
  min_value: number
  max_value: number
  output_type: 'grade_label' | 'comment'
  output_text: string
}

/**
 * Evaluates the given value against a list of criteria to find an overriding rule.
 * 
 * @param value The value to test (e.g. subject score, total, or aggregate)
 * @param metricType The type of metric (e.g. 'subject_score', 'total_score', 'aggregate')
 * @param curriculum The curriculum context ('secular' or 'theology')
 * @param classId The specific class ID (if applicable)
 * @param criteriaList The list of all rules from grading_criteria
 * @param outputType What kind of output we want ('grade_label' or 'comment')
 * @returns The output_text of the first matching rule, or null if no rule matches.
 */
export function evaluateCriteria(
  value: number | null | undefined,
  metricType: string,
  curriculum: 'secular' | 'theology',
  classId: string | null | undefined,
  criteriaList: GradingCriterion[],
  outputType: 'grade_label' | 'comment'
): string | null {
  if (value === null || value === undefined) return null;

  const applicableRules = criteriaList.filter((c) => {
    // Must match metric and output type
    if (c.metric_type !== metricType) return false;
    if (c.output_type !== outputType) return false;

    // Must match curriculum if specified
    if (c.curriculum !== null && c.curriculum !== curriculum) return false;

    // Must match class if specified
    if (c.class_id !== null && c.class_id !== '' && c.class_id !== classId) return false;

    return true;
  });

  // Find the first rule where the value falls within the range [min_value, max_value]
  const matchedRule = applicableRules.find(c => value >= c.min_value && value <= c.max_value);
  
  return matchedRule ? matchedRule.output_text : null;
}

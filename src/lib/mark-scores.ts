export type AssessmentPhase = 'bot' | 'mot' | 'eot'

export function getMarkScore(
  mark: Record<string, unknown> | null | undefined,
  phase: AssessmentPhase
): number | null {
  const score = mark?.[`${phase}_score`]
  if (typeof score === 'number') return score

  const legacyMark = mark?.[`${phase}_mark`]
  return typeof legacyMark === 'number' ? legacyMark : null
}

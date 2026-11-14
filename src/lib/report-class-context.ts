export type ReportCurriculum = 'secular' | 'theology' | 'combined'

export function hasRequiredClassForReport(
  curriculum: ReportCurriculum,
  hasCircularClass: boolean,
  hasTheologyClass: boolean
): boolean {
  if (curriculum === 'secular') return hasCircularClass
  if (curriculum === 'theology') return hasTheologyClass
  return hasCircularClass || hasTheologyClass
}

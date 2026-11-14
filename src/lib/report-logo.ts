export const DEFAULT_REPORT_LOGO = '/school_budge.jpeg'

export function fallbackReportLogo(image: {
  src: string
  dataset: { reportLogoFallback?: string }
}): void {
  if (image.dataset.reportLogoFallback === 'true') return

  image.dataset.reportLogoFallback = 'true'
  image.src = DEFAULT_REPORT_LOGO
}

'use client'

import type { ImgHTMLAttributes, SyntheticEvent } from 'react'
import { DEFAULT_REPORT_LOGO, fallbackReportLogo } from '@/lib/report-logo'

type ReportSchoolLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'onError' | 'src'> & {
  src?: string | null
}

export function ReportSchoolLogo({ src, ...props }: ReportSchoolLogoProps) {
  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    fallbackReportLogo(event.currentTarget)
  }

  return <img {...props} src={src || DEFAULT_REPORT_LOGO} onError={handleError} />
}

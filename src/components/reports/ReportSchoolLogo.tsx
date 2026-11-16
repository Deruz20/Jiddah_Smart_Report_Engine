'use client'

import type { ImgHTMLAttributes, SyntheticEvent } from 'react'
import { DEFAULT_REPORT_LOGO, fallbackReportLogo } from '@/lib/report-logo'

type ReportSchoolLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'onError' | 'src'> & {
  src?: string | null
}

export function ReportSchoolLogo({ src, className, ...props }: ReportSchoolLogoProps) {
  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    fallbackReportLogo(event.currentTarget)
  }

  return (
    <div className="w-14 h-14 overflow-visible flex items-center justify-center mx-auto my-0.5 shrink-0">
      <img
        {...props}
        className={`w-full h-full object-contain ${className || ''}`}
        src={src || DEFAULT_REPORT_LOGO}
        onError={handleError}
      />
    </div>
  )
}

'use client'

/**
 * PRINT PORTAL — Server-Side Print Output
 *
 * Mounts printable report containers directly into document.body (#report-print-portal)
 * via createPortal so @media print can hide all app layout siblings (`body:has(#report-print-portal) > *:not(#report-print-portal)`).
 * On @media print, ONLY #report-print-portal / #print-portal is visible (see print-system.css).
 */

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface PrintPortalProps {
  children: React.ReactNode
  pageOrientation?: 'portrait' | 'landscape' | 'mixed'
}

export function PrintPortal({ children, pageOrientation = 'portrait' }: PrintPortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      id="report-print-portal"
      data-print-portal="active"
      aria-hidden="true"
      inert={true}
    >
      <div id="print-portal">
        {pageOrientation !== 'mixed' && (
          <style>
            {pageOrientation === 'landscape'
              ? `@page { size: 297mm 210mm !important; margin: 0mm !important; }`
              : `@page { size: 210mm 297mm !important; margin: 0mm !important; }`}
          </style>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}

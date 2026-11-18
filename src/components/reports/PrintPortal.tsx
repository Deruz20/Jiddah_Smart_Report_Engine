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
  pageMargin?: string
}

export function PrintPortal({
  children,
  pageOrientation = 'portrait',
  pageMargin = '0mm',
}: PrintPortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    if (typeof document === 'undefined' || typeof window === 'undefined') return
    let hadDarkClass = false
    let prevTheme: string | null = null

    const handleBeforePrint = () => {
      const root = document.documentElement
      hadDarkClass = root.classList.contains('dark')
      prevTheme = root.getAttribute('data-theme')
      if (hadDarkClass) root.classList.remove('dark')
      if (prevTheme === 'dark') root.setAttribute('data-theme', 'light')
    }

    const handleAfterPrint = () => {
      const root = document.documentElement
      if (hadDarkClass) root.classList.add('dark')
      if (prevTheme !== null) root.setAttribute('data-theme', prevTheme)
      hadDarkClass = false
      prevTheme = null
    }

    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      handleAfterPrint()
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [])

  if (!mounted || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      id="report-print-portal"
      data-print-portal="active"
      data-mixed-orientation={pageOrientation === 'mixed' ? 'true' : 'false'}
      aria-hidden="true"
      inert={true}
    >
      <div id="print-portal">
        {pageOrientation !== 'mixed' && (
          <style>
            {pageOrientation === 'landscape'
              ? `@page { size: 297mm 210mm !important; margin: ${pageMargin} !important; }`
              : `@page { size: 210mm 297mm !important; margin: ${pageMargin} !important; }`}
          </style>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}

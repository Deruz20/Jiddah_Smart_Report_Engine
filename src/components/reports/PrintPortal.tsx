'use client'

/**
 * PRINT PORTAL — Server-Side Print Output
 *
 * Renders all printable report containers into a hidden #print-portal div.
 * On @media print, ONLY #print-portal is visible (see print-system.css).
 */

import React from 'react'

interface PrintPortalProps {
  children: React.ReactNode
  pageOrientation?: 'portrait' | 'landscape' | 'mixed'
}

export function PrintPortal({ children, pageOrientation = 'portrait' }: PrintPortalProps) {
  return (
    <div id="print-portal" aria-hidden="true" inert={true}>
      {pageOrientation !== 'mixed' && (
        <style>
          {pageOrientation === 'landscape'
            ? `@page { size: 297mm 210mm !important; margin: 0mm !important; }`
            : `@page { size: 210mm 297mm !important; margin: 0mm !important; }`}
        </style>
      )}
      {children}
    </div>
  )
}

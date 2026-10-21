'use client'

/**
 * PRINT PORTAL — Server-Side Print Output
 *
 * Renders all printable report containers into a hidden #print-portal div.
 * On @media print, ONLY #print-portal is visible (see print-system.css).
 *
 * This complete isolation means:
 * - Screen preview can use transforms/scaling without affecting print
 * - Print always renders true A4 dimensions (no scaling artifacts)
 * - Template authors never touch print CSS — it just works
 *
 * Usage: Mount in ReportGeneratorClient, pass in the reports to print.
 */

import React from 'react'

interface PrintPortalProps {
  children: React.ReactNode
}

export function PrintPortal({ children }: PrintPortalProps) {
  return (
    <div id="print-portal" aria-hidden="true" inert={true}>
      {children}
    </div>
  )
}


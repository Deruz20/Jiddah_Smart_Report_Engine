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

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface PrintPortalProps {
  children: React.ReactNode
}

export function PrintPortal({ children }: PrintPortalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Find or create the #print-portal div attached directly to document.body
    let portal = document.getElementById('print-portal') as HTMLDivElement | null
    if (!portal) {
      portal = document.createElement('div')
      portal.id = 'print-portal'
      document.body.appendChild(portal)
    }
    containerRef.current = portal
    setMounted(true)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [])

  if (!mounted || !containerRef.current) return null

  return createPortal(children, containerRef.current)
}

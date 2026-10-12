'use client'

/**
 * REPORT PREVIEW CELL — Screen-Only Scale Wrapper
 *
 * This is the ONLY component allowed to apply transform:scale.
 * The ReportContainer inside is never scaled — it always renders at true A4 px.
 *
 * Screen:  .report-preview-shell clips to scaledW × scaledH
 *           └── .report-scale-origin carries transform:scale(N)
 *                 └── .report-container — 794×1123 or 1123×794, always
 *
 * Print:   This entire component is hidden (print:hidden).
 *          PrintPortal renders .report-container directly at true A4 size.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { STABILIZED_REPORT_ORIENTATIONS } from '@/lib/report-constants'
import type { StabilizedReportType } from '@/types/report'

interface ReportPreviewCellProps {
  children: React.ReactNode
  reportType: StabilizedReportType
  /** User zoom factor from the toolbar */
  zoom?: number
  isActive?: boolean
  onClick?: () => void
  className?: string
}

export function ReportPreviewCell({
  children,
  reportType,
  zoom = 1,
  isActive = false,
  onClick,
  className = '',
}: ReportPreviewCellProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [fitScale, setFitScale] = useState(1)

  const dims = STABILIZED_REPORT_ORIENTATIONS[reportType]
  const reportW = dims.width
  const reportH = dims.height

  const updateFit = useCallback((availableW: number) => {
    const usable = availableW - 80
    const fit = Math.min(usable / reportW, 1)
    setFitScale(Math.max(fit, 0.2))
  }, [reportW])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    // Watch the nearest scroll container, not the shell itself
    const scrollEl = sentinel.closest('[data-canvas-scroll]') as HTMLElement | null
    const target = scrollEl ?? sentinel.parentElement ?? sentinel

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) updateFit(entry.contentRect.width)
    })
    observer.observe(target)
    updateFit(target.clientWidth)
    return () => observer.disconnect()
  }, [updateFit])

  const scale = Math.min(Math.max(fitScale * zoom, 0.2), 2)
  const scaledW = Math.round(reportW * scale)
  const scaledH = Math.round(reportH * scale)

  return (
    <div
      ref={sentinelRef}
      className={`report-preview-shell print:hidden ${className}`}
      data-active={isActive ? 'true' : 'false'}
      data-report-type={reportType}
      onClick={onClick}
      style={{
        width: scaledW,
        height: scaledH,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 4,
        background: '#fffbf0',
        boxShadow: isActive
          ? '0 0 0 3px #f97316, 0 16px 56px rgba(0,0,0,0.22)'
          : '0 8px 40px rgba(0,0,0,0.16)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Decorative watermark — screen only, zero layout impact */}
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.05, pointerEvents: 'none', zIndex: 0,
        }}
      >
        <img
          src="/school_budge.jpeg"
          alt=""
          style={{ width: '80%', maxHeight: '80%', objectFit: 'contain', filter: 'grayscale(1)' }}
        />
      </div>

      {/* Scale origin — THE ONLY node allowed to carry transform:scale */}
      <div
        className="report-scale-origin"
        style={{
          position: 'absolute', top: 0, left: 0,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

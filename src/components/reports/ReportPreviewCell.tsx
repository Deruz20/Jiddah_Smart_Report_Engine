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
  /** Number of columns when in Grid View (2-up) */
  columns?: number
  /** Direct scale factor passed from parent container to eliminate per-cell ResizeObserver lag */
  scale?: number
  isActive?: boolean
  onClick?: () => void
  className?: string
}

function ReportPreviewCellComponent({
  children,
  reportType,
  zoom = 1,
  columns = 1,
  scale: externalScale,
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
    const padding = availableW < 640 ? 24 : 64
    const colGap = columns > 1 && availableW >= 1280 ? (columns - 1) * 24 : 0
    const effectiveCols = columns > 1 && availableW >= 1280 ? columns : 1
    const colW = Math.floor((availableW - padding - colGap) / effectiveCols)
    const usable = Math.max(colW, 220)
    const fit = Math.min(usable / reportW, 1)
    setFitScale(Math.max(fit, 0.2))
  }, [reportW, columns])

  useEffect(() => {
    if (externalScale !== undefined) return
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
  }, [updateFit, externalScale])

  const scale = externalScale !== undefined
    ? externalScale
    : Math.min(Math.max(fitScale * zoom, 0.2), 2)
  const scaledW = Math.round(reportW * scale)
  const scaledH = Math.round(reportH * scale)

  return (
    <div
      ref={sentinelRef}
      className={`report-preview-shell print:hidden bg-white text-stone-900 shadow-[0_12px_36px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.65)] ${className}`}
      data-active={isActive ? 'true' : 'false'}
      data-report-type={reportType}
      onClick={onClick}
      style={{
        width: scaledW,
        height: scaledH,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 6,
        background: '#FFFFFF',
        colorScheme: 'light',
        color: '#0F172A',
        boxShadow: isActive
          ? '0 0 0 3px #0D5C3A, 0 16px 48px rgba(0,0,0,0.35)'
          : undefined,
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'box-shadow 0.15s, transform 0.15s',
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
          src="/logo-512h.png"
          alt=""
          loading="lazy"
          decoding="async"
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

export const ReportPreviewCell = React.memo(ReportPreviewCellComponent)

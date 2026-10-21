/**
 * SHARED REPORT CONTAINER
 *
 * Universal wrapper for all stabilized report components.
 * Centralized dimension and print context management.
 *
 * CONSTRAINTS:
 * - All dimensions from STABILIZED_REPORT_ORIENTATIONS (canonical mapping)
 * - All types from report.ts
 * - px units only (no mm, vh, in, cm)
 * - No inline dimension hardcoding
 * - Stable data attributes for testing
 * - TheologyMOTReport type-safe rejection at compile time
 * - Single source of truth: reportType determines dimensions
 */

import React from 'react'
import { STABILIZED_REPORT_ORIENTATIONS } from '@/lib/report-constants'
import { getFontVariables } from '@/lib/fonts'
import { getThemeColors } from '@/lib/themes'
import type { ReportContainerProps } from '@/types/report'

/**
 * ReportContainer wraps all stabilized A4 report components.
 *
 * Dimensions are derived ONLY from reportType. This ensures:
 * - No mismatched orientation/dimensions combinations
 * - Single source of truth (STABILIZED_REPORT_ORIENTATIONS)
 * - Type-safe enforcement (StabilizedReportType excludes TheologyMOTReport)
 *
 * @param children - Report content (tables, sections, etc.)
 * @param reportType - One of 6 stabilized report types (canonically mapped to A4 dimensions)
 * @param className - Optional additional CSS classes
 */
export const ReportContainer: React.FC<ReportContainerProps> = ({
  children,
  reportType,
  className = '',
  primaryFont,
  arabicFont,
  themePreset,
  themeColor,
}) => {
  // Derive dimensions ONLY from canonical mapping
  // This is the single source of truth for each report's dimensions
  const dimensions = STABILIZED_REPORT_ORIENTATIONS[reportType]
  const pageOrientation = dimensions.pageOrientation
  const theme = getThemeColors(themePreset)
  const fontVars = getFontVariables(primaryFont, arabicFont)

  // Inline styles with exact dimensions from constants
  const containerStyle: React.CSSProperties & Record<string, any> = {
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    position: 'relative',
    boxSizing: 'border-box',
    margin: 0,
    padding: 0,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    flexGrow: 0,
    '--report-primary-color': themeColor || theme.primary,
    '--report-secondary-color': theme.secondary,
    '--report-border-color': theme.border,
  }

  return (
    <div
      role="report"
      data-report-type={reportType}
      data-report-orientation={pageOrientation}
      data-theme-preset={themePreset || 'default'}
      data-primary-font={primaryFont || 'default'}
      style={containerStyle}
      className={`report-container ${fontVars} ${className}`}
    >
      {children}
    </div>
  )
}

export default ReportContainer

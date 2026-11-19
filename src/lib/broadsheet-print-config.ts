export type BroadsheetCurriculum = 'secular' | 'theology'
export type BroadsheetFontScale = 'compact' | 'readable' | 'standard' | 'large' | 'xlarge'
export type BroadsheetDensity = 'tight' | 'comfortable' | 'spacious'
export type BroadsheetOrientation = 'landscape' | 'portrait'
export type BroadsheetHeaderStyle = 'official' | 'compact' | 'none'
export type BroadsheetFrameStyle = 'classic' | 'clean'
export type BroadsheetColorTheme = 'emerald' | 'monochrome'
export type BroadsheetTableStyle = 'double_border' | 'clean_grid' | 'zebra_banded' | 'toner_saver'
export type BroadsheetRowScope = 'all' | 'filtered' | 'top_10' | 'top_20'
export type BroadsheetSortBy = 'rank' | 'name' | 'aggregate'
export type BroadsheetSubjectDisplayMode = 'split' | 'combined' | 'marks_only'

export interface BroadsheetPrintConfig {
  fontScale: BroadsheetFontScale
  /** Optional explicit font-size stepper override (12px–26px). Null/undefined follows preset. */
  fontSizeBase?: number | null
  density: BroadsheetDensity
  orientation: BroadsheetOrientation
  colorTheme: BroadsheetColorTheme
  tableStyle: BroadsheetTableStyle
  zebraStripes: boolean

  showSerialNumber: boolean
  showAdmissionId: boolean
  showGender: boolean
  showBilingualNames: boolean
  showSubjectGrades: boolean
  secularSubjectMode: BroadsheetSubjectDisplayMode
  hiddenSubjectIds: string[]
  showTotal: boolean
  showAverage: boolean
  showAggregate: boolean
  showDivision: boolean
  showRank: boolean

  rowScope: BroadsheetRowScope
  sortBy: BroadsheetSortBy
  useArabicNumerals: boolean

  headerStyle: BroadsheetHeaderStyle
  frameStyle: BroadsheetFrameStyle
  showMetadataStrip: boolean
  showSummaryFooter: boolean
  showCohortSummaryBox: boolean
  showSignatures: boolean
  showStamp: boolean
  /** Session-only overrides (NEVER persisted to localStorage) */
  stampDateOverride?: string
  customTitle: string
  customFooterNote: string
  signatory1: string
  signatory2: string
  signatory3: string
}

export function getDefaultBroadsheetPrintConfig(curriculum: BroadsheetCurriculum): BroadsheetPrintConfig {
  if (curriculum === 'theology') {
    return {
      fontScale: 'readable',
      fontSizeBase: null,
      density: 'comfortable',
      orientation: 'landscape',
      colorTheme: 'emerald',
      tableStyle: 'double_border',
      zebraStripes: true,

      showSerialNumber: true,
      showAdmissionId: false,
      showGender: false,
      showBilingualNames: false,
      showSubjectGrades: false,
      secularSubjectMode: 'marks_only',
      hiddenSubjectIds: [],
      showTotal: true,
      showAverage: false,
      showAggregate: true,
      showDivision: true,
      showRank: true,

      rowScope: 'all',
      sortBy: 'rank',
      useArabicNumerals: true,

      headerStyle: 'official',
      frameStyle: 'classic',
      showMetadataStrip: true,
      showSummaryFooter: true,
      showCohortSummaryBox: true,
      showSignatures: true,
      showStamp: true,
      stampDateOverride: '',
      customTitle: '',
      customFooterNote: '',
      signatory1: 'مُعدّ الكشف: معلم الفصل',
      signatory2: 'مُراجع: مشرف الدراسات (DOS)',
      signatory3: 'معتمد: مدير المدرسة والختم الرسمي',
    }
  }

  return {
    fontScale: 'readable',
    fontSizeBase: null,
    density: 'comfortable',
    orientation: 'landscape',
    colorTheme: 'emerald',
    tableStyle: 'clean_grid',
    zebraStripes: true,

    showSerialNumber: true,
    showAdmissionId: false,
    showGender: false,
    showBilingualNames: false,
    showSubjectGrades: true,
    secularSubjectMode: 'combined',
    hiddenSubjectIds: [],
    showTotal: true,
    showAverage: false,
    showAggregate: true,
    showDivision: true,
    showRank: true,

    rowScope: 'all',
    sortBy: 'rank',
    useArabicNumerals: false,

    headerStyle: 'official',
    frameStyle: 'clean',
    showMetadataStrip: true,
    showSummaryFooter: true,
    showCohortSummaryBox: true,
    showSignatures: true,
    showStamp: true,
    stampDateOverride: '',
    customTitle: '',
    customFooterNote: '',
    signatory1: 'Compiled By: Class Teacher',
    signatory2: 'Reviewed By: Director of Studies (DOS)',
    signatory3: 'Approved By: Head Teacher & Official Stamp',
  }
}

export interface BroadsheetTypographyTokens {
  bodyFontPx: number
  studentNameFontPx: number
  headerFontPx: number
  subHeaderFontPx: number
  titleFontPx: number
  subtitleFontPx: number
  badgeFontPx: number
  metaFontPx: number
  summaryFontPx: number
  footerFontPx: number
  cellPadding: string
  headerPadding: string
  lineHeight: number
}

export function getPresetFontSizePx(
  fontScale: BroadsheetFontScale,
  curriculum: BroadsheetCurriculum = 'secular'
): number {
  const normalized = fontScale === 'standard' ? 'readable' : fontScale
  if (curriculum === 'theology') {
    if (normalized === 'compact') return 14
    if (normalized === 'large') return 20
    if (normalized === 'xlarge') return 23
    return 17
  }
  if (normalized === 'compact') return 10.5
  if (normalized === 'large') return 14
  if (normalized === 'xlarge') return 16
  return 12
}

export function getBroadsheetTypographyTokens(
  fontScale: BroadsheetFontScale,
  density: BroadsheetDensity,
  curriculum: BroadsheetCurriculum = 'secular',
  fontSizeBase?: number | null
): BroadsheetTypographyTokens {
  const paddingMap: Record<BroadsheetDensity, { cell: string; header: string }> = {
    tight: { cell: '4px 6px', header: '5px 6px' },
    comfortable: { cell: '6px 8px', header: '7px 8px' },
    spacious: { cell: '9px 10px', header: '9px 10px' },
  }
  const pad = paddingMap[density] || paddingMap.comfortable

  if (typeof fontSizeBase === 'number' && Number.isFinite(fontSizeBase) && fontSizeBase >= 12 && fontSizeBase <= 26) {
    const body = Math.round(fontSizeBase)
    const studentName = Math.min(27, body + 1)
    return {
      bodyFontPx: body,
      studentNameFontPx: studentName,
      headerFontPx: Math.max(11, Math.round(body * 0.94)),
      subHeaderFontPx: Math.max(10, Math.round(body * 0.8)),
      titleFontPx: Math.max(18, Math.round(body + 5)),
      subtitleFontPx: Math.max(14, Math.round(body + 1)),
      badgeFontPx: Math.max(11, Math.round(body * 0.88)),
      metaFontPx: Math.max(11, Math.round(body * 0.86)),
      summaryFontPx: Math.max(12, Math.round(body * 0.94)),
      footerFontPx: Math.max(11, Math.round(body * 0.82)),
      cellPadding: pad.cell,
      headerPadding: pad.header,
      lineHeight: body >= 20 ? 1.42 : 1.38,
    }
  }

  const normalizedScale = fontScale === 'standard' ? 'readable' : fontScale

  // Arabic script renders ~25% smaller visually than Latin; apply explicit Arabic readability scale
  if (curriculum === 'theology') {
    if (normalizedScale === 'compact') {
      return {
        bodyFontPx: 14,
        studentNameFontPx: 15,
        headerFontPx: 14,
        subHeaderFontPx: 12,
        titleFontPx: 20,
        subtitleFontPx: 16,
        badgeFontPx: 13,
        metaFontPx: 13,
        summaryFontPx: 14,
        footerFontPx: 13,
        cellPadding: pad.cell,
        headerPadding: pad.header,
        lineHeight: 1.35,
      }
    }
    if (normalizedScale === 'large') {
      return {
        bodyFontPx: 20,
        studentNameFontPx: 21,
        headerFontPx: 18.5,
        subHeaderFontPx: 15,
        titleFontPx: 24,
        subtitleFontPx: 20,
        badgeFontPx: 17.5,
        metaFontPx: 16,
        summaryFontPx: 18.5,
        footerFontPx: 15.5,
        cellPadding: pad.cell,
        headerPadding: pad.header,
        lineHeight: 1.42,
      }
    }
    if (normalizedScale === 'xlarge') {
      return {
        bodyFontPx: 23,
        studentNameFontPx: 24,
        headerFontPx: 21,
        subHeaderFontPx: 17,
        titleFontPx: 26,
        subtitleFontPx: 22,
        badgeFontPx: 19.5,
        metaFontPx: 18,
        summaryFontPx: 21,
        footerFontPx: 17,
        cellPadding: pad.cell,
        headerPadding: pad.header,
        lineHeight: 1.45,
      }
    }
    // New Theology Standard Default: 17px cell / 18px bold student name
    return {
      bodyFontPx: 17,
      studentNameFontPx: 18,
      headerFontPx: 16,
      subHeaderFontPx: 13.5,
      titleFontPx: 22,
      subtitleFontPx: 18,
      badgeFontPx: 15.5,
      metaFontPx: 14.5,
      summaryFontPx: 16,
      footerFontPx: 14,
      cellPadding: pad.cell,
      headerPadding: pad.header,
      lineHeight: 1.4,
    }
  }

  if (normalizedScale === 'xlarge') {
    return {
      bodyFontPx: 16,
      studentNameFontPx: 17,
      headerFontPx: 15,
      subHeaderFontPx: 12.5,
      titleFontPx: 21,
      subtitleFontPx: 17,
      badgeFontPx: 14,
      metaFontPx: 13.5,
      summaryFontPx: 14.5,
      footerFontPx: 13,
      cellPadding: pad.cell,
      headerPadding: pad.header,
      lineHeight: 1.42,
    }
  }

  if (normalizedScale === 'large') {
    return {
      bodyFontPx: 14,
      studentNameFontPx: 15,
      headerFontPx: 13,
      subHeaderFontPx: 11,
      titleFontPx: 19,
      subtitleFontPx: 15,
      badgeFontPx: 12.5,
      metaFontPx: 12.5,
      summaryFontPx: 13,
      footerFontPx: 12,
      cellPadding: pad.cell,
      headerPadding: pad.header,
      lineHeight: 1.4,
    }
  }

  if (normalizedScale === 'compact') {
    return {
      bodyFontPx: 10.5,
      studentNameFontPx: 11.5,
      headerFontPx: 10.5,
      subHeaderFontPx: 9,
      titleFontPx: 15,
      subtitleFontPx: 12,
      badgeFontPx: 9.5,
      metaFontPx: 10.5,
      summaryFontPx: 10,
      footerFontPx: 10,
      cellPadding: pad.cell,
      headerPadding: pad.header,
      lineHeight: 1.3,
    }
  }

  // 'readable' default — crystal clear 12px (9pt) print body
  return {
    bodyFontPx: 12,
    studentNameFontPx: 13,
    headerFontPx: 11.5,
    subHeaderFontPx: 10,
    titleFontPx: 17,
    subtitleFontPx: 13.5,
    badgeFontPx: 11,
    metaFontPx: 11.5,
    summaryFontPx: 11.5,
    footerFontPx: 11,
    cellPadding: pad.cell,
    headerPadding: pad.header,
    lineHeight: 1.35,
  }
}

export function getBroadsheetStorageKey(curriculum: BroadsheetCurriculum): string {
  return `jiddah:hub_print_config_v2:${curriculum}`
}

export function stripDynamicBroadsheetOverrides(
  config: BroadsheetPrintConfig
): Omit<BroadsheetPrintConfig, 'stampDateOverride' | 'customTitle' | 'customFooterNote'> {
  const { stampDateOverride: _sd, customTitle: _ct, customFooterNote: _cf, ...persistedLayout } = config
  return persistedLayout
}

export function loadBroadsheetPrintConfig(curriculum: BroadsheetCurriculum): BroadsheetPrintConfig {
  const defaults = getDefaultBroadsheetPrintConfig(curriculum)
  if (typeof window === 'undefined') return defaults
  try {
    const raw = window.localStorage.getItem(getBroadsheetStorageKey(curriculum))
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaults
    return {
      ...defaults,
      ...parsed,
      // Dynamic global/session fields are NEVER restored from stale localStorage
      stampDateOverride: '',
      customTitle: '',
      customFooterNote: '',
      // Enforce raw subject marks only for Theology broadsheets regardless of older saved preferences
      showSubjectGrades:
        curriculum === 'theology'
          ? false
          : typeof parsed.showSubjectGrades === 'boolean'
            ? parsed.showSubjectGrades
            : defaults.showSubjectGrades,
      hiddenSubjectIds: Array.isArray(parsed.hiddenSubjectIds) ? parsed.hiddenSubjectIds : [],
    }
  } catch {
    return defaults
  }
}

export function saveBroadsheetPrintConfig(
  curriculum: BroadsheetCurriculum,
  config: BroadsheetPrintConfig
): void {
  if (typeof window === 'undefined') return
  try {
    const persistable = stripDynamicBroadsheetOverrides(config)
    window.localStorage.setItem(getBroadsheetStorageKey(curriculum), JSON.stringify(persistable))
  } catch {
    // Ignore private-browsing quota issues
  }
}

export interface BroadsheetStudentLike {
  id: string
  name: string
  arabic_name?: string
  gender?: string
  admission_number?: string
  total?: number | null
  aggregate?: number | null
  division?: string | null
  position?: number | string
  isCandidateExcluded?: boolean
  subjectsSat?: number
  subjectScores: Record<string, number | null | undefined>
  subjectGrades: Record<string, string | null | undefined>
}

export function prepareBroadsheetStudents<T extends BroadsheetStudentLike>(
  allStudents: T[],
  filteredStudents: T[],
  config: BroadsheetPrintConfig
): T[] {
  let base = config.rowScope === 'filtered' ? [...filteredStudents] : [...allStudents]

  const hasAnyMark = (st: T) =>
    (st.subjectsSat ?? 0) > 0 ||
    Object.values(st.subjectScores || {}).some((val) => typeof val === 'number')

  const getRankTier = (st: T): number => {
    if (st.isCandidateExcluded) return 3
    if (typeof st.position === 'number') return 0
    if (hasAnyMark(st)) return 1
    return 2
  }

  if (config.sortBy === 'name') {
    base.sort((a, b) => (a.arabic_name || a.name).localeCompare(b.arabic_name || b.name))
  } else if (config.sortBy === 'aggregate') {
    base.sort((a, b) => {
      const aggA = a.aggregate ?? 999
      const aggB = b.aggregate ?? 999
      if (aggA !== aggB) return aggA - aggB
      return (b.total ?? -1) - (a.total ?? -1)
    })
  } else {
    // 'rank' keeps 4-tier order: complete ranked -> partial with marks -> 0 marks -> excluded
    base.sort((a, b) => {
      const tierDiff = getRankTier(a) - getRankTier(b)
      if (tierDiff !== 0) return tierDiff
      if (typeof a.position === 'number' && typeof b.position === 'number' && a.position !== b.position) {
        return a.position - b.position
      }
      const totalDiff = (b.total ?? -1) - (a.total ?? -1)
      if (totalDiff !== 0) return totalDiff
      return (a.arabic_name || a.name).localeCompare(b.arabic_name || b.name)
    })
  }

  if (config.rowScope === 'top_10') return base.slice(0, 10)
  if (config.rowScope === 'top_20') return base.slice(0, 20)
  return base
}

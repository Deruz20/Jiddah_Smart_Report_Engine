export type BroadsheetCurriculum = 'secular' | 'theology'
export type BroadsheetFontScale = 'compact' | 'readable' | 'large'
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
      customTitle: '',
      customFooterNote: '',
      signatory1: 'مُعدّ الكشف: معلم الفصل',
      signatory2: 'مُراجع: مشرف الدراسات (DOS)',
      signatory3: 'معتمد: مدير المدرسة والختم الرسمي',
    }
  }

  return {
    fontScale: 'readable',
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
    customTitle: '',
    customFooterNote: '',
    signatory1: 'Compiled By: Class Teacher',
    signatory2: 'Reviewed By: Director of Studies (DOS)',
    signatory3: 'Approved By: Head Teacher & Official Stamp',
  }
}

export interface BroadsheetTypographyTokens {
  bodyFontPx: number
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

export function getBroadsheetTypographyTokens(
  fontScale: BroadsheetFontScale,
  density: BroadsheetDensity
): BroadsheetTypographyTokens {
  const paddingMap: Record<BroadsheetDensity, { cell: string; header: string }> = {
    tight: { cell: '4px 6px', header: '5px 6px' },
    comfortable: { cell: '6px 8px', header: '7px 8px' },
    spacious: { cell: '9px 10px', header: '9px 10px' },
  }
  const pad = paddingMap[density] || paddingMap.comfortable

  if (fontScale === 'large') {
    return {
      bodyFontPx: 14,
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

  if (fontScale === 'compact') {
    return {
      bodyFontPx: 10.5,
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
    window.localStorage.setItem(getBroadsheetStorageKey(curriculum), JSON.stringify(config))
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
  subjectScores: Record<string, number | null | undefined>
  subjectGrades: Record<string, string | null | undefined>
}

export function prepareBroadsheetStudents<T extends BroadsheetStudentLike>(
  allStudents: T[],
  filteredStudents: T[],
  config: BroadsheetPrintConfig
): T[] {
  let base = config.rowScope === 'filtered' ? [...filteredStudents] : [...allStudents]

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
    // 'rank' keeps standard competition ranking order; ranked items before unranked
    base.sort((a, b) => {
      const rA = typeof a.position === 'number' ? a.position : 999999
      const rB = typeof b.position === 'number' ? b.position : 999999
      if (rA !== rB) return rA - rB
      return (b.total ?? -1) - (a.total ?? -1)
    })
  }

  if (config.rowScope === 'top_10') return base.slice(0, 10)
  if (config.rowScope === 'top_20') return base.slice(0, 20)
  return base
}

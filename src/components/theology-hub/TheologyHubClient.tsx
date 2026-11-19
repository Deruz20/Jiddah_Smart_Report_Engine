'use client'

import React, { useState, useEffect, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ScrollText,
  BookOpen,
  Award,
  Printer,
  FileSpreadsheet,
  Search,
  Trophy,
  Medal,
  BarChart3,
  Users,
  TrendingUp,
  Percent,
  Sparkles,
  ExternalLink,
  ArrowLeft,
  Download,
  Sliders,
  Eye,
  EyeOff,
  Check,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { TheologyHubEmptyState } from './TheologyHubEmptyState'
import { PrintPortal } from '@/components/reports/PrintPortal'
import { CustomPillSelect } from '@/components/ui/custom-pill-select'
import { JiddahLoader } from '@/components/ui/jiddah-loader'
import { BroadsheetPrintDocument } from '@/components/hubs/BroadsheetPrintDocument'
import { BroadsheetPrintStudioModal } from '@/components/hubs/BroadsheetPrintStudioModal'
import { HubDetailedReportView } from '@/components/hubs/HubDetailedReportView'
import { DetailedReportPrintDocument } from '@/components/hubs/DetailedReportPrintDocument'
import {
  buildDetailedReportCsv,
  clampSupportThreshold,
  type DetailedReportResult,
  type DetailedReportScope,
} from '@/lib/hub-detailed-report'
import {
  type BroadsheetPrintConfig,
  prepareBroadsheetStudents,
} from '@/lib/broadsheet-print-config'
import {
  useHubPrintConfig,
  useGlobalSchoolSettingsSync,
} from '@/lib/studio-config-store'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { downloadCSV, escapeCSV } from '@/utils/csvExport'
import { computeStandardRankings } from '@/lib/ranking'
import { computeHubCohortMetrics } from '@/lib/hub-cohort-engine'
import {
  mapClassesToSections,
  normalizeHubSectionsConfig,
  type HubSectionId,
} from '@/lib/academic-sections'
import {
  HubCandidateNaCard,
  HubClassBreakdownTable,
  HubDataQualityBanners,
  HubMissingMarksPanel,
} from '@/components/hubs/HubCohortPanels'
import {
  calculateTheologyAggregateFromMarks,
  getTheologyDivision,
} from '@/lib/grading'

/** Converts any Western digit string/number to Eastern Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) */
export function toArabicNumerals(val: number | string | null | undefined): string {
  if (val == null || val === '' || (typeof val === 'number' && isNaN(val))) return '—'
  return String(val).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}

type TermData = {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current: boolean
}

type TheologyClassData = {
  id: string
  class_name_arabic: string
  class_name_english: string
  level: string
}

const RemarkBadge = memo(({ division, score }: { division?: string | null; score?: number | null }) => {
  const resolved = (() => {
    if (division && division !== '-' && division !== '—') return division
    if (score == null || isNaN(Number(score))) return null
    const s = Number(score)
    if (s >= 85) return 'ممتاز'
    if (s >= 75) return 'جيد جداً'
    if (s >= 65) return 'جيد'
    if (s >= 50) return 'مقبول'
    return 'راسب'
  })()

  if (!resolved) {
    return <span className="text-stone-300 dark:text-stone-700 font-bold">-</span>
  }
  if (resolved === 'ممتاز') {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40 print:border-none print:bg-transparent print:text-black">
        ممتاز
      </span>
    )
  }
  if (resolved === 'جيد جداً' || resolved === 'جيد جدا') {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-300/40 print:border-none print:bg-transparent print:text-black">
        جيد جداً
      </span>
    )
  }
  if (resolved === 'جيد') {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40 print:border-none print:bg-transparent print:text-black">
        جيد
      </span>
    )
  }
  if (resolved === 'مقبول') {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300/40 print:border-none print:bg-transparent print:text-black">
        مقبول
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/40 print:border-none print:bg-transparent print:text-black">
      {resolved}
    </span>
  )
})
RemarkBadge.displayName = 'RemarkBadge'

export default function TheologyHubClient({
  terms,
  theologyClasses,
  canViewSchoolWideScope = false,
}: {
  terms: TermData[]
  theologyClasses: TheologyClassData[]
  canViewSchoolWideScope?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialSectionParam = searchParams.get('section_id')
  const validInitialSection: HubSectionId | '' =
    initialSectionParam === 'nursery' ||
      initialSectionParam === 'lower_primary' ||
      initialSectionParam === 'upper_primary'
      ? initialSectionParam
      : ''

  const initialScopeParam = searchParams.get('scope')
  const initialScope: DetailedReportScope =
    initialScopeParam === 'school' && canViewSchoolWideScope
      ? 'school'
      : initialScopeParam === 'section' && validInitialSection
        ? 'section'
        : initialScopeParam === 'class'
          ? 'class'
          : validInitialSection
            ? 'section'
            : canViewSchoolWideScope && searchParams.get('tab') === 'detailed_report' && !searchParams.get('class_id')
              ? 'school'
              : 'class'

  const [activeTermId, setActiveTermId] = useState<string>(
    searchParams.get('term_id') || terms.find((t) => t.is_current)?.id || terms[0]?.id || ''
  )
  const [activeSectionId, setActiveSectionId] = useState<HubSectionId | ''>(validInitialSection)
  const [activeClassId, setActiveClassId] = useState<string>(
    searchParams.get('class_id') ||
    (validInitialSection || initialScope === 'school' ? '' : theologyClasses[0]?.id || '')
  )
  const [activeLevel, setActiveLevel] = useState<string>(
    searchParams.get('level') || (theologyClasses[0]?.level != null ? String(theologyClasses[0].level) : 'raudha')
  )
  const [activeTab, setActiveTab] = useState<'assessment' | 'analysis' | 'top_students' | 'detailed_report'>(
    (searchParams.get('tab') as any) || 'assessment'
  )
  const [examPhase, setExamPhase] = useState<'bot' | 'mot' | 'eot'>(
    (searchParams.get('exam_phase') as any) || 'eot'
  )
  const [reportScope, setReportScope] = useState<DetailedReportScope>(initialScope)
  const [supportThreshold, setSupportThreshold] = useState<number>(
    clampSupportThreshold(searchParams.get('support_threshold'))
  )
  const [detailedReport, setDetailedReport] = useState<DetailedReportResult | null>(null)
  const [detailedLoading, setDetailedLoading] = useState(false)
  const [detailedError, setDetailedError] = useState<string | null>(null)
  const [detailedReloadNonce, setDetailedReloadNonce] = useState(0)
  const [detailedAvailableScopes, setDetailedAvailableScopes] = useState<{
    school: boolean
    sections: HubSectionId[]
    classCount: number
  }>({
    school: canViewSchoolWideScope,
    sections: canViewSchoolWideScope ? ['nursery', 'lower_primary', 'upper_primary'] : [],
    classCount: theologyClasses.length,
  })
  const [printMode, setPrintMode] = useState<'broadsheet' | 'detailed_report'>('broadsheet')

  const [searchQuery, setSearchQuery] = useState('')
  const [divisionFilter, setDivisionFilter] = useState<string>('all')
  const [showExcludedCandidates, setShowExcludedCandidates] = useState(false)

  // Hierarchical print state: persisted UI layout prefs (Zustand `jiddah-print-prefs`) + dynamic global defaults
  const {
    config: printConfig,
    setConfig: handleChangePrintConfig,
    resetToGlobalDefaults,
    globalDefaults,
    hydrateFromSchoolSettings,
  } = useHubPrintConfig('theology')
  const [printStudioOpen, setPrintStudioOpen] = useState(false)
  const showEnglishNames = printConfig.showBilingualNames

  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  useGlobalSchoolSettingsSync(() => {
    setReloadNonce((n) => n + 1)
  })
  const [, setIsPrinting] = useState(false)
  const [data, setData] = useState<{
    enrollments: any[]
    marks: any[]
    subjects: any[]
    classes?: TheologyClassData[]
    termMeta?: TermData | null
    unmappedClasses?: any[]
    gradingConfig?: {
      theology_grading_scale?: any[]
      theology_division_boundaries?: any[]
      theology_remarks?: any[]
      hub_sections?: any[]
      candidate_class_rules?: any[]
    }
  } | null>(null)

  const effectiveClasses = useMemo(
    () => (data?.classes && data.classes.length > 0 ? data.classes : theologyClasses),
    [data?.classes, theologyClasses]
  )

  const sectionMapping = useMemo(
    () =>
      mapClassesToSections(
        effectiveClasses,
        'theology',
        data?.gradingConfig?.hub_sections,
        data?.gradingConfig?.candidate_class_rules
      ),
    [effectiveClasses, data?.gradingConfig?.hub_sections, data?.gradingConfig?.candidate_class_rules]
  )

  const configuredSections = useMemo(
    () => normalizeHubSectionsConfig(data?.gradingConfig?.hub_sections),
    [data?.gradingConfig?.hub_sections]
  )

  const isSectionMode = Boolean(activeSectionId && !activeClassId)

  const activeSectionObj = useMemo(
    () => configuredSections.find((s) => s.id === activeSectionId) || null,
    [configuredSections, activeSectionId]
  )

  const activeTerm = useMemo(() => terms.find((t) => t.id === activeTermId), [terms, activeTermId])
  const activeClass = useMemo(
    () => effectiveClasses.find((c) => c.id === activeClassId),
    [effectiveClasses, activeClassId]
  )

  const termOptions = useMemo(
    () =>
      terms.map((t) => ({
        value: t.id,
        label: `${t.label} (${t.academic_year})`,
      })),
    [terms]
  )

  const sectionOptions = useMemo(
    () => [
      { value: '', label: 'All Sections (Class)' },
      ...configuredSections.map((sec) => ({
        value: sec.id,
        label: sec.label,
        count: sectionMapping.bySection[sec.id].length,
      })),
    ],
    [configuredSections, sectionMapping.bySection]
  )

  const classOptions = useMemo(() => {
    if (activeSectionId) {
      const sectionClasses = sectionMapping.bySection[activeSectionId] || []
      return [
        { value: '', label: `جميع الفصول (${toArabicNumerals(sectionClasses.length)})` },
        ...sectionClasses.map((t) => ({
          value: t.id,
          label: t.class_name_arabic || t.class_name_english,
        })),
      ]
    }
    return [
      { value: '', label: '-- اختر الصف --' },
      ...effectiveClasses.map((t) => ({
        value: t.id,
        label: t.class_name_arabic || t.class_name_english,
      })),
    ]
  }, [activeSectionId, activeSectionObj, sectionMapping.bySection, effectiveClasses])

  const handleSelectSection = (val: string) => {
    const nextSec = (val || '') as HubSectionId | ''
    setActiveSectionId(nextSec)
    if (nextSec) {
      setActiveClassId('')
      setReportScope('section')
    } else if (!activeClassId && effectiveClasses[0]?.id) {
      setActiveClassId(effectiveClasses[0].id)
      setReportScope('class')
    }
  }

  const handleSelectClass = (val: string) => {
    setActiveClassId(val)
    if (val) {
      setReportScope('class')
    } else if (activeSectionId) {
      setReportScope('section')
    }
    if (val && activeSectionId) {
      const clsSec = sectionMapping.classToSection[val]
      if (clsSec !== activeSectionId) {
        setActiveSectionId('')
      }
    }
  }

  const handleTabChange = (nextTab: 'assessment' | 'analysis' | 'top_students' | 'detailed_report') => {
    setActiveTab(nextTab)
    if (nextTab !== 'detailed_report' && !activeClassId && !activeSectionId && effectiveClasses[0]?.id) {
      setActiveClassId(effectiveClasses[0].id)
    }
  }

  const handleChangeReportScope = (
    nextScope: DetailedReportScope,
    nextSectionId?: HubSectionId | '',
    nextClassId?: string
  ) => {
    setReportScope(nextScope)
    if (nextScope === 'school') {
      setActiveSectionId('')
      setActiveClassId('')
    } else if (nextScope === 'section') {
      const resolvedSec =
        nextSectionId ||
        activeSectionId ||
        detailedAvailableScopes.sections[0] ||
        'upper_primary'
      setActiveSectionId(resolvedSec)
      setActiveClassId('')
    } else {
      const resolvedCls = nextClassId || activeClassId || effectiveClasses[0]?.id || ''
      setActiveClassId(resolvedCls)
      setActiveSectionId('')
    }
  }

  const handleChangeReportYear = (nextYear: number) => {
    const inYear = terms.filter((t) => Number(t.academic_year) === Number(nextYear))
    const picked = inYear.find((t) => t.is_current) || inYear[0]
    if (picked?.id) {
      setActiveTermId(picked.id)
    }
  }

  // Fetch Detailed Report whenever Detailed Report tab is active
  useEffect(() => {
    if (activeTab !== 'detailed_report' || !activeTermId) return
    if (reportScope === 'class' && !activeClassId) return
    if (reportScope === 'section' && !activeSectionId) return

    const controller = new AbortController()
    const loadDetailed = async () => {
      setDetailedLoading(true)
      setDetailedError(null)
      try {
        const params = new URLSearchParams({
          curriculum: 'theology',
          scope: reportScope,
          term_id: activeTermId,
          exam_phase: examPhase,
          support_threshold: String(supportThreshold),
        })
        if (activeTerm?.academic_year) params.set('year', String(activeTerm.academic_year))
        if (reportScope === 'section' && activeSectionId) params.set('section_id', activeSectionId)
        if (reportScope === 'class' && activeClassId) params.set('class_id', activeClassId)

        const res = await fetch(`/api/hub-detailed-report?${params.toString()}`, {
          signal: controller.signal,
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(json?.error || `Failed to load detailed report (${res.status})`)
        }
        setDetailedReport(json.report || null)
        if (json.availableScopes) {
          setDetailedAvailableScopes(json.availableScopes)
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        setDetailedError(err?.message || 'Failed to load detailed report.')
      } finally {
        if (!controller.signal.aborted) {
          setDetailedLoading(false)
        }
      }
    }

    loadDetailed()
    return () => controller.abort()
  }, [
    activeTab,
    reportScope,
    activeSectionId,
    activeClassId,
    activeTermId,
    activeTerm?.academic_year,
    examPhase,
    detailedReloadNonce,
  ])

  // Fetch data cleanly
  useEffect(() => {
    if (!activeTermId || (!activeClassId && !activeSectionId)) return

    let cancelled = false
    const fetchData = async () => {
      setIsLoading(true)
      setFetchError(null)
      try {
        const queryParams = new URLSearchParams({ term_id: activeTermId })
        if (activeClassId) queryParams.set('class_id', activeClassId)
        else if (activeSectionId) queryParams.set('section_id', activeSectionId)
        if (activeLevel) queryParams.set('level', String(activeLevel))

        const res = await fetch(`/api/theology-hub?${queryParams.toString()}`)
        const ct = res.headers.get('content-type') || ''
        if (!res.ok || !ct.includes('application/json')) {
          const errText = await res.text()
          throw new Error(errText || 'Failed to fetch theology data')
        }
        const json = await res.json()
        if (!cancelled) {
          setData(json)
          if (json?.schoolSettings) {
            hydrateFromSchoolSettings(json.schoolSettings)
          }
        }
      } catch (err) {
        console.error('Theology Hub load error:', err)
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load theology data.'
          setFetchError(msg)
          toast.error('Failed to load theology data. Check database connections.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [activeTermId, activeClassId, activeSectionId, activeLevel, reloadNonce])

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (activeTermId) params.set('term_id', activeTermId)
    if (activeSectionId) params.set('section_id', activeSectionId)
    else params.delete('section_id')
    if (activeClassId) params.set('class_id', activeClassId)
    else params.delete('class_id')
    if (activeLevel) params.set('level', String(activeLevel))
    if (activeTab) params.set('tab', activeTab)
    if (examPhase) params.set('exam_phase', examPhase)
    if (activeTab === 'detailed_report') {
      params.set('scope', reportScope)
      params.set('support_threshold', String(supportThreshold))
    } else {
      params.delete('scope')
      params.delete('support_threshold')
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [activeTermId, activeSectionId, activeClassId, activeLevel, activeTab, examPhase, reportScope, supportThreshold, pathname, router, searchParams])

  // Update level when class changes
  useEffect(() => {
    if (activeClassId && activeTab === 'assessment') {
      const cls = effectiveClasses.find((c) => c.id === activeClassId)
      if (cls && String(cls.level) !== String(activeLevel)) {
        setActiveLevel(String(cls.level))
      }
    }
  }, [activeClassId, effectiveClasses, activeTab, activeLevel])

  // ----------------------------------------------------
  // Unified Cohort Metrics Engine (Class + Section + P.7 Term 3 EOT Guard)
  // ----------------------------------------------------
  const cohortMetrics = useMemo(() => {
    const scopeClasses = activeClassId
      ? effectiveClasses.filter((c) => c.id === activeClassId)
      : activeSectionId
        ? sectionMapping.bySection[activeSectionId] || []
        : []

    return computeHubCohortMetrics({
      curriculum: 'theology',
      mode: isSectionMode ? 'section' : 'class',
      sectionId: isSectionMode ? (activeSectionId as HubSectionId) : null,
      classes: scopeClasses,
      enrollments: data?.enrollments || [],
      marks: data?.marks || [],
      subjects: data?.subjects || [],
      examPhase,
      termNumber: data?.termMeta?.term_number ?? activeTerm?.term_number ?? null,
      termLabel: data?.termMeta?.label ?? activeTerm?.label ?? null,
      gradingConfig: data?.gradingConfig,
    })
  }, [
    data,
    activeClassId,
    activeSectionId,
    isSectionMode,
    effectiveClasses,
    sectionMapping.bySection,
    examPhase,
    activeTerm?.term_number,
    activeTerm?.label,
  ])

  const assessmentData = useMemo(
    () => ({
      orderedSubjects: cohortMetrics.orderedSubjects,
      students: cohortMetrics.students,
    }),
    [cohortMetrics]
  )

  const excludedCandidateRowsCount = useMemo(
    () => assessmentData.students.filter((st) => st.isCandidateExcluded).length,
    [assessmentData.students]
  )

  // Filtered students for search, theology grade filter, and candidate exclusion
  const filteredStudents = useMemo(() => {
    return assessmentData.students.filter((st) => {
      if (isSectionMode && !showExcludedCandidates && st.isCandidateExcluded) {
        return false
      }
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        st.name.toLowerCase().includes(q) ||
        st.className.toLowerCase().includes(q) ||
        (st.arabic_name && st.arabic_name.toLowerCase().includes(q)) ||
        (st.admission_number && st.admission_number.toLowerCase().includes(q))

      let matchesGrade = true
      if (divisionFilter !== 'all') {
        matchesGrade = st.division === divisionFilter
      }

      return matchesSearch && matchesGrade
    })
  }, [assessmentData.students, searchQuery, divisionFilter, isSectionMode, showExcludedCandidates])

  const broadsheetSummary = useMemo(
    () => (assessmentData.students.length > 0 && assessmentData.orderedSubjects.length > 0 ? cohortMetrics.summary : null),
    [assessmentData.students.length, assessmentData.orderedSubjects.length, cohortMetrics.summary]
  )

  const top10Data = cohortMetrics?.top10 ?? []

  const currentScopeLabel = isSectionMode
    ? `${activeSectionObj?.label_arabic || activeSectionObj?.label || activeSectionId}`
    : activeClass?.class_name_arabic || activeClass?.class_name_english || 'الصف'

  const printStudents = useMemo(
    () => prepareBroadsheetStudents(assessmentData.students, filteredStudents, printConfig),
    [assessmentData.students, filteredStudents, printConfig]
  )

  // ----------------------------------------------------
  // Actions: Print & Export
  // ----------------------------------------------------
  const handlePrintBroadsheet = () => {
    if (cohortMetrics.isSingleClassCandidateExcluded) {
      return toast.info('N/A — candidate class: P.7 has no Term 3 EOT.')
    }
    if (!assessmentData.students.length) {
      return toast.error('No student assessment data to print.')
    }
    setPrintMode('broadsheet')
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 350)
  }

  const handlePrintDetailedReport = () => {
    try {
      if (!detailedReport) {
        return toast.error('No detailed report loaded to print.')
      }
      setPrintMode('detailed_report')
      setIsPrinting(true)
      setTimeout(() => {
        window.print()
        setIsPrinting(false)
      }, 250)
    } catch (err) {
      console.error('Print detailed report error:', err)
      setIsPrinting(false)
      toast.error('Unable to open print dialog.')
    }
  }

  const handlePrintActiveView = () => {
    try {
      if (activeTab === 'detailed_report') {
        handlePrintDetailedReport()
        return
      }
      if (activeTab === 'top_students' || activeTab === 'analysis') {
        setPrintMode('broadsheet')
        setIsPrinting(true)
        setTimeout(() => {
          window.print()
          setIsPrinting(false)
        }, 250)
        return
      }
      handlePrintBroadsheet()
    } catch (err) {
      console.error('Print view error:', err)
      setIsPrinting(false)
      toast.error('Unable to open print dialog.')
    }
  }

  const handleExportDetailedReportCsv = () => {
    try {
      if (!detailedReport) {
        toast.error('Detailed report is not loaded yet.')
        return
      }
      const csv = buildDetailedReportCsv(detailedReport, supportThreshold)
      const safeScope = (detailedReport?.meta?.scopeLabel || 'Cohort').replace(/[^a-zA-Z0-9_-]/g, '_')
      downloadCSV(csv, `Jiddah_Theology_Detailed_Report_${safeScope}_${examPhase.toUpperCase()}.csv`)
      toast.success('Detailed Report exported cleanly to CSV!')
    } catch (err) {
      console.error('Export detailed report CSV error:', err)
      toast.error('Failed to export detailed report CSV.')
    }
  }

  const handleExportActiveViewCsv = () => {
    try {
      if (activeTab === 'detailed_report') {
        handleExportDetailedReportCsv()
        return
      }
      if (activeTab === 'top_students') {
        const list = top10Data ?? []
        if (!list.length) {
          toast.error('No Top 10 data available to export.')
          return
        }
        const headers = ['Rank', 'Student Name', 'Arabic Name', 'Admission No', 'Class', 'Avg %', 'Total', 'Aggregate', 'Division']
        const rows = list.map((st) => [
          st?.position ?? '-',
          st?.name || '-',
          st?.arabic_name || '-',
          st?.admission_number || '-',
          st?.className || '-',
          st?.normalizedScore != null ? `${st.normalizedScore}%` : '-',
          st?.total ?? '-',
          st?.aggregate ?? '-',
          st?.division || '-',
        ])
        const csvContent = [
          `"JIDDAH THEOLOGY TOP 10 MERIT ROLL — ${currentScopeLabel || ''}"`,
          headers.map(escapeCSV).join(','),
          ...rows.map((r) => r.map(escapeCSV).join(',')),
        ].join('\n')
        downloadCSV(csvContent, `Jiddah_Theology_Top10_${(currentScopeLabel || 'Cohort').replace(/\s+/g, '_')}.csv`)
        toast.success('Top 10 Merit Roll exported to CSV!')
        return
      }
      if (activeTab === 'analysis') {
        const classes = cohortMetrics?.classBreakdown ?? []
        const subjects = assessmentData?.orderedSubjects ?? []
        const headers = ['Category', 'Name', 'Enrolled / Sat', 'Mean / Avg', 'Pass Rate %']
        const rows: unknown[][] = [
          ...classes.map((c) => [
            'Class',
            c?.className || '-',
            `${c?.satComplete ?? 0}/${c?.totalEnrolled ?? 0}`,
            c?.meanPct != null ? `${c.meanPct}%` : '-',
            c?.passRate != null ? `${c.passRate}%` : '-',
          ]),
          ...subjects.map((s) => [
            'Subject',
            s?.subject_name_arabic || s?.subject_name || '-',
            broadsheetSummary?.subjectStats?.[s.id]?.count ?? '-',
            broadsheetSummary?.subjectStats?.[s.id]?.avg ?? '-',
            broadsheetSummary?.subjectStats?.[s.id]?.passRate != null ? `${broadsheetSummary.subjectStats[s.id].passRate}%` : '-',
          ]),
        ]
        if (!rows.length) {
          toast.error('No analysis data available to export.')
          return
        }
        const csvContent = [
          `"JIDDAH THEOLOGY ANALYSIS — ${currentScopeLabel || ''}"`,
          headers.map(escapeCSV).join(','),
          ...rows.map((r) => r.map(escapeCSV).join(',')),
        ].join('\n')
        downloadCSV(csvContent, `Jiddah_Theology_Analysis_${(currentScopeLabel || 'Cohort').replace(/\s+/g, '_')}.csv`)
        toast.success('Analysis exported to CSV!')
        return
      }
      handleExportCSV()
    } catch (err) {
      console.error('Export active view CSV error:', err)
      toast.error('Failed to export CSV.')
    }
  }

  const handleExportCSV = () => {
    try {
      if (cohortMetrics?.isSingleClassCandidateExcluded) {
        return toast.info('N/A — candidate class: P.7 has no Term 3 EOT.')
      }
      const studentsList = assessmentData?.students ?? []
      if (!studentsList.length) {
        return toast.error('No assessment data to export.')
      }
      const orderedSubjects = assessmentData?.orderedSubjects ?? []
      const termLabel = activeTerm?.label ? activeTerm.label.replace(/\s+/g, '_') : 'Term'
      const classLabel = (currentScopeLabel || 'Cohort').replace(/\s+/g, '_')
      const filename = `Jiddah_Theology_Broadsheet_${classLabel}_${termLabel}_${examPhase.toUpperCase()}_2026.csv`

      const headers = [
        'Rank',
        ...(isSectionMode ? ['Class'] : []),
        'Admission No',
        'Student Name',
        'Arabic Name',
        'Gender',
        ...orderedSubjects.map((s) => `${s?.subject_name_arabic || s?.subject_name || 'Subject'} (Mark)`),
        'Total Score',
        ...(cohortMetrics?.isNormalizedRanking ? ['Avg %'] : []),
        'Aggregate',
        'Division',
      ]

      const rows = studentsList.map((st) => [
        st?.position ?? '-',
        ...(isSectionMode ? [st?.className ?? '-'] : []),
        st?.admission_number || '-',
        st?.name || '-',
        st?.arabic_name || '-',
        st?.gender || '-',
        ...orderedSubjects.map((s) => st?.subjectScores?.[s.id] ?? '-'),
        st?.total != null ? st.total : '-',
        ...(cohortMetrics?.isNormalizedRanking
          ? [st?.normalizedScore != null ? `${st.normalizedScore}%` : '-']
          : []),
        st?.aggregate ?? '-',
        st?.division || '-',
      ])

      if (broadsheetSummary) {
        rows.push([])
        rows.push([
          'SUMMARY',
          ...(isSectionMode ? [''] : []),
          '',
          'CLASS AVERAGE',
          '',
          '',
          ...orderedSubjects.map((s) => broadsheetSummary?.subjectStats?.[s.id]?.avg ?? '-'),
          broadsheetSummary?.classAverageTotal ?? '-',
          ...(cohortMetrics?.isNormalizedRanking
            ? [broadsheetSummary?.meanNormalizedPct != null ? `${broadsheetSummary.meanNormalizedPct}%` : '-']
            : []),
          '',
          '',
        ])
        rows.push([
          'SUMMARY',
          ...(isSectionMode ? [''] : []),
          '',
          'PASS RATE (%)',
          '',
          '',
          ...orderedSubjects.map((s) => `${broadsheetSummary?.subjectStats?.[s.id]?.passRate ?? 0}%`),
          '',
          ...(cohortMetrics?.isNormalizedRanking ? [''] : []),
          '',
          '',
        ])
      }

      const csvContent = [
        `"JIDDAH ISLAMIC NURSERY & PRIMARY SCHOOL — THEOLOGY BROADSHEET"`,
        `"Scope: ${currentScopeLabel || ''} | Term: ${activeTerm?.label || ''} | Phase: ${examPhase.toUpperCase()} | Generated: ${new Date().toLocaleDateString()}"`,
        '',
        headers.map(escapeCSV).join(','),
        ...rows.map((row) => row.map(escapeCSV).join(',')),
      ].join('\n')

      downloadCSV(csvContent, filename)
      toast.success('Theology Broadsheet exported cleanly to CSV!')
    } catch (err) {
      console.error('Export Theology CSV error:', err)
      toast.error('Failed to export CSV. Please try again.')
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] dark:bg-[#0D1411] text-[#1C1917] dark:text-stone-100 font-sans tabular-nums selection:bg-[#0D5C3A] selection:text-white overflow-hidden">
      {/* ======================================================== */}
      {/* 1. REPORT-CENTER-STYLE SINGLE-ROW TOOLBAR */}
      {/* ======================================================== */}
      <div className="print:hidden shrink-0 px-2 sm:px-4 lg:px-6 pt-2 pb-0 w-full max-w-[1920px] mx-auto">
        <div
          data-testid="theology-hub-banner"
          className="w-full h-auto py-2 min-[1600px]:py-0 min-h-12 min-[1600px]:h-12 bg-white dark:bg-[#151D1A] rounded-2xl px-2.5 sm:px-3.5 border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 flex flex-col sm:flex-row sm:flex-wrap min-[1600px]:flex-nowrap sm:items-center sm:justify-between gap-2 shadow-2xs"
        >
          {/* Row 1 (Mobile & <1600px Desktop Tier 1) / Left+Selectors Container */}
          <div className="flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto sm:flex-1 min-[1600px]:flex-none sm:order-1 shrink-0">
            {/* Brand + Back (+ inline desktop selectors) */}
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-1.5 min-w-0">
              <Link
                href="/admin"
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft size={16} />
              </Link>

              {/* Title pill */}
              <div className="flex items-center gap-1.5 shrink-0 bg-[#D97706]/15 dark:bg-[#D97706]/10 rounded-lg px-2 py-0.5">
                <div className="w-6 h-6 rounded-lg bg-[#0D5C3A] flex items-center justify-center shrink-0">
                  <BookOpen className="w-3.5 h-3.5 text-white" strokeWidth={2.25} />
                </div>
                <span className="inline text-[11px] sm:text-xs font-black text-stone-800 dark:text-stone-100 tracking-tight whitespace-nowrap">
                  Theology Hub
                </span>
              </div>

              <div className="hidden min-[1600px]:block w-px h-5 bg-stone-200 dark:bg-white/10 mx-0.5 shrink-0" />

              {/* Desktop inline selectors — fitContent prevents any truncation of All Sections / Arabic class names */}
              <div className="hidden sm:flex flex-wrap lg:flex-nowrap items-center gap-1.5 shrink-0">
                <CustomPillSelect
                  id="theology-hub-term-select-desktop"
                  ariaLabel="Academic Term"
                  value={activeTermId}
                  onChange={(val) => setActiveTermId(val)}
                  options={termOptions}
                  fitContent
                  className="h-8 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap"
                />

                <CustomPillSelect
                  id="theology-hub-section-select-desktop"
                  dataTestId="theology-hub-section-select"
                  ariaLabel="Academic Section"
                  value={activeSectionId}
                  onChange={handleSelectSection}
                  options={sectionOptions}
                  placeholder="Section..."
                  fitContent
                  className="h-8 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap"
                />

                <CustomPillSelect
                  id="theology-hub-class-select-desktop"
                  ariaLabel="Theology Class"
                  value={activeClassId}
                  onChange={handleSelectClass}
                  options={classOptions}
                  placeholder="Select Class..."
                  fitContent
                  className="h-8 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs font-semibold text-stone-800 dark:text-stone-100 whitespace-nowrap"
                />
              </div>
            </div>

            {/* Mobile right actions */}
            <div className="flex sm:hidden items-center gap-1 shrink-0">
              <button
                onClick={handleExportActiveViewCsv}
                disabled={
                  activeTab === 'detailed_report'
                    ? detailedLoading || !detailedReport
                    : isLoading || cohortMetrics.isSingleClassCandidateExcluded || !assessmentData.students.length
                }
                title={activeTab === 'detailed_report' ? 'Export Detailed Report CSV' : 'Export Broadsheet CSV'}
                aria-label={activeTab === 'detailed_report' ? 'Export Detailed Report CSV' : 'Export Broadsheet CSV'}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10 border border-stone-200 dark:border-white/10 transition cursor-pointer disabled:opacity-40 shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" strokeWidth={2.25} />
              </button>

              <button
                type="button"
                onClick={() => setPrintStudioOpen(true)}
                disabled={
                  activeTab === 'detailed_report' ||
                  isLoading ||
                  cohortMetrics.isSingleClassCandidateExcluded ||
                  !assessmentData.students.length
                }
                title="Customize Sheet & Print Preview"
                aria-label="Customize Sheet"
                className="w-8 h-8 rounded-full bg-[#D97706]/12 text-[#B45309] dark:bg-[#F59E0B]/20 dark:text-[#FCD34D] border border-[#D97706]/30 text-xs font-semibold inline-flex items-center justify-center cursor-pointer transition disabled:opacity-40 shrink-0"
              >
                <Sliders className="size-3.5" />
              </button>

              <button
                onClick={handlePrintActiveView}
                disabled={
                  activeTab === 'detailed_report'
                    ? detailedLoading || !detailedReport
                    : isLoading || cohortMetrics.isSingleClassCandidateExcluded || !assessmentData.students.length
                }
                title={activeTab === 'detailed_report' ? 'Print A4 Detailed Report' : 'Print Official Broadsheet'}
                className="h-8 px-2.5 rounded-full bg-gradient-to-r from-[#0D5C3A] to-[#117A4D] text-white ring-1 ring-[#D97706]/50 shadow-sm text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 transition shrink-0"
              >
                <Printer className="w-3.5 h-3.5" strokeWidth={2.25} />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Mobile Row 2: 2-row readable selectors without truncation or clipping */}
          <div className="grid sm:hidden grid-cols-2 gap-1.5 w-full">
            <CustomPillSelect
              id="theology-hub-term-select"
              ariaLabel="Academic Term"
              value={activeTermId}
              onChange={(val) => setActiveTermId(val)}
              options={termOptions}
              className="h-8 w-full min-w-0 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-[11px] font-semibold text-stone-800 dark:text-stone-100"
            />

            <CustomPillSelect
              id="theology-hub-section-select"
              dataTestId="theology-hub-section-select-mobile"
              ariaLabel="Academic Section"
              value={activeSectionId}
              onChange={handleSelectSection}
              options={sectionOptions}
              placeholder="Section..."
              className="h-8 w-full min-w-0 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-[11px] font-semibold text-stone-800 dark:text-stone-100"
            />

            <CustomPillSelect
              id="theology-hub-class-select"
              ariaLabel="Theology Class"
              value={activeClassId}
              onChange={handleSelectClass}
              options={classOptions}
              placeholder="Select Class..."
              className="col-span-2 h-8 w-full min-w-0 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-[11px] font-semibold text-stone-800 dark:text-stone-100"
            />
          </div>

          {/* TIER 2 (<1600px) / CENTER (>=1600px): Exam Phase + View Mode — hidden on mobile, shown sm+ */}
          <div className="hidden sm:flex flex-wrap items-center justify-between min-[1600px]:justify-start gap-2 shrink-0 sm:basis-full sm:order-3 sm:pt-1.5 sm:border-t sm:border-stone-100 dark:sm:border-white/5 min-[1600px]:basis-auto min-[1600px]:order-2 min-[1600px]:pt-0 min-[1600px]:border-t-0">
            {/* Exam Phase — inline pill group */}
            <div className="flex items-center bg-stone-100 dark:bg-white/5 rounded-full p-0.5 border border-stone-200/80 dark:border-white/10 gap-0.5">
              {(['bot', 'mot', 'eot'] as const).map((phase) => (
                <button
                  key={phase}
                  type="button"
                  onClick={() => setExamPhase(phase)}
                  className={`h-7 px-2.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all cursor-pointer ${examPhase === phase
                    ? phase === 'eot'
                      ? 'bg-[#0D5C3A] text-white shadow-xs'
                      : 'bg-stone-700 text-white shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
                    }`}
                >
                  {phase.toUpperCase()}
                </button>
              ))}
            </div>

            {/* View Mode — Sheet / Analysis / Top 10 / Detailed Report */}
            <div className="flex items-center bg-stone-100 dark:bg-white/5 rounded-full p-0.5 border border-stone-200/80 dark:border-white/10 gap-0.5">
              <button
                type="button"
                onClick={() => handleTabChange('assessment')}
                className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${activeTab === 'assessment'
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
                  }`}
              >
                <ScrollText className="w-3 h-3" strokeWidth={2.25} />
                <span>Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('analysis')}
                className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${activeTab === 'analysis'
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
                  }`}
              >
                <BarChart3 className="w-3 h-3" strokeWidth={2.25} />
                <span>Analysis</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('top_students')}
                className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${activeTab === 'top_students'
                  ? 'bg-[#D97706] text-white shadow-xs'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
                  }`}
              >
                <Award className="w-3 h-3" strokeWidth={2.25} />
                <span>Top 10</span>
              </button>
              <button
                type="button"
                data-testid="tab-detailed-report"
                onClick={() => handleTabChange('detailed_report')}
                className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${activeTab === 'detailed_report'
                  ? 'bg-[#0F4D25] text-white shadow-xs'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
                  }`}
              >
                <FileText className="w-3 h-3" strokeWidth={2.25} />
                <span>Detailed Report</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Export CSV + Customize + Print Broadsheet (Desktop sm+, sits on Tier 1 right when <1600px) */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0 sm:order-2 min-[1600px]:order-3">
            <button
              onClick={handleExportActiveViewCsv}
              disabled={
                activeTab === 'detailed_report'
                  ? detailedLoading || !detailedReport
                  : isLoading || cohortMetrics.isSingleClassCandidateExcluded || !assessmentData.students.length
              }
              title={activeTab === 'detailed_report' ? 'Export Detailed Report CSV' : 'Export Broadsheet CSV'}
              aria-label={activeTab === 'detailed_report' ? 'Export Detailed Report CSV' : 'Export Broadsheet CSV'}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10 border border-stone-200 dark:border-white/10 transition cursor-pointer disabled:opacity-40 shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" strokeWidth={2.25} />
            </button>

            {/* Advanced Sheet Customizer & Live Preview Studio */}
            <button
              type="button"
              onClick={() => setPrintStudioOpen(true)}
              disabled={
                activeTab === 'detailed_report' ||
                isLoading ||
                cohortMetrics.isSingleClassCandidateExcluded ||
                !assessmentData.students.length
              }
              title="Customize Sheet & Print Preview"
              aria-label="Customize Sheet"
              className="h-8 px-2.5 rounded-full bg-[#D97706]/12 text-[#B45309] dark:bg-[#F59E0B]/20 dark:text-[#FCD34D] border border-[#D97706]/30 hover:bg-[#D97706]/20 dark:hover:bg-[#F59E0B]/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition disabled:opacity-40 shrink-0 focus:outline-none focus:ring-2 focus:ring-[#D97706]"
            >
              <Sliders className="size-3.5" />
              <span className="hidden md:inline font-bold text-[11px]">Customize</span>
            </button>

            <button
              onClick={handlePrintActiveView}
              disabled={
                activeTab === 'detailed_report'
                  ? detailedLoading || !detailedReport
                  : isLoading || cohortMetrics.isSingleClassCandidateExcluded || !assessmentData.students.length
              }
              title={activeTab === 'detailed_report' ? 'Print A4 Detailed Report' : 'Print Official Broadsheet'}
              className="h-8 px-3 rounded-full bg-gradient-to-r from-[#0D5C3A] to-[#117A4D] hover:from-[#09472C] hover:to-[#0D5C3A] text-white ring-1 ring-[#D97706]/50 shadow-md text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition shrink-0"
            >
              <Printer className="w-3.5 h-3.5" strokeWidth={2.25} />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile-only phase + view strip (2 clean stacked rows) */}
      <div className="print:hidden sm:hidden flex flex-col gap-1.5 px-2 pt-1.5 pb-0 w-full max-w-full mx-auto shrink-0">
        <div className="flex items-center bg-stone-100 dark:bg-white/5 rounded-full p-0.5 border border-stone-200/80 dark:border-white/10 gap-0.5 w-fit max-w-full">
          {(['bot', 'mot', 'eot'] as const).map((phase) => (
            <button
              key={phase}
              type="button"
              onClick={() => setExamPhase(phase)}
              className={`h-7 px-3 rounded-full text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-all cursor-pointer shrink-0 ${examPhase === phase
                ? phase === 'eot'
                  ? 'bg-[#0D5C3A] text-white shadow-xs'
                  : 'bg-stone-700 text-white shadow-xs'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
                }`}
            >
              {phase.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center bg-stone-100 dark:bg-white/5 rounded-full p-0.5 border border-stone-200/80 dark:border-white/10 gap-0.5 overflow-x-auto no-scrollbar max-w-full">
          <button
            type="button"
            onClick={() => handleTabChange('assessment')}
            className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${activeTab === 'assessment'
              ? 'bg-[#D97706] text-white shadow-xs'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
              }`}
          >
            <ScrollText className="w-3 h-3" strokeWidth={2.25} />
            <span>Sheet</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('analysis')}
            className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${activeTab === 'analysis'
              ? 'bg-[#D97706] text-white shadow-xs'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
              }`}
          >
            <BarChart3 className="w-3 h-3" strokeWidth={2.25} />
            <span>Analysis</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('top_students')}
            className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${activeTab === 'top_students'
              ? 'bg-[#D97706] text-white shadow-xs'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
              }`}
          >
            <Award className="w-3 h-3" strokeWidth={2.25} />
            <span>Top 10</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('detailed_report')}
            className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${activeTab === 'detailed_report'
              ? 'bg-[#0F4D25] text-white shadow-xs'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
              }`}
          >
            <FileText className="w-3 h-3" strokeWidth={2.25} />
            <span>Detailed Report</span>
          </button>
        </div>
      </div>

      {/* 1-Click Quick-Filter Class Pills when a Section is active (visible on all viewports) */}
      {activeSectionId && (sectionMapping.bySection[activeSectionId] || []).length > 0 && (
        <div className="print:hidden shrink-0 w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 pb-2 pt-1.5">
          <div
            data-testid="theology-section-quick-pills"
            dir="rtl"
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-none border-t border-stone-200/70 dark:border-white/10 pt-1.5 font-arabic"
          >
            <span className="text-[10px] font-bold text-stone-400 shrink-0 ml-1">
              {activeSectionObj?.label_arabic || activeSectionObj?.label || activeSectionId}:
            </span>
            <button
              type="button"
              onClick={() => handleSelectClass('')}
              className={`h-6.5 px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${activeClassId === ''
                ? 'bg-[#0D5C3A] text-white shadow-xs'
                : 'bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
                }`}
            >
              جميع فصول {activeSectionObj?.label_arabic || 'القسم'}
            </button>
            {(sectionMapping.bySection[activeSectionId] || []).map((cls) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => handleSelectClass(cls.id)}
                className={`h-6.5 px-2.5 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${activeClassId === cls.id
                  ? 'bg-[#0D5C3A] text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
                  }`}
              >
                {cls.class_name_arabic || cls.class_name_english}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE AREA */}
      {/* ======================================================== */}
      <main className="flex-1 min-h-0 w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 pt-2 pb-2 flex flex-col min-w-0 overflow-hidden">
        {activeTab === 'detailed_report' ? (
          <HubDetailedReportView
            curriculum="theology"
            report={detailedReport}
            isLoading={detailedLoading}
            error={detailedError}
            onRetry={() => setDetailedReloadNonce((n) => n + 1)}
            scope={reportScope}
            sectionId={activeSectionId}
            classId={activeClassId}
            termId={activeTermId}
            year={Number(activeTerm?.academic_year || terms[0]?.academic_year || 2026)}
            examPhase={examPhase}
            supportThreshold={supportThreshold}
            terms={terms}
            classes={effectiveClasses}
            availableScopes={detailedAvailableScopes}
            onChangeScope={handleChangeReportScope}
            onChangeYear={handleChangeReportYear}
            onChangeTermId={(id) => setActiveTermId(id)}
            onChangeExamPhase={(p) => setExamPhase(p)}
            onChangeSupportThreshold={(next) => setSupportThreshold(clampSupportThreshold(next))}
            onPrintReport={handlePrintDetailedReport}
          />
        ) : isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24">
            <JiddahLoader />
            <p className="mt-4 text-xs font-bold text-[#57534E] dark:text-stone-400 uppercase tracking-widest font-sans">
              Loading Theology Broadsheets &amp; Reconciling Marks...
            </p>
          </div>
        ) : fetchError && !data ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <HubDataQualityBanners
              curriculum="theology"
              fetchError={fetchError}
              onRetry={() => setReloadNonce((n) => n + 1)}
              unmappedClasses={[]}
              candidateExclusions={[]}
              rankingMethodLabel=""
              rankingMethodLabelArabic=""
              isNormalizedRanking={false}
              showRankingMethod={false}
            />
          </div>
        ) : !data || (!activeClassId && !activeSectionId) ? (
          <TheologyHubEmptyState />
        ) : cohortMetrics.isSingleClassCandidateExcluded ? (
          <div className="flex-1 overflow-y-auto px-2 py-4">
            <HubCandidateNaCard
              curriculum="theology"
              classLabel={currentScopeLabel}
              termLabel={activeTerm?.label || 'الفترة الثالثة'}
              badge={cohortMetrics.candidateExclusionBadge}
              reason={cohortMetrics.candidateExclusionReason}
              onSwitchExamPhase={(next) => setExamPhase(next)}
            />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* VIEW 1: BROADSHEET TABLE (CORE ASSESSMENT SHEET IN AUTHENTIC RTL ARABIC) */}
            {activeTab === 'assessment' && (
              <motion.div
                key="sheet"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-h-0 flex flex-col gap-2 min-w-0 overflow-hidden"
              >
                <HubDataQualityBanners
                  curriculum="theology"
                  fetchError={fetchError}
                  onRetry={() => setReloadNonce((n) => n + 1)}
                  unmappedClasses={sectionMapping.unmappedClasses}
                  candidateExclusions={cohortMetrics.candidateExclusions}
                  rankingMethodLabel={cohortMetrics.rankingMethodLabel}
                  rankingMethodLabelArabic={cohortMetrics.rankingMethodLabelArabic}
                  isNormalizedRanking={cohortMetrics.isNormalizedRanking}
                  showRankingMethod={isSectionMode || cohortMetrics.missingMarksList.length > 0}
                  isSectionMode={isSectionMode}
                  excludedRowsCount={excludedCandidateRowsCount}
                  showExcludedCandidates={showExcludedCandidates}
                  onToggleShowExcludedCandidates={() => setShowExcludedCandidates((prev) => !prev)}
                />

                {/* Search & Filter strip — Arabic labels */}
                <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#151F1B] border border-[#E7E5E4] dark:border-white/10 shadow-xs" dir="rtl">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search
                      className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      strokeWidth={2.25}
                    />
                    <input
                      type="text"
                      placeholder="ابحث باسم التلميذ أو رقم القيد..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pr-9 pl-3 py-1.5 rounded-[10px] text-xs bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#0D5C3A] font-arabic text-right"
                      dir="rtl"
                    />
                  </div>

                  {/* الملاحظات Filter Pills — Arabic theology grades */}
                  <div className="flex items-center gap-1 overflow-x-auto text-xs py-0.5">
                    <span className="text-[10px] font-bold tracking-wider text-stone-400 ml-1 shrink-0 font-arabic">
                      الملاحظات:
                    </span>
                    {(['all', 'ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'راسب'] as const).map((grade) => (
                      <button
                        key={grade}
                        onClick={() => setDivisionFilter(grade)}
                        className={`px-2 py-1 rounded-[10px] text-[11px] font-bold transition-all cursor-pointer font-arabic ${divisionFilter === grade
                          ? grade === 'ممتاز'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : grade === 'جيد جداً'
                              ? 'bg-teal-600 text-white shadow-xs'
                              : grade === 'جيد'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : grade === 'مقبول'
                                  ? 'bg-orange-600 text-white shadow-xs'
                                  : grade === 'راسب'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-[#0D5C3A] text-white shadow-xs'
                          : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
                          }`}
                      >
                        {grade === 'all' ? 'الكل' : grade}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ——————————————————————————————————————————————
                      ASSESSMENT SHEET: Pure Arabic, matches reference image exactly
                      Columns: م | اسم التلميذ/ة | [subjects] | المجموع | الترتيب | الملاحظات
                  —————————————————————————————————————————————— */}
                <div
                  dir="rtl"
                  className="flex-1 min-h-0 rounded-2xl border border-[#0D5C3A]/15 dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-xs overflow-hidden flex flex-col"
                >
                  <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 pb-16">
                    <table className="w-full text-right border-collapse text-[12px]">
                      {/* ——— HEADER ——— */}
                      <thead className="sticky top-0 z-30 bg-stone-50 dark:bg-[#1A2621] border-b-2 border-[#0D5C3A]/20 dark:border-white/10">
                        <tr>
                          {/* م — sticky right */}
                          <th className="sticky top-0 right-0 z-40 bg-stone-50 dark:bg-[#1A2621] py-2.5 sm:py-3 px-1.5 sm:px-2 font-extrabold text-center w-8 sm:w-10 border-l border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300 font-arabic text-[11px] sm:text-[12px]">
                            م
                          </th>

                          {/* Student Name — sticky */}
                          <th className="sticky top-0 right-8 sm:right-10 z-40 bg-stone-50 dark:bg-[#1A2621] py-2.5 sm:py-3 px-2 sm:px-4 font-extrabold text-right min-w-[130px] sm:min-w-[180px] border-l border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-200 font-arabic text-[11px] sm:text-[12px]">
                            اسم التلميذ/ة
                          </th>

                          {/* Dynamic subject columns */}
                          {assessmentData.orderedSubjects.map((sub) => (
                            <th
                              key={sub.id}
                              className="bg-stone-50 dark:bg-[#1A2621] py-2.5 sm:py-3 px-1.5 sm:px-3 font-extrabold text-center border-l border-stone-200 dark:border-white/10 min-w-[65px] sm:min-w-[80px] text-[#0D5C3A] dark:text-emerald-400 font-arabic text-[11px] sm:text-[12px] leading-tight"
                            >
                              {sub.subject_name_arabic || sub.subject_name}
                            </th>
                          ))}

                          {/* المجموع */}
                          <th className="py-2.5 sm:py-3 px-1.5 sm:px-3 font-extrabold text-center border-l border-stone-200 dark:border-white/10 min-w-[60px] sm:min-w-[72px] bg-emerald-50 dark:bg-[#182E25] text-[#0D5C3A] dark:text-emerald-400 font-arabic text-[11px] sm:text-[12px]">
                            المجموع
                          </th>

                          {cohortMetrics.isNormalizedRanking && (
                            <th className="py-2.5 sm:py-3 px-1.5 sm:px-3 font-extrabold text-center border-l border-stone-200 dark:border-white/10 min-w-[60px] bg-emerald-50 dark:bg-[#182E25] text-[#0F4D25] dark:text-emerald-300 font-arabic text-[11px] sm:text-[12px]">
                              المعدل ٪
                            </th>
                          )}

                          {/* الترتيب */}
                          <th className="py-2.5 sm:py-3 px-1.5 sm:px-3 font-extrabold text-center border-l border-stone-200 dark:border-white/10 min-w-[50px] sm:min-w-[60px] bg-amber-50 dark:bg-[#2B2618] text-amber-800 dark:text-amber-400 font-arabic text-[11px] sm:text-[12px]">
                            الترتيب
                          </th>

                          {/* الملاحظات */}
                          <th className="bg-stone-50 dark:bg-[#1A2621] py-2.5 sm:py-3 px-1.5 sm:px-3 font-extrabold text-center border-l border-stone-200 dark:border-white/10 min-w-[60px] sm:min-w-[72px] text-[#57534E] dark:text-stone-400 font-arabic text-[11px] sm:text-[12px]">
                            الملاحظات
                          </th>
                        </tr>
                      </thead>

                      {/* ——— BODY ——— */}
                      <tbody className="divide-y divide-stone-100 dark:divide-white/[0.04]">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td
                              colSpan={assessmentData.orderedSubjects.length + (cohortMetrics.isNormalizedRanking ? 6 : 5)}
                              className="text-center py-14 text-[#57534E] dark:text-stone-400 font-medium text-sm font-arabic"
                            >
                              {assessmentData.students.length === 0
                                ? 'لا يوجد تلاميذ مسجلون في هذا النطاق للفترة المحددة.'
                                : 'لم يتم العثور على تلاميذ يطابقون خيارات البحث.'}
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((st, idx) => (
                            <tr
                              key={st.id}
                              className="hover:bg-[#0D5C3A]/[0.025] dark:hover:bg-white/[0.015] transition-colors cursor-pointer group"
                              onClick={() => {
                                router.push(`/admin/reports?student_id=${st.student_id}&term_id=${activeTermId}&curriculum=theology`)
                              }}
                            >
                              {/* م — sticky */}
                              <td className="sticky right-0 z-10 bg-white dark:bg-[#151F1B] group-hover:bg-stone-50 dark:group-hover:bg-[#1A2621] py-2 sm:py-2.5 px-1.5 sm:px-2 text-center font-bold text-[#57534E] dark:text-stone-400 text-[11px] sm:text-[12px] border-l border-stone-100 dark:border-white/[0.04] w-8 sm:w-10 font-arabic">
                                {String(idx + 1).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])}
                              </td>

                              {/* اسم التلميذ/ة — sticky */}
                              <td className="sticky right-8 sm:right-10 z-10 bg-white dark:bg-[#151F1B] group-hover:bg-stone-50 dark:group-hover:bg-[#1A2621] py-2 sm:py-2.5 px-2 sm:px-4 text-right border-l border-stone-100 dark:border-white/[0.04] min-w-[130px] sm:min-w-[180px] max-w-[160px] sm:max-w-none">
                                <div className="font-extrabold text-[#1C1917] dark:text-stone-100 font-arabic text-[12px] sm:text-[13px] leading-tight truncate sm:whitespace-normal">
                                  {st.arabic_name || st.name}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  {showEnglishNames && st.arabic_name && st.name && (
                                    <span className="text-[10px] text-[#57534E] dark:text-stone-400 font-sans font-normal truncate">
                                      {st.name}
                                    </span>
                                  )}
                                  {isSectionMode && (
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EFE9DF] dark:bg-white/10 text-[#1C1917] dark:text-stone-200 font-arabic font-semibold">
                                      {st.className}
                                    </span>
                                  )}
                                  {!st.isCompleteMarks && !st.isCandidateExcluded && st.expectedSubjectCount > 0 && (
                                    <span className="text-[10px] px-1 py-0.2 rounded bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 font-arabic font-bold">
                                      {toArabicNumerals(`${st.satSubjectCount}/${st.expectedSubjectCount}`)}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Subject score columns */}
                              {assessmentData.orderedSubjects.map((sub) => {
                                const score = st.subjectScores[sub.id]
                                const numScore = score != null ? Number(score) : null
                                return (
                                  <td
                                    key={sub.id}
                                    className="py-2.5 px-3 text-center border-l border-stone-100 dark:border-white/[0.04]"
                                  >
                                    <span className={`font-mono font-black text-[13px] ${numScore == null
                                      ? 'text-stone-300 dark:text-stone-700'
                                      : numScore >= 85
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : numScore >= 50
                                          ? 'text-stone-800 dark:text-stone-200'
                                          : 'text-rose-600 dark:text-rose-400'
                                      }`}>
                                      {numScore != null ? toArabicNumerals(numScore) : '—'}
                                    </span>
                                  </td>
                                )
                              })}

                              {/* المجموع */}
                              <td className="py-2.5 px-3 text-center border-l border-stone-100 dark:border-white/[0.04] bg-emerald-50/30 dark:bg-emerald-950/[0.08]">
                                <span className="font-mono font-black text-[13px] text-[#0D5C3A] dark:text-emerald-400">
                                  {st.total != null ? toArabicNumerals(st.total) : '—'}
                                </span>
                              </td>

                              {cohortMetrics.isNormalizedRanking && (
                                <td className="py-2.5 px-3 text-center border-l border-stone-100 dark:border-white/[0.04] bg-emerald-50/20 dark:bg-emerald-950/[0.05]">
                                  <span className="font-mono font-extrabold text-[12px] text-[#0F4D25] dark:text-emerald-300">
                                    {st.normalizedScore != null ? `${toArabicNumerals(st.normalizedScore)}٪` : '—'}
                                  </span>
                                </td>
                              )}

                              {/* الترتيب — Arabic-Indic numeral */}
                              <td className="py-2.5 px-3 text-center border-l border-stone-100 dark:border-white/[0.04] bg-amber-50/30 dark:bg-amber-950/[0.06]">
                                <span className="font-mono font-black text-[13px] text-amber-800 dark:text-amber-400">
                                  {st.position !== '-' && st.position !== undefined && st.position !== null
                                    ? String(st.position).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
                                    : '—'}
                                </span>
                              </td>

                              {/* الملاحظات — Arabic IPLE division badge */}
                              <td className="py-2.5 px-3 text-center border-l border-stone-100 dark:border-white/[0.04]">
                                <RemarkBadge division={st.division} />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>

                      {/* ——— FOOTER: Class averages + pass rate (relative flow prevents overlapping final tbody row) ——— */}
                      {broadsheetSummary && (
                        <tfoot className="relative z-20 bg-stone-100 dark:bg-[#1A2621] border-t-2 border-[#0D5C3A]/30 font-arabic">
                          <tr className="text-[11px] font-extrabold text-stone-700 dark:text-stone-200">
                            <td
                              colSpan={2}
                              className="sticky right-0 z-30 bg-stone-100 dark:bg-[#1A2621] py-2 px-2 sm:px-4 text-right text-[10px] sm:text-[11px] text-[#0D5C3A] dark:text-emerald-400 border-l border-stone-200 dark:border-white/10"
                            >
                              {isSectionMode ? 'متوسط القسم' : 'متوسط الفصل'}
                            </td>
                            {assessmentData.orderedSubjects.map((sub) => {
                              const stat = broadsheetSummary.subjectStats[sub.id]
                              return (
                                <td
                                  key={sub.id}
                                  className="py-2 px-3 text-center font-mono border-l border-stone-200 dark:border-white/10"
                                >
                                  {stat ? toArabicNumerals(stat.avg) : '—'}
                                </td>
                              )
                            })}
                            <td className="py-2 px-3 text-center font-mono text-[#0D5C3A] dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 border-l border-stone-200 dark:border-white/10">
                              {toArabicNumerals(broadsheetSummary.classAverageTotal)}
                            </td>
                            {cohortMetrics.isNormalizedRanking && (
                              <td className="py-2 px-3 text-center font-mono text-[#0F4D25] dark:text-emerald-300 border-l border-stone-200 dark:border-white/10">
                                {broadsheetSummary.meanNormalizedPct != null
                                  ? `${toArabicNumerals(broadsheetSummary.meanNormalizedPct)}٪`
                                  : '—'}
                              </td>
                            )}
                            <td className="py-2 px-3 text-center border-l border-stone-200 dark:border-white/10">—</td>
                            <td className="py-2 px-3 text-center text-[10px] text-[#57534E] dark:text-stone-400 border-l border-stone-200 dark:border-white/10 font-arabic">
                              {String(broadsheetSummary.satCandidates).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])}/{String(broadsheetSummary.totalCandidates).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])}
                            </td>
                          </tr>
                          <tr className="text-[10px] text-[#57534E] dark:text-stone-400">
                            <td
                              colSpan={2}
                              className="sticky right-0 z-30 bg-stone-100 dark:bg-[#1A2621] py-1.5 px-2 sm:px-4 text-right border-l border-stone-200 dark:border-white/10 font-arabic"
                            >
                              نسبة النجاح (٥٠٪ فأعلى)
                            </td>
                            {assessmentData.orderedSubjects.map((sub) => {
                              const stat = broadsheetSummary.subjectStats[sub.id]
                              return (
                                <td
                                  key={sub.id}
                                  className="py-1.5 px-3 text-center font-mono text-emerald-700 dark:text-emerald-400 border-l border-stone-200 dark:border-white/10"
                                >
                                  {stat ? `${toArabicNumerals(stat.passRate)}٪` : '—'}
                                </td>
                              )
                            })}
                            <td colSpan={cohortMetrics.isNormalizedRanking ? 4 : 3} className="py-1.5 px-3 text-center text-[10px] border-l border-stone-200 dark:border-white/10 font-arabic">
                              الممتحنون: {String(broadsheetSummary.satCandidates).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])} من {String(broadsheetSummary.totalCandidates).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW 2: COHORT ANALYTICS */}
            {activeTab === 'analysis' && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 min-w-0 pr-1 pb-4"
              >
                {/* 4 Executive KPI Cards — Arabic */}
                <HubDataQualityBanners
                  curriculum="theology"
                  fetchError={fetchError}
                  onRetry={() => setReloadNonce((n) => n + 1)}
                  unmappedClasses={sectionMapping.unmappedClasses}
                  candidateExclusions={cohortMetrics.candidateExclusions}
                  rankingMethodLabel={cohortMetrics.rankingMethodLabel}
                  rankingMethodLabelArabic={cohortMetrics.rankingMethodLabelArabic}
                  isNormalizedRanking={cohortMetrics.isNormalizedRanking}
                />

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* KPI 1: إجمالي المسجلين */}
                  <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#57534E] dark:text-stone-400 font-arabic">
                        إجمالي المسجلين
                      </p>
                      <h3 className="text-2xl font-black text-[#1C1917] dark:text-white mt-1 font-arabic" dir="rtl">
                        {toArabicNumerals(broadsheetSummary ? broadsheetSummary.totalCandidates : 0)}
                      </h3>
                      <p className="text-[10px] text-[#57534E] dark:text-stone-400 mt-0.5 font-arabic">
                        {isSectionMode ? currentScopeLabel : 'الفوج الدراسي'}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-[#0D5C3A] dark:text-emerald-400">
                      <Users className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                  </div>

                  {/* KPI 2: متوسط النسبة / مجموع الفصل */}
                  <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#57534E] dark:text-stone-400 font-arabic">
                        {cohortMetrics.isNormalizedRanking ? 'متوسط النسبة المعيارية' : 'متوسط مجموع الفصل'}
                      </p>
                      <h3 className="text-2xl font-black text-[#1C1917] dark:text-white mt-1 font-arabic" dir="rtl">
                        {cohortMetrics.isNormalizedRanking
                          ? `${toArabicNumerals(broadsheetSummary?.meanNormalizedPct ?? 0)}٪`
                          : toArabicNumerals(broadsheetSummary ? broadsheetSummary.classAverageTotal : 0)}
                      </h3>
                      <p className="text-[10px] text-[#57534E] dark:text-stone-400 mt-0.5 font-arabic">
                        الأعلى: {toArabicNumerals(broadsheetSummary?.highestTotal || 0)}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <TrendingUp className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                  </div>

                  {/* KPI 3: ممتاز + جيد جداً (IPLE aggregate 4-23 cohort) */}
                  {(() => {
                    const exc = broadsheetSummary?.divCounts.I || 0
                    const vgd = broadsheetSummary?.divCounts.II || 0
                    const tot = broadsheetSummary?.satCandidates || 0
                    const pct = tot > 0 ? Math.round(((exc + vgd) / tot) * 100) : 0
                    return (
                      <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#57534E] dark:text-stone-400 font-arabic">
                            ممتاز + جيد جداً
                          </p>
                          <h3 className="text-2xl font-black text-[#0D5C3A] dark:text-emerald-400 mt-1 font-arabic" dir="rtl">
                            {toArabicNumerals(exc + vgd)}
                          </h3>
                          <p className="text-[10px] text-[#57534E] dark:text-stone-400 mt-0.5 font-arabic">
                            {toArabicNumerals(pct)}٪ من الممتحنين
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
                          <Percent className="w-5 h-5" strokeWidth={2.25} />
                        </div>
                      </div>
                    )
                  })()}

                  {/* KPI 4: نسبة الإكمال */}
                  <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#57534E] dark:text-stone-400 font-arabic">
                        نسبة الإكمال ({examPhase.toUpperCase()})
                      </p>
                      <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-arabic" dir="rtl">
                        {toArabicNumerals(broadsheetSummary ? broadsheetSummary.completionPct : 0)}٪
                      </h3>
                      <p className="text-[10px] text-[#57534E] dark:text-stone-400 mt-0.5 font-arabic">
                        {currentScopeLabel}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <Sparkles className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                  </div>
                </div>

                {/* Class-by-Class Comparison & Missing Marks Panels */}
                <HubClassBreakdownTable
                  curriculum="theology"
                  classBreakdown={cohortMetrics.classBreakdown}
                  sectionTitle={isSectionMode ? currentScopeLabel : activeClass?.class_name_arabic}
                />

                <HubMissingMarksPanel
                  curriculum="theology"
                  missingMarksList={cohortMetrics.missingMarksList}
                />

                {/* Subject Performance Matrix Table */}
                <div className="rounded-2xl border border-[#0D5C3A]/12 dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-xs p-5">
                  <h3 className="text-sm font-extrabold text-stone-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#0D5C3A]" strokeWidth={2.25} />
                    <span className="font-arabic">أداء مواد العلوم الشرعية</span>
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-stone-200 dark:border-white/10 text-stone-400 text-[10px] font-extrabold uppercase tracking-wider">
                          <th className="py-2 px-3 font-arabic">المادة</th>
                          <th className="py-2 px-3 text-center font-arabic">المتوسط</th>
                          <th className="py-2 px-3 text-center font-arabic">الأعلى</th>
                          <th className="py-2 px-3 text-center font-arabic">الأدنى</th>
                          <th className="py-2 px-3 text-center font-arabic">نسبة النجاح (٥٠٪+)</th>
                          <th className="py-2 px-3 min-w-[140px] font-arabic">الأداء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-white/5 font-medium">
                        {assessmentData.orderedSubjects.map((sub) => {
                          const stat = broadsheetSummary?.subjectStats[sub.id]
                          const avg = stat?.avg || 0
                          const passRate = stat?.passRate || 0
                          return (
                            <tr key={sub.id} className="hover:bg-stone-50 dark:hover:bg-white/[0.02]">
                              <td className="py-3 px-3">
                                <div className="font-arabic font-extrabold text-stone-900 dark:text-stone-100 text-sm" dir="rtl">
                                  {sub.subject_name_arabic || sub.subject_name}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-xs font-arabic" dir="rtl">
                                {toArabicNumerals(avg)}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-xs text-emerald-600 font-arabic" dir="rtl">
                                {toArabicNumerals(stat?.highest || 0)}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-xs text-rose-600 font-arabic" dir="rtl">
                                {toArabicNumerals(stat?.lowest || 0)}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-xs">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-arabic" dir="rtl">
                                  {toArabicNumerals(passRate)}٪
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-[linear-gradient(90deg_in_oklch,oklch(0.68_0.19_48),oklch(0.42_0.11_158))] rounded-full transition-all duration-500"
                                    style={{ width: `${passRate}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Theology Grade Distribution Cohort (IPLE aggregate divisions) */}
                {broadsheetSummary && (() => {
                  const counts = [
                    { label: 'ممتاز', count: broadsheetSummary.divCounts.I, color: 'emerald' },
                    { label: 'جيد جداً', count: broadsheetSummary.divCounts.II, color: 'teal' },
                    { label: 'جيد', count: broadsheetSummary.divCounts.III, color: 'amber' },
                    { label: 'مقبول', count: broadsheetSummary.divCounts.IV, color: 'orange' },
                    { label: 'راسب', count: broadsheetSummary.divCounts.U, color: 'rose' },
                  ] as const
                  return (
                    <div className="rounded-2xl border border-[#0D5C3A]/12 dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-xs p-5">
                      <h3 className="text-sm font-extrabold text-stone-900 dark:text-white uppercase tracking-wider mb-3 font-arabic">
                        توزيع التقديرات الشرعية
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                        {counts.map(g => {
                          const pct = broadsheetSummary.totalCandidates > 0
                            ? Math.round((g.count / broadsheetSummary.totalCandidates) * 100) : 0
                          const colorMap: Record<string, string> = {
                            emerald: 'border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400',
                            teal: 'border-teal-200/80 dark:border-teal-900/40 bg-teal-50/50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400',
                            amber: 'border-amber-200/80 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400',
                            orange: 'border-orange-200/80 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400',
                            rose: 'border-rose-200/80 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400',
                          }
                          return (
                            <div key={g.label} className={`p-3 rounded-xl border ${colorMap[g.color]} text-center`}>
                              <span className="text-[11px] font-black tracking-wide font-arabic">{g.label}</span>
                              <div className="text-xl font-black text-stone-900 dark:text-white mt-1 font-arabic" dir="rtl">{toArabicNumerals(g.count)}</div>
                              <div className="text-[10px] font-bold font-arabic" dir="rtl">{toArabicNumerals(pct)}٪</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </motion.div>
            )}

            {/* VIEW 3: TOP 10 MERIT ROLL */}
            {activeTab === 'top_students' && (
              <motion.div
                key="top"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 min-w-0 pr-1 pb-4"
              >
                <HubDataQualityBanners
                  curriculum="theology"
                  fetchError={fetchError}
                  onRetry={() => setReloadNonce((n) => n + 1)}
                  unmappedClasses={sectionMapping.unmappedClasses}
                  candidateExclusions={cohortMetrics.candidateExclusions}
                  rankingMethodLabel={cohortMetrics.rankingMethodLabel}
                  rankingMethodLabelArabic={cohortMetrics.rankingMethodLabelArabic}
                  isNormalizedRanking={cohortMetrics.isNormalizedRanking}
                />

                {/* Podium Cards for Top 3 — Full Arabic */}
                {top10Data.length >= 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-4">
                    {/* 2nd Place — المركز الثاني */}
                    <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-slate-300/60 dark:border-white/10 shadow-md text-center flex flex-col items-center order-2 md:order-1">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center shadow-inner mb-2">
                        <Medal className="w-6 h-6" strokeWidth={2.25} />
                      </div>
                      <span className="text-[11px] font-black tracking-wide text-slate-500 font-arabic">
                        المركز الثاني
                      </span>
                      <h4 className="font-extrabold text-[#1C1917] dark:text-white text-sm mt-1 font-arabic" dir="rtl">
                        {top10Data[1].arabic_name || top10Data[1].name}
                      </h4>
                      {isSectionMode && (
                        <p className="text-[10px] text-[#57534E] dark:text-stone-300 font-arabic mt-0.5">{top10Data[1].className}</p>
                      )}
                      {showEnglishNames && top10Data[1].arabic_name && (
                        <p className="text-[10px] text-[#57534E] dark:text-stone-400 font-sans mt-0.5">{top10Data[1].name}</p>
                      )}
                      <div className="mt-2 flex items-center gap-1 justify-center flex-wrap">
                        <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-300 font-arabic" dir="rtl">
                          {cohortMetrics.isNormalizedRanking && top10Data[1].normalizedScore != null
                            ? `${toArabicNumerals(top10Data[1].normalizedScore)}٪ (${toArabicNumerals(top10Data[1].total)})`
                            : `${toArabicNumerals(top10Data[1].total)} درجة`}
                        </span>
                        <RemarkBadge division={top10Data[1].division} />
                      </div>
                    </div>

                    {/* 1st Place — المركز الأول */}
                    <div className="rounded-2xl p-5 bg-[linear-gradient(135deg_in_oklch,oklch(0.92_0.07_80)_0%,oklch(0.85_0.12_75)_100%)] dark:bg-[linear-gradient(135deg_in_oklch,oklch(0.40_0.10_80)_0%,oklch(0.30_0.08_75)_100%)] border border-amber-400 shadow-xl text-center flex flex-col items-center order-1 md:order-2 scale-105 z-10">
                      <div className="w-14 h-14 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-md mb-2">
                        <Trophy className="w-7 h-7" strokeWidth={2.25} />
                      </div>
                      <span className="text-[11px] font-black tracking-wide text-amber-900 dark:text-amber-200 font-arabic">
                        {isSectionMode ? `بطل القسم · المركز الأول` : 'بطل الفصل · المركز الأول'}
                      </span>
                      <h3 className="font-black text-[#1C1917] dark:text-white text-base mt-1 font-arabic" dir="rtl">
                        {top10Data[0].arabic_name || top10Data[0].name}
                      </h3>
                      {isSectionMode && (
                        <p className="text-[10px] text-amber-950 dark:text-amber-200 font-arabic mt-0.5">{top10Data[0].className}</p>
                      )}
                      {showEnglishNames && top10Data[0].arabic_name && (
                        <p className="text-[10px] text-amber-950 dark:text-amber-300 font-sans mt-0.5">{top10Data[0].name}</p>
                      )}
                      <div className="mt-2.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-950 dark:text-amber-200 flex items-center gap-1.5 justify-center">
                        <span className="text-xs font-mono font-black font-arabic" dir="rtl">
                          {cohortMetrics.isNormalizedRanking && top10Data[0].normalizedScore != null
                            ? `${toArabicNumerals(top10Data[0].normalizedScore)}٪ (${toArabicNumerals(top10Data[0].total)})`
                            : `${toArabicNumerals(top10Data[0].total)} درجة`}
                        </span>
                        <RemarkBadge division={top10Data[0].division} />
                      </div>
                    </div>

                    {/* 3rd Place — المركز الثالث */}
                    <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-amber-600/30 dark:border-white/10 shadow-md text-center flex flex-col items-center order-3">
                      <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center shadow-inner mb-2">
                        <Award className="w-6 h-6" strokeWidth={2.25} />
                      </div>
                      <span className="text-[10px] font-black tracking-wide text-amber-700 font-arabic">
                        المركز الثالث
                      </span>
                      <h4 className="font-extrabold text-[#1C1917] dark:text-white text-sm mt-1 font-arabic" dir="rtl">
                        {top10Data[2].arabic_name || top10Data[2].name}
                      </h4>
                      {isSectionMode && (
                        <p className="text-[10px] text-[#57534E] dark:text-stone-300 font-arabic mt-0.5">{top10Data[2].className}</p>
                      )}
                      {showEnglishNames && top10Data[2].arabic_name && (
                        <p className="text-[10px] text-[#57534E] dark:text-stone-400 font-sans mt-0.5">{top10Data[2].name}</p>
                      )}
                      <div className="mt-2 flex items-center gap-1 justify-center flex-wrap">
                        <span className="text-xs font-mono font-black text-amber-800 dark:text-amber-400 font-arabic" dir="rtl">
                          {cohortMetrics.isNormalizedRanking && top10Data[2].normalizedScore != null
                            ? `${toArabicNumerals(top10Data[2].normalizedScore)}٪ (${toArabicNumerals(top10Data[2].total)})`
                            : `${toArabicNumerals(top10Data[2].total)} درجة`}
                        </span>
                        <RemarkBadge division={top10Data[2].division} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Top 10 Table */}
                <div className="rounded-2xl border border-[#0D5C3A]/15 dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-[#E7E5E4] dark:border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#1C1917] dark:text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" strokeWidth={2.25} />
                      <span className="font-arabic">
                        {isSectionMode
                          ? `قائمة الشرف — أفضل ١٠ في ${currentScopeLabel}`
                          : 'قائمة الشرف — أفضل ١٠ في العلوم الشرعية'}
                      </span>
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E7E5E4] dark:border-white/10 text-[#57534E] dark:text-stone-400 text-[10px] font-extrabold uppercase tracking-wider bg-[#FAF7F2] dark:bg-white/[0.02]" dir="rtl">
                          <th className="py-2.5 px-3 text-center w-12 font-arabic">الترتيب</th>
                          <th className="py-2.5 px-3 font-arabic">الاسم</th>
                          {isSectionMode && <th className="py-2.5 px-3 text-center font-arabic">الصف</th>}
                          <th className="py-2.5 px-3 text-center font-arabic">رقم القيد</th>
                          <th className="py-2.5 px-3 text-center font-arabic">المجموع</th>
                          {cohortMetrics.isNormalizedRanking && (
                            <th className="py-2.5 px-3 text-center font-arabic">النسبة</th>
                          )}
                          <th className="py-2.5 px-3 text-center font-arabic">المعدل</th>
                          <th className="py-2.5 px-3 text-center font-arabic">التقدير</th>
                          <th className="py-2.5 px-3 text-center font-arabic">التقرير</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-white/5 font-medium">
                        {top10Data.length === 0 ? (
                          <tr>
                            <td
                              colSpan={isSectionMode ? 9 : 7}
                              className="py-10 text-center text-[#57534E] dark:text-stone-400 text-xs font-arabic"
                            >
                              لا يوجد تلاميذ مكتملو الدرجات في هذا النطاق. تستبعد الدرجات الناقصة من الترتيب.
                            </td>
                          </tr>
                        ) : (
                          top10Data.map((st) => (
                            <tr
                              key={st.id}
                              className="hover:bg-amber-50/40 dark:hover:bg-white/[0.02] cursor-pointer"
                              dir="rtl"
                              onClick={() =>
                                router.push(
                                  `/admin/reports?student_id=${st.student_id}&term_id=${activeTermId}&curriculum=theology`
                                )
                              }
                            >
                              <td className="py-2.5 px-3 text-center font-mono font-black text-amber-700 dark:text-amber-400 text-xs font-arabic">
                                {toArabicNumerals(st.position)}
                              </td>
                              <td className="py-2.5 px-3 font-arabic">
                                <div className="font-extrabold text-[#1C1917] dark:text-white" dir="rtl">{st.arabic_name || st.name}</div>
                                {showEnglishNames && st.arabic_name && <div className="text-[10px] text-[#57534E] dark:text-stone-400 font-sans">{st.name}</div>}
                              </td>
                              {isSectionMode && (
                                <td className="py-2.5 px-3 text-center font-arabic text-xs text-[#57534E] dark:text-stone-300">
                                  {st.className}
                                </td>
                              )}
                              <td className="py-2.5 px-3 text-center font-mono text-[#57534E] dark:text-stone-400">{st.admission_number || '-'}</td>
                              <td className="py-2.5 px-3 text-center font-mono font-black text-[#1C1917] dark:text-white font-arabic" dir="rtl">
                                {st.total != null ? toArabicNumerals(st.total) : '—'}
                              </td>
                              {cohortMetrics.isNormalizedRanking && (
                                <td className="py-2.5 px-3 text-center font-mono font-extrabold text-[#0F4D25] dark:text-emerald-300 font-arabic" dir="rtl">
                                  {st.normalizedScore != null ? `${toArabicNumerals(st.normalizedScore)}٪` : '—'}
                                </td>
                              )}
                              <td className="py-2.5 px-3 text-center font-mono font-extrabold text-[#0D5C3A] dark:text-emerald-400 font-arabic" dir="rtl">
                                {st.aggregate != null ? toArabicNumerals(st.aggregate) : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <RemarkBadge division={st.division} />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <ExternalLink className="w-3.5 h-3.5 text-stone-400 inline-block" strokeWidth={2.25} />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <HubMissingMarksPanel
                  curriculum="theology"
                  missingMarksList={cohortMetrics.missingMarksList}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* ======================================================== */}
      {/* 3. FORMAL INSTITUTIONAL LANDSCAPE PRINT BROADSHEET */}
      {/* Advanced Broadsheet Customization Studio & Multi-Page Flowing Print Portal */}
      <BroadsheetPrintStudioModal
        open={printStudioOpen}
        onClose={() => setPrintStudioOpen(false)}
        onPrint={() => {
          setPrintStudioOpen(false)
          handlePrintBroadsheet()
        }}
        curriculum="theology"
        config={printConfig}
        onChangeConfig={handleChangePrintConfig}
        allStudents={assessmentData.students}
        filteredStudents={filteredStudents}
        subjects={assessmentData.orderedSubjects}
        termLabel={activeTerm?.label || 'الفترة الثالثة'}
        academicYear={activeTerm?.academic_year || 2026}
        classNameLabel={currentScopeLabel}
        sectionLabel={activeSectionObj?.label_arabic || activeSectionObj?.label || undefined}
        examPhase={examPhase}
        summary={broadsheetSummary}
        globalStampDate={globalDefaults.stampDate}
        onResetToGlobalDefaults={resetToGlobalDefaults}
      />

      <PrintPortal
        pageOrientation={
          activeTab === 'detailed_report' || printMode === 'detailed_report'
            ? 'portrait'
            : printConfig.orientation
        }
        pageMargin={
          activeTab === 'detailed_report' || printMode === 'detailed_report'
            ? '10mm'
            : '8mm'
        }
      >
        {activeTab === 'detailed_report' || printMode === 'detailed_report' ? (
          <DetailedReportPrintDocument
            report={detailedReport}
            supportThreshold={supportThreshold}
            globalStampDate={globalDefaults.stampDate}
          />
        ) : (
          <BroadsheetPrintDocument
            curriculum="theology"
            config={printConfig}
            students={printStudents}
            subjects={assessmentData.orderedSubjects}
            termLabel={activeTerm?.label || 'الفترة الثالثة'}
            academicYear={activeTerm?.academic_year || 2026}
            classNameLabel={currentScopeLabel}
            sectionLabel={activeSectionObj?.label_arabic || activeSectionObj?.label || undefined}
            examPhase={examPhase}
            summary={broadsheetSummary}
            globalStampDate={globalDefaults.stampDate}
          />
        )}
      </PrintPortal>
    </div>
  )
}

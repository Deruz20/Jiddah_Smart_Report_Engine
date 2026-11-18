'use client'

import React, { useState, useEffect, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Loader2,
  ScrollText,
  LayoutDashboard,
  Award,
  Download,
  Printer,
  FileSpreadsheet,
  ChevronDown,
  Search,
  Filter,
  Eye,
  Trophy,
  Medal,
  CheckCircle2,
  BarChart3,
  Users,
  TrendingUp,
  Percent,
  Sparkles,
  ExternalLink,
  Layers,
  ArrowLeft,
  Sliders,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { SecularHubEmptyState } from './SecularHubEmptyState'
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
  getDefaultBroadsheetPrintConfig,
  loadBroadsheetPrintConfig,
  saveBroadsheetPrintConfig,
  prepareBroadsheetStudents,
} from '@/lib/broadsheet-print-config'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { downloadCSV, escapeCSV } from '@/utils/csvExport'
import { computeStandardRankings } from '@/lib/ranking'
import { computeHubCohortMetrics } from '@/lib/hub-cohort-engine'
import {
  DEFAULT_HUB_SECTIONS,
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
  getSubjectGradeNumber,
  getGradeDisplay,
  calculateAggregate,
  getDivision,
  isNurseryClass,
  getNurseryGrade,
  computeNurseryBadge,
  type GradeCode,
  type NurseryGrade,
} from '@/lib/grading'

type TermData = {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current: boolean
}

type CircularClassData = {
  id: string
  class_name: string
  section: string
}

// Color-coded UNEB / Nursery grade badge
const SecularGradeBadge = memo(({
  mark,
  grade,
  isNursery,
  customBands,
}: {
  mark: number | null | undefined
  grade?: string | null
  isNursery?: boolean
  customBands?: any[]
}) => {
  if (mark == null || isNaN(Number(mark))) {
    return <span className="text-stone-300 dark:text-stone-700 font-bold">-</span>
  }
  const g = grade || (isNursery ? getNurseryGrade(Number(mark)).grade : getGradeDisplay(getSubjectGradeNumber(Number(mark), customBands)))
  if (g === 'D1' || g === 'D2' || g === 'A') {
    return (
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300/40 print:border-none print:bg-transparent print:text-black">
        {g}
      </span>
    )
  }
  if (g === 'C3' || g === 'C4' || g === 'C5' || g === 'C6' || g === 'B') {
    return (
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-md bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300/40 print:border-none print:bg-transparent print:text-black">
        {g}
      </span>
    )
  }
  if (g === 'P7' || g === 'C') {
    return (
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/40 print:border-none print:bg-transparent print:text-black">
        {g}
      </span>
    )
  }
  if (g === 'P8' || g === 'D') {
    return (
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-md bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border border-orange-300/40 print:border-none print:bg-transparent print:text-black">
        {g}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300/40 print:border-none print:bg-transparent print:text-black">
      {g}
    </span>
  )
})
SecularGradeBadge.displayName = 'SecularGradeBadge'

export default function SecularHubClient({
  terms,
  circularClasses,
  canViewSchoolWideScope = false,
}: {
  terms: TermData[]
  circularClasses: CircularClassData[]
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
      (validInitialSection || initialScope === 'school' ? '' : circularClasses[0]?.id || '')
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
    classCount: circularClasses.length,
  })
  const [printMode, setPrintMode] = useState<'broadsheet' | 'detailed_report'>('broadsheet')

  const [searchQuery, setSearchQuery] = useState('')
  const [divisionFilter, setDivisionFilter] = useState<string>('all')
  const [showGrades, setShowGrades] = useState(true)

  // Advanced print & broadsheet customization state (persisted locally)
  const [printConfig, setPrintConfig] = useState<BroadsheetPrintConfig>(() =>
    getDefaultBroadsheetPrintConfig('secular')
  )
  const [printStudioOpen, setPrintStudioOpen] = useState(false)

  useEffect(() => {
    setPrintConfig(loadBroadsheetPrintConfig('secular'))
  }, [])

  const handleChangePrintConfig = (next: BroadsheetPrintConfig) => {
    setPrintConfig(next)
    saveBroadsheetPrintConfig('secular', next)
  }

  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [isPrinting, setIsPrinting] = useState(false)
  const [data, setData] = useState<{
    enrollments: any[]
    marks: any[]
    subjects: any[]
    classes?: CircularClassData[]
    termMeta?: TermData | null
    unmappedClasses?: any[]
    gradingConfig?: {
      grading_scale?: any[]
      division_boundaries?: any[]
      hub_sections?: any[]
      candidate_class_rules?: any[]
    }
  } | null>(null)

  const effectiveClasses = useMemo(
    () => (data?.classes && data.classes.length > 0 ? data.classes : circularClasses),
    [data?.classes, circularClasses]
  )

  const sectionMapping = useMemo(
    () =>
      mapClassesToSections(
        effectiveClasses,
        'secular',
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

  const isNursery = useMemo(() => {
    if (isSectionMode) return activeSectionId === 'nursery'
    return (
      activeClass?.section?.toLowerCase() === 'nursery' ||
      isNurseryClass(activeClass?.class_name)
    )
  }, [activeClass, activeSectionId, isSectionMode])

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
        { value: '', label: `All ${activeSectionObj?.label || 'Section'} Classes (${sectionClasses.length})` },
        ...sectionClasses.map((t) => ({ value: t.id, label: t.class_name })),
      ]
    }
    return [
      { value: '', label: '-- Select a Class --' },
      ...effectiveClasses.map((t) => ({ value: t.id, label: t.class_name })),
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
          curriculum: 'secular',
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

        const res = await fetch(`/api/secular-hub?${queryParams.toString()}`)
        const ct = res.headers.get('content-type') || ''
        if (!res.ok || !ct.includes('application/json')) {
          const errText = await res.text()
          throw new Error(errText || 'Failed to fetch secular data')
        }
        const json = await res.json()
        if (!cancelled) {
          setData(json)
        }
      } catch (err) {
        console.error('Secular Hub load error:', err)
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Failed to load secular data.'
          setFetchError(msg)
          toast.error('Failed to load secular data. Check database connections.')
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
  }, [activeTermId, activeClassId, activeSectionId, reloadNonce])

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (activeTermId) params.set('term_id', activeTermId)
    if (activeSectionId) params.set('section_id', activeSectionId)
    else params.delete('section_id')
    if (activeClassId) params.set('class_id', activeClassId)
    else params.delete('class_id')
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
  }, [activeTermId, activeSectionId, activeClassId, activeTab, examPhase, reportScope, supportThreshold, pathname, router, searchParams])

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
      curriculum: 'secular',
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

  const broadsheetSummary = useMemo(
    () => (assessmentData.students.length > 0 && assessmentData.orderedSubjects.length > 0 ? cohortMetrics.summary : null),
    [assessmentData.students.length, assessmentData.orderedSubjects.length, cohortMetrics.summary]
  )

  const top10Data = cohortMetrics.top10

  // Filtered students for search & division
  const filteredStudents = useMemo(() => {
    return assessmentData.students.filter((st) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        st.name.toLowerCase().includes(q) ||
        st.className.toLowerCase().includes(q) ||
        (st.admission_number && st.admission_number.toLowerCase().includes(q))

      let matchesDiv = true
      if (!isNursery && divisionFilter !== 'all') {
        if (divisionFilter === 'unranked') {
          matchesDiv = st.position === '-' || st.division === '-'
        } else {
          matchesDiv = st.division === divisionFilter
        }
      }

      return matchesSearch && matchesDiv
    })
  }, [assessmentData.students, searchQuery, divisionFilter, isNursery])

  const printStudents = useMemo(
    () => prepareBroadsheetStudents(assessmentData.students, filteredStudents, printConfig),
    [assessmentData.students, filteredStudents, printConfig]
  )

  const currentScopeLabel = isSectionMode
    ? `${activeSectionObj?.label || activeSectionId} Section`
    : activeClass?.class_name || 'Class'

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
    if (!detailedReport) {
      return toast.error('No detailed report loaded to print.')
    }
    setPrintMode('detailed_report')
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 250)
  }

  const handleExportDetailedReportCsv = () => {
    if (!detailedReport) return
    const csv = buildDetailedReportCsv(detailedReport, supportThreshold)
    const safeScope = detailedReport.meta.scopeLabel.replace(/[^a-zA-Z0-9_-]/g, '_')
    downloadCSV(csv, `Jiddah_Secular_Detailed_Report_${safeScope}_${examPhase.toUpperCase()}.csv`)
  }

  const handleExportCSV = () => {
    if (cohortMetrics.isSingleClassCandidateExcluded) {
      return toast.info('N/A — candidate class: P.7 has no Term 3 EOT.')
    }
    if (!assessmentData.students.length) {
      return toast.error('No assessment data to export.')
    }
    const termLabel = activeTerm ? activeTerm.label.replace(/\s+/g, '_') : 'Term'
    const classLabel = currentScopeLabel.replace(/\s+/g, '_')
    const filename = `Jiddah_Secular_Broadsheet_${classLabel}_${termLabel}_${examPhase.toUpperCase()}_2026.csv`

    const headers = isNursery
      ? [
          'Rank',
          ...(isSectionMode ? ['Class'] : []),
          'Admission No',
          'Student Full Name',
          'Gender',
          ...assessmentData.orderedSubjects.map((s) => `${s.subject_name} (Mark)`),
          ...assessmentData.orderedSubjects.map((s) => `${s.subject_name} (Letter Grade)`),
          'Total Score',
          'Average Score',
          'Overall Grade',
          'Remark',
        ]
      : [
          'Rank',
          ...(isSectionMode ? ['Class'] : []),
          'Admission No',
          'Student Full Name',
          'Gender',
          ...assessmentData.orderedSubjects.map((s) => `${s.subject_name} (Mark)`),
          ...assessmentData.orderedSubjects.map((s) => `${s.subject_name} (Grade)`),
          'Total Score',
          ...(cohortMetrics.isNormalizedRanking ? ['Avg %'] : []),
          'Aggregate',
          'Division',
        ]

    const rows = assessmentData.students.map((st) => {
      if (isNursery) {
        const avg = st.normalizedScore != null ? Math.round(st.normalizedScore) : null
        const gInfo = avg != null ? getNurseryGrade(avg) : null
        return [
          st.position,
          ...(isSectionMode ? [st.className] : []),
          st.admission_number || '-',
          st.name,
          st.gender || '-',
          ...assessmentData.orderedSubjects.map((s) => st.subjectScores[s.id] ?? '-'),
          ...assessmentData.orderedSubjects.map((s) => st.subjectGrades[s.id] ?? '-'),
          st.total != null ? st.total : '-',
          avg != null ? `${avg}%` : '-',
          gInfo?.grade || '-',
          gInfo?.remark || '-',
        ]
      }
      return [
        st.position,
        ...(isSectionMode ? [st.className] : []),
        st.admission_number || '-',
        st.name,
        st.gender || '-',
        ...assessmentData.orderedSubjects.map((s) => st.subjectScores[s.id] ?? '-'),
        ...assessmentData.orderedSubjects.map((s) => st.subjectGrades[s.id] ?? '-'),
        st.total != null ? st.total : '-',
        ...(cohortMetrics.isNormalizedRanking
          ? [st.normalizedScore != null ? `${st.normalizedScore}%` : '-']
          : []),
        st.aggregate ?? '-',
        st.division || '-',
      ]
    })

    if (broadsheetSummary) {
      rows.push([])
      rows.push([
        'SUMMARY',
        '',
        'CLASS AVERAGE',
        '',
        ...assessmentData.orderedSubjects.map((s) => broadsheetSummary.subjectStats[s.id]?.avg ?? '-'),
        ...assessmentData.orderedSubjects.map(() => ''),
        broadsheetSummary.classAverageTotal,
        '',
        '',
      ])
      rows.push([
        'SUMMARY',
        '',
        'PASS RATE (%)',
        '',
        ...assessmentData.orderedSubjects.map((s) => `${broadsheetSummary.subjectStats[s.id]?.passRate ?? 0}%`),
        ...assessmentData.orderedSubjects.map(() => ''),
        '',
        '',
        '',
      ])
    }

    const csvContent = [
      `"JIDDAH ISLAMIC NURSERY & PRIMARY SCHOOL — SECULAR ACADEMIC BROADSHEET"`,
      `"Scope: ${currentScopeLabel} | Section: ${activeSectionObj?.label || activeClass?.section || ''} | Term: ${activeTerm?.label || ''} | Phase: ${examPhase.toUpperCase()} | Generated: ${new Date().toLocaleDateString()}"`,
      '',
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n')

    downloadCSV(csvContent, filename)
    toast.success('Secular Broadsheet exported cleanly to CSV!')
  }

  return (
    <div className="flex flex-col h-full bg-[#FAF7F2] dark:bg-[#0D1411] text-[#1C1917] dark:text-stone-100 font-sans tabular-nums selection:bg-[#0D5C3A] selection:text-white overflow-hidden">
      {/* ======================================================== */}
      {/* 1. REPORT-CENTER-STYLE SINGLE-ROW TOOLBAR */}
      {/* ======================================================== */}
      <div className="print:hidden shrink-0 px-2 sm:px-4 lg:px-6 pt-2 pb-0 w-full max-w-[1920px] mx-auto">
        <div
          data-testid="secular-hub-banner"
          className="w-full h-auto py-2 sm:py-0 sm:h-12 bg-white dark:bg-[#151D1A] rounded-2xl px-2.5 sm:px-3 border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-2xs"
        >
          {/* Row 1 (Mobile) / Left+Right Container */}
          <div className="flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto sm:flex-1">
            {/* Brand + Back (+ inline desktop selectors) */}
            <div className="flex items-center gap-1.5 min-w-0 shrink">
              <Link
                href="/admin"
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft size={16} />
              </Link>

              {/* Title pill */}
              <div className="flex items-center gap-1.5 shrink-0 bg-[#0D5C3A]/10 dark:bg-[#0D5C3A]/20 rounded-lg px-1.5 py-0.5">
                <div className="w-6 h-6 rounded-lg bg-[#0D5C3A] flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-3.5 h-3.5 text-white" strokeWidth={2.25} />
                </div>
                <span className="inline sm:hidden xl:inline text-[11px] sm:text-xs font-black text-stone-800 dark:text-stone-100 tracking-tight whitespace-nowrap">
                  Secular Hub
                </span>
              </div>

              <div className="hidden sm:block w-px h-5 bg-stone-200 dark:bg-white/10 mx-0.5 shrink-0" />

              {/* Desktop inline selectors */}
              <div className="hidden sm:flex items-center gap-1.5 min-w-0">
                <CustomPillSelect
                  id="secular-hub-term-select-desktop"
                  ariaLabel="Academic Term"
                  value={activeTermId}
                  onChange={(val) => setActiveTermId(val)}
                  options={termOptions}
                  className="h-8 w-36 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs font-semibold text-stone-800 dark:text-stone-100"
                />

                <CustomPillSelect
                  id="secular-hub-section-select-desktop"
                  dataTestId="secular-hub-section-select"
                  ariaLabel="Academic Section"
                  value={activeSectionId}
                  onChange={handleSelectSection}
                  options={sectionOptions}
                  placeholder="Section..."
                  className="h-8 w-36 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs font-semibold text-stone-800 dark:text-stone-100"
                />

                <CustomPillSelect
                  id="secular-hub-class-select-desktop"
                  ariaLabel="Class Cohort"
                  value={activeClassId}
                  onChange={handleSelectClass}
                  options={classOptions}
                  placeholder="Select Class..."
                  className="h-8 w-40 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs font-semibold text-stone-800 dark:text-stone-100"
                />
              </div>
            </div>

            {/* Mobile right actions */}
            <div className="flex sm:hidden items-center gap-1 shrink-0">
              <button
                onClick={activeTab === 'detailed_report' ? handleExportDetailedReportCsv : handleExportCSV}
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
                onClick={activeTab === 'detailed_report' ? handlePrintDetailedReport : handlePrintBroadsheet}
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

          {/* Mobile Row 2: 3-column selectors without overlap or clipping */}
          <div className="grid sm:hidden grid-cols-3 gap-1.5 w-full">
            <CustomPillSelect
              id="secular-hub-term-select"
              ariaLabel="Academic Term"
              value={activeTermId}
              onChange={(val) => setActiveTermId(val)}
              options={termOptions}
              className="h-8 w-full min-w-0 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-[11px] font-semibold text-stone-800 dark:text-stone-100"
            />

            <CustomPillSelect
              id="secular-hub-section-select"
              dataTestId="secular-hub-section-select-mobile"
              ariaLabel="Academic Section"
              value={activeSectionId}
              onChange={handleSelectSection}
              options={sectionOptions}
              placeholder="Section..."
              className="h-8 w-full min-w-0 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-[11px] font-semibold text-stone-800 dark:text-stone-100"
            />

            <CustomPillSelect
              id="secular-hub-class-select"
              ariaLabel="Class Cohort"
              value={activeClassId}
              onChange={handleSelectClass}
              options={classOptions}
              placeholder="Class..."
              className="h-8 w-full min-w-0 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-[11px] font-semibold text-stone-800 dark:text-stone-100"
            />
          </div>

          {/* CENTER: Exam Phase + View Mode — hidden on mobile, shown sm+ */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {/* Exam Phase — inline pill group */}
            <div className="flex items-center bg-stone-100 dark:bg-white/5 rounded-full p-0.5 border border-stone-200/80 dark:border-white/10 gap-0.5">
              {(['bot', 'mot', 'eot'] as const).map((phase) => (
                <button
                  key={phase}
                  type="button"
                  onClick={() => setExamPhase(phase)}
                  className={`h-7 px-2.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
                    examPhase === phase
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
                className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === 'assessment'
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
                className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === 'analysis'
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
                className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === 'top_students'
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
                className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === 'detailed_report'
                    ? 'bg-[#0F4D25] text-white shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3 h-3" strokeWidth={2.25} />
                <span>Detailed Report</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Export CSV + Customize + Print Broadsheet (Desktop sm+) */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              onClick={activeTab === 'detailed_report' ? handleExportDetailedReportCsv : handleExportCSV}
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
              className="h-8 px-2.5 rounded-full bg-[#D97706]/12 text-[#B45309] dark:bg-[#F59E0B]/20 dark:text-[#FCD34D] border border-[#D97706]/30 hover:bg-[#D97706]/20 dark:hover:bg-[#F59E0B]/30 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition disabled:opacity-40 shrink-0 focus:outline-none focus:ring-2 focus:ring-[#D97706]"
            >
              <Sliders className="size-3.5" />
              <span className="hidden xl:inline font-bold text-[11px]">Customize</span>
            </button>

            <button
              onClick={activeTab === 'detailed_report' ? handlePrintDetailedReport : handlePrintBroadsheet}
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
              className={`h-7 px-3 rounded-full text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                examPhase === phase
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
            className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              activeTab === 'assessment'
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
            className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              activeTab === 'analysis'
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
            className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              activeTab === 'top_students'
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
            className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              activeTab === 'detailed_report'
                ? 'bg-[#0F4D25] text-white shadow-xs'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3 h-3" strokeWidth={2.25} />
            <span>Detailed Report</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE AREA */}
      {/* ======================================================== */}
      <main className="flex-1 min-h-0 w-full max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6 pt-2 pb-2 flex flex-col min-w-0 overflow-hidden">
        {activeTab === 'detailed_report' ? (
          <HubDetailedReportView
            curriculum="secular"
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
            <p className="mt-4 text-xs font-bold text-[#57534E] dark:text-stone-400 uppercase tracking-widest">
              Loading Secular Broadsheet &amp; Calculating Cohort Analytics...
            </p>
          </div>
        ) : fetchError && !data ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <HubDataQualityBanners
              curriculum="secular"
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
          <SecularHubEmptyState />
        ) : cohortMetrics.isSingleClassCandidateExcluded ? (
          <div className="flex-1 overflow-y-auto px-2 py-4">
            <HubCandidateNaCard
              curriculum="secular"
              classLabel={currentScopeLabel}
              termLabel={activeTerm?.label || 'Term 3'}
              badge={cohortMetrics.candidateExclusionBadge}
              reason={cohortMetrics.candidateExclusionReason}
              onSwitchExamPhase={(next) => setExamPhase(next)}
            />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* VIEW 1: BROADSHEET TABLE */}
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
                  curriculum="secular"
                  fetchError={fetchError}
                  onRetry={() => setReloadNonce((n) => n + 1)}
                  unmappedClasses={sectionMapping.unmappedClasses}
                  candidateExclusions={cohortMetrics.candidateExclusions}
                  rankingMethodLabel={cohortMetrics.rankingMethodLabel}
                  rankingMethodLabelArabic={cohortMetrics.rankingMethodLabelArabic}
                  isNormalizedRanking={cohortMetrics.isNormalizedRanking}
                  showRankingMethod={isSectionMode || cohortMetrics.missingMarksList.length > 0}
                />

                {/* Search, Filter & Quick-Stats Strip */}
                <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#151F1B] border border-[#E7E5E4] dark:border-white/10 shadow-xs">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <div className="relative flex-1">
                      <Search
                        className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2"
                        strokeWidth={2.25}
                      />
                      <input
                        type="text"
                        placeholder="Search student by name or admission #..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-[10px] text-xs bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#0D5C3A]"
                      />
                    </div>
                  </div>

                  {/* Division Filter Pills or Nursery Indicator */}
                  {isNursery ? (
                    <div className="flex items-center gap-1.5 text-xs py-0.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md bg-[#0D5C3A]/10 text-[#0D5C3A] dark:text-emerald-400 border border-[#0D5C3A]/20">
                        Nursery Letter Scale (A - E)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 overflow-x-auto text-xs py-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mr-1 shrink-0">
                        Division:
                      </span>
                      {(['all', 'I', 'II', 'III', 'IV', 'U'] as const).map((div) => (
                        <button
                          key={div}
                          onClick={() => setDivisionFilter(div)}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                            divisionFilter === div
                              ? 'bg-[#0D5C3A] text-white shadow-xs'
                              : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
                          }`}
                        >
                          {div === 'all' ? 'All' : `Div ${div}`}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Toggle: Grades vs Scores Only */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowGrades(!showGrades)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold border border-[#0D5C3A]/20 dark:border-white/10 bg-emerald-50/60 dark:bg-emerald-950/30 text-[#0D5C3A] dark:text-emerald-300 hover:bg-emerald-100/60 transition-colors"
                    >
                      {showGrades ? 'Hide Subject Grades' : 'Show Subject Grades'}
                    </button>
                  </div>
                </div>

                {/* Broadsheet Container with Full-Viewport Flex Height */}
                <div className="flex-1 min-h-0 rounded-2xl border border-[#0D5C3A]/15 dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-xs overflow-hidden flex flex-col">
                  <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
                    <table className="w-full text-left border-collapse text-xs">
                      {/* Table Header */}
                      <thead className="sticky top-0 z-10 bg-stone-100/90 dark:bg-[#1A2621]/90 backdrop-blur-md text-stone-700 dark:text-stone-200 border-b border-stone-200 dark:border-white/10">
                        <tr>
                          <th className="sticky top-0 left-0 z-30 bg-stone-100 dark:bg-[#1A2621] py-2.5 px-1.5 sm:px-3 font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider text-center w-10 sm:w-12 min-w-[40px] sm:min-w-[48px] max-w-[40px] sm:max-w-[48px] border-r border-stone-200 dark:border-white/10">
                            #
                          </th>
                          <th className="sticky top-0 left-10 sm:left-12 z-30 bg-stone-100 dark:bg-[#1A2621] py-2.5 px-2 sm:px-3 font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider min-w-[130px] sm:min-w-[200px] border-r border-stone-200 dark:border-white/10">
                            Student Name &amp; ID
                          </th>
                          {assessmentData.orderedSubjects.map((sub) => (
                            <th
                              key={sub.id}
                              colSpan={showGrades ? 2 : 1}
                              className="py-2.5 px-2 font-bold text-[11px] text-center border-r border-stone-200 dark:border-white/10 min-w-[90px]"
                            >
                              <div className="font-extrabold text-[#0D5C3A] dark:text-emerald-400">
                                {sub.subject_name}
                              </div>
                              <div className="text-[9px] uppercase tracking-tight text-stone-400 dark:text-stone-500 font-sans">
                                {examPhase.toUpperCase()} Mark
                              </div>
                            </th>
                          ))}
                          <th className="py-2.5 px-2.5 font-black text-[11px] text-center bg-stone-200/50 dark:bg-white/5 border-r border-stone-200 dark:border-white/10 min-w-[70px]">
                            Total
                          </th>
                          {cohortMetrics.isNormalizedRanking && !isNursery && (
                            <th className="py-2.5 px-2 font-black text-[11px] text-center bg-emerald-50/70 dark:bg-emerald-950/30 text-[#0F4D25] dark:text-emerald-300 border-r border-stone-200 dark:border-white/10 min-w-[65px]">
                              Avg %
                            </th>
                          )}
                          {!isNursery && (
                            <>
                              <th className="py-2.5 px-2 font-black text-[11px] text-center bg-stone-200/50 dark:bg-white/5 border-r border-stone-200 dark:border-white/10 min-w-[60px]">
                                Agg
                              </th>
                              <th className="py-2.5 px-2 font-black text-[11px] text-center bg-stone-200/50 dark:bg-white/5 border-r border-stone-200 dark:border-white/10 min-w-[60px]">
                                Div
                              </th>
                            </>
                          )}
                          {isNursery && (
                            <>
                              <th className="py-2.5 px-2 font-black text-[11px] text-center bg-stone-200/50 dark:bg-white/5 border-r border-stone-200 dark:border-white/10 min-w-[60px]">
                                Average
                              </th>
                              <th className="py-2.5 px-2 font-black text-[11px] text-center bg-stone-200/50 dark:bg-white/5 border-r border-stone-200 dark:border-white/10 min-w-[60px]">
                                Grade
                              </th>
                            </>
                          )}
                          <th className="py-2.5 px-2.5 font-black text-[11px] text-center bg-amber-500/10 dark:bg-amber-400/10 text-amber-800 dark:text-amber-300 min-w-[55px]">
                            Rank
                          </th>
                          <th className="py-2.5 px-2 text-center text-[10px] uppercase font-bold text-stone-400 min-w-[60px]">
                            Report
                          </th>
                        </tr>
                      </thead>

                      {/* Table Body */}
                      <tbody className="divide-y divide-stone-100 dark:divide-white/5">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td
                              colSpan={assessmentData.orderedSubjects.length * (showGrades ? 2 : 1) + (cohortMetrics.isNormalizedRanking && !isNursery ? 7 : 6)}
                              className="text-center py-12 text-[#57534E] dark:text-stone-400 font-medium text-xs"
                            >
                              {assessmentData.students.length === 0
                                ? 'No enrolled pupils found in this scope for the selected term.'
                                : 'No students found matching current search or division filters.'}
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((st, idx) => (
                            <tr
                              key={st.id}
                              className="hover:bg-[#0D5C3A]/[0.03] dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                              onClick={() => {
                                router.push(`/admin/reports?student_id=${st.student_id}&term_id=${activeTermId}&curriculum=secular`)
                              }}
                            >
                              {/* Sticky Index */}
                              <td className="sticky left-0 z-10 bg-white dark:bg-[#151F1B] group-hover:bg-stone-50 dark:group-hover:bg-[#1A2621] py-2 px-1.5 sm:px-3 text-center font-bold text-[#57534E] dark:text-stone-400 text-[11px] sm:text-xs border-r border-stone-100 dark:border-white/5 w-10 sm:w-12 min-w-[40px] sm:min-w-[48px] max-w-[40px] sm:max-w-[48px]">
                                {idx + 1}
                              </td>

                              {/* Sticky Student Name & ID */}
                              <td className="sticky left-10 sm:left-12 z-10 bg-white dark:bg-[#151F1B] group-hover:bg-stone-50 dark:group-hover:bg-[#1A2621] py-2 px-2 sm:px-3 border-r border-stone-100 dark:border-white/5 min-w-[130px] sm:min-w-[200px] max-w-[160px] sm:max-w-none">
                                <div className="font-bold text-[#1C1917] dark:text-stone-100 text-xs truncate sm:whitespace-normal">
                                  {st.name}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-[#57534E] dark:text-stone-400 font-mono truncate">
                                  <span>{st.admission_number || 'No ID'}</span>
                                  {isSectionMode && (
                                    <span className="px-1.5 py-0.2 rounded bg-[#EFE9DF] dark:bg-white/10 text-[#1C1917] dark:text-stone-200 font-sans font-semibold">
                                      {st.className}
                                    </span>
                                  )}
                                  {!st.isCompleteMarks && !st.isCandidateExcluded && st.expectedSubjectCount > 0 && (
                                    <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 font-sans font-bold">
                                      {st.satSubjectCount}/{st.expectedSubjectCount}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Subject Columns */}
                              {assessmentData.orderedSubjects.map((sub) => {
                                const score = st.subjectScores[sub.id]
                                return (
                                  <React.Fragment key={sub.id}>
                                    <td className="py-2 px-2 text-center font-mono font-bold text-xs text-stone-800 dark:text-stone-200 border-r border-stone-100 dark:border-white/5">
                                      {score != null ? score : '-'}
                                    </td>
                                    {showGrades && (
                                      <td className="py-2 px-1 text-center border-r border-stone-100 dark:border-white/5">
                                        <SecularGradeBadge mark={score} grade={st.subjectGrades[sub.id]} isNursery={isNursery} />
                                      </td>
                                    )}
                                  </React.Fragment>
                                )
                              })}

                              {/* Total */}
                              <td className="py-2 px-2.5 text-center font-mono font-black text-xs text-[#1C1917] dark:text-white bg-stone-50/50 dark:bg-white/[0.02] border-r border-stone-100 dark:border-white/5">
                                {st.total != null ? st.total : '-'}
                              </td>

                              {cohortMetrics.isNormalizedRanking && !isNursery && (
                                <td className="py-2 px-2 text-center font-mono font-extrabold text-xs text-[#0F4D25] dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/15 border-r border-stone-100 dark:border-white/5">
                                  {st.normalizedScore != null ? `${st.normalizedScore}%` : '-'}
                                </td>
                              )}

                              {isNursery ? (
                                <>
                                  {/* Nursery Average Score */}
                                  <td className="py-2 px-2 text-center font-mono font-black text-xs text-[#0D5C3A] dark:text-emerald-400 bg-stone-50/50 dark:bg-white/[0.02] border-r border-stone-100 dark:border-white/5">
                                    {st.normalizedScore != null ? `${Math.round(st.normalizedScore)}%` : '-'}
                                  </td>
                                  {/* Nursery Letter Grade Badge */}
                                  <td className="py-2 px-2 text-center border-r border-stone-100 dark:border-white/5">
                                    {st.normalizedScore != null ? (
                                      (() => {
                                        const avg = Math.round(st.normalizedScore)
                                        const badge = computeNurseryBadge(avg)
                                        return badge ? (
                                          <span
                                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black ${badge.bg} ${badge.text}`}
                                            title={`${badge.grade}: ${badge.remark} (${avg}%)`}
                                          >
                                            {badge.grade}
                                          </span>
                                        ) : (
                                          <span className="text-stone-300 dark:text-stone-600 font-bold">-</span>
                                        )
                                      })()
                                    ) : (
                                      <span className="text-stone-300 dark:text-stone-600 font-bold">-</span>
                                    )}
                                  </td>
                                </>
                              ) : (
                                <>
                                  {/* Aggregate */}
                                  <td className="py-2 px-2 text-center font-mono font-extrabold text-xs text-[#0D5C3A] dark:text-emerald-400 bg-stone-50/50 dark:bg-white/[0.02] border-r border-stone-100 dark:border-white/5">
                                    {st.aggregate ?? '-'}
                                  </td>
                                  {/* Division */}
                                  <td className="py-2 px-2 text-center font-bold text-xs border-r border-stone-100 dark:border-white/5">
                                    <span
                                      className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black ${
                                        st.division === 'I'
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                          : st.division === 'II'
                                          ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                          : st.division === 'III'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                          : st.division === 'IV'
                                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                          : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                                      }`}
                                    >
                                      {st.division}
                                    </span>
                                  </td>
                                </>
                              )}

                              {/* Rank */}
                              <td className="py-2 px-2.5 text-center font-mono font-black text-xs text-amber-800 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-400/[0.03]">
                                {st.position}
                              </td>

                              {/* Jump to Report Card */}
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(
                                      `/admin/reports?student_id=${st.student_id}&term_id=${activeTermId}&curriculum=secular`
                                    )
                                  }}
                                  className="p-1 rounded-md text-stone-400 hover:text-[#0D5C3A] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                                  title="View Report Card"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.25} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>

                      {/* Pinned Summary Statistics Footer */}
                      {broadsheetSummary && (
                        <tfoot className="sticky bottom-0 z-10 bg-stone-100 dark:bg-[#1A2621] font-bold text-stone-800 dark:text-stone-200 border-t-2 border-[#0D5C3A]/30">
                          {/* Row 1: Class Averages */}
                          <tr>
                            <td
                              colSpan={2}
                              className="sticky left-0 bottom-0 z-30 bg-stone-100 dark:bg-[#1A2621] py-2 px-2 sm:px-3 text-right text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold text-[#0D5C3A] dark:text-emerald-400 border-r border-stone-200 dark:border-white/10"
                            >
                              Class Average
                            </td>
                            {assessmentData.orderedSubjects.map((sub) => {
                              const stat = broadsheetSummary.subjectStats[sub.id]
                              return (
                                <React.Fragment key={sub.id}>
                                  <td className="py-2 px-2 text-center font-mono font-extrabold text-xs border-r border-stone-200 dark:border-white/10">
                                    {stat ? stat.avg : '-'}
                                  </td>
                                  {showGrades && (
                                    <td className="py-2 px-1 text-center border-r border-stone-200 dark:border-white/10">
                                      <SecularGradeBadge mark={stat?.avg} isNursery={isNursery} customBands={data?.gradingConfig?.grading_scale} />
                                    </td>
                                  )}
                                </React.Fragment>
                              )
                            })}
                            <td className="py-2 px-2.5 text-center font-mono font-black text-xs text-[#0D5C3A] dark:text-emerald-400 border-r border-stone-200 dark:border-white/10">
                              {broadsheetSummary.classAverageTotal}
                            </td>
                            {cohortMetrics.isNormalizedRanking && !isNursery && (
                              <td className="py-2 px-2 text-center font-mono font-extrabold text-xs text-[#0F4D25] dark:text-emerald-400 border-r border-stone-200 dark:border-white/10">
                                {broadsheetSummary.meanNormalizedPct != null
                                  ? `${broadsheetSummary.meanNormalizedPct}%`
                                  : '-'}
                              </td>
                            )}
                            <td colSpan={4} className="py-2 px-2 text-center text-[10px] text-[#57534E] dark:text-stone-400">
                              {isNursery
                                ? `Class Mean: ${broadsheetSummary.nurseryOverallAvg}% • A+B: ${broadsheetSummary.nurseryExcellenceCount}`
                                : `Mean: ${broadsheetSummary.classAverageTotal}`}
                            </td>
                          </tr>

                          {/* Row 2: Pass Rate */}
                          <tr className="text-stone-600 dark:text-stone-400 text-[10px]">
                            <td
                              colSpan={2}
                              className="sticky left-0 bottom-0 z-30 bg-stone-100 dark:bg-[#1A2621] py-1.5 px-2 sm:px-3 text-right uppercase tracking-wider font-bold border-r border-stone-200 dark:border-white/10"
                            >
                              Pass Rate (≥50%)
                            </td>
                            {assessmentData.orderedSubjects.map((sub) => {
                              const stat = broadsheetSummary.subjectStats[sub.id]
                              return (
                                <React.Fragment key={sub.id}>
                                  <td
                                    colSpan={showGrades ? 2 : 1}
                                    className="py-1.5 px-1 text-center font-mono font-bold text-[10px] border-r border-stone-200 dark:border-white/10 text-emerald-700 dark:text-emerald-400"
                                  >
                                    {stat ? `${stat.passRate}%` : '-'}
                                  </td>
                                </React.Fragment>
                              )
                            })}
                            <td
                              colSpan={cohortMetrics.isNormalizedRanking && !isNursery ? 6 : 5}
                              className="py-1.5 px-2 text-center text-[10px] text-[#57534E] dark:text-stone-400"
                            >
                              Complete Marks: {broadsheetSummary.satCandidates} / {broadsheetSummary.totalCandidates}
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
                {/* 4 Executive KPI Cards */}
                <HubDataQualityBanners
                  curriculum="secular"
                  fetchError={fetchError}
                  onRetry={() => setReloadNonce((n) => n + 1)}
                  unmappedClasses={sectionMapping.unmappedClasses}
                  candidateExclusions={cohortMetrics.candidateExclusions}
                  rankingMethodLabel={cohortMetrics.rankingMethodLabel}
                  rankingMethodLabelArabic={cohortMetrics.rankingMethodLabelArabic}
                  isNormalizedRanking={cohortMetrics.isNormalizedRanking}
                />

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#57534E] dark:text-stone-400">Total Enrolled</p>
                      <h3 className="text-2xl font-black text-[#1C1917] dark:text-white mt-1">
                        {broadsheetSummary ? broadsheetSummary.totalCandidates : 0}
                      </h3>
                      <p className="text-[10px] text-[#57534E] dark:text-stone-400 mt-0.5">
                        {isSectionMode
                          ? `${activeSectionObj?.label || activeSectionId} (${cohortMetrics.classBreakdown.filter((c) => !c.isCandidateExcluded).length} active classes)`
                          : `${activeClass?.section || 'Secular'} Section`}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-[#0D5C3A] dark:text-emerald-400">
                      <Users className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                  </div>

                  <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#57534E] dark:text-stone-400">
                        {cohortMetrics.isNormalizedRanking ? 'Mean Normalized %' : 'Class Mean Total'}
                      </p>
                      <h3 className="text-2xl font-black text-[#1C1917] dark:text-white mt-1">
                        {cohortMetrics.isNormalizedRanking
                          ? `${broadsheetSummary?.meanNormalizedPct ?? 0}%`
                          : broadsheetSummary
                            ? broadsheetSummary.classAverageTotal
                            : 0}
                      </h3>
                      <p className="text-[10px] text-[#57534E] dark:text-stone-400 mt-0.5">
                        High: {broadsheetSummary?.highestTotal || 0} · Sat: {broadsheetSummary?.satCandidates || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <TrendingUp className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                  </div>

                  {isNursery ? (
                    <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#57534E] dark:text-stone-400">Grade A &amp; B Excellence</p>
                        <h3 className="text-2xl font-black text-[#0D5C3A] dark:text-emerald-400 mt-1">
                          {broadsheetSummary?.nurseryExcellenceCount ?? 0}
                        </h3>
                        <p className="text-[10px] text-[#57534E] dark:text-stone-400 mt-0.5">
                          {broadsheetSummary?.nurseryExcellencePct ?? 0}% of cohort (Mastery Tier)
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <Percent className="w-5 h-5" strokeWidth={2.25} />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#57534E] dark:text-stone-400">Div I &amp; II Distinction</p>
                        <h3 className="text-2xl font-black text-[#0D5C3A] dark:text-emerald-400 mt-1">
                          {(broadsheetSummary?.divCounts.I || 0) + (broadsheetSummary?.divCounts.II || 0)}
                        </h3>
                        <p className="text-[10px] text-[#57534E] dark:text-stone-400 mt-0.5">
                          {broadsheetSummary && broadsheetSummary.satCandidates > 0
                            ? Math.round(
                                (((broadsheetSummary.divCounts.I || 0) + (broadsheetSummary.divCounts.II || 0)) /
                                  broadsheetSummary.satCandidates) *
                                  100
                              )
                            : 0}
                          % of ranked pupils
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <Percent className="w-5 h-5" strokeWidth={2.25} />
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#57534E] dark:text-stone-400">Marks Completion ({examPhase.toUpperCase()})</p>
                      <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        {broadsheetSummary ? `${broadsheetSummary.completionPct}%` : '0%'}
                      </h3>
                      <p className="text-[10px] text-[#57534E] dark:text-stone-400 mt-0.5">{currentScopeLabel}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <Sparkles className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                  </div>
                </div>

                {/* Class-by-Class Comparison & Reconciliation Table */}
                <HubClassBreakdownTable
                  curriculum="secular"
                  classBreakdown={cohortMetrics.classBreakdown}
                  sectionTitle={isSectionMode ? activeSectionObj?.label || String(activeSectionId) : activeClass?.class_name}
                />

                {/* Missing Marks List (Excluded from Rank) */}
                <HubMissingMarksPanel
                  curriculum="secular"
                  missingMarksList={cohortMetrics.missingMarksList}
                />

                {/* Subject Performance Matrix Table */}
                <div className="rounded-2xl border border-[#0D5C3A]/12 dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-xs p-5">
                  <h3 className="text-sm font-extrabold text-stone-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#0D5C3A]" strokeWidth={2.25} />
                    <span>Secular Subject Performance Breakdown</span>
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-stone-200 dark:border-white/10 text-stone-400 text-[10px] font-extrabold uppercase tracking-wider">
                          <th className="py-2 px-3">Subject Name</th>
                          <th className="py-2 px-3 text-center">Mean Score</th>
                          <th className="py-2 px-3 text-center">Highest Mark</th>
                          <th className="py-2 px-3 text-center">Lowest Mark</th>
                          <th className="py-2 px-3 text-center">Pass Rate (≥50%)</th>
                          <th className="py-2 px-3 min-w-[140px]">Performance Bar</th>
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
                                <div className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                                  {sub.subject_name}
                                </div>
                                <div className="text-[10px] text-stone-400">{sub.section || activeClass?.section}</div>
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-xs">{avg}</td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-xs text-emerald-600">
                                {stat?.highest || 0}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-xs text-rose-600">
                                {stat?.lowest || 0}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-xs">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  {passRate}%
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

                {/* Division Distribution Breakdown */}
                {broadsheetSummary && !isNursery && (
                  <div className="rounded-2xl border border-[#0D5C3A]/12 dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-xs p-5">
                    <h3 className="text-sm font-extrabold text-stone-900 dark:text-white uppercase tracking-wider mb-3">
                      UNEB Division Classification Cohort
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                      {(['I', 'II', 'III', 'IV', 'U'] as const).map((div) => {
                        const count = broadsheetSummary.divCounts[div] || 0
                        const pct =
                          broadsheetSummary.totalCandidates > 0
                            ? Math.round((count / broadsheetSummary.totalCandidates) * 100)
                            : 0
                        return (
                          <div
                            key={div}
                            className="p-3 rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.02] text-center"
                          >
                            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                              Division {div}
                            </span>
                            <div className="text-xl font-black text-stone-900 dark:text-white mt-1">{count}</div>
                            <div className="text-[10px] font-bold text-[#0D5C3A] dark:text-emerald-400">{pct}%</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Nursery Grade Cohort */}
                {broadsheetSummary && isNursery && (
                  <div className="rounded-2xl border border-[#0D5C3A]/12 dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-xs p-5">
                    <h3 className="text-sm font-extrabold text-stone-900 dark:text-white uppercase tracking-wider mb-3">
                      Nursery Letter Grade Classification Cohort
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                      {(['A', 'B', 'C', 'D', 'E'] as const).map((grade) => {
                        const count = broadsheetSummary.nurseryGradeCounts[grade] || 0
                        const pct = broadsheetSummary.totalCandidates > 0
                          ? Math.round((count / broadsheetSummary.totalCandidates) * 100)
                          : 0
                        const colorMap: Record<string, string> = {
                          A: 'text-emerald-700 dark:text-emerald-400',
                          B: 'text-sky-700 dark:text-sky-400',
                          C: 'text-amber-700 dark:text-amber-400',
                          D: 'text-orange-700 dark:text-orange-400',
                          E: 'text-rose-700 dark:text-rose-400',
                        }
                        return (
                          <div
                            key={grade}
                            className="p-3 rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.02] text-center"
                          >
                            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">Grade {grade}</span>
                            <div className={`text-xl font-black mt-1 ${colorMap[grade]}`}>{count}</div>
                            <div className="text-[10px] font-bold text-stone-500">{pct}%</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
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
                  curriculum="secular"
                  fetchError={fetchError}
                  onRetry={() => setReloadNonce((n) => n + 1)}
                  unmappedClasses={sectionMapping.unmappedClasses}
                  candidateExclusions={cohortMetrics.candidateExclusions}
                  rankingMethodLabel={cohortMetrics.rankingMethodLabel}
                  rankingMethodLabelArabic={cohortMetrics.rankingMethodLabelArabic}
                  isNormalizedRanking={cohortMetrics.isNormalizedRanking}
                />

                {/* Podium Cards for Top 3 */}
                {top10Data.length >= 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-4">
                    {/* 2nd Place Silver */}
                    <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-slate-300/60 dark:border-white/10 shadow-md text-center flex flex-col items-center order-2 md:order-1">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center shadow-inner mb-2">
                        <Medal className="w-6 h-6" strokeWidth={2.25} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">2nd Place</span>
                      <h4 className="font-bold text-[#1C1917] dark:text-white text-sm mt-1">{top10Data[1].name}</h4>
                      <p className="text-xs text-[#57534E] dark:text-stone-400 font-mono mt-0.5">
                        {isSectionMode ? `${top10Data[1].className} · ` : ''}{top10Data[1].admission_number || 'ID'}
                      </p>
                      <div className="mt-2 text-xs font-mono font-black text-slate-700 dark:text-slate-300">
                        {cohortMetrics.isNormalizedRanking && top10Data[1].normalizedScore != null
                          ? `${top10Data[1].normalizedScore}% (${top10Data[1].total} pts)`
                          : `${top10Data[1].total} pts`}
                        {isNursery && top10Data[1].normalizedScore != null
                          ? ` • ${computeNurseryBadge(Math.round(top10Data[1].normalizedScore))?.grade ?? ''}`
                          : !isNursery
                            ? ` • Div ${top10Data[1].division}`
                            : ''}
                      </div>
                    </div>

                    {/* 1st Place Gold */}
                    <div className="rounded-2xl p-5 bg-[linear-gradient(135deg_in_oklch,oklch(0.92_0.07_80)_0%,oklch(0.85_0.12_75)_100%)] dark:bg-[linear-gradient(135deg_in_oklch,oklch(0.40_0.10_80)_0%,oklch(0.30_0.08_75)_100%)] border border-amber-400 shadow-xl text-center flex flex-col items-center order-1 md:order-2 scale-105 z-10">
                      <div className="w-14 h-14 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-md mb-2">
                        <Trophy className="w-7 h-7" strokeWidth={2.25} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                        {isSectionMode ? `${activeSectionObj?.label || 'Section'} Champion — 1st Place` : 'Class Champion — 1st Place'}
                      </span>
                      <h3 className="font-black text-[#1C1917] dark:text-white text-base mt-1">{top10Data[0].name}</h3>
                      <p className="text-xs text-amber-900 dark:text-amber-300 font-mono mt-0.5">
                        {isSectionMode ? `${top10Data[0].className} · ` : ''}{top10Data[0].admission_number || 'ID'}
                      </p>
                      <div className="mt-2.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-950 dark:text-amber-200 text-xs font-mono font-black">
                        {cohortMetrics.isNormalizedRanking && top10Data[0].normalizedScore != null
                          ? `${top10Data[0].normalizedScore}% (${top10Data[0].total} pts)`
                          : `${top10Data[0].total} pts`}
                        {isNursery && top10Data[0].normalizedScore != null
                          ? ` • ${computeNurseryBadge(Math.round(top10Data[0].normalizedScore))?.grade ?? ''}`
                          : !isNursery
                            ? ` • Div ${top10Data[0].division} (Agg ${top10Data[0].aggregate ?? '-'})`
                            : ''}
                      </div>
                    </div>

                    {/* 3rd Place Bronze */}
                    <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-amber-600/30 dark:border-white/10 shadow-md text-center flex flex-col items-center order-3">
                      <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center shadow-inner mb-2">
                        <Award className="w-6 h-6" strokeWidth={2.25} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">3rd Place</span>
                      <h4 className="font-bold text-[#1C1917] dark:text-white text-sm mt-1">{top10Data[2].name}</h4>
                      <p className="text-xs text-[#57534E] dark:text-stone-400 font-mono mt-0.5">
                        {isSectionMode ? `${top10Data[2].className} · ` : ''}{top10Data[2].admission_number || 'ID'}
                      </p>
                      <div className="mt-2 text-xs font-mono font-black text-amber-800 dark:text-amber-400">
                        {cohortMetrics.isNormalizedRanking && top10Data[2].normalizedScore != null
                          ? `${top10Data[2].normalizedScore}% (${top10Data[2].total} pts)`
                          : `${top10Data[2].total} pts`}
                        {isNursery && top10Data[2].normalizedScore != null
                          ? ` • ${computeNurseryBadge(Math.round(top10Data[2].normalizedScore))?.grade ?? ''}`
                          : !isNursery
                            ? ` • Div ${top10Data[2].division}`
                            : ''}
                      </div>
                    </div>
                  </div>
                )}

                {/* Top 10 Table */}
                <div className="rounded-2xl border border-[#0D5C3A]/15 dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-[#E7E5E4] dark:border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#1C1917] dark:text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" strokeWidth={2.25} />
                      <span>
                        {isSectionMode
                          ? `Official Top 10 Merit Roll — ${activeSectionObj?.label || activeSectionId}`
                          : 'Official Top 10 Academic Merit Roll'}
                      </span>
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E7E5E4] dark:border-white/10 text-[#57534E] dark:text-stone-400 text-[10px] font-extrabold uppercase tracking-wider bg-[#FAF7F2] dark:bg-white/[0.02]">
                          <th className="py-2.5 px-3 text-center w-12">Rank</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          {isSectionMode && <th className="py-2.5 px-3 text-center">Class</th>}
                          <th className="py-2.5 px-3 text-center">Admission #</th>
                          <th className="py-2.5 px-3 text-center">Gender</th>
                          <th className="py-2.5 px-3 text-center">Total Marks</th>
                          {cohortMetrics.isNormalizedRanking && !isNursery && (
                            <th className="py-2.5 px-3 text-center">Avg %</th>
                          )}
                          {isNursery ? (
                            <>
                              <th className="py-2.5 px-3 text-center">Average Score</th>
                              <th className="py-2.5 px-3 text-center">Overall Grade</th>
                            </>
                          ) : (
                            <>
                              <th className="py-2.5 px-3 text-center">Aggregate</th>
                              <th className="py-2.5 px-3 text-center">Division</th>
                            </>
                          )}
                          <th className="py-2.5 px-3 text-center">Report</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-white/5 font-medium">
                        {top10Data.length === 0 ? (
                          <tr>
                            <td
                              colSpan={isSectionMode ? 10 : 8}
                              className="py-10 text-center text-[#57534E] dark:text-stone-400 text-xs"
                            >
                              No pupils with complete marks in this scope yet. Missing marks are excluded from ranking.
                            </td>
                          </tr>
                        ) : (
                          top10Data.map((st) => (
                            <tr
                              key={st.id}
                              className="hover:bg-amber-50/40 dark:hover:bg-white/[0.02] cursor-pointer"
                              onClick={() =>
                                router.push(
                                  `/admin/reports?student_id=${st.student_id}&term_id=${activeTermId}&curriculum=secular`
                                )
                              }
                            >
                              <td className="py-2.5 px-3 text-center font-mono font-black text-amber-700 dark:text-amber-400 text-xs">
                                {st.position}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[#1C1917] dark:text-white">{st.name}</td>
                              {isSectionMode && (
                                <td className="py-2.5 px-3 text-center text-xs font-semibold text-[#57534E] dark:text-stone-300">
                                  {st.className}
                                </td>
                              )}
                              <td className="py-2.5 px-3 text-center font-mono text-[#57534E] dark:text-stone-400">
                                {st.admission_number || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center text-[#57534E] dark:text-stone-400">
                                {st.gender || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-black text-[#1C1917] dark:text-white">
                                {st.total ?? '-'}
                              </td>
                              {cohortMetrics.isNormalizedRanking && !isNursery && (
                                <td className="py-2.5 px-3 text-center font-mono font-extrabold text-[#0F4D25] dark:text-emerald-400">
                                  {st.normalizedScore != null ? `${st.normalizedScore}%` : '-'}
                                </td>
                              )}
                              {isNursery ? (
                                <>
                                  <td className="py-2.5 px-3 text-center font-mono font-extrabold text-[#0D5C3A] dark:text-emerald-400">
                                    {st.normalizedScore != null ? `${Math.round(st.normalizedScore)}%` : '-'}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    {st.normalizedScore != null ? (
                                      (() => {
                                        const avg = Math.round(st.normalizedScore)
                                        const badge = computeNurseryBadge(avg)
                                        return badge ? (
                                          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-black ${badge.bg} ${badge.text}`}>
                                            Grade {badge.grade}
                                          </span>
                                        ) : <span className="text-stone-400">-</span>
                                      })()
                                    ) : <span className="text-stone-400">-</span>}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="py-2.5 px-3 text-center font-mono font-extrabold text-[#0D5C3A] dark:text-emerald-400">
                                    {st.aggregate ?? '-'}
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      Div {st.division}
                                    </span>
                                  </td>
                                </>
                              )}
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
                  curriculum="secular"
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
        curriculum="secular"
        config={printConfig}
        onChangeConfig={handleChangePrintConfig}
        allStudents={assessmentData.students}
        filteredStudents={filteredStudents}
        subjects={assessmentData.orderedSubjects}
        termLabel={activeTerm?.label || 'Term 3'}
        academicYear={activeTerm?.academic_year || 2026}
        classNameLabel={currentScopeLabel}
        sectionLabel={activeSectionObj?.label || activeClass?.section || 'Secular'}
        examPhase={examPhase}
        isNursery={isNursery}
        summary={broadsheetSummary}
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
          />
        ) : (
          <BroadsheetPrintDocument
            curriculum="secular"
            config={printConfig}
            students={printStudents}
            subjects={assessmentData.orderedSubjects}
            termLabel={activeTerm?.label || 'Term 3'}
            academicYear={activeTerm?.academic_year || 2026}
            classNameLabel={currentScopeLabel}
            sectionLabel={activeSectionObj?.label || activeClass?.section || 'Secular'}
            examPhase={examPhase}
            isNursery={isNursery}
            summary={broadsheetSummary}
          />
        )}
      </PrintPortal>
    </div>
  )
}

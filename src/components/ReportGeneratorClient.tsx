'use client'

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { FileSpreadsheet, Printer, Users, FileText, Sliders, Settings, History, ChevronDown, LayoutGrid } from 'lucide-react'
import { generateReportBroadsheetCSV } from '@/utils/csvExport'
import { TopToolbar } from './figma-ui/TopToolbar'
import { DocumentCanvas } from './figma-ui/DocumentCanvas'
import { StudentRosterSidebar } from './figma-ui/StudentRosterSidebar'
import { PrintDialog } from './figma-ui/PrintDialog'
import { Popover, PopoverTrigger, PopoverContent } from './figma-ui/ui/popover'
import { CustomPillSelect } from '@/components/ui/custom-pill-select'
import type { FilterState, ReportData, ClassGroup, EnrollmentItem } from './figma-ui/types'

// Jiddah Templates
import PrimaryEOTReport from './reports/PrimaryEOTReport'
import P7EOTReport from './reports/P7EOTReport'
import PrimaryBOTReport from './reports/PrimaryBOTReport'
import PrimaryMOTReport from './reports/PrimaryMOTReport'
import NurseryEOTReport from './reports/NurseryEOTReport'
import NurseryMOTReport from './reports/NurseryMOTReport'
import TheologyMOTReport, { Theology2UpPrintSheet } from './reports/TheologyMOTReport'
import NurseryTheologyEOTReport from './reports/NurseryTheologyEOTReport'
import { ReportPreviewCell } from './reports/ReportPreviewCell'
import { PrintPortal } from './reports/PrintPortal'
import { STABILIZED_REPORT_ORIENTATIONS } from '@/lib/report-constants'
import {
  getReportCompletionStatus,
  applyRangeSelection,
  toggleSelectAllPreservingOthers,
  type StudentCompletionStatus,
} from '@/lib/report-selection'

type TermData = {
  id: string
  term?: string
  year?: number
  term_number?: number
  academic_year?: number
  label?: string
  is_current?: boolean
}

type RawEnrollment = {
  enrollment_id: string
  name: string
  admission_number: string
  circular_class: string
  section: string | null
  theology_class_arabic: string | null
}

interface ReportGeneratorClientProps {
  terms: TermData[]
}

export function ReportGeneratorClient({ terms }: ReportGeneratorClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentTerm = useMemo(() => {
    return terms.find((t) => t.is_current) || terms[0]
  }, [terms])
  const activeTermNumber = currentTerm ? String(currentTerm.term_number || '3') : '3'
  const activeTermLabel = currentTerm?.label || `Term ${activeTermNumber}, 2026`

  const [enrollments, setEnrollments] = useState<RawEnrollment[]>([])
  const [filterState, setFilterState] = useState<FilterState>(() => {
    return {
      mode: (searchParams.get('mode') as any) || 'class',
      studentIds: searchParams.get('studentIds') ? searchParams.get('studentIds')!.split(',') : [],
      classIds: searchParams.get('classIds') ? searchParams.get('classIds')!.split(',') : [],
      section: (searchParams.get('section') as any) || 'all',
      gender: (searchParams.get('gender') as any) || 'All',
      term: (searchParams.get('term') as any) || activeTermNumber,
      phase: (searchParams.get('phase') as any) || 'EOT',
      curriculum: (searchParams.get('curriculum') as any) || 'secular',
      layout: (searchParams.get('layout') as any) || 'single',
    }
  })

  const [rawReports, setRawReports] = useState<ReportData[]>([])
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0.75)
  const [printScope, setPrintScope] = useState<'current' | 'all' | string[]>('current')
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [completionCache, setCompletionCache] = useState<Record<string, StudentCompletionStatus>>({})

  // Multi-selection state for student checklist
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null)
  const [isRosterOpen, setIsRosterOpen] = useState(false)
  const [isMobileRosterOpen, setIsMobileRosterOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<'students' | 'preview'>('students')

  useEffect(() => {
    async function loadEnrollments() {
      try {
        const response = await fetch('/api/enrollments')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load enrollments')
        setEnrollments(data)
      } catch {
        toast.error('Failed to load students list.')
      }
    }
    loadEnrollments()
  }, [])

  const { figmaClasses, figmaEnrollments } = useMemo(() => {
    const eList: EnrollmentItem[] = []
    const classMap = new Map<string, ClassGroup>()

    for (const e of enrollments) {
      const hasCirc = e.circular_class && e.circular_class !== '—'
      const hasTheo = !!e.theology_class_arabic

      let clsName = e.circular_class && e.circular_class !== '—' ? e.circular_class : e.theology_class_arabic || 'Unassigned'
      let sectionType = (e.section as any) || 'unknown'

      if (filterState.curriculum === 'theology') {
        if (!hasTheo) continue
        clsName = e.theology_class_arabic || 'Unassigned'
        const tLevel = (e as any).theology_level
        if (tLevel === 'raudha') sectionType = 'nursery'
        else if (tLevel === 'ibtidaai_lower') sectionType = 'lower_primary'
        else if (tLevel === 'ibtidaai_upper') sectionType = 'upper_primary'
        else sectionType = 'unknown'
      } else if (filterState.curriculum === 'secular') {
        if (!hasCirc) continue
        clsName = e.circular_class || 'Unassigned'
        sectionType = (e.section as any) || 'unknown'
      } else {
        if (!hasCirc && !hasTheo) continue
      }

      let track: 'Secular' | 'Theology' | 'Both' = 'Secular'
      if (hasCirc && hasTheo) track = 'Both'
      else if (hasTheo) track = 'Theology'

      const id = e.enrollment_id

      eList.push({
        enrollment_id: id,
        name: e.name,
        arabic_name: '',
        admission_number: e.admission_number,
        circular_class: clsName,
        section_type: sectionType,
        theology_class_arabic: e.theology_class_arabic,
        track,
      })

      if (!classMap.has(clsName)) {
        classMap.set(clsName, {
          id: clsName,
          name: clsName,
          section_type: sectionType,
          enrollmentIds: [],
        })
      }
      classMap.get(clsName)!.enrollmentIds.push(id)
    }

    return { figmaClasses: Array.from(classMap.values()), figmaEnrollments: eList }
  }, [enrollments, filterState.curriculum])

  // Active class enrollments
  const activeClassEnrollments = useMemo(() => {
    if (filterState.classIds.length === 0) return []
    const cls = figmaClasses.find((c) => filterState.classIds.includes(c.id))
    if (!cls) return []
    return figmaEnrollments.filter((e) => cls.enrollmentIds.includes(e.enrollment_id))
  }, [figmaClasses, figmaEnrollments, filterState.classIds])

  // Sync selectedStudentIds with active class enrollments on class change / initial load
  useEffect(() => {
    if (activeClassEnrollments.length > 0) {
      const activeIds = activeClassEnrollments.map((e) => e.enrollment_id)
      setSelectedStudentIds((prev) => {
        const overlap = prev.filter((id) => activeIds.includes(id))
        return overlap.length > 0 ? prev : activeIds
      })
    }
  }, [activeClassEnrollments])

  // Smart defaults: Automatically select active class if none chosen
  useEffect(() => {
    if (figmaClasses.length === 0) return
    if (filterState.classIds.length === 0) {
      let chosenClassId = figmaClasses[0].id
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('jiddah_reports_last_class')
        if (stored && figmaClasses.some((c) => c.id === stored)) {
          chosenClassId = stored
        }
      }
      setFilterState((prev) => ({
        ...prev,
        classIds: [chosenClassId],
        term: (prev.term || activeTermNumber) as any,
        phase: prev.phase || 'EOT',
      }))
    }
  }, [figmaClasses, filterState.classIds.length, activeTermNumber])

  const executeGeneration = useCallback(async (): Promise<ReportData[]> => {
    const { mode, studentIds, classIds, section, term, phase } = filterState

    let targets: string[] = []
    if (mode === 'individual') {
      targets = studentIds
    } else {
      targets = figmaClasses
        .filter((c) => classIds.includes(c.id))
        .flatMap((c) => c.enrollmentIds)
    }

    if (targets.length === 0) {
      return []
    }

    const termObj = terms.find((t) => String(t.term_number) === term)
    if (!termObj) {
      toast.error('Term not found in database.')
      return []
    }

    setIsGenerating(true)
    const loadingId = toast.loading(
      mode === 'class' ? 'Generating batch reports…' : 'Generating report…'
    )

    try {
      const isPrimaryClass = figmaClasses.some(
        (c) =>
          classIds.includes(c.id) &&
          (c.section_type === 'lower_primary' || c.section_type === 'upper_primary')
      )
      const isPrimaryStudent = figmaEnrollments.some(
        (e) =>
          studentIds.includes(e.enrollment_id) &&
          (e.section_type === 'lower_primary' || e.section_type === 'upper_primary')
      )
      const isPrimary =
        section === 'lower_primary' ||
        section === 'upper_primary' ||
        (mode === 'class' ? isPrimaryClass : isPrimaryStudent)
      const isEOT = phase.toLowerCase() === 'eot'

      let effectiveCurriculum: 'secular' | 'theology' | 'combined' = filterState.curriculum
      if (isPrimary && isEOT && filterState.curriculum !== 'theology' && filterState.curriculum !== 'secular') {
        effectiveCurriculum = 'combined'
      }

      const response = await fetch('/api/report/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollment_ids: targets,
          term_id: termObj.id,
          score_type: phase.toLowerCase(),
          curriculum: effectiveCurriculum,
          stamp_date: filterState.stampDate,
        }),
      })
      const data = await response.json()

      toast.dismiss(loadingId)

      if (!response.ok) throw new Error(data.error || 'Failed to generate reports')

      const generatedReportsData: ReportData[] = data.reports || []

      if (generatedReportsData.length === 0) {
        toast.warning('No report data found for the selected students.')
        setIsGenerating(false)
        return []
      }

      setRawReports(generatedReportsData)
      setActiveReportId(generatedReportsData[0].id)
      setCompletionCache((prev) => {
        const next = { ...prev }
        const keyPrefix = `${term}:${phase}:`
        for (const r of generatedReportsData) {
          next[`${keyPrefix}${r.id}`] = getReportCompletionStatus(r)
        }
        return next
      })

      toast.success(
        `${generatedReportsData.length} report${generatedReportsData.length !== 1 ? 's' : ''} ready to preview.`,
        { duration: 2500 }
      )
      return generatedReportsData
    } catch (err: any) {
      toast.dismiss(loadingId)
      toast.error(err.message || 'Report generation failed')
      setRawReports([])
      return []
    } finally {
      setIsGenerating(false)
    }
  }, [filterState, figmaClasses, figmaEnrollments, terms])

  // Automatically execute generation when class, term, and phase are set
  const autoGeneratedKey = useRef<string>('')
  useEffect(() => {
    if (
      filterState.classIds.length > 0 &&
      filterState.term &&
      filterState.phase &&
      figmaClasses.length > 0
    ) {
      const key = `${filterState.classIds.join(',')}:${filterState.term}:${filterState.phase}:${filterState.curriculum}`
      if (autoGeneratedKey.current !== key) {
        autoGeneratedKey.current = key
        executeGeneration()
      }
    }
  }, [
    filterState.classIds,
    filterState.term,
    filterState.phase,
    filterState.curriculum,
    figmaClasses.length,
    executeGeneration,
  ])

  // URL query sync
  useEffect(() => {
    const params = new URLSearchParams()
    if (filterState.mode !== 'class') params.set('mode', filterState.mode)
    if (filterState.studentIds.length > 0) params.set('studentIds', filterState.studentIds.join(','))
    if (filterState.classIds.length > 0) params.set('classIds', filterState.classIds.join(','))
    if (filterState.section !== 'all') params.set('section', filterState.section)
    if (filterState.gender !== 'All') params.set('gender', filterState.gender)
    if (filterState.term) params.set('term', filterState.term)
    if (filterState.phase) params.set('phase', filterState.phase)
    if (filterState.curriculum !== 'secular') params.set('curriculum', filterState.curriculum)
    if (filterState.layout !== 'single') params.set('layout', filterState.layout)

    const newParamsStr = params.toString()
    if (newParamsStr !== searchParams.toString()) {
      router.replace(`${pathname}?${newParamsStr}`, { scroll: false })
    }
  }, [filterState, pathname, router, searchParams])

  const completionByEnrollment = useMemo(() => {
    const map: Record<string, StudentCompletionStatus> = {}
    const prefix = `${filterState.term}:${filterState.phase}:`
    for (const [k, v] of Object.entries(completionCache)) {
      if (k.startsWith(prefix)) {
        map[k.slice(prefix.length)] = v
      }
    }
    for (const r of rawReports) {
      map[r.id] = getReportCompletionStatus(r)
    }
    return map
  }, [completionCache, rawReports, filterState.term, filterState.phase])

  // Range and Checkbox handlers for Left Sidebar
  const handleToggleSelect = useCallback(
    (id: string, shiftKey: boolean) => {
      const orderedVisibleIds = activeClassEnrollments.map((e) => e.enrollment_id)
      const res = applyRangeSelection(
        orderedVisibleIds,
        selectedStudentIds,
        id,
        anchorIndex,
        shiftKey
      )
      setSelectedStudentIds(res.nextSelected)
      setAnchorIndex(res.nextAnchorIndex)
    },
    [activeClassEnrollments, selectedStudentIds, anchorIndex]
  )

  const handleSelectAll = useCallback(() => {
    const visibleIds = activeClassEnrollments.map((e) => e.enrollment_id)
    const next = toggleSelectAllPreservingOthers(visibleIds, selectedStudentIds)
    setSelectedStudentIds(next)
  }, [activeClassEnrollments, selectedStudentIds])

  const handleClearAll = useCallback(() => {
    const visibleSet = new Set(activeClassEnrollments.map((e) => e.enrollment_id))
    setSelectedStudentIds((prev) => prev.filter((id) => !visibleSet.has(id)))
  }, [activeClassEnrollments])

  // Count-Aware Print Button Label
  const printButtonLabel = useMemo(() => {
    const count = selectedStudentIds.length
    if (count === 0) return 'Print Reports'
    if (count === 1) return 'Print 1 Report'
    if (count === activeClassEnrollments.length && activeClassEnrollments.length > 0) {
      return `Print ${count} Reports`
    }
    return `Print ${count} Selected`
  }, [selectedStudentIds.length, activeClassEnrollments.length])

  // Active student for topbar selector pill
  const activeStudent = useMemo(() => {
    return activeClassEnrollments.find((e) => e.enrollment_id === activeReportId) || activeClassEnrollments[0]
  }, [activeClassEnrollments, activeReportId])

  // Primary Print Action
  const handlePrintSelected = useCallback(async () => {
    const targets =
      selectedStudentIds.length > 0
        ? selectedStudentIds
        : activeReportId
        ? [activeReportId]
        : []

    if (targets.length === 0) {
      toast.error('Please select at least one student to print.')
      return
    }

    const loadedIds = new Set(rawReports.map((r) => r.id))
    const allTargetsLoaded = targets.every((id) => loadedIds.has(id))
    const reportsForPrint = allTargetsLoaded ? rawReports : await executeGeneration()
    if (!reportsForPrint || reportsForPrint.length === 0) return

    setPrintScope(targets)
    const originalTitle = document.title
    const termSuffix = filterState.term ? `_Term_${filterState.term}` : ''
    const baseName =
      targets.length === 1
        ? `${(reportsForPrint.find((r) => r.id === targets[0]) as any)?.student?.name || 'Student'}${termSuffix}_Report.pdf`
        : `Selected_${targets.length}_Reports${termSuffix}.pdf`
    document.title = baseName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')

    setTimeout(() => {
      window.print()
    }, 320)

    const restoreTitle = () => {
      document.title = originalTitle
      window.removeEventListener('afterprint', restoreTitle)
    }
    window.addEventListener('afterprint', restoreTitle)
  }, [selectedStudentIds, activeReportId, rawReports, executeGeneration, filterState.term])

  const handleDownload = useCallback(() => {
    if (rawReports.length === 0) {
      toast.error('No reports loaded. Generate reports first.')
      return
    }
    generateReportBroadsheetCSV(
      rawReports,
      `broadsheet-${new Date().toISOString().split('T')[0]}.csv`
    )
    toast.success('Broadsheet downloaded!')
  }, [rawReports])

  const handlePrint = useCallback(() => {
    if (rawReports.length === 0) {
      toast.error('No reports loaded. Generate reports first.')
      return
    }
    setIsPrintDialogOpen(true)
  }, [rawReports])

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    } catch {
      toast.error('Failed to copy link.')
    }
  }, [])

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2))), [])
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(0.4, +(z - 0.25).toFixed(2))), [])
  const handleFitScreen = useCallback(() => setZoom(1), [])

  const resolveReport = useCallback(
    (report: ReportData): { component: React.ReactNode; type: keyof typeof STABILIZED_REPORT_ORIENTATIONS } | null => {
      let component: React.ReactNode = null
      let type: keyof typeof STABILIZED_REPORT_ORIENTATIONS | null = null

      const isP7 = report.student.class_name?.toLowerCase() === 'p.7'
      const isPrim = report.section_type === 'lower_primary' || report.section_type === 'upper_primary'

      const hasCirc = !!report.circular && report.circular.subjects.length > 0
      const hasTheo = !!report.theology

      let format = 'circular'
      if (isPrim && report.score_type === 'eot') {
        if (hasCirc && hasTheo) format = 'combined'
        else if (hasCirc) format = 'circular'
        else if (hasTheo) format = 'theology'
      } else {
        if (hasCirc) format = 'circular'
        else if (hasTheo) format = 'theology'
      }

      if (filterState.curriculum === 'theology') {
        if (hasTheo) format = 'theology'
      } else if (filterState.curriculum === 'secular') {
        if (hasCirc) format = 'circular'
      } else if (filterState.curriculum === 'combined' || filterState.curriculum === 'both') {
        if (hasCirc && hasTheo && isPrim && report.score_type === 'eot') {
          format = 'combined'
        }
      }

      if (format === 'combined' || format === 'circular') {
        if (isPrim && report.score_type === 'eot') {
          component = isP7 ? <P7EOTReport reportData={report} /> : <PrimaryEOTReport reportData={report} />
          type = isP7 ? 'P7EOTReport' : 'PrimaryEOTReport'
        } else if (report.section_type === 'nursery') {
          if (report.score_type === 'mot') {
            component = <NurseryMOTReport reportData={report} />
            type = 'NurseryMOTReport'
          } else {
            component = <NurseryEOTReport reportData={report} />
            type = 'NurseryEOTReport'
          }
        } else if (report.score_type === 'bot') {
          component = <PrimaryBOTReport reportData={report} />
          type = 'PrimaryBOTReport'
        } else {
          component = <PrimaryMOTReport reportData={report} />
          type = 'PrimaryMOTReport'
        }
      } else if (format === 'theology') {
        if (report.section_type === 'nursery' && report.score_type === 'eot') {
          component = <NurseryTheologyEOTReport reportData={report} />
          type = 'NurseryTheologyEOTReport'
        } else {
          component = <TheologyMOTReport reportData={report} />
          type = 'TheologyMOTReport'
        }
      }

      if (!component || !type) return null

      return { component, type }
    },
    [filterState.curriculum]
  )

  const renderJiddahReport = useCallback(
    (report: ReportData, isActive: boolean) => {
      const resolved = resolveReport(report)
      if (!resolved) return <div className="p-8 text-rose-600">Error: Unmapped report format.</div>

      return (
        <ReportPreviewCell
          reportType={resolved.type}
          zoom={zoom}
          isActive={isActive}
          onClick={() => setActiveReportId(report.id)}
        >
          {resolved.component}
        </ReportPreviewCell>
      )
    },
    [resolveReport, zoom]
  )

  const printableReports = useMemo(() => {
    if (printScope === 'current') {
      const current = rawReports.find((r) => r.id === activeReportId)
      return current ? [current] : []
    }
    if (Array.isArray(printScope)) {
      return rawReports.filter((r) => printScope.includes(r.id))
    }
    return rawReports
  }, [rawReports, printScope, activeReportId])

  return (
    <div
      data-testid="report-center-workspace"
      className="h-full bg-[#EEF3F0] dark:bg-[#0B110E] font-sans flex flex-col relative overflow-hidden text-stone-800 dark:text-stone-100 p-2 sm:p-3 gap-2 sm:gap-2.5"
    >
      <PrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        reports={rawReports as any}
        onConfirmPrint={(mode) => {
          setPrintScope(mode)

          let sanitizedFilename = 'Report.pdf'

          if (mode === 'current') {
            const currentReport = rawReports.find((r) => r.id === activeReportId)
            const studentName = (currentReport as any)?.student?.name || 'Student'
            const term = filterState.term ? `_Term_${filterState.term}` : ''
            sanitizedFilename = `${studentName}${term}_Report.pdf`
          } else if (mode === 'all') {
            const className = (filterState as any).classIds?.[0]
              ? figmaClasses.find((c) => c.id === (filterState as any).classIds[0])?.name || 'Batch'
              : 'Batch'
            const term = filterState.term ? `_Term_${filterState.term}` : ''
            sanitizedFilename = `${className}${term}_Batch_Reports.pdf`
          } else {
            sanitizedFilename = `Custom_Batch_Reports_${new Date().toISOString().split('T')[0]}.pdf`
          }

          sanitizedFilename = sanitizedFilename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')

          const originalTitle = document.title
          document.title = sanitizedFilename

          setTimeout(() => {
            window.print()
          }, 300)

          const restoreTitle = () => {
            document.title = originalTitle
            window.removeEventListener('afterprint', restoreTitle)
          }
          window.addEventListener('afterprint', restoreTitle)
        }}
      />

      {/* Zone 1 Unified Live Control Bar */}
      <div className="print:hidden shrink-0">
        <TopToolbar
          classCohortSelect={
            <CustomPillSelect
              id="reports-class-cohort-select"
              ariaLabel="Class Cohort"
              value={filterState.classIds[0] || ''}
              onChange={(val) => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem('jiddah_reports_last_class', val)
                }
                setFilterState((prev) => ({ ...prev, classIds: [val] }))
              }}
              options={figmaClasses.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.enrollmentIds.length})`,
              }))}
              className="shrink-0"
              triggerClassName="h-8.5 px-3 rounded-full text-xs font-semibold shrink-0"
            />
          }
          studentSelectorPill={
            <Popover open={isRosterOpen} onOpenChange={setIsRosterOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-testid="student-roster-popover-trigger"
                  className="h-8.5 px-3 rounded-full bg-[#F0F4F9] dark:bg-[#1E2623] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] border border-black/[0.04] dark:border-white/[0.06] text-xs font-semibold text-[#111827] dark:text-[#F3F7F5] flex items-center gap-1.5 cursor-pointer transition shrink-0 max-w-[210px] sm:max-w-[280px]"
                  title="Click to view & select students"
                >
                  <Users size={13} className="text-[#0D5C3A] dark:text-[#34D399] shrink-0" />
                  <span className="truncate tabular-nums">
                    👥 {selectedStudentIds.length} Selected • {activeStudent?.name || 'All Students'}
                  </span>
                  <ChevronDown size={13} className="text-stone-400 shrink-0 ml-0.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="w-[330px] sm:w-[360px] p-0 rounded-2xl border border-[#0D5C3A]/20 dark:border-[#F59E0B]/25 shadow-2xl overflow-hidden bg-white dark:bg-[#151D1A] z-50 max-h-[75dvh] flex flex-col"
              >
                <StudentRosterSidebar
                  enrollments={activeClassEnrollments}
                  selectedIds={selectedStudentIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                  onClearAll={handleClearAll}
                  activeReportId={activeReportId}
                  onSelectStudent={(id) => {
                    setActiveReportId(id)
                    if (filterState.layout === 'grid') {
                      const el = document.querySelector(`[data-report-id="${id}"]`)
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  }}
                  completionByEnrollment={completionByEnrollment}
                  reports={rawReports}
                  className="w-full h-full border-0 rounded-none shadow-none"
                />
              </PopoverContent>
            </Popover>
          }
          activeTermPill={
            <span
              data-testid="reports-active-term-pill"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0D5C3A]/10 dark:bg-[#10B981]/15 text-[#0D5C3A] dark:text-[#34D399] text-[11px] font-semibold shrink-0"
            >
              ● {activeTermLabel}
            </span>
          }
          phaseTrack={
            <div
              data-testid="reports-phase-track"
              className="inline-flex items-center bg-[#F0F4F9] dark:bg-[#1E2623] p-0.5 rounded-full border border-black/[0.04] dark:border-white/[0.06] shrink-0"
            >
              {(['BOT', 'MOT', 'EOT'] as const).map((p) => {
                const isActive = filterState.phase.toUpperCase() === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFilterState((prev) => ({ ...prev, phase: p }))}
                    className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-[#0D5C3A] text-white shadow-2xs font-bold'
                        : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          }
          curriculumTrack={
            <div
              data-testid="reports-curriculum-track"
              className="inline-flex items-center bg-[#F0F4F9] dark:bg-[#1E2623] p-0.5 rounded-full border border-black/[0.04] dark:border-white/[0.06] shrink-0"
            >
              {[
                { id: 'both', label: 'Both' },
                { id: 'secular', label: 'Secular' },
                { id: 'theology', label: 'Theology' },
              ].map((c) => {
                const isActive =
                  c.id === 'both'
                    ? filterState.curriculum === 'combined'
                    : filterState.curriculum === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setFilterState((prev) => ({
                        ...prev,
                        curriculum: c.id === 'both' ? 'combined' : (c.id as 'secular' | 'theology'),
                      }))
                    }
                    className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-[#0D5C3A] text-white shadow-2xs font-bold'
                        : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          }
          layoutTrack={
            <div
              data-testid="reports-layout-track"
              className="inline-flex items-center bg-[#F0F4F9] dark:bg-[#1E2623] p-0.5 rounded-full border border-black/[0.04] dark:border-white/[0.06] shrink-0"
            >
              <button
                type="button"
                onClick={() => setFilterState((prev) => ({ ...prev, layout: 'single' }))}
                className={`h-7 px-2.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  filterState.layout === 'single'
                    ? 'bg-[#0D5C3A] text-white font-bold shadow-2xs'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <FileText size={12} />
                <span>Single</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterState((prev) => ({ ...prev, layout: 'grid' }))}
                className={`h-7 px-2.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  filterState.layout === 'grid'
                    ? 'bg-[#0D5C3A] text-white font-bold shadow-2xs'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid size={12} />
                <span>All Pages</span>
              </button>
            </div>
          }
          primaryPrintAction={{
            label: printButtonLabel,
            onClick: handlePrintSelected,
            disabled: selectedStudentIds.length === 0 || isGenerating,
          }}
          onDownload={handleDownload}
          onPrint={handlePrint}
          onShare={handleShare}
          reportCount={rawReports.length}
          layout={filterState.layout || 'single'}
          onLayoutToggle={() =>
            setFilterState((prev) => ({
              ...prev,
              layout: prev.layout === 'grid' ? 'single' : 'grid',
            }))
          }
          isGenerating={isGenerating}
        />
      </div>

      {/* Dedicated Mobile Controls (< lg) */}
      <div className="lg:hidden flex flex-col gap-1.5 shrink-0 print:hidden">
        {/* Row 1: Class + Term/Phase */}
        <div className="grid grid-cols-2 gap-1.5 p-2 bg-white dark:bg-[#151D1A] rounded-2xl border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20">
          <CustomPillSelect
            id="reports-mobile-class-select"
            ariaLabel="Class"
            value={filterState.classIds[0] || ''}
            onChange={(val) => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('jiddah_reports_last_class', val)
              }
              setFilterState((prev) => ({ ...prev, classIds: [val] }))
            }}
            options={figmaClasses.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.enrollmentIds.length})`,
            }))}
            className="w-full"
            triggerClassName="w-full h-8 px-2.5 text-xs font-semibold"
          />
          <div className="flex items-center justify-between gap-1 px-2.5 py-1 rounded-full bg-[#F0F4F9] dark:bg-[#1E2623] border border-black/[0.04] dark:border-white/[0.06]">
            <span className="text-[10px] font-bold text-[#0D5C3A] dark:text-[#34D399] truncate">
              ● Term {activeTermNumber}
            </span>
            <div className="flex items-center gap-0.5">
              {(['BOT', 'MOT', 'EOT'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilterState((prev) => ({ ...prev, phase: p }))}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    filterState.phase.toUpperCase() === p
                      ? 'bg-[#0D5C3A] text-white'
                      : 'text-stone-500 dark:text-stone-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Interactive Student & Batch Popover + Compact Print CTA */}
        <div className="flex items-center justify-between gap-2 p-1.5 bg-white dark:bg-[#151D1A] rounded-2xl border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20">
          <Popover open={isMobileRosterOpen} onOpenChange={setIsMobileRosterOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex-1 h-8 px-3 rounded-full bg-[#F0F4F9] dark:bg-[#1E2623] border border-black/[0.04] dark:border-white/[0.06] text-xs font-semibold text-[#111827] dark:text-[#F3F7F5] flex items-center justify-between gap-1.5 cursor-pointer min-w-0"
              >
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <Users size={13} className="text-[#0D5C3A] dark:text-[#34D399] shrink-0" />
                  <span className="truncate tabular-nums">
                    👥 {selectedStudentIds.length} Selected • {activeStudent?.name || 'All'}
                  </span>
                </div>
                <ChevronDown size={13} className="text-stone-400 shrink-0" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="center"
              sideOffset={6}
              className="w-[calc(100vw-24px)] max-w-[360px] p-0 rounded-2xl border border-[#0D5C3A]/20 dark:border-[#F59E0B]/25 shadow-2xl overflow-hidden bg-white dark:bg-[#151D1A] z-50 max-h-[75dvh] flex flex-col"
            >
              <StudentRosterSidebar
                enrollments={activeClassEnrollments}
                selectedIds={selectedStudentIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
                onClearAll={handleClearAll}
                activeReportId={activeReportId}
                onSelectStudent={(id) => {
                  setActiveReportId(id)
                  setIsMobileRosterOpen(false)
                }}
                completionByEnrollment={completionByEnrollment}
                reports={rawReports}
                className="w-full h-full border-0 rounded-none shadow-none"
              />
            </PopoverContent>
          </Popover>

          <motion.button
            type="button"
            onClick={handlePrintSelected}
            disabled={selectedStudentIds.length === 0 || isGenerating}
            whileTap={{ scale: 0.96 }}
            className="h-8 px-3.5 rounded-full btn-jiddah-cta text-xs font-bold inline-flex items-center gap-1.5 shrink-0 disabled:opacity-40"
          >
            <Printer size={13} />
            <span>Print ({selectedStudentIds.length})</span>
          </motion.button>
        </div>
      </div>

      {/* 100% Full-Width Document Preview Canvas */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative w-full h-full rounded-2xl border border-[#0D5C3A]/12 dark:border-[#F59E0B]/15">
        <DocumentCanvas
          reports={rawReports}
          activeReportId={activeReportId}
          onSelectReport={setActiveReportId}
          renderReport={renderJiddahReport}
          zoom={zoom}
          layout={filterState.layout}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitScreen={handleFitScreen}
          onLayoutToggle={() =>
            setFilterState((prev) => ({
              ...prev,
              layout: prev.layout === 'grid' ? 'single' : 'grid',
            }))
          }
          printScope={printScope}
        />
      </div>

      {/* Print Portal for Stable true A4 Printing */}
      {(() => {
        const reportsToPrint =
          printableReports.length > 0
            ? printableReports
            : rawReports.filter((r) => r.id === activeReportId).length > 0
            ? rawReports.filter((r) => r.id === activeReportId)
            : rawReports.length > 0
            ? [rawReports[0]]
            : []

        if (reportsToPrint.length === 0) {
          return (
            <PrintPortal>
              <div style={{ padding: '60px 40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1c1917', marginBottom: '12px' }}>
                  Jiddah Islamic Schools — Report Generation Engine
                </h2>
                <p style={{ fontSize: '14px', color: '#57534e', maxWidth: '480px', margin: '0 auto' }}>
                  Select classes or students in the filter panel and generate reports to preview or print.
                </p>
              </div>
            </PrintPortal>
          )
        }

        return (
          <PrintPortal>
            {(() => {
              const nodes: React.ReactNode[] = []
              let i = 0

              while (i < reportsToPrint.length) {
                const report = reportsToPrint[i]
                const resolved = resolveReport(report)
                if (!resolved) {
                  i++
                  continue
                }

                if (resolved.type === 'TheologyMOTReport') {
                  const topReport = report
                  const nextReport = reportsToPrint[i + 1]
                  const nextResolved = nextReport ? resolveReport(nextReport) : null

                  if (nextReport && nextResolved?.type === 'TheologyMOTReport') {
                    nodes.push(
                      <Theology2UpPrintSheet
                        key={`theology-sheet-${topReport.id}-${nextReport.id}`}
                        topReport={topReport}
                        bottomReport={nextReport}
                      />
                    )
                    i += 2
                  } else {
                    nodes.push(
                      <Theology2UpPrintSheet
                        key={`theology-sheet-${topReport.id}`}
                        topReport={topReport}
                      />
                    )
                    i += 1
                  }
                } else {
                  nodes.push(
                    <React.Fragment key={report.id}>
                      {resolved.component}
                    </React.Fragment>
                  )
                  i++
                }
              }

              return nodes
            })()}
          </PrintPortal>
        )
      })()}
    </div>
  )
}

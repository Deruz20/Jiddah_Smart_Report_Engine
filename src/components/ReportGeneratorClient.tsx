'use client'

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { FileSpreadsheet, Printer, Users, FileText, Sliders, Settings, History, ChevronDown, LayoutGrid, Menu, Palette, Sun, Moon, Download, CheckSquare, ShieldCheck } from 'lucide-react'
import { generateReportBroadsheetCSV } from '@/utils/csvExport'
import { TopToolbar, StudioFormattingState, DEFAULT_STUDIO_FORMATTING } from './figma-ui/TopToolbar'
import {
  useSyncedStudioConfig,
  StudioFormattingProvider,
  useGlobalSchoolSettingsSync,
} from '@/lib/studio-config-store'
import { resolveEffectiveStampDate } from '@/lib/stamp-date'
import { PrePrintQaModal, auditPrePrintIssues } from './reports/PrePrintQaModal'
import { MoreActionsMenu } from '@/components/ui/more-actions-menu'
import { isNonMuslimStudent, shouldUseSecularPortraitTemplate } from '@/lib/student-religion'
import { DocumentCanvas } from './figma-ui/DocumentCanvas'
import { StudentRosterSidebar } from './figma-ui/StudentRosterSidebar'
import { PrintDialog } from './figma-ui/PrintDialog'
import { Popover, PopoverTrigger, PopoverContent } from './figma-ui/ui/popover'
import { CustomPillSelect } from '@/components/ui/custom-pill-select'
import { useSidebar } from '@/components/figma-ui/ui/sidebar'
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
import { isNurseryClass } from '@/lib/grading'
import {
  getReportCompletionStatus,
  applyRangeSelection,
  toggleSelectAllPreservingOthers,
  type StudentCompletionStatus,
} from '@/lib/report-selection'

export const ZOOM_STEPS = [0.5, 0.75, 0.9, 1.0, 1.15, 1.25, 1.5] as const

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
  id?: string
  enrollment_id: string
  name: string
  arabic_name?: string | null
  admission_number: string
  circular_class: string
  section: string | null
  theology_class_arabic: string | null
}

interface ReportGeneratorClientProps {
  terms: TermData[]
}

export const SECULAR_TO_THEOLOGY_MAP: Record<string, string> = {
  Baby: 'الروضة السفلى',
  Middle: 'الروضة الوسطى',
  Top: 'الروضة العليا',
  'P.1': 'الصف الأول',
  'P.2': 'الصف الثاني',
  'P.3': 'الصف الثالث',
  'P.4': 'الصف الرابع',
  'P.5': 'الصف الخامس',
  'P.6': 'الصف السادس',
  'P.7': 'الصف السابع',
  P1: 'الصف الأول',
  P2: 'الصف الثاني',
  P3: 'الصف الثالث',
  P4: 'الصف الرابع',
  P5: 'الصف الخامس',
  P6: 'الصف السادس',
  P7: 'الصف السابع',
}

export const THEOLOGY_TO_SECULAR_MAP: Record<string, string> = {
  'الروضة السفلى': 'Baby',
  'الروضة الوسطى': 'Middle',
  'الروضة العليا': 'Top',
  'الصف الأول': 'P.1',
  'الصف الثاني': 'P.2',
  'الصف الثالث': 'P.3',
  'الصف الرابع': 'P.4',
  'الصف الخامس': 'P.5',
  'الصف السادس': 'P.6',
  'الصف السابع': 'P.7',
}

export const CLASS_ORDER: Record<string, number> = {
  Baby: 1,
  Middle: 2,
  Top: 3,
  'P.1': 4,
  P1: 4,
  'P.2': 5,
  P2: 5,
  'P.3': 6,
  P3: 6,
  'P.4': 7,
  P4: 7,
  'P.5': 8,
  P5: 8,
  'P.6': 9,
  P6: 9,
  'P.7': 10,
  P7: 10,
  'الروضة السفلى': 1,
  'الروضة الوسطى': 2,
  'الروضة العليا': 3,
  'الصف الأول': 4,
  'الصف الثاني': 5,
  'الصف الثالث': 6,
  'الصف الرابع': 7,
  'الصف الخامس': 8,
  'الصف السادس': 9,
  'الصف السابع': 10,
}

function isLandscapeReportData(rep: any, curriculumFilter: string): boolean {
  if (!rep) return false
  const isPrim =
    rep.section_type === 'lower_primary' ||
    rep.section_type === 'upper_primary' ||
    (rep.section_type || '').includes('primary')
  const isP7 = (rep.student?.class_name || '').toLowerCase().includes('p.7')
  const isNonMuslim = isNonMuslimStudent(rep.student, rep)
  const hasCirc = Boolean(rep.circular && rep.circular.subjects?.length > 0)
  const hasTheo = Boolean(rep.theology)

  let format = 'circular'
  if (curriculumFilter === 'theology') {
    if (hasTheo) format = 'theology'
  } else if (curriculumFilter === 'secular') {
    if (hasCirc) format = 'circular'
  } else if ((curriculumFilter === 'combined' || curriculumFilter === 'both') && hasCirc && hasTheo && isPrim && rep.score_type === 'eot') {
    format = 'combined'
  } else if (!hasCirc && hasTheo) {
    format = 'theology'
  }

  return (format === 'combined' || format === 'circular') && isPrim && rep.score_type === 'eot' && !isP7 && !isNonMuslim
}

function applyDynamicPrintPageRule(reportsList: any[], curriculumFilter: string): HTMLStyleElement {
  const hasLandscape = reportsList.some((rep) => isLandscapeReportData(rep, curriculumFilter))
  const hasPortrait = reportsList.some((rep) => !isLandscapeReportData(rep, curriculumFilter))
  let styleEl = document.getElementById('jiddah-print-page-rule') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'jiddah-print-page-rule'
    document.head.appendChild(styleEl)
  }
  if (hasLandscape && !hasPortrait) {
    styleEl.textContent = `@media print { @page { size: 297mm 210mm !important; margin: 0mm !important; } }`
  } else if (hasPortrait && !hasLandscape) {
    styleEl.textContent = `@media print { @page { size: 210mm 297mm !important; margin: 0mm !important; } }`
  } else {
    styleEl.textContent = ''
  }
  return styleEl
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
  const [zoom, setZoom] = useState(1.0)
  const [cardsPerRow, setCardsPerRow] = useState<1 | 2 | 3>(1)
  const [printScope, setPrintScope] = useState<'current' | 'all' | string[]>('current')
  const [printRequest, setPrintRequest] = useState<{ title: string } | null>(null)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [isQaModalOpen, setIsQaModalOpen] = useState(false)
  const [visualSelectMode, setVisualSelectMode] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [completionCache, setCompletionCache] = useState<Record<string, StudentCompletionStatus>>({})

  // Studio formatting and customisation state (shared across Report Center & Report Studio 2.0)
  const [studioFormatting, setStudioFormatting] = useSyncedStudioConfig()

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
        student_id: e.id,
        name: e.name,
        arabic_name: e.arabic_name || '',
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

    const sortedClasses = Array.from(classMap.values()).sort((a, b) => {
      const orderA = CLASS_ORDER[a.name] ?? 99
      const orderB = CLASS_ORDER[b.name] ?? 99
      if (orderA !== orderB) return orderA - orderB
      return a.name.localeCompare(b.name)
    })

    return { figmaClasses: sortedClasses, figmaEnrollments: eList }
  }, [enrollments, filterState.curriculum])

  // Active class enrollments
  const activeClassEnrollments = useMemo(() => {
    if (filterState.classIds.length === 0 || filterState.classIds.includes('all')) {
      return figmaEnrollments
    }
    const cls = figmaClasses.find((c) => filterState.classIds.includes(c.id))
    if (!cls) return []
    return figmaEnrollments.filter((e) => cls.enrollmentIds.includes(e.enrollment_id))
  }, [figmaClasses, figmaEnrollments, filterState.classIds])

  const activeClassIdSet = useMemo(
    () => new Set(activeClassEnrollments.map((e) => e.enrollment_id)),
    [activeClassEnrollments]
  )

  const selectedInViewIds = useMemo(
    () => selectedStudentIds.filter((id) => activeClassIdSet.has(id)),
    [selectedStudentIds, activeClassIdSet]
  )
  const selectedInViewCount = selectedInViewIds.length

  const isCurrentNurseryOrTheology = useMemo(() => {
    if (filterState.curriculum === 'theology') return true
    const currentCls = filterState.classIds[0] || ''
    if (currentCls && currentCls !== 'all') {
      if (isNurseryClass(currentCls) || currentCls.includes('الروضة')) return true
    }
    if (activeClassEnrollments.length > 0 && activeClassEnrollments.every((e) => e.section_type === 'nursery' || isNurseryClass(e.circular_class))) {
      return true
    }
    return false
  }, [filterState.curriculum, filterState.classIds, activeClassEnrollments])

  const availablePhases = useMemo(
    () => (isCurrentNurseryOrTheology ? (['MOT', 'EOT'] as const) : (['BOT', 'MOT', 'EOT'] as const)),
    [isCurrentNurseryOrTheology]
  )

  useEffect(() => {
    if (isCurrentNurseryOrTheology && filterState.phase.toUpperCase() === 'BOT') {
      setFilterState((prev) => ({ ...prev, phase: 'EOT' }))
    }
  }, [isCurrentNurseryOrTheology, filterState.phase])

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

  // Smart defaults: Automatically select active class if none chosen or alias-mapped
  useEffect(() => {
    if (figmaClasses.length === 0) return
    const currentClassId = filterState.classIds[0]
    if (!currentClassId) {
      let chosenClassId = figmaClasses[0].id
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('jiddah_reports_last_class')
        if (stored && (stored === 'all' || figmaClasses.some((c) => c.id === stored))) {
          chosenClassId = stored
        }
      }
      setFilterState((prev) => ({
        ...prev,
        classIds: [chosenClassId],
        term: (prev.term || activeTermNumber) as any,
        phase: prev.phase || 'EOT',
      }))
    } else if (currentClassId !== 'all' && !figmaClasses.some((c) => c.id === currentClassId)) {
      const alias = SECULAR_TO_THEOLOGY_MAP[currentClassId] || THEOLOGY_TO_SECULAR_MAP[currentClassId]
      const chosenClassId = alias && figmaClasses.some((c) => c.id === alias) ? alias : figmaClasses[0].id
      setFilterState((prev) => ({
        ...prev,
        classIds: [chosenClassId],
      }))
      setSelectedStudentIds([])
    }
  }, [figmaClasses, filterState.classIds, activeTermNumber])

  const executeGeneration = useCallback(async (): Promise<ReportData[]> => {
    const { mode, studentIds, classIds, section, term, phase } = filterState

    let targets: string[] = []
    if (mode === 'individual') {
      targets = studentIds
    } else {
      if (classIds.includes('all')) {
        targets = figmaClasses.flatMap((c) => c.enrollmentIds)
      } else {
        targets = figmaClasses
          .filter((c) => classIds.includes(c.id))
          .flatMap((c) => c.enrollmentIds)
      }
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

    try {
      const isPrimaryClass = figmaClasses.some(
        (c) =>
          (classIds.includes('all') || classIds.includes(c.id)) &&
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
          stamp_date: studioFormatting.stampDate || filterState.stampDate || undefined,
        }),
      })
      const data = await response.json()

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

  const handleToggleSelectCard = useCallback((id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }, [])

  const handleSelectAll = useCallback(() => {
    const visibleIds = activeClassEnrollments.map((e) => e.enrollment_id)
    const next = toggleSelectAllPreservingOthers(visibleIds, selectedStudentIds)
    setSelectedStudentIds(next)
  }, [activeClassEnrollments, selectedStudentIds])

  const handleClearAll = useCallback(() => {
    const visibleSet = new Set(activeClassEnrollments.map((e) => e.enrollment_id))
    setSelectedStudentIds((prev) => prev.filter((id) => !visibleSet.has(id)))
  }, [activeClassEnrollments])

  const handleInvertCards = useCallback(() => {
    const visibleIds = activeClassEnrollments.map((e) => e.enrollment_id)
    const selectedSet = new Set(selectedStudentIds)
    const invertedVisible = visibleIds.filter((id) => !selectedSet.has(id))
    const visibleSet = new Set(visibleIds)
    const preservedOther = selectedStudentIds.filter((id) => !visibleSet.has(id))
    setSelectedStudentIds([...preservedOther, ...invertedVisible])
  }, [activeClassEnrollments, selectedStudentIds])

  // Count-Aware Print Button Label
  const printButtonLabel = useMemo(() => {
    const count = selectedInViewCount
    if (count === 0) return 'Print Reports'
    if (count === 1) return 'Print 1 Report'
    if (count === activeClassEnrollments.length && activeClassEnrollments.length > 0) {
      return `Print ${count} Reports`
    }
    return `Print ${count} Selected`
  }, [selectedInViewCount, activeClassEnrollments.length])

  // Active student for topbar selector pill
  const activeStudent = useMemo(() => {
    return activeClassEnrollments.find((e) => e.enrollment_id === activeReportId) || activeClassEnrollments[0]
  }, [activeClassEnrollments, activeReportId])

  const globalPrintDefaults = useGlobalSchoolSettingsSync(() => {
    void executeGeneration()
  })

  const qaAuditSummary = useMemo(
    () =>
      auditPrePrintIssues({
        enrollments: activeClassEnrollments,
        reports: rawReports,
        curriculum: filterState.curriculum,
        phase: filterState.phase || 'EOT',
      }),
    [activeClassEnrollments, rawReports, filterState.curriculum, filterState.phase]
  )

  const handleQaStudentUpdated = useCallback(
    async (studentId: string, enrollmentId: string, patch: { name: string; arabic_name: string }) => {
      setEnrollments((prev) =>
        prev.map((row) =>
          row.enrollment_id === enrollmentId || (studentId && row.id === studentId)
            ? { ...row, name: patch.name, arabic_name: patch.arabic_name }
            : row
        )
      )
      setRawReports((prev) =>
        prev.map((rep) =>
          rep.id === enrollmentId
            ? {
              ...rep,
              student: {
                ...rep.student,
                name: patch.name,
                arabic_name: patch.arabic_name,
              },
            }
            : rep
        )
      )
      await executeGeneration()
    },
    [executeGeneration]
  )

  // Primary Print Action
  const handlePrintSelected = useCallback(async () => {
    const targets =
      selectedInViewIds.length > 0
        ? selectedInViewIds
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

    // Dynamically inject exact @page dimensions so Chrome Print Preview locks Landscape or Portrait cleanly
    const targetReports = targets
      .map((targetId) => (reportsForPrint || rawReports).find((r) => r.id === targetId))
      .filter(Boolean)
    const styleEl = applyDynamicPrintPageRule(targetReports, filterState.curriculum)

    setTimeout(() => {
      window.print()
    }, 320)

    const restoreTitle = () => {
      document.title = originalTitle
      styleEl?.remove()
      window.removeEventListener('afterprint', restoreTitle)
    }
    window.addEventListener('afterprint', restoreTitle)
  }, [selectedStudentIds, activeReportId, rawReports, executeGeneration, filterState.term, filterState.curriculum])

  let sidebar: { toggleSidebar: () => void } | null = null
  try {
    sidebar = useSidebar()
  } catch {
    sidebar = null
  }

  // Single sheet print action
  const handlePrintCurrent = useCallback(() => {
    if (!activeReportId) {
      toast.error('Please select a student report to print.')
      return
    }
    setPrintScope([activeReportId])
    const currentRep = rawReports.find((r) => r.id === activeReportId)
    applyDynamicPrintPageRule(currentRep ? [currentRep] : [], filterState.curriculum)

    setTimeout(() => {
      window.print()
    }, 280)
  }, [activeReportId, rawReports, filterState.curriculum])

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

  const handleZoomIn = useCallback(() => {
    setZoom((z) => {
      const next = ZOOM_STEPS.find((step) => step > z + 0.01)
      return next ?? 1.5
    })
  }, [])
  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const prevSteps = ZOOM_STEPS.filter((step) => step < z - 0.01)
      return prevSteps.length > 0 ? prevSteps[prevSteps.length - 1] : 0.5
    })
  }, [])
  const handleFitScreen = useCallback(() => setZoom(1.0), [])

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

      const rep = report as any
      const enhancedReport = {
        ...report,
        branding: {
          ...rep.branding,
          primaryFont: studioFormatting.fontFamily,
          themePreset: studioFormatting.colorTheme,
        },
        settings: {
          ...rep.settings,
          primary_font: studioFormatting.fontFamily,
          theme_preset: studioFormatting.colorTheme,
          print_preferences: {
            ...rep.settings?.print_preferences,
            includeStamp: studioFormatting.stampEnabled,
            includeSignatures: studioFormatting.signaturesEnabled,
            stamp_config: {
              ...rep.settings?.print_preferences?.stamp_config,
              ink_color: studioFormatting.stampInkColor,
              date: resolveEffectiveStampDate(
                studioFormatting.stampDate,
                globalPrintDefaults.stampDate || rep?.settings?.stamp_date || rep?.term?.end_date
              ),
            },
          },
        },
      }

      if (format === 'combined' || format === 'circular') {
        if (isPrim && report.score_type === 'eot') {
          const useSecularPortrait = isP7 || shouldUseSecularPortraitTemplate(report.student, report)
          component = useSecularPortrait ? (
            <P7EOTReport reportData={enhancedReport} studioFormatting={studioFormatting} />
          ) : (
            <PrimaryEOTReport reportData={enhancedReport} studioFormatting={studioFormatting} />
          )
          type = useSecularPortrait ? 'P7EOTReport' : 'PrimaryEOTReport'
        } else if (report.section_type === 'nursery') {
          if (report.score_type === 'mot') {
            component = <NurseryMOTReport reportData={enhancedReport} studioFormatting={studioFormatting} />
            type = 'NurseryMOTReport'
          } else {
            component = <NurseryEOTReport reportData={enhancedReport} studioFormatting={studioFormatting} />
            type = 'NurseryEOTReport'
          }
        } else if (report.score_type === 'bot') {
          component = <PrimaryBOTReport reportData={enhancedReport} studioFormatting={studioFormatting} />
          type = 'PrimaryBOTReport'
        } else {
          component = <PrimaryMOTReport reportData={enhancedReport} studioFormatting={studioFormatting} />
          type = 'PrimaryMOTReport'
        }
      } else if (format === 'theology') {
        if (report.section_type === 'nursery' && report.score_type === 'eot') {
          component = <NurseryTheologyEOTReport reportData={enhancedReport} studioFormatting={studioFormatting} />
          type = 'NurseryTheologyEOTReport'
        } else {
          component = <TheologyMOTReport reportData={enhancedReport} studioFormatting={studioFormatting} />
          type = 'TheologyMOTReport'
        }
      }

      if (!component || !type) return null

      return { component, type }
    },
    [filterState.curriculum, studioFormatting]
  )

  const renderJiddahReport = useCallback(
    (report: ReportData, isActive: boolean, scales?: { landscapeScale: number; portraitScale: number } | number) => {
      const resolved = resolveReport(report)
      if (!resolved) return <div className="p-8 text-rose-600">Error: Unmapped report format.</div>

      const dims = STABILIZED_REPORT_ORIENTATIONS[resolved.type]
      const isLandscape = dims?.pageOrientation === 'landscape'
      const scale = typeof scales === 'number'
        ? scales
        : scales
          ? (isLandscape ? scales.landscapeScale : scales.portraitScale)
          : undefined

      return (
        <ReportPreviewCell
          reportType={resolved.type}
          report={report}
          zoom={zoom}
          scale={scale}
          columns={filterState.layout === 'grid' ? 2 : 1}
          isActive={isActive}
          studioFormatting={studioFormatting}
          onClick={() => setActiveReportId(report.id)}
        >
          <div
            style={{
              fontSize: `${studioFormatting.fontSize}%`,
              fontWeight: studioFormatting.isBold ? 600 : 'normal',
              width: '100%',
              height: '100%',
            }}
          >
            {resolved.component}
          </div>
        </ReportPreviewCell>
      )
    },
    [resolveReport, zoom, filterState.layout, studioFormatting]
  )

  const printableReports = useMemo(() => {
    if (printScope === 'current') {
      const current = rawReports.find((r) => r.id === activeReportId)
      return current ? [current] : []
    }
    if (Array.isArray(printScope)) {
      return rawReports.filter(report => printScope.includes(report.id))
    }
    return rawReports
  }, [rawReports, printScope, activeReportId])

  useEffect(() => {
    if (!printRequest || isPrintDialogOpen) return
    if (printableReports.length === 0) {
      toast.error('No reports selected for printing.')
      setPrintRequest(null)
      return
    }

    const originalTitle = document.title
    document.title = printRequest.title

    const styleEl = applyDynamicPrintPageRule(printableReports, filterState.curriculum)

    const restoreTitle = () => {
      document.title = originalTitle
      styleEl?.remove()
      setPrintRequest(null)
    }
    const printFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print())
    })

    window.addEventListener('afterprint', restoreTitle, { once: true })
    return () => {
      window.cancelAnimationFrame(printFrame)
      window.removeEventListener('afterprint', restoreTitle)
      styleEl?.remove()
      document.title = originalTitle
    }
  }, [isPrintDialogOpen, printableReports, printRequest])

  return (
    <div
      data-testid="report-center-workspace"
      className="report-studio-root h-full bg-[#EEF3F0] dark:bg-[#0B110E] font-sans flex flex-col relative overflow-hidden text-stone-800 dark:text-stone-100 p-2 sm:p-3 gap-2 sm:gap-2.5 print:!hidden"
    >
      <PrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        reports={rawReports as any}
        activeReport={rawReports.find((r) => r.id === activeReportId) as any}
        preselectedIds={selectedInViewIds}
        onEnterVisualSelect={() => setVisualSelectMode(true)}
        onConfirmPrint={(mode) => {
          setPrintScope(mode)

          let sanitizedFilename = 'Report.pdf'

          if (Array.isArray(mode)) {
            const term = filterState.term ? `_Term_${filterState.term}` : ''
            sanitizedFilename = `Selected_Reports${term}.pdf`
          } else if (mode === 'current') {
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
          }

          sanitizedFilename = sanitizedFilename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
          setPrintRequest({ title: sanitizedFilename })
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
                setSelectedStudentIds([])
                setFilterState((prev) => ({ ...prev, classIds: [val] }))
              }}
              options={[
                { value: 'all', label: `All Classes (${figmaEnrollments.length})` },
                ...figmaClasses.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.enrollmentIds.length})`,
                })),
              ]}
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
                  className="h-8.5 px-3 rounded-full bg-[#F0F4F9] dark:bg-[#1E2623] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] border border-black/[0.04] dark:border-white/[0.06] text-xs font-semibold text-[#111827] dark:text-[#F3F7F5] flex items-center gap-1.5 cursor-pointer transition min-w-0 shrink max-w-[145px] xl:max-w-[230px]"
                  title="Click to view & select students"
                >
                  <Users size={13} className="text-[#0D5C3A] dark:text-[#34D399] shrink-0" />
                  <span className="truncate tabular-nums">
                    👥 {selectedInViewCount} <span className="hidden xl:inline">Selected • {activeStudent?.name || 'All Students'}</span><span className="xl:hidden">Selected</span>
                  </span>
                  <ChevronDown size={13} className="text-stone-400 shrink-0 ml-0.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="w-[330px] sm:w-[360px] max-w-[calc(100vw-20px)] max-h-[72dvh] p-0 rounded-2xl border border-[#0D5C3A]/20 dark:border-[#F59E0B]/25 shadow-2xl overflow-hidden bg-white dark:bg-[#151D1A] z-50 flex flex-col"
              >
                <StudentRosterSidebar
                  enrollments={activeClassEnrollments}
                  selectedIds={selectedStudentIds}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                  onClearAll={handleClearAll}
                  onSetSelectedIds={setSelectedStudentIds}
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
              {availablePhases.map((p) => {
                const isActive = filterState.phase.toUpperCase() === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      React.startTransition(() => {
                        setFilterState((prev) => ({ ...prev, phase: p }))
                      })
                    }
                    className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${isActive
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
                      React.startTransition(() => {
                        const newCurriculum = c.id === 'both' ? 'combined' : (c.id as 'secular' | 'theology')
                        setFilterState((prev) => {
                          const currentClassId = prev.classIds[0]
                          let mappedClassId = currentClassId
                          if (currentClassId && currentClassId !== 'all') {
                            if (newCurriculum === 'theology') {
                              mappedClassId = SECULAR_TO_THEOLOGY_MAP[currentClassId] || currentClassId
                            } else if (newCurriculum === 'secular') {
                              mappedClassId = THEOLOGY_TO_SECULAR_MAP[currentClassId] || currentClassId
                            }
                          }
                          return {
                            ...prev,
                            curriculum: newCurriculum,
                            classIds: mappedClassId ? [mappedClassId] : prev.classIds,
                          }
                        })
                        setSelectedStudentIds([])
                      })
                    }
                    className={`h-7 px-3 rounded-full text-xs font-semibold transition cursor-pointer ${isActive
                      ? 'bg-gradient-to-r from-[#D97706] to-[#EA580C] text-white shadow-xs font-bold'
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
                className={`h-7 px-2.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${filterState.layout === 'single'
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
                className={`h-7 px-2.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${filterState.layout === 'grid'
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
            disabled: selectedInViewCount === 0 || isGenerating,
          }}
          studioFormatting={studioFormatting}
          onStudioFormattingChange={setStudioFormatting}
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
          cardsPerRow={cardsPerRow}
          onCardsPerRowChange={setCardsPerRow}
          onPrintCurrent={handlePrintCurrent}
          visualSelectMode={visualSelectMode}
          onToggleVisualSelect={() => setVisualSelectMode((v) => !v)}
          onOpenQaAuditor={() => setIsQaModalOpen(true)}
          qaIssueCount={qaAuditSummary.counts.totalFlagged}
          isGenerating={isGenerating}
        />
      </div>

      {/* Sleek Single 44px Mobile Action Header (< md) — Strictly 6 Compact Elements */}
      <div className="h-11 px-2 flex md:hidden items-center justify-between gap-1 bg-white dark:bg-[#151D1A] rounded-2xl border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 shrink-0 print:hidden shadow-2xs w-full max-w-full overflow-hidden">
        {/* 1. Hamburger to open main sidebar */}
        {sidebar && (
          <button
            type="button"
            onClick={sidebar.toggleSidebar}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
            title="Open Navigation"
            aria-label="Open Navigation"
          >
            <Menu size={16} />
          </button>
        )}

        {/* 2. Compact Class Pill */}
        <div className="min-w-0 shrink max-w-[92px] sm:max-w-[120px]">
          <CustomPillSelect
            id="reports-mobile-class-select"
            ariaLabel="Class"
            value={filterState.classIds[0] || ''}
            onChange={(val) => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('jiddah_reports_last_class', val)
              }
              setSelectedStudentIds([])
              setFilterState((prev) => ({ ...prev, classIds: [val] }))
            }}
            options={[
              { value: 'all', label: `All Classes (${figmaEnrollments.length})` },
              ...figmaClasses.map((c) => ({
                value: c.id,
                label: c.name,
              })),
            ]}
            className="w-full"
            triggerClassName="h-7.5 px-2 text-[11px] font-bold rounded-lg bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-800 dark:text-emerald-200 border-0 truncate"
          />
        </div>

        {/* 3. Student & Custom Batch Selection Pill */}
        <Popover open={isMobileRosterOpen} onOpenChange={setIsMobileRosterOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              data-testid="mobile-roster-pill"
              className="h-7.5 px-2 rounded-full bg-[#F0F4F9] dark:bg-[#1E2623] border border-black/[0.04] dark:border-white/[0.06] text-[11px] font-bold text-[#111827] dark:text-[#F3F7F5] flex items-center gap-1 cursor-pointer shrink-0 tabular-nums"
            >
              <span className="truncate tabular-nums">👥 {selectedInViewCount}</span>
              <ChevronDown size={11} className="text-stone-400 shrink-0" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            sideOffset={6}
            className="w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] sm:max-w-[360px] max-h-[72dvh] p-0 rounded-2xl border border-[#0D5C3A]/20 dark:border-[#F59E0B]/25 shadow-2xl overflow-hidden bg-white dark:bg-[#151D1A] z-50 flex flex-col"
          >
            <StudentRosterSidebar
              enrollments={activeClassEnrollments}
              selectedIds={selectedStudentIds}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
              onSetSelectedIds={setSelectedStudentIds}
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

        {/* 4. Phase & Curriculum Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              data-testid="mobile-phase-curriculum-pill"
              className="h-7.5 px-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-[11px] font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer"
              title="Phase & Curriculum"
            >
              <span>
                {filterState.phase.toUpperCase()}•
                {filterState.curriculum === 'combined'
                  ? 'Both'
                  : filterState.curriculum === 'secular'
                    ? 'Sec'
                    : 'Theo'}
              </span>
              <ChevronDown size={11} className="text-stone-400" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            sideOffset={6}
            className="w-56 max-w-[calc(100vw-20px)] max-h-[72dvh] p-2 rounded-xl bg-white dark:bg-[#151D1A] border border-[#0D5C3A]/20 shadow-xl flex flex-col gap-2 z-50 text-xs"
          >
            <span className="text-[10px] font-bold uppercase text-stone-500">Assessment Phase</span>
            <div className={`grid ${availablePhases.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-1`}>
              {availablePhases.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilterState((prev) => ({ ...prev, phase: p }))}
                  className={`h-7 rounded text-xs font-bold transition cursor-pointer ${filterState.phase.toUpperCase() === p
                    ? 'bg-[#0D5C3A] text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <span className="text-[10px] font-bold uppercase text-stone-500 mt-1">Curriculum Track</span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'both', label: 'Both' },
                { id: 'secular', label: 'Secular' },
                { id: 'theology', label: 'Theology' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    const newCurriculum = c.id === 'both' ? 'combined' : (c.id as any)
                    setFilterState((prev) => {
                      const currentClassId = prev.classIds[0]
                      let mappedClassId = currentClassId
                      if (currentClassId && currentClassId !== 'all') {
                        if (newCurriculum === 'theology') {
                          mappedClassId = SECULAR_TO_THEOLOGY_MAP[currentClassId] || currentClassId
                        } else if (newCurriculum === 'secular') {
                          mappedClassId = THEOLOGY_TO_SECULAR_MAP[currentClassId] || currentClassId
                        }
                      }
                      return {
                        ...prev,
                        curriculum: newCurriculum,
                        classIds: mappedClassId ? [mappedClassId] : prev.classIds,
                      }
                    })
                    setSelectedStudentIds([])
                  }}
                  className={`h-7 rounded text-xs font-bold transition cursor-pointer ${(c.id === 'both' ? filterState.curriculum === 'combined' : filterState.curriculum === c.id)
                    ? 'bg-[#0D5C3A] text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                    }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* 5. Primary Print pill button */}
        <motion.button
          type="button"
          data-testid="mobile-print-cta"
          onClick={handlePrint}
          disabled={rawReports.length === 0 || isGenerating}
          whileTap={{ scale: 0.96 }}
          className="h-7.5 px-2.5 rounded-full btn-jiddah-cta text-[11px] font-bold inline-flex items-center gap-1 shrink-0 whitespace-nowrap disabled:opacity-40"
          title="Print Reports"
        >
          <Printer size={12} />
          <span>{selectedInViewCount}</span>
        </motion.button>

        {/* 6. Mobile ⋮ More Actions Menu (Guaranteed 100% visible down to 280px) */}
        <MoreActionsMenu
          align="end"
          triggerClassName="w-7 h-7 shrink-0 rounded-full bg-[#F0F4F9] dark:bg-[#1E2623] border border-black/[0.04] dark:border-white/[0.06] text-stone-700 dark:text-stone-200"
          items={[
            {
              label:
                qaAuditSummary.counts.totalFlagged > 0
                  ? `🛡️ QA & Name Check (${qaAuditSummary.counts.totalFlagged})`
                  : '🛡️ QA & Name Check',
              icon: ShieldCheck,
              onClick: () => setIsQaModalOpen(true),
            },
            {
              label: '🎨 Customize Studio & Stamp',
              icon: Palette,
              onClick: () => {
                const studioTrigger = document.querySelector(
                  '[data-testid="studio-popover-trigger"]'
                ) as HTMLButtonElement | null
                studioTrigger?.click()
              },
            },
            {
              label: filterState.layout === 'grid' ? '⊞ Single View' : '⊞ Grid / Single View',
              icon: LayoutGrid,
              onClick: () => {
                setFilterState((prev) => ({
                  ...prev,
                  layout: prev.layout === 'grid' ? 'single' : 'grid',
                }))
              },
            },
            {
              label: visualSelectMode ? '☑️ Exit Card Selection' : '☑️ Select Cards on Canvas',
              icon: CheckSquare,
              onClick: () => setVisualSelectMode((v) => !v),
            },
            {
              label: '↓ Download PDF',
              icon: Download,
              onClick: handlePrint,
            },
            {
              label: '☀️/🌙 Theme',
              icon: Sun,
              onClick: () => {
                const isDark = document.documentElement.classList.contains('dark')
                if (isDark) {
                  document.documentElement.classList.remove('dark')
                  localStorage.setItem('theme', 'light')
                } else {
                  document.documentElement.classList.add('dark')
                  localStorage.setItem('theme', 'dark')
                }
                window.dispatchEvent(new Event('jiddah-theme-changed'))
              },
            },
            {
              label: '⚙️ Report Studio 2.0',
              icon: Sliders,
              onClick: () => {
                window.location.href = '/admin/reports/studio'
              },
            },
          ]}
        />
      </div>

      {/* 100% Full-Width Document Preview Canvas */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative w-full h-full rounded-2xl border border-[#0D5C3A]/12 dark:border-[#F59E0B]/15 print:!hidden">
        <DocumentCanvas
          reports={rawReports}
          activeReportId={activeReportId}
          onSelectReport={setActiveReportId}
          renderReport={renderJiddahReport}
          zoom={zoom}
          cardsPerRow={cardsPerRow}
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
          visualSelectMode={visualSelectMode}
          selectedIds={selectedInViewIds}
          onToggleSelectCard={handleToggleSelectCard}
          onSelectAllCards={handleSelectAll}
          onClearCards={handleClearAll}
          onInvertCards={handleInvertCards}
          onPrintSelectedCards={handlePrintSelected}
          onExitVisualSelect={() => setVisualSelectMode(false)}
          isGenerating={isGenerating}
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
        const hasLandscape = reportsToPrint.some((rep) => {
          const res = resolveReport(rep)
          return res && STABILIZED_REPORT_ORIENTATIONS[res.type]?.pageOrientation === 'landscape'
        })
        const hasPortrait = reportsToPrint.some((rep) => {
          const res = resolveReport(rep)
          return res && STABILIZED_REPORT_ORIENTATIONS[res.type]?.pageOrientation === 'portrait'
        })
        const pageOrientation: 'portrait' | 'landscape' | 'mixed' =
          hasLandscape && !hasPortrait
            ? 'landscape'
            : hasPortrait && !hasLandscape
              ? 'portrait'
              : 'mixed'

        if (reportsToPrint.length === 0) {
          return <PrintPortal pageOrientation={pageOrientation}>{null}</PrintPortal>
        }

        return (
          <PrintPortal pageOrientation={pageOrientation}>
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

                const isFirstSheet = nodes.length === 0

                if (resolved.type === 'TheologyMOTReport') {
                  const topReport = report
                  const nextReport = reportsToPrint[i + 1]
                  const nextResolved = nextReport ? resolveReport(nextReport) : null
                  const advance = nextReport && nextResolved?.type === 'TheologyMOTReport' ? 2 : 1
                  const isLastSheet = i + advance >= reportsToPrint.length

                  nodes.push(
                    <div
                      key={advance === 2 ? `theology-sheet-${topReport.id}-${nextReport.id}` : `theology-sheet-${topReport.id}`}
                      data-first-printed={isFirstSheet ? 'true' : 'false'}
                      data-last-printed={isLastSheet ? 'true' : 'false'}
                      className="report-card-sheet report-sheet-portrait"
                      data-report-orientation="portrait"
                    >
                      <Theology2UpPrintSheet
                        topReport={topReport}
                        bottomReport={advance === 2 ? nextReport : undefined}
                        studioFormatting={studioFormatting}
                        isLastPrinted={isLastSheet}
                      />
                    </div>
                  )
                  i += advance
                } else {
                  const dims = STABILIZED_REPORT_ORIENTATIONS[resolved.type]
                  const isCardLandscape = dims?.pageOrientation === 'landscape'
                  const isLastSheet = i + 1 >= reportsToPrint.length
                  nodes.push(
                    <div
                      key={report.id}
                      data-first-printed={isFirstSheet ? 'true' : 'false'}
                      data-last-printed={isLastSheet ? 'true' : 'false'}
                      className={`report-card-sheet ${isCardLandscape ? 'report-sheet-landscape' : 'report-sheet-portrait'}`}
                      data-report-orientation={isCardLandscape ? 'landscape' : 'portrait'}
                    >
                      {resolved.component}
                    </div>
                  )
                  i++
                }
              }

              return nodes
            })()}
          </PrintPortal>
        )
      })()}

      <PrePrintQaModal
        open={isQaModalOpen}
        onClose={() => setIsQaModalOpen(false)}
        classLabel={
          filterState.classIds[0] && filterState.classIds[0] !== 'all'
            ? filterState.classIds[0]
            : `All Classes (${activeClassEnrollments.length})`
        }
        phase={filterState.phase || 'EOT'}
        curriculum={filterState.curriculum}
        enrollments={activeClassEnrollments}
        reports={rawReports}
        onStudentUpdated={handleQaStudentUpdated}
        onSelectStudent={(id) => {
          setActiveReportId(id)
          if (filterState.layout === 'grid') {
            const el = document.querySelector(`[data-report-id="${id}"]`)
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }}
      />
    </div>
  )
}

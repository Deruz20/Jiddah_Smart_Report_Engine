'use client'

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { AnimatePresence } from 'motion/react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { FileSpreadsheet, Printer } from 'lucide-react'
import { generateReportBroadsheetCSV } from '@/utils/csvExport'
import { TopToolbar } from './figma-ui/TopToolbar'
import { SearchFilterBar } from './figma-ui/SearchFilterBar'
import { DocumentCanvas } from './figma-ui/DocumentCanvas'
import { SidePanel } from './figma-ui/SidePanel'
import { PrintDialog } from './figma-ui/PrintDialog'
import type { FilterState, ReportData, ClassGroup } from './figma-ui/types'

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

  const [enrollments, setEnrollments] = useState<RawEnrollment[]>([])
  const [searchOpen, setSearchOpen] = useState(false)

  const [filterState, setFilterState] = useState<FilterState>(() => {
    return {
      mode: (searchParams.get('mode') as any) || 'class',
      studentIds: searchParams.get('studentIds') ? searchParams.get('studentIds')!.split(',') : [],
      classIds: searchParams.get('classIds') ? searchParams.get('classIds')!.split(',') : [],
      section: (searchParams.get('section') as any) || 'all',
      gender: (searchParams.get('gender') as any) || 'All',
      term: (searchParams.get('term') as any) || '',
      phase: (searchParams.get('phase') as any) || '',
      curriculum: (searchParams.get('curriculum') as any) || 'secular',
      layout: (searchParams.get('layout') as any) || 'single',
    }
  })

  const [rawReports, setRawReports] = useState<ReportData[]>([])
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0.75)
  const [printScope, setPrintScope] = useState<'current' | 'all'>('current')
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

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
    const eList: any[] = []
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
          enrollmentIds: []
        })
      }
      classMap.get(clsName)!.enrollmentIds.push(id)
    }

    return { figmaClasses: Array.from(classMap.values()), figmaEnrollments: eList }
  }, [enrollments, filterState.curriculum])

  const executeGeneration = useCallback(async () => {
    const { mode, studentIds, classIds, section, term, phase } = filterState

    let targets: string[] = []
    if (mode === 'individual') {
      targets = studentIds
    } else {
      targets = figmaClasses
        .filter(c => classIds.includes(c.id))
        .flatMap(c => c.enrollmentIds)
    }

    if (targets.length === 0) {
      toast.warning('No students found for this selection.')
      return
    }

    const termObj = terms.find(t => String(t.term_number) === term)
    if (!termObj) {
      toast.error('Term not found in database.')
      return
    }

    setIsGenerating(true)
    const loadingId = toast.loading(
      mode === 'class' ? 'Generating batch reports…' : 'Generating report…'
    )

    try {
      const isPrimaryClass = figmaClasses.some(c => classIds.includes(c.id) && (c.section_type === 'lower_primary' || c.section_type === 'upper_primary'))
      const isPrimaryStudent = figmaEnrollments.some(e => studentIds.includes(e.enrollment_id) && (e.section_type === 'lower_primary' || e.section_type === 'upper_primary'))
      const isPrimary = section === 'lower_primary' || section === 'upper_primary' || (mode === 'class' ? isPrimaryClass : isPrimaryStudent)
      const isEOT = phase.toLowerCase() === 'eot'

      let effectiveCurriculum = filterState.curriculum
      if (isPrimary && isEOT) {
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
          stamp_date: filterState.stampDate
        })
      })
      const data = await response.json()

      toast.dismiss(loadingId)

      if (!response.ok) throw new Error(data.error || 'Failed to generate reports')

      const generatedReportsData: ReportData[] = data.reports || []

      if (generatedReportsData.length === 0) {
        toast.warning('No report data found for the selected students.')
        setIsGenerating(false)
        return
      }

      if (typeof window !== 'undefined' && localStorage.getItem('auto_transliterate') === 'true') {
        const namesToTransliterate = generatedReportsData
          .filter(r => r.student && !r.student.arabic_name)
          .map(r => r.student.name)

        if (namesToTransliterate.length > 0) {
          toast.loading('Transliterating names...', { id: 'transliterate-toast' })
          try {
            const transRes = await fetch('/api/transliterate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ names: namesToTransliterate })
            })
            if (transRes.ok) {
              const transData = await transRes.json()
              if (transData.transliterated && transData.transliterated.length === namesToTransliterate.length) {
                let i = 0
                generatedReportsData.forEach(r => {
                  if (r.student && !r.student.arabic_name) {
                    r.student.arabic_name = transData.transliterated[i++]
                  }
                })
              }
            }
          } catch (e) {
            console.error('Transliteration failed', e)
          } finally {
            toast.dismiss('transliterate-toast')
          }
        }
      }

      setRawReports(generatedReportsData)
      setActiveReportId(generatedReportsData[0].id)

      toast.success(
        `${generatedReportsData.length} report${generatedReportsData.length !== 1 ? 's' : ''} generated.`,
        { duration: 3000 }
      )
      setSearchOpen(false)

      setTimeout(() => {
        const missingTheology = generatedReportsData.filter(r =>
          r.section_type !== 'nursery' && r.score_type === 'eot' && !r.theology && r.student?.theology_class_arabic
        )
        if (missingTheology.length > 0) {
          toast.warning(`${missingTheology.length} students are missing theology EOT marks`, {
            duration: 7000,
            action: {
              label: 'View',
              onClick: () => setActiveReportId(missingTheology[0].id)
            }
          })
        }

        const incompleteMarks = generatedReportsData.filter(r =>
          r.score_type === 'eot' && r.circular && r.circular.subjects.some((subj: any) => subj.eot_score === null)
        )
        if (incompleteMarks.length > 0) {
          toast.warning(`Incomplete marks detected for ${incompleteMarks.length} students`, {
            duration: 7000,
            action: {
              label: 'View',
              onClick: () => setActiveReportId(incompleteMarks[0].id)
            }
          })
        }
      }, 1500)
    } catch (err: any) {
      toast.dismiss(loadingId)
      toast.error(err.message || 'Report generation failed')
      setRawReports([])
    } finally {
      setIsGenerating(false)
    }
  }, [filterState, figmaClasses, figmaEnrollments, terms])

  const handleGenerate = useCallback(async () => {
    const { mode, studentIds, classIds, term, phase } = filterState

    if (!term || !phase) {
      toast.error('Please select both a Term and Phase before generating.')
      return
    }
    if (mode === 'individual' && (!studentIds || studentIds.length === 0)) {
      toast.error('Please select at least one student.')
      return
    }
    if (mode === 'class' && (!classIds || classIds.length === 0)) {
      toast.error('Please select at least one class.')
      return
    }

    executeGeneration()
  }, [filterState, executeGeneration])

  const handleDownload = useCallback(() => {
    if (rawReports.length === 0) { toast.error('No reports loaded. Generate reports first.'); return }
    generateReportBroadsheetCSV(rawReports, `broadsheet-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success('Broadsheet downloaded!')
  }, [rawReports])

  const handlePrint = useCallback(() => {
    if (rawReports.length === 0) { toast.error('No reports loaded. Generate reports first.'); return }
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

  const hasAutoGenerated = useRef(false)
  useEffect(() => {
    if (enrollments.length > 0 && !hasAutoGenerated.current && filterState.term && filterState.phase) {
      const { mode, studentIds, classIds } = filterState
      if ((mode === 'individual' && studentIds.length > 0) || (mode === 'class' && classIds.length > 0)) {
        hasAutoGenerated.current = true
        setTimeout(() => executeGeneration(), 100)
      }
    }
  }, [enrollments, filterState, executeGeneration])

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

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(2, +(z + 0.25).toFixed(2))), [])
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2))), [])
  const handleFitScreen = useCallback(() => setZoom(1), [])

  const resolveReport = useCallback((report: ReportData): { component: React.ReactNode; type: keyof typeof STABILIZED_REPORT_ORIENTATIONS } | null => {
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
    } else if (filterState.curriculum === 'combined') {
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
  }, [filterState.curriculum])

  const renderJiddahReport = useCallback((report: ReportData, isActive: boolean) => {
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
  }, [resolveReport, zoom])

  const printableReports = useMemo(() => {
    if (printScope === 'current') {
      const current = rawReports.find(r => r.id === activeReportId)
      return current ? [current] : []
    }
    return rawReports
  }, [rawReports, printScope, activeReportId])

  return (
    <div className="h-full bg-[#FDFBF7] font-sans flex flex-col relative overflow-hidden text-stone-800">
      <PrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        reports={rawReports as any}
        onConfirmPrint={(mode) => {
          setPrintScope(mode)

          let sanitizedFilename = 'Report.pdf'

          if (mode === 'current') {
            const currentReport = rawReports.find(r => r.id === activeReportId)
            const studentName = (currentReport as any)?.student?.name || 'Student'
            const term = filterState.term ? `_Term_${filterState.term}` : ''
            sanitizedFilename = `${studentName}${term}_Report.pdf`
          } else if (mode === 'all') {
            const className = (filterState as any).classIds?.[0] ? figmaClasses.find(c => c.id === (filterState as any).classIds[0])?.name || 'Batch' : 'Batch'
            const term = filterState.term ? `_Term_${filterState.term}` : ''
            sanitizedFilename = `${className}${term}_Batch_Reports.pdf`
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

      <div className="print:hidden">
        <TopToolbar
          onSearchToggle={() => setSearchOpen(o => !o)}
          searchOpen={searchOpen}
          downloadOptions={[
            {
              label: 'Print / Save as PDF',
              icon: <Printer size={15} />,
              onClick: handlePrint
            },
            {
              label: 'Download Broadsheet (CSV)',
              icon: <FileSpreadsheet size={15} />,
              onClick: handleDownload
            }
          ]}
          onDownload={handleDownload}
          onPrint={handlePrint}
          onShare={handleShare}
          reportCount={rawReports.length}
          layout={filterState.layout || 'single'}
          onLayoutToggle={() => setFilterState({ ...filterState, layout: filterState.layout === 'grid' ? 'single' : 'grid' })}
        />
      </div>

      <AnimatePresence>
        {searchOpen && (
          <div className="print:hidden relative z-40 flex-shrink-0 shadow-sm border-b border-stone-200 bg-[#FAF7F2]">
            <SearchFilterBar
              open={searchOpen}
              enrollments={figmaEnrollments}
              classes={figmaClasses}
              filterState={filterState}
              onChange={(patch) => setFilterState({ ...filterState, ...patch })}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden relative">
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
          onSearchOpen={() => setSearchOpen(true)}
          printScope={printScope}
        />

        <div
          className={`print:hidden absolute right-0 top-0 bottom-0 z-40 md:relative flex flex-col h-full ${
            sidePanelOpen ? "shadow-2xl md:shadow-none bg-white" : ""
          }`}
          style={{ pointerEvents: sidePanelOpen ? 'auto' : 'none' }}
        >
          <div style={{ pointerEvents: 'auto', height: '100%' }}>
            <SidePanel
              open={sidePanelOpen}
              onToggle={() => setSidePanelOpen(o => !o)}
              activeReport={rawReports.find(r => r.id === activeReportId) || null}
              reports={rawReports}
            />
          </div>
        </div>
      </div>

      {(() => {
        const reportsToPrint = printableReports.length > 0
          ? printableReports
          : (rawReports.filter(r => r.id === activeReportId).length > 0
              ? rawReports.filter(r => r.id === activeReportId)
              : (rawReports.length > 0 ? [rawReports[0]] : []))
        const firstPrintableReport = reportsToPrint
          .map(resolveReport)
          .find((resolved) => resolved !== null)
        const pageOrientation = firstPrintableReport
          ? STABILIZED_REPORT_ORIENTATIONS[firstPrintableReport.type].pageOrientation
          : 'portrait'

        if (reportsToPrint.length === 0) {
          return (
            <PrintPortal pageOrientation={pageOrientation}>
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

'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Toaster, toast } from 'sonner'
import { AnimatePresence } from 'motion/react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { FileSpreadsheet, Printer } from 'lucide-react'
import { generateReportBroadsheetCSV } from '@/utils/csvExport'
import { TopToolbar } from './figma-ui/TopToolbar'
import { SearchFilterBar } from './figma-ui/SearchFilterBar'
import { DocumentCanvas } from './figma-ui/DocumentCanvas'
import { SidePanel } from './figma-ui/SidePanel'
import { PrintDialog } from './figma-ui/PrintDialog'
import type { FilterState, ReportData, ClassGroup, EnrollmentItem } from './figma-ui/types'
import * as AlertDialog from '@radix-ui/react-alert-dialog'

// Jiddah Templates
import PrimaryEOTReport from './reports/PrimaryEOTReport'
import P7EOTReport from './reports/P7EOTReport'
import PrimaryBOTReport from './reports/PrimaryBOTReport'
import PrimaryMOTReport from './reports/PrimaryMOTReport'
import NurseryEOTReport from './reports/NurseryEOTReport'
import NurseryMOTReport from './reports/NurseryMOTReport'
import TheologyMOTReport from './reports/TheologyMOTReport'
import NurseryTheologyEOTReport from './reports/NurseryTheologyEOTReport'
import { ReportViewport } from './reports/ReportViewport'
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

const DEFAULT_FILTER: FilterState = {
  mode: 'class',
  studentIds: [],
  classIds: [],
  section: 'all',
  gender: 'All',
  term: '',
  phase: '',
  curriculum: 'secular',
  layout: 'single',
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
  
  // Real data store
  const [rawReports, setRawReports] = useState<ReportData[]>([])
  
  const [activeReportId, setActiveReportId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0.75)
  const [printScope, setPrintScope] = useState<'current' | 'all' | string[]>('current')
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Load roster
  useEffect(() => {
    async function loadEnrollments() {
      try {
        const response = await fetch('/api/enrollments')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load enrollments')
        setEnrollments(data)
      } catch (err: any) {
        toast.error('Failed to load students list.')
      }
    }
    loadEnrollments()
    
    // Panel starts collapsed by default
  }, [])

  // Map enrollments to Figma's ClassInfo and EnrollmentItem for the search filter
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
        arabic_name: '', // Backend lacks arabic_name
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

  const handleGenerate = useCallback(async () => {
    const { mode, studentIds, classIds, section, term, phase } = filterState

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
  }, [filterState])

  const executeGeneration = useCallback(async () => {
    const { mode, studentIds, classIds, section, term, phase } = filterState

    // Determine target enrollment IDs
    let targets: string[] = [];
    if (mode === 'individual') {
      targets = studentIds;
    } else {
      // In class mode, we just get students from the selected classes
      targets = figmaClasses
        .filter(c => classIds.includes(c.id))
        .flatMap(c => c.enrollmentIds);
    }

    if (targets.length === 0) {
      toast.warning('No students found for this selection.')
      return
    }

    // Map the selected term "1", "2", "3" to the actual backend TermData id
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
      const response = await fetch('/api/report/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollment_ids: targets,
          term_id: termObj.id,
          score_type: phase.toLowerCase(),
          curriculum: filterState.curriculum === 'combined' ? 'secular' : filterState.curriculum
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

      // Add Smart Transliteration step
      const namesToTransliterate = generatedReportsData
        .filter(r => !r.student.arabic_name)
        .map(r => r.student.name);

      if (namesToTransliterate.length > 0) {
        toast.loading('Transliterating names...', { id: 'transliterate-toast' });
        try {
          const transRes = await fetch('/api/transliterate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ names: namesToTransliterate })
          });
          if (transRes.ok) {
            const transData = await transRes.json();
            if (transData.transliterated && transData.transliterated.length === namesToTransliterate.length) {
              let i = 0;
              generatedReportsData.forEach(r => {
                if (!r.student.arabic_name) {
                  r.student.arabic_name = transData.transliterated[i++];
                }
              });
            }
          }
        } catch (e) {
          console.error('Transliteration failed', e);
        } finally {
          toast.dismiss('transliterate-toast');
        }
      }

      setRawReports(generatedReportsData)
      setActiveReportId(generatedReportsData[0].id)

      toast.success(
        `${generatedReportsData.length} report${generatedReportsData.length !== 1 ? 's' : ''} generated.`,
        { duration: 3000 }
      )
      setSearchOpen(false)

      // Post-generation alerts
      setTimeout(() => {
        const missingTheology = generatedReportsData.filter(r => 
          r.section_type !== 'nursery' && r.score_type === 'eot' && !r.theology && r.student.theology_class_arabic
        );
        if (missingTheology.length > 0) {
          toast.warning(`${missingTheology.length} students are missing theology EOT marks`, {
            duration: 7000,
            action: {
              label: 'View',
              onClick: () => setActiveReportId(missingTheology[0].id)
            }
          });
        }

        const incompleteMarks = generatedReportsData.filter(r => 
          r.score_type === 'eot' && r.circular.subjects.some((subj: any) => subj.eot_score === null)
        );
        if (incompleteMarks.length > 0) {
          toast.warning(`Incomplete marks detected for ${incompleteMarks.length} students`, {
            duration: 7000,
            action: {
              label: 'View',
              onClick: () => setActiveReportId(incompleteMarks[0].id)
            }
          });
        }
      }, 1500)

    } catch (err: any) {
      toast.dismiss(loadingId)
      toast.error(err.message || 'Report generation failed')
      setRawReports([])
    } finally {
      setIsGenerating(false)
    }
  }, [filterState, figmaClasses, terms])

  const handleDownload = useCallback(() => {
    if (rawReports.length === 0) { toast.error('No reports loaded. Generate reports first.'); return; }
    generateReportBroadsheetCSV(rawReports, `broadsheet-${new Date().toISOString().split('T')[0]}.csv`)
    toast.success('Broadsheet downloaded!')
  }, [rawReports])

  const handlePrint = useCallback(() => {
    if (rawReports.length === 0) { toast.error('No reports loaded. Generate reports first.'); return; }
    setIsPrintDialogOpen(true)
  }, [rawReports])

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy link.')
    }
  }, [])

  // Auto-generate on load if params present
  const hasAutoGenerated = useRef(false)
  useEffect(() => {
    if (enrollments.length > 0 && !hasAutoGenerated.current && filterState.term && filterState.phase) {
      const { mode, studentIds, classIds } = filterState
      if ((mode === 'individual' && studentIds.length > 0) || (mode === 'class' && classIds.length > 0)) {
        hasAutoGenerated.current = true
        // Only auto-generate if we actually matched classes that exist in figmaClasses
        // This avoids triggering generation with empty arrays if the class map hasn't hydrated
        setTimeout(() => executeGeneration(), 100)
      }
    }
  }, [enrollments, filterState, executeGeneration])

  // Sync state to URL
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

  const activeReport = rawReports.find(r => r.id === activeReportId) ?? null

  // RENDER CUSTOM REPORT TEMPLATE
  const renderJiddahReport = useCallback((report: ReportData, isActive: boolean) => {
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
    
    // Override format based on user's curriculum selection in the UI
    if (filterState.curriculum === 'theology') {
      if (hasTheo) format = 'theology'
    } else if (filterState.curriculum === 'secular') {
      if (hasCirc) format = 'circular'
    } else if (filterState.curriculum === 'combined') {
      if (hasCirc && hasTheo && isPrim && report.score_type === 'eot') {
        format = 'combined'
      }
      // Else it naturally falls back to the default format computed above
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

    if (!component || !type) return <div className="p-8 text-rose-500">Error: Unmapped report format.</div>

    return (
      <div className="bg-white" style={{ pointerEvents: isActive ? 'auto' : 'none' }}>
        <ReportViewport reportType={type}>
          {component}
        </ReportViewport>
      </div>
    )
  }, [filterState.curriculum])

  return (
    <div className="h-full bg-[#f1f5f9] font-sans flex flex-col relative print:bg-white overflow-hidden text-slate-800 print:overflow-visible print:h-auto print:block">
      

      <PrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        reports={rawReports as any}
        onConfirmPrint={(mode) => {
          setPrintScope(mode)
          
          let sanitizedFilename = 'Report.pdf';
          
          if (mode === 'current') {
            const currentReport = rawReports.find(r => r.id === activeReportId);
            const studentName = (currentReport as any)?.student?.name || 'Student';
            const term = filterState.term ? `_Term_${filterState.term}` : '';
            sanitizedFilename = `${studentName}${term}_Report.pdf`;
          } else if (mode === 'all') {
            const className = (filterState as any).classIds?.[0] ? figmaClasses.find(c => c.id === (filterState as any).classIds[0])?.name || 'Batch' : 'Batch';
            const term = filterState.term ? `_Term_${filterState.term}` : '';
            sanitizedFilename = `${className}${term}_Batch_Reports.pdf`;
          } else {
            sanitizedFilename = `Custom_Batch_Reports_${new Date().toISOString().split('T')[0]}.pdf`;
          }
          
          // Sanitize filename for illegal Windows/macOS characters
          sanitizedFilename = sanitizedFilename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
          
          const originalTitle = document.title;
          document.title = sanitizedFilename;
          
          setTimeout(() => {
            window.print();
          }, 300);
          
          const restoreTitle = () => {
            document.title = originalTitle;
            window.removeEventListener('afterprint', restoreTitle);
          };
          window.addEventListener('afterprint', restoreTitle);
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
          <div className="print:hidden relative z-40 flex-shrink-0 shadow-sm border-b border-slate-200/60 bg-white/95 backdrop-blur-md">
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

      <div className="flex flex-1 overflow-hidden print:overflow-visible print:block print-reset-layout relative">
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

        {/* Side Panel Wrapper - Overlay on Mobile, Inline on Desktop */}
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
    </div>
  )
}

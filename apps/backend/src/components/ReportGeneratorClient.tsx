'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

type EnrollmentItem = {
  enrollment_id: string
  name: string
  admission_number: string
  circular_class: string
  section: string | null
  theology_class_arabic: string | null
}

type CircularSubject = {
  subject_name: string
  score: number | null
  grade_display: string
  remark: string
  is_core: boolean
}

type TheologySubject = {
  subject_name_arabic: string
  score: number | null
  grade_display: string
}

type ReportData = {
  student: {
    name: string
    admission_number: string
    class_name: string
    section: string
    academic_year: number
  }
  term: {
    label: string
    term_number: number
    academic_year: number
  }
  score_type: 'bot' | 'mot' | 'eot'
  section_type: 'nursery' | 'lower_primary' | 'upper_primary'
  circular: {
    subjects: CircularSubject[]
    total: number
    aggregate: number | null
    division: string | null
    position: null
  }
  theology: {
    subjects: TheologySubject[]
    total: number
    aggregate: number | null
    division: string | null
  } | null
  meta: {
    is_term_3: boolean
    promotion_status: string | null
  }
}

interface ReportGeneratorClientProps {
  terms: TermData[]
}

export function ReportGeneratorClient({ terms }: ReportGeneratorClientProps) {
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([])
  const [selectedTermId, setSelectedTermId] = useState('')
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('')
  const [scoreType, setScoreType] = useState<'bot' | 'mot' | 'eot'>('mot')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [activeReport, setActiveReport] = useState<'circular' | 'theology'>('circular')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [deepLinkHandled, setDeepLinkHandled] = useState(false)
  const [pendingPrint, setPendingPrint] = useState(false)
  const autoGenerateAttempted = useRef(false)

  useEffect(() => {
    async function loadEnrollments() {
      try {
        const response = await fetch('/api/enrollments')
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Unable to load enrollments')
        }
        setEnrollments(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load students')
      }
    }

    loadEnrollments()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || deepLinkHandled) return
    const params = new URLSearchParams(window.location.search)
    const enrollmentId = params.get('enrollment_id')
    const termId = params.get('term_id')
    const scoreTypeParam = params.get('score_type')
    const shouldPrint = params.get('print') === '1'

    if (termId) setSelectedTermId(termId)
    if (enrollmentId) setSelectedEnrollmentId(enrollmentId)
    if (scoreTypeParam === 'bot' || scoreTypeParam === 'mot' || scoreTypeParam === 'eot') setScoreType(scoreTypeParam)
    if (shouldPrint) setPendingPrint(true)
    if (enrollmentId || termId) setDeepLinkHandled(true)
  }, [deepLinkHandled])

  const sortedEnrollments = useMemo(
    () => [...enrollments].sort((a, b) => a.name.localeCompare(b.name)),
    [enrollments]
  )

  const selectedEnrollment = enrollments.find((item) => item.enrollment_id === selectedEnrollmentId)

  const getTermLabel = (term: TermData) => {
    const termNumber = term.term_number ?? (term.term === 'beginning' ? 1 : term.term === 'midterm' ? 2 : term.term === 'endterm' ? 3 : 0)
    const academicYear = term.academic_year ?? term.year
    if (term.label) {
      return `${term.label} — ${academicYear}`
    }
    return `Term ${termNumber} — ${academicYear}`
  }

  const handleGenerateReport = async () => {
    setError(null)
    setReportData(null)

    if (!selectedTermId) {
      setError('Please select a term.')
      return
    }

    if (!selectedEnrollmentId) {
      setError('Please select a student.')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        `/api/report?enrollment_id=${encodeURIComponent(selectedEnrollmentId)}&term_id=${encodeURIComponent(selectedTermId)}&score_type=${scoreType}`
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate report')
      }
      setReportData(data)
      return data as ReportData
    } catch (err: any) {
      setError(err.message || 'Report generation failed')
      return null
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!deepLinkHandled || loading || autoGenerateAttempted.current) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('autogenerate') === '0') return
    if (!selectedEnrollmentId || !selectedTermId) return
    if (reportData) return

    autoGenerateAttempted.current = true
    void handleGenerateReport()
  }, [deepLinkHandled, selectedEnrollmentId, selectedTermId, enrollments.length, loading, reportData])

  useEffect(() => {
    if (!pendingPrint || !reportData || loading) return
    setPendingPrint(false)
    setTimeout(() => window.print(), 400)
  }, [pendingPrint, reportData, loading])

  const getValidReportTypes = () => {
    if (!reportData) return { circular: false, theology: false, combined: false }
    
    const { section_type, score_type } = reportData
    
    if ((section_type === 'lower_primary' || section_type === 'upper_primary') && score_type === 'eot') {
      return { circular: false, theology: false, combined: true }
    }
    
    if ((section_type === 'lower_primary' || section_type === 'upper_primary') && (score_type === 'mot' || score_type === 'bot')) {
      return { circular: true, theology: reportData.theology ? true : false, combined: false }
    }
    
    if (section_type === 'nursery') {
      return { circular: true, theology: reportData.theology ? true : false, combined: false }
    }
    
    return { circular: true, theology: reportData.theology ? true : false, combined: false }
  }

  const validReports = getValidReportTypes()

  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
    }, 200)
  }

  const renderCurrentReport = () => {
    if (!reportData) return null
    
    let component: React.ReactNode = null
    let type: keyof typeof STABILIZED_REPORT_ORIENTATIONS | null = null

    const isP7 = reportData?.student?.class_name?.toLowerCase() === 'p.7'
    if ((reportData.section_type === 'lower_primary' || reportData.section_type === 'upper_primary') && 
        reportData.score_type === 'eot') {
      if (isP7) {
        component = <P7EOTReport reportData={reportData} />
        type = 'P7EOTReport'
      } else {
        component = <PrimaryEOTReport reportData={reportData} />
        type = 'PrimaryEOTReport'
      }
    } else {
      if (activeReport === 'circular') {
        if (reportData.section_type === 'nursery') {
          if (reportData.score_type === 'mot') {
            component = <NurseryMOTReport reportData={reportData} />
            type = 'NurseryMOTReport'
          } else {
            component = <NurseryEOTReport reportData={reportData} />
            type = 'NurseryEOTReport'
          }
        } else if (reportData.score_type === 'bot') {
          component = <PrimaryBOTReport reportData={reportData} />
          type = 'PrimaryBOTReport'
        } else {
          component = <PrimaryMOTReport reportData={reportData} />
          type = 'PrimaryMOTReport'
        }
      } else {
        if (reportData.section_type === 'nursery' && reportData.score_type === 'eot') {
          component = <NurseryTheologyEOTReport reportData={reportData} />
          type = 'NurseryTheologyEOTReport'
        } else {
          component = <TheologyMOTReport reportData={reportData} />
          type = 'TheologyMOTReport'
        }
      }
    }

    if (!component || !type) return null
    
    return (
      <ReportViewport reportType={type}>
        {component}
      </ReportViewport>
    )
  }

  useEffect(() => {
    const handleBeforePrint = () => setIsPrinting(true)
    const handleAfterPrint = () => setIsPrinting(false)

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeprint', handleBeforePrint)
      window.addEventListener('afterprint', handleAfterPrint)
      window.onbeforeprint = handleBeforePrint
      window.onafterprint = handleAfterPrint

      const mediaQuery = window.matchMedia('print')
      const handleMediaChange = (event: MediaQueryListEvent) => {
        setIsPrinting(event.matches)
      }
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleMediaChange)
      } else if ((mediaQuery as any).addListener) {
        ;(mediaQuery as any).addListener(handleMediaChange)
      }

      return () => {
        window.removeEventListener('beforeprint', handleBeforePrint)
        window.removeEventListener('afterprint', handleAfterPrint)
        window.onbeforeprint = null
        window.onafterprint = null
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleMediaChange)
        } else if ((mediaQuery as any).removeListener) {
          ;(mediaQuery as any).removeListener(handleMediaChange)
        }
      }
    }
    return undefined
  }, [])

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans flex flex-col overflow-visible print:h-auto print:overflow-visible">
      <style dangerouslySetInnerHTML={{
        __html: `
        @media screen {
          .preview-container {
            position: relative;
            width: auto;
            height: 100%;
          }
          .preview-scroll {
            width: auto;
            height: 100%;
            overflow: auto;
            padding: 32px 0 40px;
          }
          .preview-frame {
            min-height: 100%;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0 32px;
          }
          .preview-wrapper {
            width: fit-content;
            height: fit-content;
            margin: auto;
            transform: none;
            transition: none;
            will-change: auto;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            backface-visibility: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05);
            border-radius: 2px;
            overflow: hidden;
            background: white;
          }
          
          /* Custom Scrollbar for a premium feel */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        }
        @media print {
          body * {
            visibility: hidden;
          }

          .print-root,
          .print-root * {
            visibility: visible;
          }

          .print-root {
            position: absolute;
            inset: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            overflow: visible !important;
            transform: none !important;
          }

          .preview-container,
          .preview-scroll,
          .preview-frame,
          .preview-wrapper {
            transform: none !important;
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
        `
      }} />

      {/* PREMIUM DARK HEADER */}
      <header className="h-16 shrink-0 bg-slate-900 border-b border-slate-800 shadow-lg z-30 px-4 sm:px-6 flex items-center justify-between print-hide sticky top-0">
        <div className="flex items-center gap-5 flex-1">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 lg:hidden transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          
          <div className="hidden sm:flex items-center gap-4">
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="w-48 appearance-none bg-slate-800 border border-slate-700 text-slate-200 rounded-lg pl-9 pr-8 py-1.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer hover:bg-slate-750"
              >
                <option value="">Select term...</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>{getTermLabel(term)}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <select
                value={selectedEnrollmentId}
                onChange={(e) => setSelectedEnrollmentId(e.target.value)}
                className="w-64 appearance-none bg-slate-800 border border-slate-700 text-slate-200 rounded-lg pl-9 pr-8 py-1.5 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer hover:bg-slate-750"
              >
                <option value="">Select student...</option>
                {sortedEnrollments.map((enrollment) => (
                  <option key={enrollment.enrollment_id} value={enrollment.enrollment_id}>
                    {enrollment.name} ({enrollment.circular_class})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            <div className="flex rounded-lg bg-slate-800 p-1 border border-slate-700">
              {([
                ...(selectedEnrollment?.section !== 'nursery' ? ['bot'] : []),
                'mot',
                'eot'
              ] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setScoreType(type as any)}
                  className={`rounded-md px-4 py-1 text-xs font-bold transition-all ${
                    scoreType === type 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {type === 'bot' ? 'BEGINNING' : type === 'mot' ? 'MID TERM' : 'END OF TERM'}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="ml-2 px-5 py-1.5 bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-[0_0_15px_rgba(5,150,105,0.3)] hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(5,150,105,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap active:scale-95 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Load Report
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {error && (
            <div className="hidden md:flex items-center gap-2 text-sm font-bold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-md border border-rose-500/20">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
          <button
            onClick={handlePrint}
            disabled={!reportData}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-5 py-1.5 text-sm font-bold text-slate-200 shadow-sm hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print Output
          </button>
        </div>
      </header>

      {/* MOBILE CONTROLS */}
      <div className="sm:hidden p-4 bg-slate-900 border-b border-slate-800 flex flex-col gap-3 print-hide shadow-inner">
        <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)} className="w-full rounded-lg bg-slate-800 border-slate-700 text-slate-200 p-2.5 text-sm focus:ring-emerald-500">
          <option value="">Select term...</option>
          {terms.map(t => <option key={t.id} value={t.id}>{getTermLabel(t)}</option>)}
        </select>
        <select value={selectedEnrollmentId} onChange={(e) => setSelectedEnrollmentId(e.target.value)} className="w-full rounded-lg bg-slate-800 border-slate-700 text-slate-200 p-2.5 text-sm focus:ring-emerald-500">
          <option value="">Select student...</option>
          {sortedEnrollments.map(e => <option key={e.enrollment_id} value={e.enrollment_id}>{e.name}</option>)}
        </select>
        <div className="flex gap-2">
          <select value={scoreType} onChange={(e) => setScoreType(e.target.value as 'bot'|'mot'|'eot')} className="flex-1 rounded-lg bg-slate-800 border-slate-700 text-slate-200 p-2.5 text-sm focus:ring-emerald-500">
                {selectedEnrollment?.section !== 'nursery' && <option value="bot">Beginning of Term</option>}
                <option value="mot">Mid Term</option>
                <option value="eot">End of Term</option>
          </select>
          <button onClick={handleGenerateReport} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm shadow-lg transition-colors">
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-visible relative">
        
        {/* PREMIUM LEFT SIDEBAR */}
        <aside className={`
          absolute lg:static top-0 left-0 h-full w-80 bg-white border-r border-slate-200 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.03)] transition-transform duration-300
          flex flex-col overflow-y-auto print-hide
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-80 lg:block'}
        `}>
          <div className="p-6 flex flex-col gap-8">
            
            {/* Student Profile Card */}
            <div>
              <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Student Profile
              </h3>
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
                <div className="p-5">
                  {selectedEnrollment ? (
                    <>
                      <h2 className="text-lg font-extrabold text-slate-900 leading-tight mb-1.5">{selectedEnrollment.name}</h2>
                      <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 mb-4 border border-slate-200">
                        ID: <span className="font-mono text-slate-900">{selectedEnrollment.admission_number || 'PENDING'}</span>
                      </span>
                      
                      <div className="space-y-3 mt-1 pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-500">Class</span>
                          <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">{selectedEnrollment.circular_class}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-slate-500">Phase</span>
                          <span className="text-sm font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">{scoreType.toUpperCase()}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 flex flex-col items-center justify-center text-center opacity-60">
                      <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" /></svg>
                      <p className="text-sm font-medium text-slate-500">No student selected</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Document Selector */}
            {reportData && <div className="text-xs font-mono text-red-500 break-words mb-4">DEBUG: {JSON.stringify(reportData.debug)}</div>}
            {reportData && (validReports.circular || validReports.theology) && !validReports.combined && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Generated Documents
                </h3>
                <div className="flex flex-col gap-3">
                  {validReports.circular && (
                    <button
                      type="button"
                      onClick={() => setActiveReport('circular')}
                      className={`w-full group relative flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-bold transition-all overflow-hidden ${
                        activeReport === 'circular'
                          ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-500 shadow-sm'
                          : 'bg-white text-slate-600 border-2 border-slate-100 hover:border-emerald-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 relative z-10">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeReport === 'circular' ? 'bg-emerald-200/50 text-emerald-700' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600'}`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        Academic Report
                      </div>
                      {activeReport === 'circular' && (
                        <svg className="w-5 h-5 text-emerald-500 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>
                  )}
                  {validReports.theology && (
                    <button
                      type="button"
                      onClick={() => setActiveReport('theology')}
                      className={`w-full group relative flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-bold transition-all overflow-hidden ${
                        activeReport === 'theology'
                          ? 'bg-amber-50 text-amber-900 border-2 border-amber-500 shadow-sm'
                          : 'bg-white text-slate-600 border-2 border-slate-100 hover:border-amber-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 relative z-10">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeReport === 'theology' ? 'bg-amber-200/50 text-amber-700' : 'bg-slate-100 text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-600'}`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        Theology Report
                      </div>
                      {activeReport === 'theology' && (
                        <svg className="w-5 h-5 text-amber-500 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* OVERLAY FOR MOBILE SIDEBAR */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-10 lg:hidden print-hide transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* DYNAMIC GRID PREVIEW WORKSPACE */}
        <main 
          className="flex-1 bg-slate-100 overflow-visible relative print-canvas flex justify-center items-start py-4 px-4"
          style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px'
          }}
        >
          <div className="preview-container w-full h-full">
            {reportData ? (
              <>
                {!isPrinting && (
                  <>
                    <div className="preview-scroll">
                      <div className="preview-frame animate-in fade-in zoom-in-95 duration-500">
                        <div className="preview-wrapper">
                          {renderCurrentReport()}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 print-hide animate-in fade-in duration-700">
                <div className="w-20 h-20 bg-slate-200/50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <p className="text-xl font-extrabold text-slate-700">Workspace Empty</p>
                <p className="text-sm font-medium mt-2 max-w-sm text-slate-500">Use the navigation bar above to select a term, student, and phase to generate a beautiful report card.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* DEDICATED PRINT CONTAINER */}
      {reportData && isPrinting && (
        <div className="print-root hidden print:block">
          {renderCurrentReport()}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import PrimaryEOTReport from './reports/PrimaryEOTReport'
import P7EOTReport from './reports/P7EOTReport'
import PrimaryMOTReport from './reports/PrimaryMOTReport'
import NurseryEOTReport from './reports/NurseryEOTReport'
import NurseryMOTReport from './reports/NurseryMOTReport'
import TheologyMOTReport from './reports/TheologyMOTReport'
import NurseryTheologyEOTReport from './reports/NurseryTheologyEOTReport'

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
  score_type: 'mot' | 'eot'
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
  const [scoreType, setScoreType] = useState<'mot' | 'eot'>('mot')
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
    if (scoreTypeParam === 'mot' || scoreTypeParam === 'eot') setScoreType(scoreTypeParam)
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

  const renderReport = () => {
    if (!reportData) return null

    if (reportData.section_type === 'nursery') {
      return reportData.score_type === 'mot' ? (
        <NurseryMOTReport reportData={reportData} />
      ) : (
        <NurseryEOTReport reportData={reportData} />
      )
    }

    if (reportData.score_type === 'mot') {
      return <PrimaryMOTReport reportData={reportData} />
    }

    const isP7 = reportData?.student?.class_name?.toLowerCase() === 'p.7'
    return isP7 ? <P7EOTReport reportData={reportData} /> : <PrimaryEOTReport reportData={reportData} />
  }

  const renderTheologyReport = () => {
    if (!reportData || !reportData.theology) return null
    if (reportData.section_type === 'nursery' && reportData.score_type === 'eot') {
      return <NurseryTheologyEOTReport reportData={reportData} />
    }
    return <TheologyMOTReport reportData={reportData} />
  }

  // Determine valid report types based on section and score type
  const getValidReportTypes = () => {
    if (!reportData) return { circular: false, theology: false, combined: false }
    
    const { section_type, score_type } = reportData
    
    // Primary EOT: Combined only (no separate theology)
    if ((section_type === 'lower_primary' || section_type === 'upper_primary') && score_type === 'eot') {
      return { circular: false, theology: false, combined: true }
    }
    
    // Primary MOT: Separate circular and theology
    if ((section_type === 'lower_primary' || section_type === 'upper_primary') && score_type === 'mot') {
      return { circular: true, theology: reportData.theology ? true : false, combined: false }
    }
    
    // Nursery: Separate circular and theology for both MOT and EOT
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
    
    const isP7 = reportData?.student?.class_name?.toLowerCase() === 'p.7'
    if ((reportData.section_type === 'lower_primary' || reportData.section_type === 'upper_primary') && 
        reportData.score_type === 'eot') {
      return isP7 ? <P7EOTReport reportData={reportData} /> : <PrimaryEOTReport reportData={reportData} />
    }
    
    return activeReport === 'circular' ? renderReport() : renderTheologyReport()
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
    <div className="min-h-screen w-full bg-[#f3f4f6] font-sans flex flex-col overflow-visible print:h-auto print:overflow-visible">
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
            padding: 24px 0 28px;
          }
          .preview-frame {
            min-height: 100%;
            width: auto;
            display: flex;
            justify-content: center;
            padding: 0 20px;
          }
          .preview-wrapper {
            transform: none;
            transition: none;
            will-change: auto;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            backface-visibility: hidden;
          }
          .preview-controls {
            position: absolute;
            top: 16px;
            right: 16px;
            z-index: 22;
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(255,255,255,0.95);
            border: 1px solid rgba(148,163,184,0.35);
            border-radius: 9999px;
            backdrop-filter: blur(8px);
            padding: 8px 10px;
            box-shadow: 0 16px 40px rgba(15,23,42,0.08);
          }
          .preview-controls button {
            min-width: 34px;
            min-height: 34px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 9999px;
            background: white;
            border: 1px solid #cbd5e1;
            color: #334155;
            font-weight: 700;
            cursor: pointer;
            transition: background-color 0.15s ease, border-color 0.15s ease;
          }
          .preview-controls button:hover {
            background: #f8fafc;
            border-color: #94a3b8;
          }
          .preview-controls button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .preview-controls .zoom-label {
            min-width: 56px;
            text-align: center;
            font-size: 12px;
            font-weight: 700;
            color: #475569;
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
          .preview-wrapper,
          .preview-controls {
            transform: none !important;
            width: auto !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .preview-controls {
            display: none !important;
          }
        }
        `
      }} />

      {/* FIXED TOP NAVIGATION BAR */}
      <header className="h-16 shrink-0 bg-white border-b border-gray-200 shadow-sm z-30 px-4 flex items-center justify-between print-hide">
        <div className="flex items-center gap-4 flex-1">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0f5b48] lg:hidden"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          
          <div className="hidden sm:flex items-center gap-4">
            <div className="w-48">
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-gray-800 outline-none focus:border-[#0f5b48] focus:ring-1 focus:ring-[#0f5b48] transition-colors"
              >
                <option value="">Select term...</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>{getTermLabel(term)}</option>
                ))}
              </select>
            </div>

            <div className="w-64">
              <select
                value={selectedEnrollmentId}
                onChange={(e) => setSelectedEnrollmentId(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-medium text-gray-800 outline-none focus:border-[#0f5b48] focus:ring-1 focus:ring-[#0f5b48] transition-colors"
              >
                <option value="">Select student...</option>
                {sortedEnrollments.map((enrollment) => (
                  <option key={enrollment.enrollment_id} value={enrollment.enrollment_id}>
                    {enrollment.name} ({enrollment.circular_class})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex rounded-md bg-gray-100 p-0.5 border border-gray-200">
              {(['mot', 'eot'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setScoreType(type)}
                  className={`rounded px-3 py-1 text-xs font-bold transition-all ${
                    scoreType === type 
                    ? 'bg-white text-[#0f5b48] shadow-sm ring-1 ring-gray-200' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {type.toUpperCase() === 'MOT' ? 'MID TERM' : 'END OF TERM'}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="px-4 py-1.5 bg-[#0f5b48] text-white text-sm font-bold rounded-md shadow-sm hover:bg-[#0c4a3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? 'Loading...' : 'Load Report'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {error && <span className="text-sm font-semibold text-red-600 hidden md:block mr-2">{error}</span>}
          <button
            onClick={handlePrint}
            disabled={!reportData}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white border border-gray-300 px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
        </div>
      </header>

      {/* MOBILE CONTROLS */}
      <div className="sm:hidden p-3 bg-white border-b border-gray-200 flex flex-col gap-2 print-hide">
        <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)} className="w-full rounded border p-2 text-sm">
          <option value="">Select term...</option>
          {terms.map(t => <option key={t.id} value={t.id}>{getTermLabel(t)}</option>)}
        </select>
        <select value={selectedEnrollmentId} onChange={(e) => setSelectedEnrollmentId(e.target.value)} className="w-full rounded border p-2 text-sm">
          <option value="">Select student...</option>
          {sortedEnrollments.map(e => <option key={e.enrollment_id} value={e.enrollment_id}>{e.name}</option>)}
        </select>
        <div className="flex gap-2">
          <select value={scoreType} onChange={(e) => setScoreType(e.target.value as 'mot'|'eot')} className="flex-1 rounded border p-2 text-sm">
            <option value="mot">MID TERM</option>
            <option value="eot">END OF TERM</option>
          </select>
          <button onClick={handleGenerateReport} disabled={loading} className="flex-1 bg-[#0f5b48] text-white rounded font-bold text-sm">
            {loading ? 'Loading...' : 'Load Report'}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-visible relative">
        
        {/* COLLAPSIBLE LEFT SIDEBAR */}
        <aside className={`
          absolute lg:static top-0 left-0 h-full w-72 bg-white border-r border-gray-200 z-20 transition-transform duration-300
          flex flex-col overflow-y-auto print-hide
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-72 lg:block'}
        `}>
          <div className="p-5 flex flex-col gap-6">
            
            {/* Student Profile Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="h-1.5 w-full bg-[#0f5b48]"></div>
              <div className="p-4">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Student Profile</h3>
                {selectedEnrollment ? (
                  <>
                    <h2 className="text-base font-bold text-gray-900 leading-tight mb-1">{selectedEnrollment.name}</h2>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-600 mb-3">ID: {selectedEnrollment.admission_number || 'PENDING'}</span>
                    
                    <div className="space-y-2 mt-2 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Class</span>
                        <span className="text-xs font-bold text-[#0f5b48] bg-[#eef7f4] px-1.5 py-0.5 rounded">{selectedEnrollment.circular_class}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Phase</span>
                        <span className="text-xs font-bold text-gray-700">{scoreType.toUpperCase()}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 py-4 text-center">No student selected</p>
                )}
              </div>
            </div>

            {/* Document Selector */}
            {reportData && (validReports.circular || validReports.theology) && !validReports.combined && (
              <div>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Document Selector</h3>
                <div className="flex flex-col gap-2">
                  {validReports.circular && (
                    <button
                      type="button"
                      onClick={() => setActiveReport('circular')}
                      className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-bold transition-all border ${
                        activeReport === 'circular'
                          ? 'bg-[#0f5b48] text-white border-[#0f5b48] shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#0f5b48]'
                      }`}
                    >
                      Academic Report
                    </button>
                  )}
                  {validReports.theology && (
                    <button
                      type="button"
                      onClick={() => setActiveReport('theology')}
                      className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-bold transition-all border ${
                        activeReport === 'theology'
                          ? 'bg-[#c5a059] text-white border-[#c5a059] shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#c5a059]'
                      }`}
                    >
                      Theology Report
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
            className="fixed inset-0 bg-black/20 z-10 lg:hidden print-hide"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* STATIC PREVIEW WORKSPACE */}
        <main className="flex-1 bg-[#d1d1d1] overflow-visible relative print-canvas flex justify-center items-start py-10 px-4">
          <div className="preview-container w-full h-full">
            {reportData ? (
              <>
                {!isPrinting && (
                  <>
                    <div className="preview-scroll">
                      <div className="preview-frame">
                        <div
                          className="preview-wrapper drop-shadow-2xl"
                        >
                          {renderCurrentReport()}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 print-hide">
                <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-lg font-bold">Workspace Empty</p>
                <p className="text-sm mt-1 max-w-xs">Select options from the top bar to load a document preview.</p>
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

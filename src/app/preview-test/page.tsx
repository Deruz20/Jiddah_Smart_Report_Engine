'use client'

import React, { useState } from 'react'
import { generateReport } from '@/components/figma-ui/mock-data'
import PrimaryEOTReport from '@/components/reports/PrimaryEOTReport'
import PrimaryMOTReport from '@/components/reports/PrimaryMOTReport'
import P7EOTReport from '@/components/reports/P7EOTReport'
import NurseryEOTReport from '@/components/reports/NurseryEOTReport'
import TheologyMOTReport, { Theology2UpPrintSheet } from '@/components/reports/TheologyMOTReport'
import { ReportPreviewCell } from '@/components/reports/ReportPreviewCell'
import { PrintPortal } from '@/components/reports/PrintPortal'
import { STABILIZED_REPORT_ORIENTATIONS } from '@/lib/report-constants'
import { Printer, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { notFound } from 'next/navigation'

export default function PreviewTestPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  const [zoom, setZoom] = useState(0.85)
  const [selectedReport, setSelectedReport] = useState<string>('theology-2up')

  // Generate test reports with rich data
  const pEotData = generateReport('e4', '2', 'EOT' as any, 2026) // P.2 Lower Primary EOT (Landscape)
  const pMotData = generateReport('e4', '2', 'MOT' as any, 2026) // P.2 Lower Primary MOT (Portrait)
  const p7EotData = generateReport('e7', '2', 'EOT' as any, 2026) // P.7 Upper Primary EOT (Portrait)
  const nurEotData = generateReport('e1', '2', 'EOT' as any, 2026) // Nursery Baby Class EOT (Portrait)

  const theo1 = {
    id: 'theo-1',
    score_type: 'mot',
    student: {
      name: 'Lamaxola Atia',
      arabic_name: 'لاماكولا عطية',
      theology_class_arabic: 'الصف الثاني'
    },
    term: {
      term_number: 2,
      academic_year: 2026
    },
    meta: {
      total_students: 38,
      position: 26
    },
    theology: {
      mot_total: 359,
      division: '1',
      subjects: [
        { subject_name_arabic: 'القرآن الكريم', mot_score: 78 },
        { subject_name_arabic: 'اللغة العربية', mot_score: 98 },
        { subject_name_arabic: 'الفقه', mot_score: 85 },
        { subject_name_arabic: 'التاريخ والسيرة', mot_score: 98 },
      ]
    }
  }

  const theo2 = {
    id: 'theo-2',
    score_type: 'mot',
    student: {
      name: 'Kayizzi Abdullah',
      arabic_name: 'كاييزي عبد الله',
      theology_class_arabic: 'الصف الثاني'
    },
    term: {
      term_number: 2,
      academic_year: 2026
    },
    meta: {
      total_students: 38,
      position: 12
    },
    theology: {
      mot_total: 372,
      division: '1',
      subjects: [
        { subject_name_arabic: 'القرآن الكريم', mot_score: 92 },
        { subject_name_arabic: 'اللغة العربية', mot_score: 94 },
        { subject_name_arabic: 'الفقه', mot_score: 88 },
        { subject_name_arabic: 'التاريخ والسيرة', mot_score: 98 },
      ]
    }
  }

  const reports = [
    { 
      id: 'theology-2up', 
      title: 'Theology 2-Up (2 Sheets / 4 Cards)', 
      component: (
        <>
          <Theology2UpPrintSheet topReport={theo1} bottomReport={theo2} />
          <Theology2UpPrintSheet topReport={theo2} bottomReport={theo1} />
        </>
      ), 
      type: 'PrimaryBOTReport' as const 
    },
    { id: 'theology-mot', title: 'Theology Card (A5 Landscape)', component: <TheologyMOTReport reportData={theo1} />, type: 'TheologyMOTReport' as const },
    { id: 'primary-eot', title: 'Primary EOT (Landscape)', component: <PrimaryEOTReport reportData={pEotData} />, type: 'PrimaryEOTReport' as const },
    { id: 'primary-mot', title: 'Primary MOT (Portrait)', component: <PrimaryMOTReport reportData={pMotData} />, type: 'PrimaryMOTReport' as const },
    { id: 'p7-eot', title: 'P.7 EOT (Portrait)', component: <P7EOTReport reportData={p7EotData} />, type: 'P7EOTReport' as const },
    { id: 'nursery-eot', title: 'Nursery EOT (Portrait)', component: <NurseryEOTReport reportData={nurEotData} />, type: 'NurseryEOTReport' as const },
  ]

  const active = reports.find(r => r.id === selectedReport) || reports[0]

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Top toolbar */}
      <div className="print:hidden w-full bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-base font-bold text-slate-900">Jiddah Report Architecture Verification</h1>
            <p className="text-xs text-slate-500">Preview Scaling &amp; Print Portal Isolation Test</p>
          </div>

          {/* Template switcher tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {reports.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedReport(r.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  selectedReport === r.id
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r.title}
              </button>
            ))}
          </div>
        </div>

        {/* Zoom & Print Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(2)))}
              className="p-1 hover:bg-white rounded transition-colors text-slate-700"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="font-mono font-medium px-1.5 text-slate-800">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(1.8, +(z + 0.1).toFixed(2)))}
              className="p-1 hover:bg-white rounded transition-colors text-slate-700"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setZoom(0.85)}
              className="p-1 hover:bg-white rounded transition-colors text-slate-700 ml-1"
              title="Reset Zoom"
              aria-label="Reset Zoom"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          <button
            onClick={() => window.print()}
            aria-label="Test Print / Save PDF"
            className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Printer size={15} />
            Test Print / Save PDF
          </button>
        </div>
      </div>

      {/* Main Preview Canvas */}
      <div
        data-canvas-scroll
        className="flex-1 overflow-auto flex items-center justify-center p-8 print:hidden"
        style={{
          background: `
            radial-gradient(circle, rgba(5,150,105,0.04) 1px, transparent 1px),
            radial-gradient(circle, rgba(5,150,105,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px, 48px 48px',
          backgroundColor: '#f1f5f9',
        }}
      >
        <ReportPreviewCell
          reportType={active.type}
          zoom={zoom}
          isActive={true}
        >
          {active.component}
        </ReportPreviewCell>
      </div>

      {/* Print Portal — ONLY visible during window.print() */}
      <PrintPortal pageOrientation={STABILIZED_REPORT_ORIENTATIONS[active.type].pageOrientation}>
        {active.component}
      </PrintPortal>
    </div>
  )
}

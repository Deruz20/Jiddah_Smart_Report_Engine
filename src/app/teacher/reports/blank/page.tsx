'use client'

import React, { useRef } from 'react'
import PrimaryMOTReport from '@/components/reports/PrimaryMOTReport'
import { ReportViewport } from '@/components/reports/ReportViewport'
import { Printer, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function BlankMOTTemplates() {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

  const lowerData = {
    section_type: "lower_primary",
    student: { class_name: "", name: "" },
    term: { label: "Term 2", academic_year: 2026 },
    circular: {
      position: "",
      total_students: "",
      division: "",
      bot_total: "",
      bot_aggregate: "",
      mot_total: "",
      mot_aggregate: "",
      class_teacher_comment: "",
      conduct_remark: "",
      head_teacher_comment: "",
      subjects: [
        { subject_name: "ENG", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", remark: "" },
        { subject_name: "MATH", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", remark: "" },
        { subject_name: "LIT I", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", remark: "" },
        { subject_name: "LIT II", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", remark: "" },
        { subject_name: "I.R.E", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", remark: "" }
      ]
    }
  }

  const upperData = {
    section_type: "upper_primary",
    student: { class_name: "", name: "" },
    term: { label: "Term 2", academic_year: 2026 },
    circular: {
      position: "",
      total_students: "",
      division: "",
      bot_total: "",
      bot_aggregate: "",
      mot_total: "",
      mot_aggregate: "",
      class_teacher_comment: "",
      conduct_remark: "",
      head_teacher_comment: "",
      subjects: [
        { subject_name: "ENG", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", remark: "" },
        { subject_name: "MATH", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", remark: "" },
        { subject_name: "SCI", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", remark: "" },
        { subject_name: "SST", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", remark: "" },
        { subject_name: "I.R.E", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", remark: "" },
        { subject_name: "COMPUTER", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", remark: "" }
      ]
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      <div className="print:hidden w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/admin/reports" className="p-2 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Blank MOT Templates</h1>
            <p className="text-xs text-slate-500">Ready to print for manual entry</p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-colors text-sm"
        >
          <Printer className="w-4 h-4" />
          Print Both Templates
        </button>
      </div>

      <div className="flex-1 overflow-auto p-8 print:p-0">
        <div 
          ref={printRef} 
          className="max-w-4xl mx-auto flex flex-col gap-12 print:block print:w-full print:m-0 print:bg-white"
        >
          <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #print-area, #print-area * {
                visibility: visible;
              }
              #print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              .page-break {
                page-break-before: always;
                page-break-inside: avoid;
                break-before: page;
              }
            }
          `}} />

          <div id="print-area">
            {/* Lower Primary Template */}
            <div className="bg-white shadow-xl ring-1 ring-slate-200 rounded-lg overflow-hidden flex justify-center p-8 print:shadow-none print:ring-0 print:p-0 print:rounded-none">
              <ReportViewport reportType="PrimaryMOTReport">
                <PrimaryMOTReport reportData={lowerData} />
              </ReportViewport>
            </div>

            {/* Print Break */}
            <div className="page-break my-12 print:my-0"></div>

            {/* Upper Primary Template */}
            <div className="bg-white shadow-xl ring-1 ring-slate-200 rounded-lg overflow-hidden flex justify-center p-8 print:shadow-none print:ring-0 print:p-0 print:rounded-none">
              <ReportViewport reportType="PrimaryMOTReport">
                <PrimaryMOTReport reportData={upperData} />
              </ReportViewport>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

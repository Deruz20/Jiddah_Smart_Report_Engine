'use client'

import React, { useRef, useState } from 'react'
import PrimaryMOTReport from '@/components/reports/PrimaryMOTReport'
import PrimaryEOTReport from '@/components/reports/PrimaryEOTReport'
import NurseryMOTReport from '@/components/reports/NurseryMOTReport'
import TheologyMOTReport from '@/components/reports/TheologyMOTReport'
import { ReportViewport } from '@/components/reports/ReportViewport'
import { Printer, ChevronLeft, FileText, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

type BlankTemplateType = 'primary-mot' | 'primary-eot' | 'nursery-mot' | 'theology-mot'

export default function BlankMOTTemplates() {
  const printRef = useRef<HTMLDivElement>(null)
  const [activeTemplate, setActiveTemplate] = useState<BlankTemplateType>('primary-mot')

  const handlePrint = () => {
    window.print()
  }

  // Blank Primary MOT Data
  const primaryMotLower = {
    section_type: "lower_primary",
    score_type: "mot",
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

  const primaryMotUpper = {
    section_type: "upper_primary",
    score_type: "mot",
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

  // Blank Primary EOT Data
  const primaryEotLower = {
    section_type: "lower_primary",
    score_type: "eot",
    student: { class_name: "", name: "" },
    term: { label: "Term 3", academic_year: 2026, term_number: 3 },
    circular: {
      position: "",
      total_students: "",
      division: "",
      bot_total: "",
      bot_aggregate: "",
      mot_total: "",
      mot_aggregate: "",
      eot_total: "",
      eot_aggregate: "",
      class_teacher_comment: "",
      conduct_remark: "",
      head_teacher_comment: "",
      subjects: [
        { subject_name: "ENG", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", eot_score: "", eot_grade_display: "", remark: "" },
        { subject_name: "MATH", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", eot_score: "", eot_grade_display: "", remark: "" },
        { subject_name: "LIT I", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", eot_score: "", eot_grade_display: "", remark: "" },
        { subject_name: "LIT II", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", eot_score: "", eot_grade_display: "", remark: "" },
        { subject_name: "I.R.E", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", eot_score: "", eot_grade_display: "", remark: "" }
      ]
    }
  }

  const primaryEotUpper = {
    section_type: "upper_primary",
    score_type: "eot",
    student: { class_name: "", name: "" },
    term: { label: "Term 3", academic_year: 2026, term_number: 3 },
    circular: {
      position: "",
      total_students: "",
      division: "",
      bot_total: "",
      bot_aggregate: "",
      mot_total: "",
      mot_aggregate: "",
      eot_total: "",
      eot_aggregate: "",
      class_teacher_comment: "",
      conduct_remark: "",
      head_teacher_comment: "",
      subjects: [
        { subject_name: "ENG", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", eot_score: "", eot_grade_display: "", remark: "" },
        { subject_name: "MATH", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", eot_score: "", eot_grade_display: "", remark: "" },
        { subject_name: "SCI", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", eot_score: "", eot_grade_display: "", remark: "" },
        { subject_name: "SST", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", eot_score: "", eot_grade_display: "", remark: "" },
        { subject_name: "I.R.E", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", eot_score: "", eot_grade_display: "", remark: "" },
        { subject_name: "COMPUTER", bot_score: "", bot_grade_display: "", mot_score: "", mot_grade_display: "", eot_score: "", eot_grade_display: "", remark: "" }
      ]
    }
  }

  // Blank Nursery MOT Data
  const nurseryMotData = {
    section_type: "nursery",
    score_type: "mot",
    student: { class_name: "Middle Class", name: "" },
    term: { label: "Term 2", academic_year: 2026 },
    circular: {
      position: "",
      total_students: "",
      class_teacher_comment: "",
      conduct_remark: "",
      head_teacher_comment: "",
      subjects: [
        { subject_name: "Mathematical Concepts", score: "", remark: "" },
        { subject_name: "Language Development", score: "", remark: "" },
        { subject_name: "Social Development", score: "", remark: "" },
        { subject_name: "Health Habits", score: "", remark: "" },
        { subject_name: "Writing Skills", score: "", remark: "" },
      ]
    }
  }

  // Blank Theology MOT Data
  const theologyMotData = {
    score_type: "mot",
    student: {
      name: "",
      theology_class_arabic: ""
    },
    term: {
      term_number: 2,
      academic_year: 2026
    },
    meta: {
      total_students: "",
      position: ""
    },
    theology: {
      mot_total: "",
      eot_total: "",
      division: "",
      subjects: [
        { subject_name_arabic: "القرآن الكريم", mot_score: "", eot_score: "" },
        { subject_name_arabic: "الحديث الشريف", mot_score: "", eot_score: "" },
        { subject_name_arabic: "الفقه الإسلامي", mot_score: "", eot_score: "" },
        { subject_name_arabic: "التوحيد والعقيدة", mot_score: "", eot_score: "" },
        { subject_name_arabic: "السيرة والتاريخ", mot_score: "", eot_score: "" },
        { subject_name_arabic: "اللغة العربية", mot_score: "", eot_score: "" }
      ]
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#090C0A] flex flex-col font-sans text-slate-800 dark:text-slate-100">
      <div className="print:hidden w-full bg-white dark:bg-[#1E2623] border-b border-slate-200 dark:border-white/10 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/reports"
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Back to Report Center"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#10B981]" />
              Blank Report Templates
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Printable unpopulated templates for manual mark capture
            </p>
          </div>
        </div>

        {/* Template Selector Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 p-1 bg-slate-50 dark:bg-white/5 gap-1">
            {[
              { id: 'primary-mot', label: 'Primary MOT' },
              { id: 'primary-eot', label: 'Primary EOT' },
              { id: 'nursery-mot', label: 'Nursery MOT' },
              { id: 'theology-mot', label: 'Theology MOT' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTemplate(tab.id as BlankTemplateType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] cursor-pointer ${
                  activeTemplate === tab.id
                    ? 'bg-[#10B981] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-xl font-bold shadow-xs transition-colors text-xs sm:text-sm min-h-[44px] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Template
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-8 print:p-0">
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
            {activeTemplate === 'primary-mot' && (
              <>
                {/* Lower Primary Template */}
                <div className="bg-white shadow-xl ring-1 ring-slate-200 rounded-lg overflow-hidden flex justify-center p-8 print:shadow-none print:ring-0 print:p-0 print:rounded-none">
                  <ReportViewport reportType="PrimaryMOTReport">
                    <PrimaryMOTReport reportData={primaryMotLower} />
                  </ReportViewport>
                </div>

                <div className="page-break my-12 print:my-0"></div>

                {/* Upper Primary Template */}
                <div className="bg-white shadow-xl ring-1 ring-slate-200 rounded-lg overflow-hidden flex justify-center p-8 print:shadow-none print:ring-0 print:p-0 print:rounded-none">
                  <ReportViewport reportType="PrimaryMOTReport">
                    <PrimaryMOTReport reportData={primaryMotUpper} />
                  </ReportViewport>
                </div>
              </>
            )}

            {activeTemplate === 'primary-eot' && (
              <>
                {/* Lower Primary EOT Template */}
                <div className="bg-white shadow-xl ring-1 ring-slate-200 rounded-lg overflow-hidden flex justify-center p-8 print:shadow-none print:ring-0 print:p-0 print:rounded-none">
                  <ReportViewport reportType="PrimaryEOTReport">
                    <PrimaryEOTReport reportData={primaryEotLower} />
                  </ReportViewport>
                </div>

                <div className="page-break my-12 print:my-0"></div>

                {/* Upper Primary EOT Template */}
                <div className="bg-white shadow-xl ring-1 ring-slate-200 rounded-lg overflow-hidden flex justify-center p-8 print:shadow-none print:ring-0 print:p-0 print:rounded-none">
                  <ReportViewport reportType="PrimaryEOTReport">
                    <PrimaryEOTReport reportData={primaryEotUpper} />
                  </ReportViewport>
                </div>
              </>
            )}

            {activeTemplate === 'nursery-mot' && (
              <div className="bg-white shadow-xl ring-1 ring-slate-200 rounded-lg overflow-hidden flex justify-center p-8 print:shadow-none print:ring-0 print:p-0 print:rounded-none">
                <ReportViewport reportType="NurseryMOTReport">
                  <NurseryMOTReport reportData={nurseryMotData} />
                </ReportViewport>
              </div>
            )}

            {activeTemplate === 'theology-mot' && (
              <div className="bg-white shadow-xl ring-1 ring-slate-200 rounded-lg overflow-hidden flex justify-center p-8 print:shadow-none print:ring-0 print:p-0 print:rounded-none">
                <ReportViewport reportType="TheologyMOTReport">
                  <TheologyMOTReport reportData={theologyMotData} />
                </ReportViewport>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

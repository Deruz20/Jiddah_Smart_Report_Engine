'use client'

import React, { useState } from 'react'
import {
  Printer,
  Sliders,
  X,
  RotateCcw,
  Eye,
  Columns3,
  ListFilter,
  FileText,
  Sparkles,
  Check,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import {
  type BroadsheetCurriculum,
  type BroadsheetPrintConfig,
  type BroadsheetStudentLike,
  type BroadsheetTableStyle,
  getDefaultBroadsheetPrintConfig,
  prepareBroadsheetStudents,
} from '@/lib/broadsheet-print-config'
import {
  BroadsheetPrintDocument,
  type BroadsheetSubjectItem,
  type BroadsheetCohortStats,
} from './BroadsheetPrintDocument'

interface BroadsheetPrintStudioModalProps {
  open: boolean
  onClose: () => void
  onPrint: () => void
  curriculum: BroadsheetCurriculum
  config: BroadsheetPrintConfig
  onChangeConfig: (next: BroadsheetPrintConfig) => void
  allStudents: BroadsheetStudentLike[]
  filteredStudents: BroadsheetStudentLike[]
  subjects: BroadsheetSubjectItem[]
  termLabel: string
  academicYear: string | number
  classNameLabel: string
  sectionLabel?: string
  examPhase: 'bot' | 'mot' | 'eot'
  isNursery?: boolean
  summary?: BroadsheetCohortStats | null
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 py-2 px-2.5 rounded-xl hover:bg-stone-100/80 dark:hover:bg-white/[0.04] transition text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0D5C3A]"
    >
      <div className="min-w-0">
        <div className="text-xs font-semibold text-stone-800 dark:text-stone-100">{label}</div>
        {hint && <div className="text-[10.5px] text-stone-500 dark:text-stone-400 leading-tight mt-0.5">{hint}</div>}
      </div>
      <span
        className={`w-9 h-5 rounded-full transition p-0.5 flex items-center shrink-0 ${
          checked ? 'bg-[#0D5C3A] justify-end' : 'bg-stone-300 dark:bg-stone-700 justify-start'
        }`}
      >
        <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
      </span>
    </button>
  )
}

export function BroadsheetPrintStudioModal({
  open,
  onClose,
  onPrint,
  curriculum,
  config,
  onChangeConfig,
  allStudents,
  filteredStudents,
  subjects,
  termLabel,
  academicYear,
  classNameLabel,
  sectionLabel,
  examPhase,
  isNursery = false,
  summary,
}: BroadsheetPrintStudioModalProps) {
  const [section, setSection] = useState<'layout' | 'columns' | 'rows' | 'header'>('layout')
  const [mobileView, setMobileView] = useState<'controls' | 'preview'>('controls')
  const [previewZoom, setPreviewZoom] = useState<number>(85)

  if (!open) return null

  const isTheology = curriculum === 'theology'
  const update = (patch: Partial<BroadsheetPrintConfig>) => onChangeConfig({ ...config, ...patch })
  const previewStudents = prepareBroadsheetStudents(allStudents, filteredStudents, config)
  const visibleSubjectCount = subjects.filter((s) => !config.hiddenSubjectIds.includes(s.id)).length

  const applyPreset = (preset: 'readable' | 'large' | 'bw' | 'draft') => {
    const base = getDefaultBroadsheetPrintConfig(curriculum)
    if (preset === 'readable') {
      onChangeConfig(base)
    } else if (preset === 'large') {
      onChangeConfig({
        ...config,
        fontScale: 'large',
        density: 'spacious',
        zebraStripes: true,
        showAdmissionId: false,
      })
    } else if (preset === 'bw') {
      onChangeConfig({
        ...config,
        colorTheme: 'monochrome',
        zebraStripes: true,
      })
    } else if (preset === 'draft') {
      onChangeConfig({
        ...config,
        headerStyle: 'compact',
        showStamp: false,
        showSignatures: false,
        showCohortSummaryBox: false,
        colorTheme: 'monochrome',
      })
    }
  }

  const toggleSubjectVisibility = (subjectId: string) => {
    const isHidden = config.hiddenSubjectIds.includes(subjectId)
    const nextHidden = isHidden
      ? config.hiddenSubjectIds.filter((id) => id !== subjectId)
      : [...config.hiddenSubjectIds, subjectId]
    update({ hiddenSubjectIds: nextHidden })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Broadsheet Print & Sheet Customization Studio"
    >
      <div className="w-full h-full sm:h-[92dvh] max-w-[1440px] sm:rounded-2xl bg-[#FAF7F2] dark:bg-[#0D1411] border border-[#0D5C3A]/20 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* TOP STUDIO HEADER */}
        <div className="shrink-0 px-4 py-3 bg-white dark:bg-[#151F1B] border-b border-stone-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#0D5C3A] text-white flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-stone-900 dark:text-white truncate">
                {isTheology
                  ? 'Theology Sheet Customizer & Print Studio'
                  : 'Secular Sheet Customizer & Print Studio'}
              </h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                {classNameLabel} · {previewStudents.length} students · {visibleSubjectCount} subjects ·{' '}
                {config.fontScale === 'large' ? '14px Large Print' : config.fontScale === 'compact' ? '10.5px Compact' : '12px Readable'}
              </p>
            </div>
          </div>

          {/* Quick One-Click Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-wider text-stone-400 mr-1">
              Presets:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('readable')}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-[#0D5C3A] hover:bg-emerald-100 border border-emerald-200 cursor-pointer transition"
            >
              Readable (12px)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('large')}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 cursor-pointer transition inline-flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Eye Comfort (14px)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('bw')}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200 cursor-pointer transition"
            >
              Ink-Saver B&amp;W
            </button>
            <button
              type="button"
              onClick={() => applyPreset('draft')}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200 cursor-pointer transition"
            >
              Working Draft
            </button>

            <div className="w-px h-5 bg-stone-200 dark:bg-white/10 mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={() => onChangeConfig(getDefaultBroadsheetPrintConfig(curriculum))}
              className="h-8 px-2.5 rounded-full text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/10 inline-flex items-center gap-1 cursor-pointer transition"
              title="Reset to clean defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose()
                setTimeout(onPrint, 120)
              }}
              disabled={!previewStudents.length}
              className="h-8 px-4 rounded-full bg-[#0D5C3A] hover:bg-[#0A472C] text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-40 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close studio"
              className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MOBILE VIEW SWITCHER */}
        <div className="lg:hidden flex items-center gap-2 px-3 py-2 bg-stone-100 dark:bg-[#121B17] border-b border-stone-200 dark:border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setMobileView('controls')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
              mobileView === 'controls'
                ? 'bg-white dark:bg-[#1B2822] text-[#0D5C3A] shadow-xs'
                : 'text-stone-500'
            }`}
          >
            Controls
          </button>
          <button
            type="button"
            onClick={() => setMobileView('preview')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
              mobileView === 'preview'
                ? 'bg-white dark:bg-[#1B2822] text-[#0D5C3A] shadow-xs'
                : 'text-stone-500'
            }`}
          >
            Live Sheet Preview
          </button>
        </div>

        {/* BODY: TWO PANES */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* LEFT CONTROLS SIDEBAR */}
          <aside
            className={`${
              mobileView === 'controls' ? 'flex' : 'hidden lg:flex'
            } w-full lg:w-[390px] xl:w-[420px] shrink-0 bg-white dark:bg-[#151F1B] border-r border-stone-200 dark:border-white/10 flex-col min-h-0`}
          >
            {/* Category Tabs */}
            <div className="grid grid-cols-4 gap-1 p-2 border-b border-stone-200 dark:border-white/10 shrink-0 bg-stone-50/60 dark:bg-black/15">
              {[
                { id: 'layout', label: 'Eyesight', Icon: Eye },
                { id: 'columns', label: 'Columns', Icon: Columns3 },
                { id: 'rows', label: 'Rows', Icon: ListFilter },
                { id: 'header', label: 'Header', Icon: FileText },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id as any)}
                  className={`py-2 px-1.5 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 cursor-pointer transition ${
                    section === id
                      ? 'bg-[#0D5C3A] text-white shadow-xs'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Active Section Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {section === 'layout' && (
                <>
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-2">
                      Font Size &amp; Eye Comfort
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'compact', title: 'Compact', sub: '10.5px' },
                          { id: 'readable', title: 'Readable', sub: '12px Default' },
                          { id: 'large', title: 'Large Print', sub: '14px Easy-Read' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => update({ fontScale: opt.id })}
                          className={`p-2.5 rounded-xl border text-center cursor-pointer transition ${
                            config.fontScale === opt.id
                              ? 'border-[#0D5C3A] bg-emerald-50/80 dark:bg-emerald-950/30 text-[#0D5C3A] dark:text-emerald-300'
                              : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5'
                          }`}
                        >
                          <div className="text-xs font-extrabold">{opt.title}</div>
                          <div className="text-[10px] opacity-75 mt-0.5">{opt.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-2">
                      Row Padding / Spacing
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['tight', 'comfortable', 'spacious'] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => update({ density: d })}
                          className={`py-2 px-2 rounded-xl border text-xs font-bold capitalize cursor-pointer transition ${
                            config.density === d
                              ? 'border-[#0D5C3A] bg-emerald-50/80 dark:bg-emerald-950/30 text-[#0D5C3A] dark:text-emerald-300'
                              : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-2">
                      Paper Orientation
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: 'landscape', label: 'A4 Landscape (Wide)' },
                          { id: 'portrait', label: 'A4 Portrait (Tall)' },
                        ] as const
                      ).map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => update({ orientation: o.id })}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                            config.orientation === o.id
                              ? 'border-[#0D5C3A] bg-emerald-50/80 dark:bg-emerald-950/30 text-[#0D5C3A] dark:text-emerald-300'
                              : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-2">
                      Color &amp; Printer Ink Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => update({ colorTheme: 'emerald', tableStyle: config.tableStyle === 'toner_saver' ? 'clean_grid' : config.tableStyle })}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                          config.colorTheme === 'emerald'
                            ? 'border-[#0D5C3A] bg-emerald-50/80 text-[#0D5C3A]'
                            : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        Emerald &amp; Gold
                      </button>
                      <button
                        type="button"
                        onClick={() => update({ colorTheme: 'monochrome', tableStyle: 'toner_saver' })}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                          config.colorTheme === 'monochrome'
                            ? 'border-stone-900 bg-stone-100 text-stone-900'
                            : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        Crisp B&amp;W (Ink-Saver)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-2">
                      Table Border &amp; Sheet Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { id: 'double_border', label: 'Double-Border', sub: 'Formal ledger frame' },
                        { id: 'clean_grid', label: 'Clean Grid', sub: 'Crisp uniform lines' },
                        { id: 'zebra_banded', label: 'Zebra Banded', sub: 'Soft alternating rows' },
                        { id: 'toner_saver', label: 'Toner-Saver B&W', sub: 'Minimal ink white header' },
                      ] as { id: BroadsheetTableStyle; label: string; sub: string }[]).map((styleOpt) => (
                        <button
                          key={styleOpt.id}
                          type="button"
                          data-testid={`table-style-${styleOpt.id}`}
                          onClick={() => {
                            if (styleOpt.id === 'toner_saver') {
                              update({ tableStyle: 'toner_saver', colorTheme: 'monochrome', zebraStripes: false })
                            } else if (styleOpt.id === 'zebra_banded') {
                              update({ tableStyle: 'zebra_banded', zebraStripes: true, colorTheme: 'emerald' })
                            } else {
                              update({
                                tableStyle: styleOpt.id,
                                colorTheme: config.colorTheme === 'monochrome' ? 'emerald' : config.colorTheme,
                              })
                            }
                          }}
                          className={`p-2 rounded-xl border text-left cursor-pointer transition ${
                            (config.tableStyle || 'clean_grid') === styleOpt.id
                              ? 'border-[#0D5C3A] bg-emerald-50/80 dark:bg-emerald-950/30 text-[#0D5C3A] dark:text-emerald-300'
                              : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          <div className="text-xs font-bold">{styleOpt.label}</div>
                          <div className="text-[10px] text-stone-500 mt-0.5">{styleOpt.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-200 dark:border-white/10 space-y-1">
                    <ToggleRow
                      label="Alternating Row Shading (Zebra)"
                      hint="Helps eyes follow scores horizontally across wide tables"
                      checked={config.zebraStripes}
                      onChange={(val) => update({ zebraStripes: val })}
                    />
                    {isTheology && (
                      <ToggleRow
                        label="Arabic-Indic Numerals (١٢٣)"
                        hint="Switch off for Western 123 numerals on Theology sheets"
                        checked={config.useArabicNumerals}
                        onChange={(val) => update({ useArabicNumerals: val })}
                      />
                    )}
                  </div>
                </>
              )}

              {section === 'columns' && (
                <>
                  <div className="space-y-1">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-1">
                      Student Identity Columns
                    </div>
                    <ToggleRow
                      label={isTheology ? 'Serial Number (م)' : 'Serial Number (#)'}
                      checked={config.showSerialNumber}
                      onChange={(val) => update({ showSerialNumber: val })}
                    />
                    <ToggleRow
                      label={isTheology ? 'Admission ID (رقم القيد)' : 'Admission ID (Adm No)'}
                      hint="Hidden by default for cleaner rows & wider score columns"
                      checked={config.showAdmissionId}
                      onChange={(val) => update({ showAdmissionId: val })}
                    />
                    <ToggleRow
                      label={isTheology ? 'Gender (النوع)' : 'Gender (M/F)'}
                      checked={config.showGender}
                      onChange={(val) => update({ showGender: val })}
                    />
                    <ToggleRow
                      label={isTheology ? 'Show English Names Underneath' : 'Show Arabic Names Underneath'}
                      checked={config.showBilingualNames}
                      onChange={(val) => update({ showBilingualNames: val })}
                    />
                  </div>

                  {!isTheology && (
                    <div className="pt-3 border-t border-stone-200 dark:border-white/10 space-y-2">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
                        Subject Scores &amp; Grades
                      </div>
                      <ToggleRow
                        label="Show Per-Subject Grade Badges (D1–F9 / A–E)"
                        hint="Display subject grade beside mark"
                        checked={config.showSubjectGrades}
                        onChange={(val) => update({ showSubjectGrades: val })}
                      />

                      {config.showSubjectGrades && (
                        <div className="px-2.5 pb-1">
                          <div className="text-[10.5px] font-bold text-stone-500 mb-1.5">Subject Grade Display Style</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(
                              [
                                { id: 'combined', label: 'Compact: 88 (D1)' },
                                { id: 'split', label: 'Split: Mark | Grd' },
                              ] as const
                            ).map((mode) => (
                              <button
                                key={mode.id}
                                type="button"
                                onClick={() => update({ secularSubjectMode: mode.id })}
                                className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold cursor-pointer ${
                                  config.secularSubjectMode === mode.id
                                    ? 'border-[#0D5C3A] bg-emerald-50 text-[#0D5C3A]'
                                    : 'border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300'
                                }`}
                              >
                                {mode.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-stone-200 dark:border-white/10 space-y-2">

                    <div className="pt-1">
                      <div className="text-[10.5px] font-bold text-stone-500 px-2.5 mb-1.5">
                        Include / Exclude Subjects ({visibleSubjectCount} / {subjects.length})
                      </div>
                      <div className="space-y-1 px-1">
                        {subjects.map((sub) => {
                          const checked = !config.hiddenSubjectIds.includes(sub.id)
                          const label = isTheology
                            ? sub.subject_name_arabic || sub.subject_name || 'Subject'
                            : sub.subject_name || sub.subject_name_arabic || 'Subject'
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => toggleSubjectVisibility(sub.id)}
                              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5 text-xs font-semibold text-stone-700 dark:text-stone-200 cursor-pointer"
                            >
                              <span>{label}</span>
                              <span
                                className={`w-4 h-4 rounded flex items-center justify-center border ${
                                  checked
                                    ? 'bg-[#0D5C3A] border-[#0D5C3A] text-white'
                                    : 'border-stone-300 dark:border-stone-600'
                                }`}
                              >
                                {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-200 dark:border-white/10 space-y-1">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-1">
                      Summary Columns
                    </div>
                    <ToggleRow
                      label={isTheology ? 'Total Score (المجموع)' : 'Total Score'}
                      checked={config.showTotal}
                      onChange={(val) => update({ showTotal: val })}
                    />
                    <ToggleRow
                      label={isTheology ? 'Percentage Average (المتوسط٪)' : 'Average Percentage (%)'}
                      checked={config.showAverage}
                      onChange={(val) => update({ showAverage: val })}
                    />
                    {!(curriculum === 'secular' && isNursery) && (
                      <>
                        <ToggleRow
                          label={isTheology ? 'Aggregate Points (المعدل التراكمي)' : 'Aggregate (Agg)'}
                          checked={config.showAggregate}
                          onChange={(val) => update({ showAggregate: val })}
                        />
                        <ToggleRow
                          label={isTheology ? 'Division / Grade (التقدير: ممتاز..)' : 'Division (Div I–U)'}
                          checked={config.showDivision}
                          onChange={(val) => update({ showDivision: val })}
                        />
                      </>
                    )}
                    <ToggleRow
                      label={isTheology ? 'Class Rank (الترتيب)' : 'Rank / Position'}
                      checked={config.showRank}
                      onChange={(val) => update({ showRank: val })}
                    />
                  </div>
                </>
              )}

              {section === 'rows' && (
                <>
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-2">
                      Students to Include on Printout
                    </label>
                    <div className="space-y-1.5">
                      {(
                        [
                          { id: 'all', title: `All Class Students (${allStudents.length})`, desc: 'Automatically paginates across pages — zero cutoff' },
                          { id: 'filtered', title: `Current Filtered View (${filteredStudents.length})`, desc: 'Matches search box & division pills' },
                          { id: 'top_10', title: 'Top 10 Merit Sheet', desc: 'Prints only the highest 10 ranked learners' },
                          { id: 'top_20', title: 'Top 20 Sheet', desc: 'Prints only the top 20 learners' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => update({ rowScope: opt.id })}
                          className={`w-full p-2.5 rounded-xl border text-left cursor-pointer transition ${
                            config.rowScope === opt.id
                              ? 'border-[#0D5C3A] bg-emerald-50/80 dark:bg-emerald-950/30 text-[#0D5C3A] dark:text-emerald-300'
                              : 'border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          <div className="text-xs font-extrabold">{opt.title}</div>
                          <div className="text-[10.5px] opacity-80 mt-0.5">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-2">
                      Sort Students By
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'rank', label: 'Class Rank' },
                          { id: 'name', label: 'Name (A–Z)' },
                          { id: 'aggregate', label: 'Aggregate' },
                        ] as const
                      ).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => update({ sortBy: s.id })}
                          className={`py-2 px-2 rounded-xl border text-xs font-bold cursor-pointer ${
                            config.sortBy === s.id
                              ? 'border-[#0D5C3A] bg-emerald-50 text-[#0D5C3A]'
                              : 'border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {section === 'header' && (
                <>
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-2">
                      Letterhead Header Style
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'official', label: 'Full Crest' },
                          { id: 'compact', label: 'Compact' },
                          { id: 'none', label: 'Minimal' },
                        ] as const
                      ).map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => update({ headerStyle: h.id })}
                          className={`py-2 px-2 rounded-xl border text-xs font-bold cursor-pointer ${
                            config.headerStyle === h.id
                              ? 'border-[#0D5C3A] bg-emerald-50 text-[#0D5C3A]'
                              : 'border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300'
                          }`}
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wider text-stone-500 mb-2">
                      Border Frame Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => update({ frameStyle: 'classic' })}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                          config.frameStyle === 'classic'
                            ? 'border-[#0D5C3A] bg-emerald-50 text-[#0D5C3A]'
                            : 'border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300'
                        }`}
                      >
                        Emerald &amp; Gold Frame
                      </button>
                      <button
                        type="button"
                        onClick={() => update({ frameStyle: 'clean' })}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                          config.frameStyle === 'clean'
                            ? 'border-[#0D5C3A] bg-emerald-50 text-[#0D5C3A]'
                            : 'border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300'
                        }`}
                      >
                        Clean Table Frame
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-stone-200 dark:border-white/10">
                    <ToggleRow
                      label="Term & Class Metadata Strip"
                      checked={config.showMetadataStrip}
                      onChange={(val) => update({ showMetadataStrip: val })}
                    />
                    <ToggleRow
                      label="Class Averages Row (Footer)"
                      checked={config.showSummaryFooter}
                      onChange={(val) => update({ showSummaryFooter: val })}
                    />
                    {!(curriculum === 'secular' && isNursery) && (
                      <ToggleRow
                        label="Cohort Division Summary Box"
                        checked={config.showCohortSummaryBox}
                        onChange={(val) => update({ showCohortSummaryBox: val })}
                      />
                    )}
                    <ToggleRow
                      label="Official School Stamp"
                      checked={config.showStamp}
                      onChange={(val) => update({ showStamp: val })}
                    />
                    <ToggleRow
                      label="Signatories Footer Block"
                      checked={config.showSignatures}
                      onChange={(val) => update({ showSignatures: val })}
                    />
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-stone-200 dark:border-white/10">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                        Custom Sheet Title (optional)
                      </label>
                      <input
                        type="text"
                        dir={isTheology ? 'rtl' : 'ltr'}
                        placeholder={isTheology ? 'كشف درجات الطلاب العام...' : 'ACADEMIC PERFORMANCE BROADSHEET...'}
                        value={config.customTitle}
                        onChange={(e) => update({ customTitle: e.target.value })}
                        className="w-full h-8 px-2.5 rounded-lg border border-stone-200 dark:border-white/15 bg-stone-50 dark:bg-black/20 text-xs text-stone-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300 mb-1">
                        Custom Footer / Notice Note (optional)
                      </label>
                      <input
                        type="text"
                        dir={isTheology ? 'rtl' : 'ltr'}
                        placeholder={isTheology ? 'ملاحظة أسفل الكشف...' : 'e.g. Moderated by Academic Committee'}
                        value={config.customFooterNote}
                        onChange={(e) => update({ customFooterNote: e.target.value })}
                        className="w-full h-8 px-2.5 rounded-lg border border-stone-200 dark:border-white/15 bg-stone-50 dark:bg-black/20 text-xs text-stone-900 dark:text-white"
                      />
                    </div>
                    {config.showSignatures && (
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-300">
                          Signatory Titles (3 Columns)
                        </label>
                        <input
                          type="text"
                          dir={isTheology ? 'rtl' : 'ltr'}
                          value={config.signatory1}
                          onChange={(e) => update({ signatory1: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg border border-stone-200 dark:border-white/15 bg-stone-50 dark:bg-black/20 text-xs"
                        />
                        <input
                          type="text"
                          dir={isTheology ? 'rtl' : 'ltr'}
                          value={config.signatory2}
                          onChange={(e) => update({ signatory2: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg border border-stone-200 dark:border-white/15 bg-stone-50 dark:bg-black/20 text-xs"
                        />
                        <input
                          type="text"
                          dir={isTheology ? 'rtl' : 'ltr'}
                          value={config.signatory3}
                          onChange={(e) => update({ signatory3: e.target.value })}
                          className="w-full h-8 px-2.5 rounded-lg border border-stone-200 dark:border-white/15 bg-stone-50 dark:bg-black/20 text-xs"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </aside>

          {/* RIGHT LIVE PAPER PREVIEW */}
          <div
            className={`${
              mobileView === 'preview' ? 'flex' : 'hidden lg:flex'
            } flex-1 min-w-0 flex-col bg-[#E5EAE7] dark:bg-[#090E0C] overflow-hidden`}
          >
            {/* Preview Toolbar */}
            <div className="shrink-0 px-4 py-2 bg-white/80 dark:bg-[#151F1B]/90 border-b border-stone-200 dark:border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-stone-200">
                <Eye className="w-4 h-4 text-[#0D5C3A]" />
                <span>Live Sheet Preview</span>
                <span className="text-[11px] font-normal text-stone-500">
                  ({config.orientation === 'landscape' ? 'A4 Landscape' : 'A4 Portrait'} · Multi-Page Safe)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.max(55, z - 10))}
                  className="p-1.5 rounded-lg bg-stone-100 dark:bg-white/5 hover:bg-stone-200 cursor-pointer"
                  title="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono font-bold w-11 text-center">{previewZoom}%</span>
                <button
                  type="button"
                  onClick={() => setPreviewZoom((z) => Math.min(130, z + 10))}
                  className="p-1.5 rounded-lg bg-stone-100 dark:bg-white/5 hover:bg-stone-200 cursor-pointer"
                  title="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Paper Stage (forced light mode, scrollable multi-page) */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start">
              <div
                style={{
                  width: config.orientation === 'landscape' ? '1060px' : '760px',
                  minWidth: config.orientation === 'landscape' ? '1060px' : '760px',
                  transform: `scale(${previewZoom / 100})`,
                  transformOrigin: 'top center',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  colorScheme: 'light',
                  boxShadow: '0 10px 35px rgba(0, 0, 0, 0.18)',
                  borderRadius: '4px',
                }}
              >
                <BroadsheetPrintDocument
                  curriculum={curriculum}
                  config={config}
                  students={previewStudents}
                  subjects={subjects}
                  termLabel={termLabel}
                  academicYear={academicYear}
                  classNameLabel={classNameLabel}
                  sectionLabel={sectionLabel}
                  examPhase={examPhase}
                  isNursery={isNursery}
                  summary={summary}
                  forPreview
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

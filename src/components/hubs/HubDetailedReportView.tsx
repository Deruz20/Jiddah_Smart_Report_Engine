'use client'

import React, { useMemo } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  CheckCircle2,
  Download,
  Info,
  Lock,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  Unlock,
  Users,
} from 'lucide-react'
import {
  clampSupportThreshold,
  filterNeedsSupportLearners,
  getNeedsSupportDefinition,
  MAX_SUPPORT_THRESHOLD,
  MIN_SUPPORT_THRESHOLD,
  buildDetailedReportCsv,
  type DetailedReportResult,
  type DetailedReportScope,
} from '@/lib/hub-detailed-report'
import { HubCandidateNaCard, HubDataQualityBanners } from './HubCohortPanels'
import { ExecutiveBreakdownPacket } from './ExecutiveBreakdownPacket'
import {
  DEFAULT_HUB_SECTIONS,
  formatClassDisplayName,
  type ExamPhase,
  type HubCurriculum,
  type HubSectionId,
} from '@/lib/academic-sections'
import { downloadCSV } from '@/utils/csvExport'

function toArabicDigits(val: number | string | null | undefined): string {
  if (val == null || val === '' || (typeof val === 'number' && Number.isNaN(val))) return '—'
  return String(val).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}

export interface DetailedReportTermOption {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current?: boolean
}

export interface DetailedReportClassOption {
  id: string
  class_name?: string
  name?: string
  section?: string
  class_name_arabic?: string
  class_name_english?: string
  level?: number | string | null
}

interface HubDetailedReportViewProps {
  curriculum: HubCurriculum
  report: DetailedReportResult | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
  scope: DetailedReportScope
  sectionId: HubSectionId | ''
  classId: string
  termId: string
  year: number
  examPhase: ExamPhase
  supportThreshold: number
  terms: DetailedReportTermOption[]
  classes: DetailedReportClassOption[]
  availableScopes: {
    school: boolean
    sections: HubSectionId[]
    classCount: number
  }
  onChangeScope: (nextScope: DetailedReportScope, nextSectionId?: HubSectionId | '', nextClassId?: string) => void
  onChangeYear: (nextYear: number) => void
  onChangeTermId: (nextTermId: string) => void
  onChangeExamPhase: (nextPhase: ExamPhase) => void
  onChangeSupportThreshold: (nextThreshold: number) => void
  onPrintReport: () => void
}

export function HubDetailedReportView({
  curriculum,
  report,
  isLoading,
  error,
  onRetry,
  scope,
  sectionId,
  classId,
  termId,
  year,
  examPhase,
  supportThreshold,
  terms,
  classes,
  availableScopes,
  onChangeScope,
  onChangeYear,
  onChangeTermId,
  onChangeExamPhase,
  onChangeSupportThreshold,
  onPrintReport,
}: HubDetailedReportViewProps) {
  const isArabic = curriculum === 'theology'
  const threshold = clampSupportThreshold(supportThreshold)

  const fmtNum = (val: number | string | null | undefined, suffix = ''): string => {
    if (val === null || val === undefined || val === '' || (typeof val === 'number' && Number.isNaN(val))) {
      return '—'
    }
    const text = `${val}${suffix}`
    return isArabic ? toArabicDigits(text) : text
  }

  const years = useMemo(() => {
    const set = new Set<number>()
    for (const t of terms) {
      if (t?.academic_year) set.add(Number(t.academic_year))
    }
    return Array.from(set).sort((a, b) => b - a)
  }, [terms])

  const termsInSelectedYear = useMemo(() => {
    const filtered = terms.filter((t) => Number(t.academic_year) === Number(year))
    return filtered.length > 0 ? filtered : terms
  }, [terms, year])

  // Live instant Needs Support filtering from the computed complete learner list (35%–65%)
  const liveNeedsSupport = useMemo(() => {
    if (!report) return []
    return filterNeedsSupportLearners(report.learners.eligibleLearners, curriculum, threshold)
  }, [report, curriculum, threshold])

  const supportDef = useMemo(() => getNeedsSupportDefinition(curriculum, threshold), [curriculum, threshold])

  const handleExportCsv = () => {
    if (!report) return
    const csv = buildDetailedReportCsv(report, threshold)
    const safeScope = report.meta.scopeLabel.replace(/[^a-zA-Z0-9_-]/g, '_')
    const filename = `Jiddah_${curriculum}_Detailed_Report_${safeScope}_${report.meta.termLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}_${examPhase.toUpperCase()}.csv`
    downloadCSV(csv, filename)
  }

  const singleClassCandidateExclusion =
    report &&
    report.meta.scope === 'class' &&
    report.cohort.candidateExclusions.length === 1 &&
    report.cohort.totalEnrolled === 0

  return (
    <div
      data-testid="detailed-report-view"
      dir={isArabic ? 'rtl' : 'ltr'}
      className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pr-1 pb-6 text-[#1C1917] dark:text-stone-100"
    >
      {/* 1. DEDICATED REPORT CONTROLS BAR */}
      <section
        aria-label={isArabic ? 'إعدادات التقرير المفصل' : 'Detailed Report Controls'}
        className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-[#151F1B] p-3.5 shadow-2xs flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Scope Selector Pills + Target Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label={isArabic ? 'نطاق التقرير' : 'Report Scope'}
              className="inline-flex items-center p-0.5 rounded-xl bg-white dark:bg-white/5 border border-[#E7E5E4] dark:border-white/10"
            >
              {availableScopes.school && (
                <button
                  type="button"
                  data-testid="report-scope-school"
                  onClick={() => onChangeScope('school', '', '')}
                  className={`h-8 px-3 rounded-[9px] text-xs font-bold transition cursor-pointer ${
                    scope === 'school'
                      ? 'bg-[#0F4D25] text-white shadow-xs'
                      : 'text-[#57534E] dark:text-stone-300 hover:text-[#1C1917] dark:hover:text-white'
                  }`}
                >
                  {isArabic ? 'المدرسة كاملة' : 'Whole School'}
                </button>
              )}

              {availableScopes.sections.length > 0 && (
                <button
                  type="button"
                  data-testid="report-scope-section"
                  onClick={() =>
                    onChangeScope(
                      'section',
                      (sectionId && availableScopes.sections.includes(sectionId)
                        ? sectionId
                        : availableScopes.sections[0]) || 'upper_primary',
                      ''
                    )
                  }
                  className={`h-8 px-3 rounded-[9px] text-xs font-bold transition cursor-pointer ${
                    scope === 'section'
                      ? 'bg-[#0F4D25] text-white shadow-xs'
                      : 'text-[#57534E] dark:text-stone-300 hover:text-[#1C1917] dark:hover:text-white'
                  }`}
                >
                  {isArabic ? 'القسم' : 'Section'}
                </button>
              )}

              <button
                type="button"
                data-testid="report-scope-class"
                onClick={() => onChangeScope('class', sectionId, classId || classes[0]?.id || '')}
                className={`h-8 px-3 rounded-[9px] text-xs font-bold transition cursor-pointer ${
                  scope === 'class'
                    ? 'bg-[#0F4D25] text-white shadow-xs'
                    : 'text-[#57534E] dark:text-stone-300 hover:text-[#1C1917] dark:hover:text-white'
                }`}
              >
                {isArabic ? 'الصف' : 'Class'}
              </button>
            </div>

            {scope === 'section' && (
              <select
                aria-label={isArabic ? 'اختيار القسم' : 'Select Section'}
                data-testid="detailed-report-section-select"
                value={sectionId || availableScopes.sections[0] || ''}
                onChange={(e) => onChangeScope('section', e.target.value as HubSectionId, '')}
                className="h-9 px-3 rounded-xl border border-[#E7E5E4] dark:border-white/15 bg-white dark:bg-[#0D1411] text-xs font-bold text-[#1C1917] dark:text-white"
              >
                {DEFAULT_HUB_SECTIONS.filter((s) => availableScopes.sections.includes(s.id)).map((s) => (
                  <option key={s.id} value={s.id}>
                    {isArabic ? `${s.label_arabic} (${s.label})` : s.label}
                  </option>
                ))}
              </select>
            )}

            {scope === 'class' && (
              <select
                aria-label={isArabic ? 'اختيار الصف' : 'Select Class'}
                data-testid="detailed-report-class-select"
                value={classId || classes[0]?.id || ''}
                onChange={(e) => onChangeScope('class', '', e.target.value)}
                className="h-9 px-3 rounded-xl border border-[#E7E5E4] dark:border-white/15 bg-white dark:bg-[#0D1411] text-xs font-bold text-[#1C1917] dark:text-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatClassDisplayName(c, curriculum)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Year, Term, Exam & Print/CSV Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={isArabic ? 'السنة الدراسية' : 'Academic Year'}
              data-testid="detailed-report-year-select"
              value={year}
              onChange={(e) => onChangeYear(Number(e.target.value))}
              className="h-9 px-2.5 rounded-xl border border-[#E7E5E4] dark:border-white/15 bg-white dark:bg-[#0D1411] text-xs font-bold text-[#1C1917] dark:text-white"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {fmtNum(y)}
                </option>
              ))}
            </select>

            <select
              aria-label={isArabic ? 'الفترة الدراسية' : 'Term'}
              data-testid="detailed-report-term-select"
              value={termId}
              onChange={(e) => onChangeTermId(e.target.value)}
              className="h-9 px-2.5 rounded-xl border border-[#E7E5E4] dark:border-white/15 bg-white dark:bg-[#0D1411] text-xs font-bold text-[#1C1917] dark:text-white"
            >
              {termsInSelectedYear.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>

            <div
              role="group"
              aria-label={isArabic ? 'نوع الاختبار' : 'Exam Phase'}
              className="inline-flex items-center p-0.5 rounded-xl bg-white dark:bg-white/5 border border-[#E7E5E4] dark:border-white/10"
            >
              {(['bot', 'mot', 'eot'] as ExamPhase[]).map((phase) => (
                <button
                  key={phase}
                  type="button"
                  onClick={() => onChangeExamPhase(phase)}
                  className={`h-8 px-2.5 rounded-[9px] text-[11px] font-extrabold uppercase transition cursor-pointer ${
                    examPhase === phase
                      ? 'bg-[#B45309] text-white shadow-xs'
                      : 'text-[#57534E] dark:text-stone-300 hover:text-[#1C1917] dark:hover:text-white'
                  }`}
                >
                  {phase.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              data-testid="detailed-report-csv-btn"
              onClick={handleExportCsv}
              disabled={isLoading || !report}
              className="h-9 px-3 rounded-xl border border-[#E7E5E4] dark:border-white/15 bg-white dark:bg-white/5 text-xs font-bold inline-flex items-center gap-1.5 hover:border-[#0F4D25] disabled:opacity-40 cursor-pointer transition"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={2.25} />
              <span>{isArabic ? 'تصدير CSV' : 'Export CSV'}</span>
            </button>

            <button
              type="button"
              data-testid="detailed-report-print-btn"
              onClick={onPrintReport}
              disabled={isLoading || !report}
              className="h-9 px-3.5 rounded-xl bg-[#0F4D25] hover:bg-[#0D4320] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs disabled:opacity-40 cursor-pointer transition"
            >
              <Printer className="w-3.5 h-3.5" strokeWidth={2.25} />
              <span>{isArabic ? 'طباعة A4' : 'Print A4 Report'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          data-testid="detailed-report-error"
          className="rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-200">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="h-7 px-2.5 rounded-lg bg-rose-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{isArabic ? 'إعادة المحاولة' : 'Retry'}</span>
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div
          data-testid="detailed-report-loading"
          className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-white dark:bg-[#151F1B] p-10 text-center text-xs font-semibold text-[#57534E] dark:text-stone-300"
        >
          {isArabic
            ? 'جاري تجميع التحليل الإحصائي المفصل والبيانات المرجعية...'
            : 'Computing detailed cohort metrics, cross-comparisons, and trends...'}
        </div>
      )}

      {!isLoading && report && singleClassCandidateExclusion && (
        <HubCandidateNaCard
          curriculum={curriculum}
          classLabel={isArabic ? report.meta.scopeLabelArabic : report.meta.scopeLabel}
          termLabel={report.meta.termLabel}
          badge={report.cohort.candidateExclusions[0]?.badge}
          onSwitchExamPhase={(p) => onChangeExamPhase(p)}
        />
      )}

      {!isLoading && report && !singleClassCandidateExclusion && (
        <>
          <HubDataQualityBanners
            curriculum={curriculum}
            unmappedClasses={report.dataQuality.unmappedClasses}
            candidateExclusions={report.cohort.candidateExclusions}
            rankingMethodLabel={report.meta.rankingMethodLabel}
            rankingMethodLabelArabic={report.meta.rankingMethodLabelArabic}
            isNormalizedRanking={report.meta.isNormalized}
            showRankingMethod={report.performance.n > 0}
          />

          {/* EXECUTIVE BREAKDOWN PACKET ("النظر الدقيق على النتائج") */}
          <ExecutiveBreakdownPacket report={report} variant="screen" />

          {/* CURRENT-TERM COHORT TABLE (BOT, MOT, EOT ONLY) */}
          <section
            data-testid="detailed-report-current-cohort-table"
            className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-2xs overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#E7E5E4] dark:border-white/10 flex items-center justify-between gap-2 bg-[#FAF7F2] dark:bg-white/[0.02]">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0F4D25] dark:text-emerald-300">
                {isArabic
                  ? 'كشف نتائج التلاميذ للفترة الحالية (BOT / MOT / EOT)'
                  : 'Current Term Cohort Summary (BOT, MOT, EOT)'}
              </h3>
              <span className="text-[11px] font-bold text-[#57534E] dark:text-stone-300 tabular-nums">
                {fmtNum((report?.learners?.cohortStudents ?? report?.learners?.eligibleLearners ?? []).length)}{' '}
                {isArabic ? 'تلميذ' : 'students'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F5F5F4] dark:bg-white/5 text-[#1C1917] dark:text-stone-200 border-b border-[#E7E5E4] dark:border-white/10">
                    <th className={`px-3 py-2 font-extrabold ${isArabic ? 'text-right' : 'text-left'}`}>
                      {isArabic ? 'اسم التلميذ' : 'Student Name'}
                    </th>
                    <th className="px-3 py-2 font-extrabold text-center">
                      {isArabic ? 'بداية الفترة (BOT)' : 'BOT Score/Grade'}
                    </th>
                    <th className="px-3 py-2 font-extrabold text-center">
                      {isArabic ? 'منتصف الفترة (MOT)' : 'MOT Score/Grade'}
                    </th>
                    <th className="px-3 py-2 font-extrabold text-center">
                      {isArabic ? 'نهاية الفترة (EOT)' : 'EOT Score/Grade'}
                    </th>
                    <th className="px-3 py-2 font-extrabold text-center">
                      {isArabic ? 'المجموع الكلي' : 'Overall Total'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E4] dark:divide-white/10">
                  {(() => {
                    const rows = report?.learners?.cohortStudents ?? report?.learners?.eligibleLearners ?? []
                    if (rows.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-xs text-[#57534E] dark:text-stone-400">
                            {isArabic ? 'لا توجد بيانات متاحة بعد' : 'No data available yet'}
                          </td>
                        </tr>
                      )
                    }
                    return rows.map((student, idx) => (
                      <tr key={student?.id || idx} className="hover:bg-[#FAF7F2] dark:hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-bold text-[#1C1917] dark:text-white">
                          {isArabic ? (student?.arabicName || student?.name || '--') : (student?.name || '--')}
                          {student?.className ? (
                            <span className="ml-1.5 text-[10px] font-semibold text-[#57534E] dark:text-stone-400">
                              ({student.className})
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {student?.bot_score ?? '--'}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {student?.mot_score ?? '--'}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {student?.eot_score ?? '--'}
                        </td>
                        <td className="px-3 py-2 text-center font-extrabold tabular-nums text-[#0F4D25] dark:text-emerald-400">
                          {student?.overall_total ?? student?.total ?? '--'}
                        </td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2. DETERMINISTIC INSIGHTS */}
          <section
            data-testid="detailed-report-insights"
            aria-label={isArabic ? 'استنتاجات مستخلصة آلياً' : 'Deterministic Insights'}
            className="rounded-2xl border border-[#0F4D25]/20 dark:border-emerald-500/20 bg-white dark:bg-[#151F1B] p-4 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#0F4D25] dark:text-emerald-400" strokeWidth={2.25} />
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#0F4D25] dark:text-emerald-300">
                  {isArabic
                    ? 'ملخص تحليلي حتمي (مستخرج مباشرة من الأرقام أدناه)'
                    : 'Deterministic Insights (Derived Strictly from Computed Figures Below)'}
                </h2>
              </div>
              <span className="text-[10px] font-bold text-[#57534E] dark:text-stone-300">
                {report.meta.scopeLabel} • {report.meta.termLabel} • {report.meta.examPhase.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {report.insights.map((ins) => {
                const badgeColors =
                  ins.severity === 'positive'
                    ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-950/20'
                    : ins.severity === 'warning'
                      ? 'border-amber-200 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-950/20'
                      : 'border-[#E7E5E4] bg-[#FAF7F2] dark:border-white/10 dark:bg-white/[0.03]'
                return (
                  <div key={ins.id} className={`rounded-xl border p-3 ${badgeColors}`}>
                    <div className="text-[11px] font-extrabold text-[#1C1917] dark:text-white">
                      {isArabic ? ins.titleArabic : ins.title}
                    </div>
                    <p className="text-xs text-[#44403C] dark:text-stone-200 mt-1 leading-relaxed">
                      {isArabic ? ins.textArabic : ins.text}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>

          {/* 3. CORE KPI CARDS */}
          <section
            data-testid="detailed-report-kpis"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            <div className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-white dark:bg-[#151F1B] p-4 shadow-2xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#57534E] dark:text-stone-300">
                {isArabic ? 'المشاركة واكتمال الفوج' : 'Cohort Completion'}
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black tabular-nums text-[#0F4D25] dark:text-emerald-400">
                  {fmtNum(report.cohort.completionPct, isArabic ? '٪' : '%')}
                </span>
                <span className="text-xs font-bold tabular-nums text-[#57534E] dark:text-stone-300">
                  ({fmtNum(report.cohort.satComplete)} / {fmtNum(report.cohort.totalEnrolled)})
                </span>
              </div>
              <p className="text-[11px] text-[#57534E] dark:text-stone-300 mt-1.5">
                {isArabic
                  ? `ناقص: ${fmtNum(report.cohort.incompleteTotal)} (جزئي ${fmtNum(report.cohort.satPartial)}) • مستثنى P.7: ${fmtNum(report.cohort.candidateExcludedCount)}`
                  : `Missing: ${report.cohort.incompleteTotal} (${report.cohort.satPartial} partial, ${report.cohort.absentOrNoMarks} 0 marks) • P.7 N/A: ${report.cohort.candidateExcludedCount}`}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-white dark:bg-[#151F1B] p-4 shadow-2xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#57534E] dark:text-stone-300">
                {isArabic ? 'المتوسط والوسيط (المعياري)' : 'Mean & Median (Normalized)'}
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black tabular-nums text-[#1C1917] dark:text-white">
                  {fmtNum(report.performance.meanPct, isArabic ? '٪' : '%')}
                </span>
                <span className="text-xs font-bold tabular-nums text-[#57534E] dark:text-stone-300">
                  {isArabic ? `الوسيط ${fmtNum(report.performance.medianPct, '٪')}` : `Med ${fmtNum(report.performance.medianPct, '%')}`}
                </span>
              </div>
              <p className="text-[11px] text-[#57534E] dark:text-stone-300 mt-1.5 tabular-nums">
                {isArabic
                  ? `العدد (n = ${fmtNum(report.performance.n)}) • الانحراف ${fmtNum(report.performance.stdDevPct)} • IQR ${fmtNum(report.performance.iqrPct)}`
                  : `n = ${report.performance.n} complete • SD ${fmtNum(report.performance.stdDevPct)} pp • IQR ${fmtNum(report.performance.iqrPct)} pp`}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-white dark:bg-[#151F1B] p-4 shadow-2xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#57534E] dark:text-stone-300">
                {isArabic ? 'نسبة النجاح والمدى' : 'Pass Rate & Score Range'}
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black tabular-nums text-[#0F4D25] dark:text-emerald-400">
                  {fmtNum(report.performance.passRatePct, isArabic ? '٪' : '%')}
                </span>
                <span className="text-xs font-bold tabular-nums text-[#57534E] dark:text-stone-300">
                  ({fmtNum(report.performance.lowestPct, '%')}–{fmtNum(report.performance.highestPct, '%')})
                </span>
              </div>
              <p className="text-[11px] text-[#57534E] dark:text-stone-300 mt-1.5 tabular-nums">
                {isArabic
                  ? `مؤشر ≥ ٥٠٪: ${fmtNum(report.performance.benchmark50PassRatePct, '٪')} • المدى ${fmtNum(report.performance.rangePct)} نقطة`
                  : `>=50% benchmark: ${fmtNum(report.performance.benchmark50PassRatePct, '%')} • Spread ${fmtNum(report.performance.rangePct)} pp`}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300/70 dark:border-amber-500/30 bg-[#FFFDF7] dark:bg-[#151F1B] p-4 shadow-2xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                {isArabic ? `بحاجة لدعم (< ${toArabicDigits(threshold)}٪)` : `Needs Support (< ${threshold}%)`}
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span
                  data-testid="needs-support-kpi-count"
                  className="text-2xl font-black tabular-nums text-amber-800 dark:text-amber-300"
                >
                  {fmtNum(liveNeedsSupport.length)}
                </span>
                <span className="text-xs font-bold tabular-nums text-[#57534E] dark:text-stone-300">
                  {report.performance.n > 0
                    ? `(${fmtNum(Math.round((liveNeedsSupport.length / report.performance.n) * 1000) / 10, isArabic ? '٪' : '%')})`
                    : '(0%)'}
                </span>
              </div>
              <p className="text-[11px] text-[#57534E] dark:text-stone-300 mt-1.5">
                {isArabic ? `من أصل ${fmtNum(report.performance.n)} تلميذ مكتمل` : `of ${report.performance.n} complete non-excluded`}
              </p>
            </div>
          </section>

          {/* 4. GRADE / DIVISION DISTRIBUTION + GENDER SPLIT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Division / Grade Distribution */}
            <section className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-white dark:bg-[#151F1B] p-4 shadow-2xs">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1C1917] dark:text-white mb-3">
                {isArabic ? 'توزيع التقديرات والدرجات المعتمدة' : 'Grade & Division Distribution (School Boundaries)'}
              </h3>

              {report.performance.hasPrimaryLearners && (
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {report.performance.divisionDistribution.map((d) => (
                    <div
                      key={d.key}
                      className="rounded-xl border border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-white/[0.03] p-2.5 text-center"
                    >
                      <div className="text-[10px] font-extrabold text-[#57534E] dark:text-stone-300 truncate">
                        {isArabic ? d.labelArabic : d.key}
                      </div>
                      <div className="text-lg font-black tabular-nums text-[#1C1917] dark:text-white mt-0.5">
                        {fmtNum(d.count)}
                      </div>
                      <div className="text-[10px] font-bold tabular-nums text-[#0F4D25] dark:text-emerald-400">
                        {fmtNum(d.pct, isArabic ? '٪' : '%')}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {report.performance.nurseryGradeDistribution && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#57534E] dark:text-stone-300 mb-1.5">
                    Nursery Grades (A–E)
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {report.performance.nurseryGradeDistribution.map((g) => (
                      <div
                        key={g.grade}
                        className="rounded-xl border border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-white/[0.03] p-2 text-center"
                      >
                        <div className="text-[10px] font-extrabold text-[#57534E] dark:text-stone-300">
                          Grade {g.grade}
                        </div>
                        <div className="text-base font-black tabular-nums text-[#1C1917] dark:text-white">
                          {g.count}
                        </div>
                        <div className="text-[10px] font-bold tabular-nums text-[#0F4D25] dark:text-emerald-400">
                          {g.pct}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Gender Split */}
            <section className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-white dark:bg-[#151F1B] p-4 shadow-2xs">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1C1917] dark:text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#0F4D25] dark:text-emerald-400" />
                  <span>{isArabic ? 'التحليل حسب النوع (الذكور / الإناث)' : 'Performance by Captured Gender'}</span>
                </h3>
                <span className="text-[10px] font-semibold text-[#57534E] dark:text-stone-300 tabular-nums">
                  {isArabic
                    ? `مسجل: ${fmtNum(report.genderSplit.capturedCount)} • غير مسجل: ${fmtNum(report.genderSplit.missingGenderCount)}`
                    : `Captured: ${report.genderSplit.capturedCount} • Unrecorded: ${report.genderSplit.missingGenderCount}`}
                </span>
              </div>

              {report.genderSplit.rows.length === 0 ? (
                <p className="text-xs text-[#57534E] dark:text-stone-300 py-4 text-center">
                  {isArabic
                    ? 'لم تُسجَّل قيم النوع للتلاميذ في هذا النطاق.'
                    : 'No student gender records are populated in this scope.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E7E5E4] dark:border-white/10 text-[10px] uppercase text-[#57534E] dark:text-stone-300 bg-[#FAF7F2] dark:bg-white/[0.02]">
                        <th className={`py-2 px-2.5 ${isArabic ? 'text-right' : 'text-left'}`}>{isArabic ? 'الفئة' : 'Gender'}</th>
                        <th className="py-2 px-2.5 text-center">{isArabic ? 'المقيدون' : 'Enrolled'}</th>
                        <th className="py-2 px-2.5 text-center">{isArabic ? 'مكتمل' : 'Sat'}</th>
                        <th className="py-2 px-2.5 text-center">{isArabic ? 'المتوسط' : 'Mean %'}</th>
                        <th className="py-2 px-2.5 text-center">{isArabic ? 'الوسيط' : 'Median %'}</th>
                        <th className="py-2 px-2.5 text-center">{isArabic ? 'النجاح' : 'Pass %'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E5E4] dark:divide-white/5 tabular-nums">
                      {report.genderSplit.rows.map((row) => (
                        <tr key={row.genderKey}>
                          <td className="py-2 px-2.5 font-bold">{isArabic ? row.labelArabic : row.label}</td>
                          <td className="py-2 px-2.5 text-center">{fmtNum(row.enrolledCount)}</td>
                          <td className="py-2 px-2.5 text-center">{fmtNum(row.satCompleteCount)}</td>
                          <td className="py-2 px-2.5 text-center font-bold text-[#0F4D25] dark:text-emerald-400">
                            {fmtNum(row.meanPct, isArabic ? '٪' : '%')}
                          </td>
                          <td className="py-2 px-2.5 text-center">{fmtNum(row.medianPct, isArabic ? '٪' : '%')}</td>
                          <td className="py-2 px-2.5 text-center">{fmtNum(row.passRatePct, isArabic ? '٪' : '%')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* 6. SECTION VS SECTION + CLASS VS CLASS COMPARISON */}
          {report.comparisons.sectionVsSection.length > 0 && (
            <section
              data-testid="section-vs-section-table"
              className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-2xs overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-white/[0.02]">
                <h3 className="text-xs font-extrabold uppercase tracking-wider">
                  {isArabic ? 'مقارنة الأقسام (الروضة • الابتدائية الدنيا • الابتدائية العليا)' : 'Section vs Section Comparison'}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E7E5E4] dark:border-white/10 text-[10px] uppercase text-[#57534E] dark:text-stone-300">
                      <th className={`py-2.5 px-3 ${isArabic ? 'text-right' : 'text-left'}`}>{isArabic ? 'القسم' : 'Section'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'الصفوف' : 'Classes'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'المقيدون' : 'Enrolled'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'مكتمل' : 'Sat'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'الإكمال' : 'Completion'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'المتوسط' : 'Mean %'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'الوسيط' : 'Median %'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'النجاح' : 'Pass %'}</th>
                      <th className="py-2.5 px-3 text-center">{isArabic ? 'الأول' : 'Top Learner'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E5E4] dark:divide-white/5 tabular-nums">
                    {report.comparisons.sectionVsSection.map((sec) => (
                      <tr key={sec.sectionId}>
                        <td className="py-2.5 px-3 font-bold">
                          {isArabic ? sec.labelArabic : sec.label}
                          {sec.candidateExcludedCount > 0 && (
                            <span className="ml-1.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                              ({fmtNum(sec.candidateExcludedCount)} P.7 N/A)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">{fmtNum(sec.classCount)}</td>
                        <td className="py-2.5 px-3 text-center">{fmtNum(sec.totalEnrolled)}</td>
                        <td className="py-2.5 px-3 text-center">{fmtNum(sec.satComplete)}</td>
                        <td className="py-2.5 px-3 text-center">{fmtNum(sec.completionPct, '%')}</td>
                        <td className="py-2.5 px-3 text-center font-black text-[#0F4D25] dark:text-emerald-400">
                          {fmtNum(sec.meanPct, '%')}
                        </td>
                        <td className="py-2.5 px-3 text-center">{fmtNum(sec.medianPct, '%')}</td>
                        <td className="py-2.5 px-3 text-center">{fmtNum(sec.passRatePct, '%')}</td>
                        <td className="py-2.5 px-3 text-center text-[11px]">
                          {sec.topLearner
                            ? `${isArabic ? sec.topLearner.arabicName || sec.topLearner.name : sec.topLearner.name} (${fmtNum(sec.topLearner.normalizedScore, '%')})`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section
            data-testid="class-vs-class-table"
            className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-2xs overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider">
                {isArabic ? 'مقارنة الصفوف التفصيلية' : 'Class vs Class Performance & Completion'}
              </h3>
              {report.comparisons.sectionComparisonNote && (
                <span className="text-[10px] font-semibold text-[#57534E] dark:text-stone-300">
                  {isArabic ? report.comparisons.sectionComparisonNoteArabic : report.comparisons.sectionComparisonNote}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E7E5E4] dark:border-white/10 text-[10px] uppercase text-[#57534E] dark:text-stone-300">
                    <th className={`py-2.5 px-3 ${isArabic ? 'text-right' : 'text-left'}`}>{isArabic ? 'الصف' : 'Class'}</th>
                    <th className="py-2.5 px-3 text-center">{isArabic ? 'القسم' : 'Section'}</th>
                    <th className="py-2.5 px-3 text-center">{isArabic ? 'المقيدون' : 'Enrolled'}</th>
                    <th className="py-2.5 px-3 text-center">{isArabic ? 'مكتمل' : 'Sat'}</th>
                    <th className="py-2.5 px-3 text-center">{isArabic ? 'ناقص' : 'Missing'}</th>
                    <th className="py-2.5 px-3 text-center">{isArabic ? 'الإكمال' : 'Completion'}</th>
                    <th className="py-2.5 px-3 text-center">{isArabic ? 'المتوسط' : 'Mean %'}</th>
                    <th className="py-2.5 px-3 text-center">{isArabic ? 'الوسيط' : 'Median %'}</th>
                    <th className="py-2.5 px-3 text-center">{isArabic ? 'الأعلى / الأدنى' : 'High / Low'}</th>
                    <th className="py-2.5 px-3 text-center">{isArabic ? 'النجاح' : 'Pass %'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E4] dark:divide-white/5 tabular-nums">
                  {report.comparisons.classVsClass.map((c) => (
                    <tr key={c.classId}>
                      <td className="py-2.5 px-3 font-bold">
                        <span>{c.className}</span>
                        {c.candidateExcluded && (
                          <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFE9DF] text-[#1C1917] dark:bg-white/10 dark:text-stone-200">
                            {c.candidateBadge}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[11px]">
                        {isArabic ? c.sectionLabelArabic : c.sectionLabel}
                      </td>
                      <td className="py-2.5 px-3 text-center">{fmtNum(c.totalEnrolled)}</td>
                      <td className="py-2.5 px-3 text-center">{c.candidateExcluded ? 'N/A' : fmtNum(c.satComplete)}</td>
                      <td className="py-2.5 px-3 text-center">{c.candidateExcluded ? 'N/A' : fmtNum(c.incompleteCount)}</td>
                      <td className="py-2.5 px-3 text-center">{c.candidateExcluded ? 'N/A' : fmtNum(c.completionPct, '%')}</td>
                      <td className="py-2.5 px-3 text-center font-black text-[#0F4D25] dark:text-emerald-400">
                        {c.candidateExcluded ? 'N/A' : fmtNum(c.meanPct, '%')}
                      </td>
                      <td className="py-2.5 px-3 text-center">{c.candidateExcluded ? 'N/A' : fmtNum(c.medianPct, '%')}</td>
                      <td className="py-2.5 px-3 text-center">
                        {c.candidateExcluded ? 'N/A' : `${fmtNum(c.highestPct, '%')} / ${fmtNum(c.lowestPct, '%')}`}
                      </td>
                      <td className="py-2.5 px-3 text-center">{c.candidateExcluded ? 'N/A' : fmtNum(c.passRatePct, '%')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 7. SUBJECT PERFORMANCE & SUBJECT X CLASS MATRIX */}
          <section
            data-testid="subject-class-matrix"
            className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-2xs overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-white/[0.02] flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider">
                {isArabic ? 'أداء المواد الدراسية ومقارنتها عبر الصفوف' : 'Subject Performance & Subject × Class Comparison'}
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                {report.subjects.strongestSubject && (
                  <span className="text-[#0F4D25] dark:text-emerald-400">
                    {isArabic ? 'الأقوى:' : 'Strongest:'} {isArabic ? report.subjects.strongestSubject.subjectNameArabic : report.subjects.strongestSubject.subjectName} ({fmtNum(report.subjects.strongestSubject.mean, '%')})
                  </span>
                )}
                {report.subjects.weakestSubject && (
                  <span className="text-amber-800 dark:text-amber-300">
                    {isArabic ? 'الأضعف:' : 'Weakest:'} {isArabic ? report.subjects.weakestSubject.subjectNameArabic : report.subjects.weakestSubject.subjectName} ({fmtNum(report.subjects.weakestSubject.mean, '%')})
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E7E5E4] dark:border-white/10 text-[10px] uppercase text-[#57534E] dark:text-stone-300">
                    <th className={`py-2.5 px-3 ${isArabic ? 'text-right' : 'text-left'}`}>{isArabic ? 'المادة' : 'Subject'}</th>
                    <th className="py-2.5 px-3 text-center">{isArabic ? 'المختبرون' : 'Sat / Exp'}</th>
                    <th className="py-2.5 px-3 text-center">{isArabic ? 'المتوسط' : 'Mean %'}</th>
                    <th className="py-2.5 px-3 text-center">{isArabic ? 'الوسيط' : 'Median'}</th>
                    <th className="py-2.5 px-3 text-center">{isArabic ? 'النجاح' : 'Pass %'}</th>
                    {report.subjects.classesInMatrix.map((cls) => (
                      <th key={cls.classId} className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        {cls.className}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E4] dark:divide-white/5 tabular-nums">
                  {report.subjects.orderedSubjects.map((sub) => (
                    <tr key={sub.subjectId}>
                      <td className="py-2.5 px-3 font-bold">
                        <span>{isArabic ? sub.subjectNameArabic : sub.subjectName}</span>
                        {sub.isStrongest && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-black">
                            {isArabic ? 'الأقوى' : 'HIGH'}
                          </span>
                        )}
                        {sub.isWeakest && !sub.isStrongest && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-black">
                            {isArabic ? 'الأضعف' : 'LOW'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {fmtNum(sub.satCount)} / {fmtNum(sub.expectedCount)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-[#0F4D25] dark:text-emerald-400">
                        {fmtNum(sub.mean, '%')}
                      </td>
                      <td className="py-2.5 px-3 text-center">{fmtNum(sub.median)}</td>
                      <td className="py-2.5 px-3 text-center">{fmtNum(sub.passRate, '%')}</td>
                      {sub.byClass.map((cell) => (
                        <td key={cell.classId} className="py-2.5 px-2.5 text-center">
                          {cell.candidateExcluded ? (
                            <span className="text-[10px] text-[#57534E]">N/A</span>
                          ) : cell.mean !== null ? (
                            <span className="font-semibold">{fmtNum(cell.mean, '%')}</span>
                          ) : (
                            <span className="text-[#57534E] dark:text-stone-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 8. TOP 10 MERIT ROLL & INTERACTIVE NEEDS SUPPORT STEPPER (35%–65%) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Top 10 */}
            <section
              data-testid="detailed-report-top10"
              className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-2xs overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-white/[0.02] flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider">
                  {isArabic ? 'قائمة الشرف — أفضل ١٠ تلاميذ' : 'Top 10 Merit Roll (Matches Phase 3 Ranking)'}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E7E5E4] dark:border-white/10 text-[10px] uppercase text-[#57534E] dark:text-stone-300">
                      <th className="py-2 px-3 text-center w-10">#</th>
                      <th className={`py-2 px-3 ${isArabic ? 'text-right' : 'text-left'}`}>{isArabic ? 'التلميذ' : 'Student'}</th>
                      <th className="py-2 px-3 text-center">{isArabic ? 'الصف' : 'Class'}</th>
                      <th className="py-2 px-3 text-center">{isArabic ? 'النسبة' : 'Norm %'}</th>
                      <th className="py-2 px-3 text-center">{isArabic ? 'المجموع' : 'Total'}</th>
                      <th className="py-2 px-3 text-center">{isArabic ? 'التقدير' : 'Grade'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E5E4] dark:divide-white/5 tabular-nums">
                    {report.learners.top10.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[#57534E] dark:text-stone-300">
                          {isArabic ? 'لا يوجد تلاميذ مكتملو الدرجات.' : 'No ranked complete learners.'}
                        </td>
                      </tr>
                    ) : (
                      report.learners.top10.map((st) => (
                        <tr key={st.id}>
                          <td className="py-2 px-3 text-center font-black text-amber-800 dark:text-amber-300">
                            {fmtNum(st.position)}
                          </td>
                          <td className="py-2 px-3 font-bold">
                            {isArabic ? st.arabicName || st.name : st.name}
                          </td>
                          <td className="py-2 px-3 text-center">{st.className}</td>
                          <td className="py-2 px-3 text-center font-black text-[#0F4D25] dark:text-emerald-400">
                            {fmtNum(st.normalizedScore, '%')}
                          </td>
                          <td className="py-2 px-3 text-center">{fmtNum(st.total)}</td>
                          <td className="py-2 px-3 text-center font-bold">{st.division}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Adjustable Needs Support List (35%–65% stepper) */}
            <section
              data-testid="needs-support-panel"
              className="rounded-2xl border border-amber-300/60 dark:border-amber-500/30 bg-white dark:bg-[#151F1B] shadow-2xs overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-white/[0.02] flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    {isArabic
                      ? `بحاجة لدعم أكاديمي (${fmtNum(liveNeedsSupport.length)})`
                      : `Learners Needing Academic Support (${liveNeedsSupport.length})`}
                  </h3>
                  <p className="text-[10px] text-[#57534E] dark:text-stone-300 mt-0.5">
                    {isArabic ? supportDef.ar : supportDef.en}
                  </p>
                </div>

                {/* 35%–65% Threshold Stepper */}
                <div
                  role="group"
                  aria-label={isArabic ? 'عتبة التلاميذ المحتاجين للدعم' : 'Needs Support Threshold Stepper'}
                  className="inline-flex items-center gap-1 rounded-xl border border-[#E7E5E4] dark:border-white/15 bg-white dark:bg-[#0D1411] p-1"
                >
                  <button
                    type="button"
                    aria-label={isArabic ? 'إنقاص عتبة الدعم' : 'Decrease support threshold'}
                    data-testid="needs-support-stepper-dec"
                    onClick={() => onChangeSupportThreshold(Math.max(MIN_SUPPORT_THRESHOLD, threshold - 5))}
                    disabled={threshold <= MIN_SUPPORT_THRESHOLD}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-stone-100 dark:hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="range"
                    aria-label={isArabic ? 'شريط تحديد عتبة الدعم' : 'Needs support percentage threshold'}
                    data-testid="needs-support-slider"
                    min={MIN_SUPPORT_THRESHOLD}
                    max={MAX_SUPPORT_THRESHOLD}
                    step={1}
                    value={threshold}
                    onChange={(e) => onChangeSupportThreshold(Number(e.target.value))}
                    className="w-20 accent-[#0F4D25] cursor-pointer"
                  />
                  <span
                    data-testid="needs-support-threshold-value"
                    className="min-w-[3.1rem] text-center text-xs font-black tabular-nums text-[#0F4D25] dark:text-emerald-400"
                  >
                    &lt; {threshold}%
                  </span>
                  <button
                    type="button"
                    aria-label={isArabic ? 'زيادة عتبة الدعم' : 'Increase support threshold'}
                    data-testid="needs-support-stepper-inc"
                    onClick={() => onChangeSupportThreshold(Math.min(MAX_SUPPORT_THRESHOLD, threshold + 5))}
                    disabled={threshold >= MAX_SUPPORT_THRESHOLD}
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-stone-100 dark:hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E7E5E4] dark:border-white/10 text-[10px] uppercase text-[#57534E] dark:text-stone-300 sticky top-0 bg-white dark:bg-[#151F1B]">
                      <th className={`py-2 px-3 ${isArabic ? 'text-right' : 'text-left'}`}>{isArabic ? 'التلميذ' : 'Student'}</th>
                      <th className="py-2 px-3 text-center">{isArabic ? 'الصف' : 'Class'}</th>
                      <th className="py-2 px-3 text-center">{isArabic ? 'النسبة' : 'Avg %'}</th>
                      <th className="py-2 px-3 text-center">{isArabic ? 'المجموع' : 'Total'}</th>
                      <th className="py-2 px-3 text-center">{isArabic ? 'التقدير' : 'Division'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E5E4] dark:divide-white/5 tabular-nums">
                    {liveNeedsSupport.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-[#57534E] dark:text-stone-300">
                          {isArabic
                            ? `لا يوجد تلاميذ مكتملو الدرجات دون ${toArabicDigits(threshold)}٪.`
                            : `No complete learners currently fall below ${threshold}%.`}
                        </td>
                      </tr>
                    ) : (
                      liveNeedsSupport.map((st) => (
                        <tr key={st.id} data-testid={`needs-support-row-${st.studentId}`}>
                          <td className="py-2 px-3 font-bold">
                            {isArabic ? st.arabicName || st.name : st.name}
                          </td>
                          <td className="py-2 px-3 text-center">{st.className}</td>
                          <td className="py-2 px-3 text-center font-black text-rose-700 dark:text-rose-300">
                            {fmtNum(st.normalizedScore, '%')}
                          </td>
                          <td className="py-2 px-3 text-center">{fmtNum(st.total)}</td>
                          <td className="py-2 px-3 text-center font-bold">{st.division}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* 9. CYCLE COMPLETENESS (MARKS, REMARKS, CONDUCT) & DATA-QUALITY FLAGS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section
              data-testid="cycle-completeness-panel"
              className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-white dark:bg-[#151F1B] p-4 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0F4D25] dark:text-emerald-400" />
                  <span>{isArabic ? 'اكتمال دورة الاختبار والملاحظات' : 'Cycle Completeness (Marks, Remarks & Conduct)'}</span>
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    report.cycleCompleteness.examLocked
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-stone-100 text-[#57534E] dark:bg-white/10 dark:text-stone-300'
                  }`}
                >
                  {report.cycleCompleteness.examLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  {report.cycleCompleteness.examLocked
                    ? isArabic
                      ? 'مغلق رسمياً'
                      : `${examPhase.toUpperCase()} Locked`
                    : isArabic
                      ? 'مفتوح للإدخال'
                      : `${examPhase.toUpperCase()} Open`}
                </span>
              </div>

              <p className="text-[11px] text-[#57534E] dark:text-stone-300 mb-3">
                {isArabic ? report.cycleCompleteness.remarksPolicyNoteArabic : report.cycleCompleteness.remarksPolicyNote}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E7E5E4] dark:border-white/10 text-[10px] uppercase text-[#57534E] dark:text-stone-300 bg-[#FAF7F2] dark:bg-white/[0.02]">
                      <th className={`py-2 px-2.5 ${isArabic ? 'text-right' : 'text-left'}`}>{isArabic ? 'الصف' : 'Class'}</th>
                      <th className="py-2 px-2.5 text-center">{isArabic ? 'الدرجات' : 'Marks %'}</th>
                      <th className="py-2 px-2.5 text-center">{isArabic ? 'الملاحظات' : 'Remarks Ready'}</th>
                      <th className="py-2 px-2.5 text-center">{isArabic ? 'السلوك' : 'Conduct'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E5E4] dark:divide-white/5 tabular-nums">
                    {report.cycleCompleteness.byClass.map((row) => (
                      <tr key={row.classId}>
                        <td className="py-2 px-2.5 font-bold">{row.className}</td>
                        <td className="py-2 px-2.5 text-center">
                          {row.candidateExcluded ? 'N/A' : `${fmtNum(row.marksCompletionPct, '%')} (${row.marksCompleteCount}/${row.totalEnrolled})`}
                        </td>
                        <td className="py-2 px-2.5 text-center">
                          {row.candidateExcluded ? 'N/A' : fmtNum(row.remarksReadyPct, '%')}
                        </td>
                        <td className="py-2 px-2.5 text-center text-[11px]">
                          {row.conductReadyPct !== null
                            ? fmtNum(row.conductReadyPct, '%')
                            : isArabic
                              ? row.conductStatusNoteArabic
                              : row.conductStatusNote}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Data Quality Flags + Omitted Metrics Disclosure */}
            <section
              data-testid="data-quality-panel"
              className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-white dark:bg-[#151F1B] p-4 shadow-2xs flex flex-col gap-3"
            >
              <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{isArabic ? 'مؤشرات جودة البيانات ونقص الدرجات' : 'Data-Quality Flags & Missing Marks'}</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center tabular-nums">
                <div className="rounded-xl border border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-white/[0.02] p-2">
                  <div className="text-[10px] text-[#57534E] dark:text-stone-300">{isArabic ? 'درجات ناقصة' : 'Missing Learners'}</div>
                  <div className="text-base font-black">{fmtNum(report.dataQuality.missingMarksStudentsCount)}</div>
                </div>
                <div className="rounded-xl border border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-white/[0.02] p-2">
                  <div className="text-[10px] text-[#57534E] dark:text-stone-300">{isArabic ? 'خارج النطاق' : 'Out of Range'}</div>
                  <div className="text-base font-black">{fmtNum(report.dataQuality.outOfRangeScores.length)}</div>
                </div>
                <div className="rounded-xl border border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-white/[0.02] p-2">
                  <div className="text-[10px] text-[#57534E] dark:text-stone-300">{isArabic ? 'صفوف مكررة' : 'Duplicates'}</div>
                  <div className="text-base font-black">{fmtNum(report.dataQuality.duplicateMarkRows.length)}</div>
                </div>
                <div className="rounded-xl border border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-white/[0.02] p-2">
                  <div className="text-[10px] text-[#57534E] dark:text-stone-300">{isArabic ? 'صفوف غير مصنفة' : 'Unmapped Classes'}</div>
                  <div className="text-base font-black">{fmtNum(report.dataQuality.unmappedClasses.length)}</div>
                </div>
              </div>

              {report.dataQuality.outOfRangeScores.length > 0 && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-950/20 p-2.5 text-[11px]">
                  <strong className="text-rose-800 dark:text-rose-300">
                    {isArabic ? 'درجات خارج النطاق (0–100):' : 'Out-of-Range Scores (<0 or >100):'}
                  </strong>
                  <ul className="mt-1 space-y-0.5">
                    {report.dataQuality.outOfRangeScores.slice(0, 8).map((f, idx) => (
                      <li key={idx}>
                        {f.studentName} ({f.className}) — {f.subjectName}: <strong>{f.score}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.cohort.missingLearners.length > 0 && (
                <div className="rounded-xl border border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-white/[0.02] p-2.5 text-[11px] max-h-40 overflow-y-auto">
                  <div className="font-bold mb-1">
                    {isArabic
                      ? `التلاميذ ذوو الدرجات الناقصة (${fmtNum(report.cohort.missingLearners.length)}):`
                      : `Incomplete Marks Breakdown (${report.cohort.missingLearners.length} learner(s)):`}
                  </div>
                  <ul className="space-y-1">
                    {report.cohort.missingLearners.slice(0, 12).map((m) => (
                      <li key={m.enrollmentId} className="flex justify-between gap-2">
                        <span className="truncate font-semibold">
                          {isArabic ? m.arabicName || m.studentName : m.studentName} ({m.className})
                        </span>
                        <span className="text-[#57534E] dark:text-stone-300 shrink-0">
                          {fmtNum(m.satCount)}/{fmtNum(m.expectedCount)} • {m.missingSubjects.slice(0, 3).join(', ')}
                          {m.missingSubjects.length > 3 ? ` +${m.missingSubjects.length - 3}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Omitted Metrics Transparency */}
              <div className="border-t border-[#E7E5E4] dark:border-white/10 pt-2.5 text-[11px] text-[#57534E] dark:text-stone-300">
                <div className="font-bold text-[#1C1917] dark:text-stone-200 mb-1">
                  {isArabic ? 'محددات النطاق والبيانات غير المخزنة:' : 'Scope & Omitted Metrics Transparency:'}
                </div>
                <ul className="space-y-1 list-disc list-inside">
                  {report.omittedMetrics.map((o) => (
                    <li key={o.key}>
                      <strong>{isArabic ? o.labelArabic : o.label}:</strong> {isArabic ? o.reasonArabic : o.reason}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

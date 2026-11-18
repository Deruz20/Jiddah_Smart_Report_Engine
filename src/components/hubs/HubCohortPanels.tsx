'use client'

import React from 'react'
import { AlertTriangle, Award, Info, RefreshCw, ShieldAlert } from 'lucide-react'
import type {
  ClassBreakdownSummary,
  MissingMarksEntry,
} from '@/lib/hub-cohort-engine'
import { CANDIDATE_NA_BADGE, type HubCurriculum, type UnmappedClassWarning } from '@/lib/academic-sections'

function formatDigits(val: number | string | null | undefined, useArabic: boolean): string {
  if (val == null || val === '' || (typeof val === 'number' && Number.isNaN(val))) return '—'
  const str = String(val)
  return useArabic ? str.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]) : str
}

export function HubCandidateNaCard({
  curriculum,
  classLabel,
  termLabel,
  badge = CANDIDATE_NA_BADGE,
  reason,
  onSwitchExamPhase,
}: {
  curriculum: HubCurriculum
  classLabel: string
  termLabel: string
  badge?: string | null
  reason?: string | null
  onSwitchExamPhase: (phase: 'bot' | 'mot') => void
}) {
  const isArabic = curriculum === 'theology'
  return (
    <div
      data-testid="candidate-class-na-banner"
      role="status"
      dir={isArabic ? 'rtl' : 'ltr'}
      className="rounded-xl border border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-[#151F1B] p-6 max-w-2xl mx-auto my-6 text-center shadow-2xs"
    >
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EFE9DF] dark:bg-white/10 text-[#1C1917] dark:text-stone-100 border border-[#D6D3D1] dark:border-white/15 mb-3">
        <Info className="w-3.5 h-3.5 text-[#0F4D25] dark:text-emerald-400" strokeWidth={2.25} />
        <span>{badge || CANDIDATE_NA_BADGE}</span>
      </div>

      <h3 className="text-base font-extrabold text-[#1C1917] dark:text-white">
        {isArabic
          ? `${classLabel} — ${termLabel} (EOT)`
          : `${classLabel} — ${termLabel} EOT`}
      </h3>

      <p className="text-xs text-[#57534E] dark:text-stone-300 mt-1.5 leading-relaxed max-w-lg mx-auto">
        {isArabic
          ? 'صف الشهادة (الصف السابع / P.7) يتقدم لامتحانات الشهادة (PLE / IPLE) ولا توجد له اختبارات نهاية الفترة الثالثة (EOT). يتم استثناؤه تلقائياً من المعدلات والترتيب ونسب الإكمال بدون ملء أصفار أو تحذيرات نقص.'
          : reason ||
            'P.7 candidates sit national PLE / IPLE examinations and have no Term 3 EOT assessment. Excluded from EOT averages, ranks, completion %, and missing-marks checks.'}
      </p>

      <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onSwitchExamPhase('bot')}
          className="h-8 px-3 rounded-[10px] text-xs font-bold bg-white dark:bg-white/10 border border-[#E7E5E4] dark:border-white/15 text-[#1C1917] dark:text-white hover:border-[#0F4D25] cursor-pointer transition"
        >
          {isArabic ? 'عرض اختبار بداية الفترة (BOT)' : 'View Term 3 BOT'}
        </button>
        <button
          type="button"
          onClick={() => onSwitchExamPhase('mot')}
          className="h-8 px-3 rounded-[10px] text-xs font-bold bg-[#0F4D25] text-white hover:bg-[#0D4320] cursor-pointer transition"
        >
          {isArabic ? 'عرض اختبار منتصف الفترة (MOT)' : 'View Term 3 MOT'}
        </button>
      </div>
    </div>
  )
}

export function HubDataQualityBanners({
  curriculum,
  fetchError,
  onRetry,
  unmappedClasses,
  candidateExclusions,
  rankingMethodLabel,
  rankingMethodLabelArabic,
  isNormalizedRanking,
  showRankingMethod = true,
  isSectionMode = false,
  excludedRowsCount = 0,
  showExcludedCandidates = false,
  onToggleShowExcludedCandidates,
}: {
  curriculum: HubCurriculum
  fetchError?: string | null
  onRetry?: () => void
  unmappedClasses: UnmappedClassWarning[]
  candidateExclusions: Array<{ classId: string; className: string; badge: string; enrolled: number }>
  rankingMethodLabel: string
  rankingMethodLabelArabic: string
  isNormalizedRanking: boolean
  showRankingMethod?: boolean
  isSectionMode?: boolean
  excludedRowsCount?: number
  showExcludedCandidates?: boolean
  onToggleShowExcludedCandidates?: () => void
}) {
  const isArabic = curriculum === 'theology'

  return (
    <div className="shrink-0 flex flex-col gap-1.5" dir={isArabic ? 'rtl' : 'ltr'}>
      {fetchError && (
        <div
          data-testid="hub-fetch-error"
          role="alert"
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 text-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-700 dark:text-rose-400" strokeWidth={2.25} />
            <span className="font-semibold truncate">{fetchError}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="h-7 px-2.5 rounded-lg bg-rose-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shrink-0 hover:bg-rose-800 transition"
            >
              <RefreshCw className="w-3 h-3" strokeWidth={2.25} />
              <span>{isArabic ? 'إعادة المحاولة' : 'Retry'}</span>
            </button>
          )}
        </div>
      )}

      {unmappedClasses.length > 0 && (
        <div
          data-testid="unmapped-classes-warning"
          role="status"
          className="flex items-start gap-2 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50/90 dark:bg-amber-950/25 text-amber-950 dark:text-amber-200 text-xs"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" strokeWidth={2.25} />
          <div className="min-w-0 leading-snug">
            <span className="font-bold">
              {isArabic ? 'تنبيه جودة البيانات — صفوف غير مصنفة في الأقسام: ' : 'Data Quality Warning — Unmapped classes (kept visible, excluded from sections): '}
            </span>
            <span className="font-medium">
              {unmappedClasses.map((u) => `${u.label} (${u.rawSectionOrLevel})`).join(' · ')}
            </span>
          </div>
        </div>
      )}

      {candidateExclusions.length > 0 && (
        <div
          data-testid="section-candidate-exclusion-notice"
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-[#151F1B] text-[#1C1917] dark:text-stone-200 text-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Info className="w-3.5 h-3.5 shrink-0 text-[#0F4D25] dark:text-emerald-400" strokeWidth={2.25} />
            <span>
              <strong className="font-bold">{CANDIDATE_NA_BADGE}:</strong>{' '}
              {isArabic
                ? `تم استبعاد ${candidateExclusions.map((c) => c.className).join('، ')} من متوسطات وترتيب ونقص نهاية الفترة الثالثة.`
                : `${candidateExclusions.map((c) => c.className).join(', ')} excluded from Term 3 EOT ranks, averages, completion %, and missing-marks alerts.`}
            </span>
          </div>
          {isSectionMode && excludedRowsCount > 0 && onToggleShowExcludedCandidates && (
            <button
              type="button"
              data-testid="toggle-excluded-candidates-btn"
              onClick={onToggleShowExcludedCandidates}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer shrink-0 ${
                showExcludedCandidates
                  ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                  : 'bg-white dark:bg-white/5 text-[#0F4D25] dark:text-emerald-300 border-[#0D5C3A]/25 hover:bg-[#0D5C3A]/10'
              }`}
            >
              {isArabic
                ? showExcludedCandidates
                  ? `إخفاء ${formatDigits(excludedRowsCount, true)} تلاميذ (${candidateExclusions.map((c) => c.className).join('، ')})`
                  : `${candidateExclusions.map((c) => c.className).join('، ')} مستبعد من EOT (إظهار ${formatDigits(excludedRowsCount, true)} صفوف)`
                : showExcludedCandidates
                  ? `Hide ${excludedRowsCount} ${candidateExclusions.map((c) => c.className).join('/')} candidate rows`
                  : `${candidateExclusions.map((c) => c.className).join('/')} excluded from Term 3 EOT (Show ${excludedRowsCount} ${candidateExclusions.map((c) => c.className).join('/')} rows)`}
            </button>
          )}
        </div>
      )}

      {showRankingMethod && (
        <div
          data-testid="ranking-method-disclosure"
          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-[#E7E5E4] dark:border-white/10 bg-[#FAF7F2] dark:bg-[#151F1B] text-[#57534E] dark:text-stone-300 text-[11px]"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Award
              className={`w-3.5 h-3.5 shrink-0 ${
                isNormalizedRanking ? 'text-[#0F4D25] dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
              }`}
              strokeWidth={2.25}
            />
            <span className="truncate font-semibold">
              {isArabic ? rankingMethodLabelArabic : rankingMethodLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export function HubClassBreakdownTable({
  curriculum,
  classBreakdown,
  sectionTitle,
}: {
  curriculum: HubCurriculum
  classBreakdown: ClassBreakdownSummary[]
  sectionTitle?: string
}) {
  if (classBreakdown.length === 0) return null
  const isArabic = curriculum === 'theology'

  const activeRows = classBreakdown.filter((r) => !r.isCandidateExcluded)
  const totalEnrolled = activeRows.reduce((s, r) => s + r.totalEnrolled, 0)
  const totalSatComplete = activeRows.reduce((s, r) => s + r.satComplete, 0)
  const totalIncomplete = activeRows.reduce((s, r) => s + r.incompleteCount, 0)

  return (
    <div
      data-testid="class-breakdown-table"
      dir={isArabic ? 'rtl' : 'ltr'}
      className="rounded-2xl border border-[#E7E5E4] dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-2xs p-4"
    >
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1C1917] dark:text-white">
          {isArabic
            ? `مقارنة الفصول ${sectionTitle ? `— ${sectionTitle}` : ''}`
            : `Class-by-Class Cohort Comparison${sectionTitle ? ` — ${sectionTitle}` : ''}`}
        </h3>
        <span className="text-[11px] text-[#57534E] dark:text-stone-400 font-medium tabular-nums">
          {isArabic
            ? `${formatDigits(classBreakdown.length, true)} فصول`
            : `${classBreakdown.length} classes`}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs tabular-nums">
          <thead>
            <tr className="border-b border-[#E7E5E4] dark:border-white/10 text-[#57534E] dark:text-stone-400 text-[10px] font-bold uppercase tracking-wider">
              <th className={`py-2 px-2.5 ${isArabic ? 'text-right' : 'text-left'}`}>
                {isArabic ? 'الصف' : 'Class'}
              </th>
              <th className="py-2 px-2.5 text-center">{isArabic ? 'المسجلون' : 'Enrolled'}</th>
              <th className="py-2 px-2.5 text-center">{isArabic ? 'المكتملون' : 'Complete'}</th>
              <th className="py-2 px-2.5 text-center">{isArabic ? 'ناقص الدرجات' : 'Incomplete'}</th>
              <th className="py-2 px-2.5 text-center">{isArabic ? 'نسبة الإكمال' : 'Completion'}</th>
              <th className="py-2 px-2.5 text-center">{isArabic ? 'متوسط النسبة' : 'Mean %'}</th>
              <th className="py-2 px-2.5 text-center">{isArabic ? 'نسبة النجاح' : 'Pass Rate'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E5E4]/70 dark:divide-white/5">
            {classBreakdown.map((row) => (
              <tr key={row.classId} className="hover:bg-[#FAF7F2] dark:hover:bg-white/[0.02]">
                <td className={`py-2 px-2.5 font-bold text-[#1C1917] dark:text-stone-100 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {row.className}
                </td>
                <td className="py-2 px-2.5 text-center font-mono">
                  {formatDigits(row.totalEnrolled, isArabic)}
                </td>
                {row.isCandidateExcluded ? (
                  <td colSpan={5} className="py-2 px-2.5 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFE9DF] dark:bg-white/10 text-[#1C1917] dark:text-stone-200 border border-[#D6D3D1] dark:border-white/15">
                      {row.candidateBadge || CANDIDATE_NA_BADGE}
                    </span>
                  </td>
                ) : (
                  <>
                    <td className="py-2 px-2.5 text-center font-mono text-[#0F4D25] dark:text-emerald-400 font-bold">
                      {formatDigits(row.satComplete, isArabic)}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono text-amber-800 dark:text-amber-400 font-semibold">
                      {formatDigits(row.incompleteCount, isArabic)}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono font-semibold">
                      {row.completionPct != null ? `${formatDigits(row.completionPct, isArabic)}%` : '—'}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono font-bold text-[#1C1917] dark:text-white">
                      {row.meanPct != null ? `${formatDigits(row.meanPct, isArabic)}%` : '—'}
                    </td>
                    <td className="py-2 px-2.5 text-center font-mono font-bold text-[#0F4D25] dark:text-emerald-400">
                      {row.passRate != null ? `${formatDigits(row.passRate, isArabic)}%` : '—'}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          {classBreakdown.length > 1 && (
            <tfoot>
              <tr className="border-t-2 border-[#E7E5E4] dark:border-white/15 bg-[#FAF7F2] dark:bg-white/[0.03] font-extrabold text-[#1C1917] dark:text-white">
                <td className={`py-2 px-2.5 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {isArabic ? 'إجمالي الفصول النشطة' : 'Applicable Classes Sum'}
                </td>
                <td className="py-2 px-2.5 text-center font-mono">{formatDigits(totalEnrolled, isArabic)}</td>
                <td className="py-2 px-2.5 text-center font-mono text-[#0F4D25] dark:text-emerald-400">
                  {formatDigits(totalSatComplete, isArabic)}
                </td>
                <td className="py-2 px-2.5 text-center font-mono text-amber-800 dark:text-amber-400">
                  {formatDigits(totalIncomplete, isArabic)}
                </td>
                <td colSpan={3} className="py-2 px-2.5 text-center text-[11px] font-medium text-[#57534E] dark:text-stone-400">
                  {isArabic
                    ? 'الصفوف المستثناة (P.7 EOT الفصل ٣) لا تدخل في المجاميع'
                    : 'Candidate N/A classes excluded from active section totals'}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

export function HubMissingMarksPanel({
  curriculum,
  missingMarksList,
}: {
  curriculum: HubCurriculum
  missingMarksList: MissingMarksEntry[]
}) {
  if (missingMarksList.length === 0) return null
  const isArabic = curriculum === 'theology'

  return (
    <div
      data-testid="missing-marks-panel"
      dir={isArabic ? 'rtl' : 'ltr'}
      className="rounded-2xl border border-amber-300/80 dark:border-amber-500/30 bg-[#FAF7F2] dark:bg-[#151F1B] p-4 shadow-2xs"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" strokeWidth={2.25} />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1C1917] dark:text-white">
            {isArabic
              ? `تلاميذ مستبعدون من الترتيب لنقص الدرجات (${formatDigits(missingMarksList.length, true)})`
              : `Missing Marks — Excluded from Rank (${missingMarksList.length})`}
          </h3>
        </div>
        <span className="text-[11px] text-[#57534E] dark:text-stone-400 font-medium">
          {isArabic
            ? 'لا تُحتسب المواد الناقصة كأصفار'
            : 'Never zero-filled; listed for mark entry verification'}
        </span>
      </div>

      <div className="overflow-x-auto max-h-60 overflow-y-auto">
        <table className="w-full border-collapse text-xs tabular-nums">
          <thead>
            <tr className="border-b border-[#E7E5E4] dark:border-white/10 text-[10px] font-bold uppercase text-[#57534E] dark:text-stone-400">
              <th className={`py-1.5 px-2 ${isArabic ? 'text-right' : 'text-left'}`}>
                {isArabic ? 'التلميذ' : 'Student'}
              </th>
              <th className={`py-1.5 px-2 ${isArabic ? 'text-right' : 'text-left'}`}>
                {isArabic ? 'الصف' : 'Class'}
              </th>
              <th className="py-1.5 px-2 text-center">{isArabic ? 'الممتحنة' : 'Sat'}</th>
              <th className={`py-1.5 px-2 ${isArabic ? 'text-right' : 'text-left'}`}>
                {isArabic ? 'المواد الناقصة' : 'Missing Subjects'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E5E4]/60 dark:divide-white/5">
            {missingMarksList.map((entry) => (
              <tr key={entry.enrollmentId}>
                <td className={`py-1.5 px-2 font-semibold text-[#1C1917] dark:text-stone-100 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {isArabic ? entry.arabicName || entry.studentName : entry.studentName}
                </td>
                <td className={`py-1.5 px-2 text-[#57534E] dark:text-stone-300 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {entry.className}
                </td>
                <td className="py-1.5 px-2 text-center font-mono text-[#1C1917] dark:text-stone-200">
                  {formatDigits(`${entry.satCount}/${entry.expectedCount}`, isArabic)}
                </td>
                <td className={`py-1.5 px-2 text-amber-900 dark:text-amber-300 font-medium ${isArabic ? 'text-right' : 'text-left'}`}>
                  {entry.missingSubjects.join(isArabic ? '، ' : ', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

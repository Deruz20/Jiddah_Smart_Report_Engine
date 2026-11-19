'use client'

import React, { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileWarning,
  Languages,
  Loader2,
  MessageSquareWarning,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { EnrollmentItem, ReportData } from '@/components/figma-ui/types'

export type QaIssueCategory = 'arabic_name' | 'missing_marks' | 'remarks'

export interface StudentQaAuditRow {
  enrollment: EnrollmentItem
  studentId: string | null
  report: ReportData | null
  arabicName: string
  englishName: string
  issues: {
    category: QaIssueCategory
    severity: 'high' | 'medium'
    message: string
  }[]
  suggestedArabicName?: string
}

const LATIN_CHAR_RE = /[A-Za-z]/
const HARSH_ENGLISH_NURSERY_RE = /\b(poor|fail|failed|failure|weak|hopeless|lazy)\b/i
const HARSH_ARABIC_NURSERY_RE = /(ضعيف|راسب|دون المستوى)/

const KNOWN_ARABIC_SUGGESTIONS: Record<string, string> = {
  'HAMAN RASHEED': 'هامان رشيد',
}

export function auditPrePrintIssues({
  enrollments,
  reports,
  curriculum,
  phase,
}: {
  enrollments: EnrollmentItem[]
  reports: ReportData[]
  curriculum: 'secular' | 'theology' | 'combined'
  phase: string
}): {
  rows: StudentQaAuditRow[]
  flaggedRows: StudentQaAuditRow[]
  counts: {
    totalFlagged: number
    arabicName: number
    missingMarks: number
    remarks: number
  }
} {
  const reportById = new Map<string, ReportData>()
  for (const r of reports) {
    if (r?.id) reportById.set(r.id, r)
  }

  const normalizedPhase = (phase || 'EOT').toLowerCase()

  // Detect class-wide actively assessed secular subjects so blank optional subjects (e.g. COMP) aren't falsely flagged
  const activeSecularSubjects = new Set<string>()
  const activeTheologySubjects = new Set<string>()
  for (const r of reports) {
    for (const sub of r.circular?.subjects || []) {
      const val =
        normalizedPhase === 'bot'
          ? sub.bot_score
          : normalizedPhase === 'mot'
            ? sub.mot_score
            : sub.eot_score
      if (typeof val === 'number') activeSecularSubjects.add(sub.subject_name)
    }
    for (const sub of r.theology?.subjects || []) {
      const val =
        normalizedPhase === 'mot'
          ? sub.mot_score
          : typeof sub.eot_score === 'number'
            ? sub.eot_score
            : sub.score
      if (typeof val === 'number') activeTheologySubjects.add(sub.subject_name_arabic)
    }
  }

  let arabicNameCount = 0
  let missingMarksCount = 0
  let remarksCount = 0

  const rows: StudentQaAuditRow[] = enrollments.map((enrollment) => {
    const report = reportById.get(enrollment.enrollment_id) || null
    const englishName = (report?.student?.name || enrollment.name || '').trim()
    const arabicName = (report?.student?.arabic_name || enrollment.arabic_name || '').trim()
    const studentId = enrollment.student_id || (report?.student as any)?.id || null
    const issues: StudentQaAuditRow['issues'] = []

    const needsArabicName =
      curriculum === 'theology' ||
      curriculum === 'combined' ||
      enrollment.track === 'Theology' ||
      enrollment.track === 'Both' ||
      Boolean(enrollment.theology_class_arabic)

    if (needsArabicName) {
      if (!arabicName) {
        issues.push({
          category: 'arabic_name',
          severity: 'high',
          message: 'Missing Arabic name — will print blank or fall back to English on Arabic cards.',
        })
      } else if (LATIN_CHAR_RE.test(arabicName)) {
        issues.push({
          category: 'arabic_name',
          severity: 'high',
          message: `Untransliterated Latin text in Arabic name ("${arabicName}").`,
        })
      }
    }

    if (report) {
      const missingSecular: string[] = []
      if (curriculum !== 'theology' && report.circular?.subjects?.length) {
        const subjectList = report.circular.subjects.filter((s) =>
          activeSecularSubjects.size > 0 ? activeSecularSubjects.has(s.subject_name) : true
        )
        for (const sub of subjectList) {
          const val =
            normalizedPhase === 'bot'
              ? sub.bot_score
              : normalizedPhase === 'mot'
                ? sub.mot_score
                : sub.eot_score
          if (typeof val !== 'number') missingSecular.push(sub.subject_name)
        }
      }

      const missingTheology: string[] = []
      if (curriculum !== 'secular' && report.theology?.subjects?.length) {
        const subjectList = report.theology.subjects.filter((s) =>
          activeTheologySubjects.size > 0 ? activeTheologySubjects.has(s.subject_name_arabic) : true
        )
        for (const sub of subjectList) {
          const val =
            normalizedPhase === 'mot'
              ? sub.mot_score
              : typeof sub.eot_score === 'number'
                ? sub.eot_score
                : sub.score
          if (typeof val !== 'number') missingTheology.push(sub.subject_name_arabic)
        }
      }

      if (missingSecular.length > 0) {
        issues.push({
          category: 'missing_marks',
          severity: 'high',
          message: `Missing Secular ${phase.toUpperCase()} marks (${missingSecular.length}): ${missingSecular.slice(0, 4).join(', ')}${missingSecular.length > 4 ? '…' : ''}`,
        })
      }
      if (missingTheology.length > 0) {
        issues.push({
          category: 'missing_marks',
          severity: 'high',
          message: `Missing Theology ${phase.toUpperCase()} marks (${missingTheology.length}): ${missingTheology.slice(0, 3).join('، ')}${missingTheology.length > 3 ? '…' : ''}`,
        })
      }

      const isNursery = report.section_type === 'nursery' || enrollment.section_type === 'nursery'
      const teacherComment = (report.circular?.class_teacher_comment || '').trim()
      const headComment = (report.circular?.head_teacher_comment || '').trim()
      const theoTeacherComment = ((report.theology as any)?.teacher_comment || '').trim()
      const theoHeadComment = ((report.theology as any)?.head_teacher_comment || '').trim()

      if (curriculum !== 'theology' && report.circular) {
        if (!teacherComment) {
          issues.push({
            category: 'remarks',
            severity: 'medium',
            message: 'Missing Class Teacher comment on Secular report.',
          })
        }
        if (!headComment && normalizedPhase === 'eot') {
          issues.push({
            category: 'remarks',
            severity: 'medium',
            message: 'Missing Head Teacher comment on Secular EOT report.',
          })
        }
        if (isNursery) {
          const harshSubj = (report.circular.subjects || []).find((s) =>
            HARSH_ENGLISH_NURSERY_RE.test(s.remark || '')
          )
          if (
            harshSubj ||
            HARSH_ENGLISH_NURSERY_RE.test(teacherComment) ||
            HARSH_ENGLISH_NURSERY_RE.test(headComment)
          ) {
            issues.push({
              category: 'remarks',
              severity: 'medium',
              message: `Harsh Nursery wording detected${harshSubj ? ` in ${harshSubj.subject_name}` : ''} — review settings or remarks.`,
            })
          }
        }
      }

      if (curriculum !== 'secular' && report.theology && isNursery) {
        const harshTheo = (report.theology.subjects || []).find((s) =>
          HARSH_ARABIC_NURSERY_RE.test(s.theology_remark || '')
        )
        if (
          harshTheo ||
          HARSH_ARABIC_NURSERY_RE.test(theoTeacherComment) ||
          HARSH_ARABIC_NURSERY_RE.test(theoHeadComment)
        ) {
          issues.push({
            category: 'remarks',
            severity: 'medium',
            message: 'Harsh Nursery Theology wording detected — consider supportive parental phrasing.',
          })
        }
      }
    }

    if (issues.some((i) => i.category === 'arabic_name')) arabicNameCount += 1
    if (issues.some((i) => i.category === 'missing_marks')) missingMarksCount += 1
    if (issues.some((i) => i.category === 'remarks')) remarksCount += 1

    const suggestedArabicName = KNOWN_ARABIC_SUGGESTIONS[englishName.toUpperCase()]

    return {
      enrollment,
      studentId,
      report,
      arabicName,
      englishName,
      issues,
      suggestedArabicName,
    }
  })

  const flaggedRows = rows.filter((r) => r.issues.length > 0)

  return {
    rows,
    flaggedRows,
    counts: {
      totalFlagged: flaggedRows.length,
      arabicName: arabicNameCount,
      missingMarks: missingMarksCount,
      remarks: remarksCount,
    },
  }
}

export interface PrePrintQaModalProps {
  open: boolean
  onClose: () => void
  classLabel: string
  phase: string
  curriculum: 'secular' | 'theology' | 'combined'
  enrollments: EnrollmentItem[]
  reports: ReportData[]
  onStudentUpdated: (
    studentId: string,
    enrollmentId: string,
    patch: { name: string; arabic_name: string }
  ) => Promise<void> | void
  onSelectStudent?: (enrollmentId: string) => void
}

export function PrePrintQaModal({
  open,
  onClose,
  classLabel,
  phase,
  curriculum,
  enrollments,
  reports,
  onStudentUpdated,
  onSelectStudent,
}: PrePrintQaModalProps) {
  const [filterTab, setFilterTab] = useState<'flagged' | 'arabic_name' | 'missing_marks' | 'remarks' | 'all'>('flagged')
  const [searchQuery, setSearchQuery] = useState('')
  const [draftNames, setDraftNames] = useState<Record<string, { name: string; arabic_name: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({})

  const audit = useMemo(
    () => auditPrePrintIssues({ enrollments, reports, curriculum, phase }),
    [enrollments, reports, curriculum, phase]
  )

  const visibleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return audit.rows.filter((row) => {
      if (filterTab === 'flagged' && row.issues.length === 0) return false
      if (
        (filterTab === 'arabic_name' || filterTab === 'missing_marks' || filterTab === 'remarks') &&
        !row.issues.some((i) => i.category === filterTab)
      ) {
        return false
      }
      if (!q) return true
      return (
        row.englishName.toLowerCase().includes(q) ||
        row.arabicName.toLowerCase().includes(q) ||
        (row.enrollment.admission_number || '').toLowerCase().includes(q)
      )
    })
  }, [audit.rows, filterTab, searchQuery])

  if (!open) return null

  const getDraft = (row: StudentQaAuditRow) =>
    draftNames[row.enrollment.enrollment_id] ?? {
      name: row.englishName,
      arabic_name: row.arabicName,
    }

  const updateDraft = (enrollmentId: string, row: StudentQaAuditRow, patch: Partial<{ name: string; arabic_name: string }>) => {
    const current = getDraft(row)
    setDraftNames((prev) => ({
      ...prev,
      [enrollmentId]: { ...current, ...patch },
    }))
    setSavedIds((prev) => ({ ...prev, [enrollmentId]: false }))
  }

  const handleSaveStudent = async (row: StudentQaAuditRow) => {
    const targetId = row.studentId
    if (!targetId) {
      toast.error('Student record ID unavailable for inline edit. Refresh enrollments and try again.')
      return
    }
    const draft = getDraft(row)
    const trimmedName = draft.name.trim()
    const trimmedArabic = draft.arabic_name.trim()
    if (!trimmedName) {
      toast.error('English name cannot be empty.')
      return
    }

    setSavingId(row.enrollment.enrollment_id)
    try {
      const res = await fetch(`/api/students/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          arabic_name: trimmedArabic || null,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(payload?.error || 'Failed to update student name.')
      }

      setSavedIds((prev) => ({ ...prev, [row.enrollment.enrollment_id]: true }))
      toast.success(`Saved "${trimmedName}"${trimmedArabic ? ` / ${trimmedArabic}` : ''}`)
      await onStudentUpdated(targetId, row.enrollment.enrollment_id, {
        name: trimmedName,
        arabic_name: trimmedArabic,
      })
    } catch (err: any) {
      toast.error(err?.message || 'Unable to save student spelling fix.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-end bg-black/45 backdrop-blur-[2px] print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Pre-Print QA and Name Check"
      data-testid="pre-print-qa-modal"
    >
      <div className="relative h-full w-full max-w-2xl bg-white dark:bg-[#121916] border-l border-stone-200 dark:border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-white/10 flex items-start justify-between gap-3 bg-[#F8FAF9] dark:bg-[#161F1C]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#0D5C3A]/12 text-[#0D5C3A] dark:bg-[#10B981]/20 dark:text-[#34D399]">
                <ShieldCheck className="size-4.5" />
              </span>
              <div>
                <h2 className="text-base font-black text-stone-900 dark:text-stone-100 leading-tight">
                  Pre-Print QA &amp; Name Check
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {classLabel} • {phase.toUpperCase()} • {enrollments.length} learner{enrollments.length === 1 ? '' : 's'} scanned
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close QA & Name Check"
            className="h-8 w-8 rounded-full flex items-center justify-center bg-stone-200/70 dark:bg-white/10 text-stone-700 dark:text-stone-200 hover:bg-stone-300/70 dark:hover:bg-white/20 transition cursor-pointer shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Summary KPI Strip + Tabs */}
        <div className="px-5 py-3 border-b border-stone-200 dark:border-white/10 space-y-2.5 bg-white dark:bg-[#121916]">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'flagged', label: `Issues (${audit.counts.totalFlagged})` },
                { id: 'arabic_name', label: `Arabic Names (${audit.counts.arabicName})` },
                { id: 'missing_marks', label: `Missing Marks (${audit.counts.missingMarks})` },
                { id: 'remarks', label: `Remarks (${audit.counts.remarks})` },
                { id: 'all', label: `All Students (${audit.rows.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-testid={`qa-tab-${tab.id}`}
                onClick={() => setFilterTab(tab.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer border ${
                  filterTab === tab.id
                    ? 'bg-[#0D5C3A] text-white border-[#0D5C3A]'
                    : 'bg-stone-100 dark:bg-[#1B2420] text-stone-700 dark:text-stone-300 border-stone-200 dark:border-white/10 hover:bg-stone-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="size-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name, Arabic spelling, or admission number..."
              className="w-full h-9 pl-8.5 pr-3 rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-[#19221E] text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#0D5C3A]/35"
            />
          </div>
        </div>

        {/* Audit List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {visibleRows.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/70 dark:bg-emerald-950/25 p-6 text-center space-y-2">
              <CheckCircle2 className="size-8 text-[#0D5C3A] dark:text-[#34D399] mx-auto" />
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {filterTab === 'flagged'
                  ? 'All scanned report cards passed Pre-Print QA!'
                  : 'No students match this filter.'}
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Switch to &ldquo;All Students&rdquo; anytime to quick-edit any learner&rsquo;s English or Arabic name before printing.
              </p>
            </div>
          ) : (
            visibleRows.map((row) => {
              const eid = row.enrollment.enrollment_id
              const draft = getDraft(row)
              const isDirty =
                draft.name.trim() !== row.englishName || draft.arabic_name.trim() !== row.arabicName
              const isSaving = savingId === eid
              const isSaved = savedIds[eid]

              return (
                <div
                  key={eid}
                  data-testid={`qa-student-row-${eid}`}
                  className={`rounded-2xl border p-3.5 space-y-2.5 transition ${
                    row.issues.length > 0
                      ? 'border-amber-200/90 dark:border-amber-700/40 bg-amber-50/35 dark:bg-amber-950/15'
                      : 'border-stone-200 dark:border-white/10 bg-white dark:bg-[#17201C]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-stone-900 dark:text-stone-100 truncate">
                          {row.englishName}
                        </span>
                        <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-stone-200/70 dark:bg-white/10 text-stone-600 dark:text-stone-300">
                          {row.enrollment.admission_number || 'No ID'}
                        </span>
                        <span className="text-[10.5px] font-semibold text-stone-500 dark:text-stone-400">
                          {row.enrollment.circular_class}
                          {row.enrollment.theology_class_arabic ? ` • ${row.enrollment.theology_class_arabic}` : ''}
                        </span>
                      </div>
                    </div>
                    {onSelectStudent && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStudent(eid)
                          onClose()
                        }}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-[#0D5C3A] dark:text-[#34D399] bg-[#0D5C3A]/10 dark:bg-[#10B981]/15 hover:bg-[#0D5C3A]/20 transition cursor-pointer"
                      >
                        <Eye className="size-3" />
                        Preview
                      </button>
                    )}
                  </div>

                  {/* Flagged Issues */}
                  {row.issues.length > 0 && (
                    <div className="space-y-1">
                      {row.issues.map((issue, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-1.5 text-[11.5px] leading-snug font-medium ${
                            issue.severity === 'high'
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {issue.category === 'arabic_name' ? (
                            <Languages className="size-3.5 shrink-0 mt-0.5" />
                          ) : issue.category === 'missing_marks' ? (
                            <FileWarning className="size-3.5 shrink-0 mt-0.5" />
                          ) : (
                            <MessageSquareWarning className="size-3.5 shrink-0 mt-0.5" />
                          )}
                          <span>{issue.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick-Fix Inline Name Editor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                        English Name
                      </label>
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(e) => updateDraft(eid, row, { name: e.target.value })}
                        className="w-full h-8.5 px-2.5 rounded-lg border border-stone-200 dark:border-white/15 bg-white dark:bg-[#111815] text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-[#0D5C3A]/35"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                          Arabic Name (الاسم بالعربية)
                        </label>
                        {row.suggestedArabicName && draft.arabic_name.trim() !== row.suggestedArabicName && (
                          <button
                            type="button"
                            onClick={() => updateDraft(eid, row, { arabic_name: row.suggestedArabicName! })}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0D5C3A] dark:text-[#34D399] hover:underline cursor-pointer"
                          >
                            <Sparkles className="size-2.5" />
                            Use {row.suggestedArabicName}
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        dir="rtl"
                        value={draft.arabic_name}
                        onChange={(e) => updateDraft(eid, row, { arabic_name: e.target.value })}
                        placeholder="مثال: هامان رشيد"
                        className="w-full h-8.5 px-2.5 rounded-lg border border-stone-200 dark:border-white/15 bg-white dark:bg-[#111815] text-sm font-bold text-stone-900 dark:text-stone-100 font-arabic focus:outline-none focus:ring-2 focus:ring-[#0D5C3A]/35"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[10.5px] text-stone-500 dark:text-stone-400">
                      {isSaved ? (
                        <span className="inline-flex items-center gap-1 text-[#0D5C3A] dark:text-[#34D399] font-bold">
                          <CheckCircle2 className="size-3" />
                          Saved &amp; report refreshed
                        </span>
                      ) : isDirty ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-semibold">
                          <AlertTriangle className="size-3" />
                          Unsaved spelling edit
                        </span>
                      ) : (
                        'Inline save updates student record & live report preview'
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={isSaving || !isDirty}
                      onClick={() => handleSaveStudent(row)}
                      data-testid={`qa-save-student-${eid}`}
                      className={`h-8 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer ${
                        isDirty
                          ? 'bg-[#0D5C3A] hover:bg-[#0A472D] text-white shadow-xs'
                          : 'bg-stone-200/70 dark:bg-white/10 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                      Save &amp; Refresh
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

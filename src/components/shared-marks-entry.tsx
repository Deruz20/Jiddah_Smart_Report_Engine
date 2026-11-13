'use client'
// @ts-nocheck

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Check,
  RefreshCw,
  AlertCircle,
  Save,
  RotateCcw,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  GraduationCap,
  Download,
  Upload,
  Lock,
  Unlock,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react'
import { EnrollmentData, CircularMarkRow, TheologyMarkRow, TermData } from '@/types/models'
import { UnassignedTeacherState } from './UnassignedTeacherState'
import { MoreActionsMenu } from '@/components/ui/more-actions-menu'

const SecularMarkTableRow = React.memo(function SecularMarkTableRow({
  mark,
  idx,
  examType,
  renderScoreCell,
}: {
  mark: CircularMarkRow
  idx: number
  examType: ExamType
  renderScoreCell: (
    curriculum: 'secular' | 'theology',
    subjectId: string,
    subjectLabel: string,
    type: 'bot' | 'mot' | 'eot',
    scoreValue: number | null,
    rowIndex: number
  ) => React.ReactNode
}) {
  return (
    <tr className="hover:bg-[var(--bg-hover)] transition-colors h-11">
      <td
        data-testid={`frozen-cell-${idx}`}
        className="sticky left-0 z-10 bg-[var(--bg-card)] px-3 sm:px-4 py-1.5 border-r border-[#0D5C3A]/[0.06] dark:border-[#F59E0B]/[0.07] min-w-[160px] max-w-[240px]"
      >
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate" title={mark.subject_name}>
            {mark.subject_name}
          </span>
          {mark.is_core && (
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold border-0 shrink-0"
              title="Core subject"
            >
              ✓
            </span>
          )}
        </div>
      </td>
      <td className="hidden sm:table-cell px-2 py-1.5 text-center">
        {mark.is_core ? (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
            ✓
          </span>
        ) : (
          <span className="text-[var(--text-muted)] text-xs">--</span>
        )}
      </td>
      {['bot', 'all'].includes(examType) && (
        <td className="px-1.5 py-1.5 text-center">
          {renderScoreCell('secular', mark.subject_id, mark.subject_name, 'bot', mark.bot_score, idx)}
        </td>
      )}
      {['mot', 'all'].includes(examType) && (
        <td className="px-1.5 py-1.5 text-center">
          {renderScoreCell('secular', mark.subject_id, mark.subject_name, 'mot', mark.mot_score, idx)}
        </td>
      )}
      {['eot', 'all'].includes(examType) && (
        <td className="px-1.5 py-1.5 text-center">
          {renderScoreCell('secular', mark.subject_id, mark.subject_name, 'eot', mark.eot_score, idx)}
        </td>
      )}
    </tr>
  )
})

const TheologyMarkTableRow = React.memo(function TheologyMarkTableRow({
  mark,
  idx,
  examType,
  renderScoreCell,
}: {
  mark: TheologyMarkRow
  idx: number
  examType: ExamType
  renderScoreCell: (
    curriculum: 'secular' | 'theology',
    subjectId: string,
    subjectLabel: string,
    type: 'bot' | 'mot' | 'eot',
    scoreValue: number | null,
    rowIndex: number
  ) => React.ReactNode
}) {
  return (
    <tr className="hover:bg-[var(--bg-hover)] transition-colors h-11">
      <td className="sticky left-0 z-10 bg-[var(--bg-card)] px-3 sm:px-4 py-1.5 border-r border-[#0D5C3A]/[0.06] dark:border-[#F59E0B]/[0.07] min-w-[160px] max-w-[240px]">
        <div className="font-bold text-[var(--text-primary)] truncate text-xs sm:text-sm" dir="rtl">
          {mark.subject_name_arabic}
        </div>
      </td>
      {['mot', 'all'].includes(examType) && (
        <td className="px-1.5 py-1.5 text-center">
          {renderScoreCell('theology', mark.subject_id, mark.subject_name_arabic, 'mot', mark.mot_score, idx)}
        </td>
      )}
      {['eot', 'all'].includes(examType) && (
        <td className="px-1.5 py-1.5 text-center">
          {renderScoreCell('theology', mark.subject_id, mark.subject_name_arabic, 'eot', mark.eot_score, idx)}
        </td>
      )}
    </tr>
  )
})

export type ExamType = 'bot' | 'mot' | 'eot' | 'all'

export interface SharedMarksEntryProps {
  terms: TermData[]
  enrollments: EnrollmentData[]

  selectedTermId: string
  onSelectTerm: (id: string) => void

  selectedEnrollmentId: string
  onSelectEnrollment: (id: string) => void

  circularMarks: CircularMarkRow[]
  setCircularMarks: React.Dispatch<React.SetStateAction<CircularMarkRow[]>>

  theologyMarks: TheologyMarkRow[]
  setTheologyMarks: React.Dispatch<React.SetStateAction<TheologyMarkRow[]>>

  examType: ExamType
  setExamType: (type: ExamType) => void

  isFetching: boolean
  isLoading: boolean
  isSaving: boolean
  isPending: boolean

  error: string | null
  success: boolean

  setSuccess: (s: boolean) => void

  onSave: (event?: React.FormEvent<HTMLFormElement>) => void
  allowedDepartment?: 'secular' | 'theology' | 'both'
  isUnassigned?: boolean
  assignedSubjects?: string[]
  roleLabel?: string
}

function computeTheologyBadge(score: number | null | undefined): {
  grade: string
  bg: string
  text: string
  border: string
} | null {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return null
  const n = Number(score)
  if (n < 0 || n > 100) return null
  if (n >= 85) return { grade: 'ممتاز', bg: 'bg-emerald-500/15', text: 'text-emerald-800 dark:text-emerald-300 font-bold', border: 'border-emerald-500/30' }
  if (n >= 75) return { grade: 'جيد جدا', bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400 font-bold', border: 'border-emerald-500/20' }
  if (n >= 60) return { grade: 'جيد', bg: 'bg-blue-500/15', text: 'text-blue-800 dark:text-blue-300 font-bold', border: 'border-blue-500/30' }
  if (n >= 50) return { grade: 'مقبول', bg: 'bg-amber-500/15', text: 'text-amber-800 dark:text-amber-300 font-bold', border: 'border-amber-500/30' }
  return { grade: 'ضعيف', bg: 'bg-rose-500/15', text: 'text-rose-800 dark:text-rose-300 font-bold', border: 'border-rose-500/30' }
}

function computeGradeBadge(score: number | null | undefined): {
  grade: string
  bg: string
  text: string
  border: string
} | null {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return null
  const n = Number(score)
  if (n < 0 || n > 100) return null
  if (n >= 85) return { grade: 'D1', bg: 'bg-emerald-500/15', text: 'text-emerald-800 dark:text-emerald-300 font-bold', border: 'border-emerald-500/30' }
  if (n >= 75) return { grade: 'D2', bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400 font-bold', border: 'border-emerald-500/20' }
  if (n >= 70) return { grade: 'C3', bg: 'bg-blue-500/15', text: 'text-blue-800 dark:text-blue-300 font-bold', border: 'border-blue-500/30' }
  if (n >= 60) return { grade: 'C4', bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400 font-bold', border: 'border-blue-500/20' }
  if (n >= 55) return { grade: 'C5', bg: 'bg-cyan-500/15', text: 'text-cyan-800 dark:text-cyan-300 font-bold', border: 'border-cyan-500/30' }
  if (n >= 50) return { grade: 'C6', bg: 'bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-400 font-bold', border: 'border-cyan-500/20' }
  if (n >= 40) return { grade: 'P7', bg: 'bg-amber-500/15', text: 'text-amber-800 dark:text-amber-300 font-bold', border: 'border-amber-500/30' }
  if (n >= 35) return { grade: 'P8', bg: 'bg-orange-500/15', text: 'text-orange-800 dark:text-orange-300 font-bold', border: 'border-orange-500/30' }
  return { grade: 'F9', bg: 'bg-rose-500/15', text: 'text-rose-800 dark:text-rose-300 font-bold', border: 'border-rose-500/30' }
}

export function SharedMarksEntry({
  terms,
  enrollments,
  selectedTermId,
  onSelectTerm,
  selectedEnrollmentId,
  onSelectEnrollment,
  circularMarks,
  setCircularMarks,
  theologyMarks,
  setTheologyMarks,
  examType,
  setExamType,
  isFetching,
  isLoading,
  isSaving,
  isPending,
  error,
  success,
  setSuccess,
  onSave,
  allowedDepartment = 'both',
  isUnassigned = false,
  assignedSubjects = [],
  roleLabel = 'Teacher',
}: SharedMarksEntryProps) {
  const selectedEnrollment = (Array.isArray(enrollments) ? enrollments.find((e) => e.id === selectedEnrollmentId) : null) || null

  const [activeView, setActiveView] = useState<'secular' | 'theology' | 'both'>(allowedDepartment)
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all')
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('')
  const [searchDropdownOpen, setSearchDropdownOpen] = useState<boolean>(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({})
  const [isExamSetLocked, setIsExamSetLocked] = useState<boolean>(false)
  const searchBoxRef = useRef<HTMLDivElement>(null)

  const handleExportMarksheet = useCallback(() => {
    const student = enrollments.find((e) => e.id === selectedEnrollmentId)
    const rows = [
      ['Student', 'Class', 'Curriculum', 'Subject', 'BOT', 'MOT', 'EOT'],
      ...circularMarks.map((m) => [
        student?.name || '',
        student?.circular_class || '',
        'Secular',
        m.subject_name || '',
        m.bot_score ?? '',
        m.mot_score ?? '',
        m.eot_score ?? '',
      ]),
      ...theologyMarks.map((m) => [
        student?.name || '',
        student?.circular_class || '',
        'Theology',
        m.subject_name_arabic || '',
        '',
        m.mot_score ?? '',
        m.eot_score ?? '',
      ]),
    ]
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `marksheet_${student?.name || 'student'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Marksheet exported successfully')
  }, [enrollments, selectedEnrollmentId, circularMarks, theologyMarks])

  useEffect(() => {
    setActiveView(allowedDepartment)
  }, [allowedDepartment])

  useEffect(() => {
    if (success) {
      setHasUnsavedChanges(false)
    }
  }, [success])

  useEffect(() => {
    setHasUnsavedChanges(false)
    setFieldErrors({})
    setRawInputs({})
  }, [selectedEnrollmentId, selectedTermId])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Distinct class options from enrollments
  const classOptions = useMemo(() => {
    const set = new Set<string>()
    enrollments.forEach((e) => {
      if (activeView === 'theology') {
        const theoCls = e.theology_class_level || e.theology_class_arabic || e.circular_class
        if (theoCls) set.add(theoCls)
      } else {
        const cls = e.circular_class || e.theology_class_level || e.theology_class_arabic
        if (cls) set.add(cls)
      }
    })
    return Array.from(set).sort()
  }, [enrollments, activeView])

  // Auto-select first assigned subject for Subject Teachers
  useEffect(() => {
    if (assignedSubjects && assignedSubjects.length > 0 && circularMarks.length > 0 && selectedSubjectFilter === 'all') {
      const lowerAssigned = assignedSubjects.map((s) => s.trim().toLowerCase())
      const matched = circularMarks.find(
        (m) =>
          lowerAssigned.includes((m.subject_id || '').toLowerCase()) ||
          lowerAssigned.includes((m.subject_name || '').toLowerCase())
      )
      if (matched && assignedSubjects.length === 1) {
        setSelectedSubjectFilter(matched.subject_id)
      }
    }
  }, [assignedSubjects, circularMarks, selectedSubjectFilter])

  // Filtered enrollments by class selector AND search input
  const filteredEnrollments = useMemo(() => {
    let list = enrollments
    if (selectedClassFilter !== 'all') {
      list = list.filter(
        (e) =>
          e.circular_class === selectedClassFilter ||
          e.theology_class_level === selectedClassFilter ||
          e.theology_class_arabic === selectedClassFilter
      )
    }
    const q = studentSearchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (e) =>
          (e.name || '').toLowerCase().includes(q) ||
          (e.arabic_name || '').toLowerCase().includes(q) ||
          (e.admission_number || '').toLowerCase().includes(q) ||
          (e.circular_class || '').toLowerCase().includes(q) ||
          (e.theology_class_arabic || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [enrollments, selectedClassFilter, studentSearchQuery])

  const currentStudentIndex = useMemo(
    () => filteredEnrollments.findIndex((e) => e.id === selectedEnrollmentId),
    [filteredEnrollments, selectedEnrollmentId]
  )

  const handleStepStudent = (delta: number) => {
    if (filteredEnrollments.length === 0) return
    const nextIdx =
      currentStudentIndex === -1
        ? 0
        : (currentStudentIndex + delta + filteredEnrollments.length) % filteredEnrollments.length
    const nextStudent = filteredEnrollments[nextIdx]
    if (nextStudent) {
      onSelectEnrollment(nextStudent.id)
      setSuccess(false)
    }
  }

  const getSubjectOrder = (name: string) => {
    const n = (name || '').toUpperCase()
    if (n.includes('ENG')) return 1
    if (n.includes('MATH') || n.includes('MTC')) return 2
    if (n.includes('LIT 1') || n.includes('LIT I')) return 3
    if (n.includes('LIT 2') || n.includes('LIT II')) return 4
    if (n.includes('SCI')) return 5
    if (n.includes('SST') || n.includes('SOCIAL')) return 6
    if (n.includes('COMP')) return 7
    if (n.includes('IRE')) return 8
    return 99
  }

  const sortedCircularMarks = useMemo(() => {
    const sorted = [...circularMarks].sort(
      (a, b) => getSubjectOrder(a.subject_name) - getSubjectOrder(b.subject_name)
    )
    if (selectedSubjectFilter === 'all') return sorted
    return sorted.filter((m) => m.subject_id === selectedSubjectFilter || m.subject_name === selectedSubjectFilter)
  }, [circularMarks, selectedSubjectFilter])

  // Live summary stats for active exam column
  const liveSummary = useMemo(() => {
    const scoreKey = examType === 'bot' ? 'bot_score' : examType === 'mot' ? 'mot_score' : 'eot_score'
    const validScores = circularMarks
      .map((m) => m[scoreKey])
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
    const total = validScores.reduce((acc, v) => acc + v, 0)
    const avg = validScores.length > 0 ? Math.round((total / validScores.length) * 10) / 10 : 0
    return {
      scoredCount: validScores.length,
      totalSubjects: circularMarks.length,
      total,
      avg,
      columnLabel: examType === 'all' ? 'EOT' : examType.toUpperCase(),
    }
  }, [circularMarks, examType])

  const editedCount = Object.keys(rawInputs).length

  const goalGradientProgress = useMemo(() => {
    if (!liveSummary.totalSubjects) return { percent: 15, left: 0 }
    const scoredFraction = liveSummary.scoredCount / liveSummary.totalSubjects
    const percent = Math.min(100, Math.round(15 + scoredFraction * 85))
    const left = Math.max(0, liveSummary.totalSubjects - liveSummary.scoredCount)
    return { percent, left }
  }, [liveSummary.scoredCount, liveSummary.totalSubjects])

  const validateAndApplyScore = useCallback((
    curriculum: 'secular' | 'theology',
    subjectId: string,
    subjectLabel: string,
    type: 'bot' | 'mot' | 'eot',
    rawValue: string
  ) => {
    const fieldKey = `${curriculum}:${subjectId}:${type}`
    setRawInputs((prev) => ({ ...prev, [fieldKey]: rawValue }))
    setHasUnsavedChanges(true)

    const trimmed = rawValue.trim()
    if (trimmed === '') {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[fieldKey]
        return next
      })
      if (curriculum === 'secular') {
        setCircularMarks((prev) =>
          prev.map((m) =>
            m.subject_id === subjectId
              ? { ...m, [type === 'bot' ? 'bot_score' : type === 'mot' ? 'mot_score' : 'eot_score']: null }
              : m
          )
        )
      } else {
        setTheologyMarks((prev) =>
          prev.map((m) =>
            m.subject_id === subjectId ? { ...m, [type === 'mot' ? 'mot_score' : 'eot_score']: null } : m
          )
        )
      }
      return
    }

    const num = Number(trimmed)
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      const errMsg = `${subjectLabel} (${type.toUpperCase()}): Enter a valid numeric score.`
      setFieldErrors((prev) => ({ ...prev, [fieldKey]: 'Numeric score required' }))
      toast.error(errMsg)
      return
    }

    if (num < 0 || num > 100) {
      const errMsg = `${subjectLabel} (${type.toUpperCase()}): Score ${num} is out of range (must be 0–100).`
      setFieldErrors((prev) => ({ ...prev, [fieldKey]: 'Must be 0–100' }))
      toast.error(errMsg)
      return
    }

    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[fieldKey]
      return next
    })

    if (curriculum === 'secular') {
      setCircularMarks((prev) =>
        prev.map((m) =>
          m.subject_id === subjectId
            ? { ...m, [type === 'bot' ? 'bot_score' : type === 'mot' ? 'mot_score' : 'eot_score']: num }
            : m
        )
      )
    } else {
      setTheologyMarks((prev) =>
        prev.map((m) =>
          m.subject_id === subjectId ? { ...m, [type === 'mot' ? 'mot_score' : 'eot_score']: num } : m
        )
      )
    }
  }, [setCircularMarks, setTheologyMarks])

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const errorEntries = Object.entries(fieldErrors)
    if (errorEntries.length > 0) {
      errorEntries.forEach(([key, msg]) => {
        const parts = key.split(':')
        toast.error(`Validation error on ${parts[2]?.toUpperCase() || 'score'}: ${msg}`)
      })
      return
    }
    onSave(e)
  }

  const renderScoreCell = (
    curriculum: 'secular' | 'theology',
    subjectId: string,
    subjectLabel: string,
    type: 'bot' | 'mot' | 'eot',
    scoreValue: number | null,
    rowIndex: number
  ) => {
    const fieldKey = `${curriculum}:${subjectId}:${type}`
    const rawOverride = rawInputs[fieldKey]
    const isDirty = fieldKey in rawInputs
    const val =
      rawOverride !== undefined
        ? rawOverride
        : scoreValue === null || scoreValue === undefined
        ? ''
        : String(scoreValue)
    const fieldError = fieldErrors[fieldKey]
    const numVal = parseFloat(val)
    const hasScore = val !== '' && !Number.isNaN(numVal)
    const isHigh = !fieldError && hasScore && numVal >= 75
    const isLow = !fieldError && hasScore && numVal < 50
    const badge = !fieldError && hasScore
      ? (curriculum === 'theology' ? computeTheologyBadge(numVal) : computeGradeBadge(numVal))
      : null

    return (
      <div className="flex flex-col items-center justify-center min-w-[90px]">
        <div className="inline-flex items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            aria-label={`${subjectLabel} ${type.toUpperCase()} score`}
            data-testid={`score-input-${curriculum}-${subjectId}-${type}`}
            placeholder="0-100"
            value={val}
            onChange={(e) => validateAndApplyScore(curriculum, subjectId, subjectLabel, type, e.target.value)}
            data-col={type.toUpperCase()}
            data-row={rowIndex}
            data-table={curriculum}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') {
                e.preventDefault()
                const currentCol = e.currentTarget.getAttribute('data-col')
                const currentTable = e.currentTarget.getAttribute('data-table')
                const currentRow = parseInt(e.currentTarget.getAttribute('data-row') || '0', 10)
                const targetRow = e.key === 'ArrowUp' ? currentRow - 1 : currentRow + 1
                const target = document.querySelector(
                  `input[data-table="${currentTable}"][data-col="${currentCol}"][data-row="${targetRow}"]`
                ) as HTMLInputElement
                if (target) {
                  target.focus()
                  target.select()
                }
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                const input = e.currentTarget
                const atStart = input.selectionStart === 0 && input.selectionEnd === 0
                const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length
                const cols = ['BOT', 'MOT', 'EOT']
                const currentCol = input.getAttribute('data-col') || ''
                const colIdx = cols.indexOf(currentCol)
                if (colIdx !== -1 && ((e.key === 'ArrowLeft' && atStart) || (e.key === 'ArrowRight' && atEnd))) {
                  const targetColIdx = e.key === 'ArrowLeft' ? colIdx - 1 : colIdx + 1
                  if (targetColIdx >= 0 && targetColIdx < cols.length) {
                    e.preventDefault()
                    const currentTable = input.getAttribute('data-table')
                    const currentRow = input.getAttribute('data-row')
                    const target = document.querySelector(
                      `input[data-table="${currentTable}"][data-col="${cols[targetColIdx]}"][data-row="${currentRow}"]`
                    ) as HTMLInputElement
                    if (target) {
                      target.focus()
                      target.select()
                    }
                  }
                }
              }
            }}
            disabled={isExamSetLocked}
            className={`score-input w-16 h-8 px-1 text-center text-xs sm:text-sm font-mono font-semibold tabular-nums rounded-xl transition-all outline-none border focus:ring-2 ${
              fieldError
                ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 focus:ring-rose-500/25'
                : isDirty
                ? 'border-[#D97706] ring-2 ring-[#D97706]/40 dark:ring-[#F59E0B]/50 bg-amber-500/10 text-[var(--text-primary)]'
                : isHigh
                ? 'border-[#0D5C3A]/25 dark:border-[#34D399]/30 bg-emerald-500/10 text-[#0D5C3A] dark:text-[#34D399] focus:border-[#0D5C3A]'
                : isLow
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 focus:border-amber-600'
                : 'border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 bg-[#F0F4F9] dark:bg-[#131314] text-[#1F1F1F] dark:text-[#E3E3E3] focus:bg-white dark:focus:bg-[#1E1F20] focus:ring-[#0D5C3A]/30 dark:focus:ring-[#F59E0B]/30'
            }`}
          />
          {badge && (
            <span
              className={`inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-full text-[10px] font-bold border-0 ${badge.bg} ${badge.text}`}
              dir={curriculum === 'theology' ? 'rtl' : 'ltr'}
            >
              {badge.grade}
            </span>
          )}
        </div>
        {fieldError && (
          <span
            data-testid={`field-error-${curriculum}-${subjectId}-${type}`}
            className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1 leading-tight text-center"
          >
            {fieldError}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-2.5 pb-20 md:pb-2">
      <style>{`
        input[type="number"].score-input::-webkit-inner-spin-button,
        input[type="number"].score-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"].score-input {
          -moz-appearance: textfield;
        }
      `}</style>

      <form onSubmit={handleFormSubmit} className="space-y-2.5 w-full min-w-0">
        {/* Step 1: Single Ultra-Compact Integrated Toolbar */}
        <div className="sticky top-2 z-30 bg-white/95 dark:bg-[#111916]/95 backdrop-blur-sm border border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 rounded-2xl p-2 sm:p-2.5 shadow-2xs w-full min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            {/* Left Group */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              {/* Class Selector Pill */}
              <select
                id="marks-class-select"
                aria-label="Class Filter"
                value={selectedClassFilter}
                onChange={(e) => {
                  const nextClass = e.target.value
                  setSelectedClassFilter(nextClass)
                  const matching =
                    nextClass === 'all'
                      ? enrollments
                      : enrollments.filter((en) => en.circular_class === nextClass)
                  if (matching.length > 0) {
                    onSelectEnrollment(matching[0].id)
                  }
                }}
                className="h-9 rounded-full bg-[#F0F4F9] dark:bg-[#1E1F20] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] text-[#1F1F1F] dark:text-[#E3E3E3] border-0 ring-0 focus:ring-2 focus:ring-[#0D5C3A]/25 dark:focus:ring-[#F59E0B]/30 px-3.5 text-xs font-medium transition-colors max-w-[170px] truncate cursor-pointer"
              >
                <option value="all">All Classes ({enrollments.length})</option>
                {classOptions.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>

              {/* Quick Search Pill */}
              <div ref={searchBoxRef} className="relative min-w-[150px] sm:min-w-[180px] max-w-[220px]">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 absolute left-3 pointer-events-none" />
                  <input
                    id="marks-student-search"
                    type="text"
                    data-testid="student-search-input"
                    value={studentSearchQuery}
                    onFocus={() => setSearchDropdownOpen(true)}
                    onChange={(e) => {
                      const q = e.target.value
                      setStudentSearchQuery(q)
                      setSearchDropdownOpen(true)
                    }}
                    placeholder="Quick search student..."
                    className="w-full h-9 pl-8 pr-7 text-xs font-medium rounded-full bg-[#F0F4F9] dark:bg-[#1E1F20] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] text-[#1F1F1F] dark:text-[#E3E3E3] placeholder:text-stone-400 dark:placeholder:text-stone-500 border-0 ring-0 focus:ring-2 focus:ring-[#0D5C3A]/25 dark:focus:ring-[#F59E0B]/30 outline-none transition-colors"
                  />
                  {studentSearchQuery && (
                    <button
                      type="button"
                      aria-label="Clear student search"
                      onClick={() => {
                        setStudentSearchQuery('')
                        setSearchDropdownOpen(false)
                      }}
                      className="absolute right-2 p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-full cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {searchDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto bg-white dark:bg-[#1E1F20] border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 rounded-2xl shadow-xl z-40 divide-y divide-[#0D5C3A]/[0.06] dark:divide-[#F59E0B]/[0.07]">
                    {filteredEnrollments.length === 0 ? (
                      <div className="px-3.5 py-3 text-xs text-stone-400 text-center">
                        No students match &ldquo;{studentSearchQuery}&rdquo;
                      </div>
                    ) : (
                      filteredEnrollments.slice(0, 30).map((s) => {
                        const isSel = s.id === selectedEnrollmentId
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              onSelectEnrollment(s.id)
                              setSuccess(false)
                              setSearchDropdownOpen(false)
                            }}
                            className={`w-full text-left px-3.5 py-2 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                              isSel
                                ? 'bg-[#0D5C3A]/10 text-[#09472C] dark:bg-[#10B981]/15 dark:text-[#34D399] font-bold'
                                : 'hover:bg-[#F0F4F9] dark:hover:bg-[#282A2C] text-[#1F1F1F] dark:text-[#E3E3E3]'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{s.name}</div>
                              <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                                {s.admission_number || 'ADM'} &bull; {s.circular_class}
                              </div>
                            </div>
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-[#F0F4F9] dark:bg-[#282A2C] text-stone-600 dark:text-stone-300 text-[10px] font-bold">
                              {s.circular_class}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Active Student Pill + Stepper Buttons */}
              <div className="flex items-center gap-1 min-w-0">
                <select
                  id="marks-student-select"
                  aria-label="Student"
                  value={selectedEnrollmentId}
                  onChange={(e) => {
                    onSelectEnrollment(e.target.value)
                    setSuccess(false)
                  }}
                  className="h-9 rounded-full bg-[#F0F4F9] dark:bg-[#1E1F20] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] text-[#1F1F1F] dark:text-[#E3E3E3] border-0 ring-0 focus:ring-2 focus:ring-[#0D5C3A]/25 dark:focus:ring-[#F59E0B]/30 px-3.5 text-xs font-semibold transition-colors max-w-[200px] sm:max-w-[240px] truncate cursor-pointer"
                >
                  <option value="">Select student...</option>
                  {filteredEnrollments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.circular_class})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleStepStudent(-1)}
                  disabled={filteredEnrollments.length <= 1}
                  title="Previous student"
                  aria-label="Previous student"
                  className="w-8 h-8 rounded-full bg-[#F0F4F9] dark:bg-[#1E1F20] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] border-0 flex items-center justify-center text-[#444746] dark:text-[#C4C7C5] active:scale-[0.97] disabled:opacity-40 cursor-pointer shrink-0 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepStudent(1)}
                  disabled={filteredEnrollments.length <= 1}
                  title="Next student"
                  aria-label="Next student"
                  className="w-8 h-8 rounded-full bg-[#F0F4F9] dark:bg-[#1E1F20] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] border-0 flex items-center justify-center text-[#444746] dark:text-[#C4C7C5] active:scale-[0.97] disabled:opacity-40 cursor-pointer shrink-0 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Group */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
              {/* Exam Phase Track (BOT | MOT | EOT | ALL) */}
              <div
                className="inline-flex items-center bg-[#F0F4F9] dark:bg-[#1E1F20] p-1 rounded-full border-0 gap-0.5"
                aria-label="Exam Type"
              >
                {(['bot', 'mot', 'eot', 'all'] as ExamType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setExamType(type)
                      setSuccess(false)
                    }}
                    className={`whitespace-nowrap shrink-0 h-7 px-3 text-xs font-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer ${
                      examType === type
                        ? 'bg-[#0D5C3A] text-white dark:bg-[#10B981]/25 dark:text-[#34D399] shadow-xs'
                        : 'text-[#444746] dark:text-[#C4C7C5] hover:text-[#1F1F1F] dark:hover:text-white'
                    }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Curriculum View Track (Both | Secular | Theology) */}
              {allowedDepartment === 'both' && (
                <div
                  className="inline-flex items-center bg-[#F0F4F9] dark:bg-[#1E1F20] p-1 rounded-full border-0 gap-0.5"
                  aria-label="Department View"
                >
                  {(['both', 'secular', 'theology'] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setActiveView(view)}
                      className={`whitespace-nowrap shrink-0 h-7 px-3 text-xs font-semibold capitalize rounded-full transition-all cursor-pointer ${
                        activeView === view
                          ? 'bg-[#0D5C3A] text-white dark:bg-[#10B981]/25 dark:text-[#34D399] shadow-xs'
                          : 'text-[#444746] dark:text-[#C4C7C5] hover:text-[#1F1F1F] dark:hover:text-white'
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              )}

              {/* Subject Filter Pill */}
              {circularMarks.length > 0 && (
                <select
                  id="marks-subject-select"
                  aria-label="Subject Filter"
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="h-9 rounded-full bg-[#F0F4F9] dark:bg-[#1E1F20] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] text-[#1F1F1F] dark:text-[#E3E3E3] border-0 ring-0 focus:ring-2 focus:ring-[#0D5C3A]/25 dark:focus:ring-[#F59E0B]/30 px-3.5 text-xs font-medium transition-colors max-w-[150px] truncate cursor-pointer"
                >
                  <option value="all">All Subjects ({circularMarks.length})</option>
                  {circularMarks.map((m) => (
                    <option key={m.subject_id} value={m.subject_id}>
                      {m.subject_name}
                    </option>
                  ))}
                </select>
              )}

              {/* Unsaved Badge */}
              {hasUnsavedChanges && (
                <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-900 dark:text-amber-200 border-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="tabular-nums">
                    {editedCount > 0 ? `${editedCount} unsaved` : 'Unsaved edits'}
                  </span>
                </span>
              )}

              {/* Primary Save Button */}
              <button
                type="submit"
                data-testid="save-marks-submit"
                disabled={isSaving || isPending || !selectedEnrollment || isExamSetLocked}
                className="h-9 px-4 btn-jiddah-cta text-xs font-semibold rounded-full inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition active:scale-[0.97] cursor-pointer shadow-xs"
              >
                {isSaving || isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : success ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span className="tabular-nums">
                  {isSaving || isPending
                    ? 'Saving...'
                    : editedCount > 0
                    ? `Save ${editedCount} Changes`
                    : 'Save Marks'}
                </span>
              </button>

              {/* More Actions Circle */}
              <MoreActionsMenu
                items={[
                  ...terms.map((t) => ({
                    label: `Switch Term: ${t.label} (${t.academic_year})${t.id === selectedTermId ? ' ✓' : ''}`,
                    icon: Calendar,
                    onClick: () => {
                      onSelectTerm(t.id)
                      toast.info(`Switched to ${t.label} (${t.academic_year})`)
                    },
                  })),
                  {
                    label: 'Import CSV',
                    icon: Upload,
                    onClick: () => {
                      window.location.href = '/admin/upload'
                    },
                  },
                  {
                    label: 'Export Marksheet',
                    icon: FileSpreadsheet,
                    onClick: handleExportMarksheet,
                  },
                  {
                    label: 'Clear Unsaved',
                    icon: RotateCcw,
                    onClick: () => {
                      setRawInputs({})
                      setFieldErrors({})
                      setHasUnsavedChanges(false)
                      toast.info('Cleared unsaved changes')
                    },
                  },
                  {
                    label: isExamSetLocked ? 'Unlock Exam Set' : 'Lock Exam Set',
                    icon: isExamSetLocked ? Unlock : Lock,
                    onClick: () => {
                      setIsExamSetLocked((prev) => {
                        const next = !prev
                        toast.success(next ? 'Exam set locked from edits' : 'Exam set unlocked')
                        return next
                      })
                    },
                  },
                ]}
                align="end"
              />
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2.5 p-3 text-rose-800 dark:text-rose-200 bg-rose-500/10 rounded-2xl border border-rose-500/25 text-xs font-bold"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!error && isUnassigned && enrollments.length === 0 ? (
          <UnassignedTeacherState
            moduleName="Marks Entry"
            department={allowedDepartment}
            roleLabel={roleLabel}
          />
        ) : !error && (
          !selectedEnrollmentId ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 bg-[var(--bg-card)]">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                <GraduationCap className="w-6 h-6" />
              </div>
              <p className="text-[var(--text-primary)] font-bold text-sm">No Student Selected</p>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mt-1">
                Choose a student cohort from the top bar to record assessment marks.
              </p>
            </div>
          ) : isFetching || isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 bg-[var(--bg-card)]">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2.5" />
              <p className="text-[var(--text-primary)] text-xs font-bold">Loading student assessment sheet...</p>
            </div>
          ) : selectedEnrollment ? (
            <div className="space-y-2.5 w-full min-w-0">
              {/* Step 2: Active Student Context Strip (Single Compact Line) */}
              <div className="bg-[var(--bg-card)] border border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 rounded-2xl px-3.5 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-2xs min-h-[44px]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-amber-500/20 text-emerald-800 dark:text-emerald-200 font-extrabold text-xs sm:text-sm border-0 shrink-0">
                    {selectedEnrollment?.name?.charAt(0).toUpperCase() || 'S'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <h2 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                      {selectedEnrollment?.name || 'Selected Student'}
                    </h2>
                    <span className="bg-[#F0F4F9] dark:bg-[#1E1F20] text-[#444746] dark:text-[#C4C7C5] border-0 rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-mono">
                      {selectedEnrollment?.admission_number || 'ADM'}
                    </span>
                    <span className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-0 rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold">
                      {selectedEnrollment?.circular_class || ''}
                    </span>
                    {liveSummary.totalSubjects > 0 && (
                      <>
                        <span className="bg-[#F0F4F9] dark:bg-[#1E1F20] text-[#444746] dark:text-[#C4C7C5] border-0 rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-medium tabular-nums">
                          {liveSummary.columnLabel}: {liveSummary.scoredCount}/{liveSummary.totalSubjects} scored &bull; Avg {liveSummary.avg}%
                        </span>
                        <span className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-0 rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold tabular-nums">
                          {goalGradientProgress.percent}% complete
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {selectedEnrollment.theology_class_arabic && (
                  <div className="text-right shrink-0 ml-auto flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]" dir="rtl">
                      {selectedEnrollment.arabic_name || selectedEnrollment.name}
                    </span>
                    <span
                      className="inline-block text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border-0"
                      dir="rtl"
                    >
                      {selectedEnrollment.theology_class_arabic}
                    </span>
                  </div>
                )}
              </div>

              {/* Step 3: Balanced Assessment Tables */}
              <div
                className={
                  activeView === 'both' &&
                  theologyMarks.length > 0 &&
                  examType !== 'bot' &&
                  selectedEnrollment?.theology_status !== 'not_applicable'
                    ? 'grid grid-cols-1 xl:grid-cols-2 gap-2.5 items-start w-full min-w-0'
                    : 'space-y-2.5 w-full min-w-0'
                }
              >
                {/* Secular Marks Card */}
                {(activeView === 'both' || activeView === 'secular') && (
                  <div className="card-jiddah rounded-2xl shadow-2xs border border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 overflow-hidden w-full min-w-0">
                    <div className="px-3.5 py-2 bg-[var(--bg-sunken)] border-b border-[#0D5C3A]/[0.06] dark:border-[#F59E0B]/[0.07] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                          Secular Marks
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Arrow keys / Enter for next row
                      </span>
                    </div>

                    <div
                      data-testid="marks-scroll-grid"
                      className="w-full max-w-full overflow-x-auto overscroll-x-contain"
                    >
                      <table
                        className={`w-full border-collapse text-left tabular-nums ${
                          examType === 'all' ? 'min-w-[440px]' : 'min-w-[340px]'
                        }`}
                      >
                        <thead>
                          <tr className="bg-[var(--bg-sunken)] border-b border-[#0D5C3A]/[0.06] dark:border-[#F59E0B]/[0.07] text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider h-9">
                            <th
                              data-testid="frozen-first-column-header"
                              className="sticky left-0 z-20 bg-[var(--bg-sunken)] px-3 sm:px-4 py-2 border-r border-[#0D5C3A]/[0.06] dark:border-[#F59E0B]/[0.07] min-w-[160px] max-w-[240px]"
                            >
                              Subject
                            </th>
                            <th className="hidden sm:table-cell px-2 py-2 text-center w-12">Core</th>
                            {['bot', 'all'].includes(examType) && (
                              <th className="px-2 py-2 text-center w-24">BOT (100)</th>
                            )}
                            {['mot', 'all'].includes(examType) && (
                              <th className="px-2 py-2 text-center w-24">MOT (100)</th>
                            )}
                            {['eot', 'all'].includes(examType) && (
                              <th className="px-2 py-2 text-center w-24">EOT (100)</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0D5C3A]/[0.06] dark:divide-[#F59E0B]/[0.07] text-xs">
                          {sortedCircularMarks.map((mark, idx) => (
                            <SecularMarkTableRow
                              key={mark.subject_id}
                              mark={mark}
                              idx={idx}
                              examType={examType}
                              renderScoreCell={renderScoreCell}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Theology Marks Card */}
                {(activeView === 'both' || activeView === 'theology') &&
                  theologyMarks.length > 0 &&
                  examType !== 'bot' &&
                  selectedEnrollment?.theology_status !== 'not_applicable' && (
                    <div className="card-jiddah rounded-2xl shadow-2xs border border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 overflow-hidden w-full min-w-0">
                      <div className="px-3.5 py-2 bg-[var(--bg-sunken)] border-b border-[#0D5C3A]/[0.06] dark:border-[#F59E0B]/[0.07] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                            Theology Marks (المواد الشرعية)
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">
                          MOT / EOT
                        </span>
                      </div>

                      <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
                        <table
                          className={`w-full border-collapse text-left tabular-nums ${
                            examType === 'all' ? 'min-w-[380px]' : 'min-w-[280px]'
                          }`}
                        >
                          <thead>
                            <tr className="bg-[var(--bg-sunken)] border-b border-[#0D5C3A]/[0.06] dark:border-[#F59E0B]/[0.07] text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider h-9">
                              <th className="sticky left-0 z-20 bg-[var(--bg-sunken)] px-3 sm:px-4 py-2 border-r border-[#0D5C3A]/[0.06] dark:border-[#F59E0B]/[0.07] min-w-[160px] max-w-[240px]">
                                Subject (المادة)
                              </th>
                              {['mot', 'all'].includes(examType) && (
                                <th className="px-2 py-2 text-center w-24">MOT (100)</th>
                              )}
                              {['eot', 'all'].includes(examType) && (
                                <th className="px-2 py-2 text-center w-24">EOT (100)</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#0D5C3A]/[0.06] dark:divide-[#F59E0B]/[0.07] text-xs">
                            {theologyMarks.map((mark, idx) => (
                              <TheologyMarkTableRow
                                key={mark.subject_id}
                                mark={mark}
                                idx={idx}
                                examType={examType}
                                renderScoreCell={renderScoreCell}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ) : null
        )}

        {/* Compact Floating Mobile Save Bar (Only when hasUnsavedChanges === true on mobile) */}
        {selectedEnrollment && hasUnsavedChanges && (
          <div className="md:hidden fixed bottom-16 left-3 right-3 z-40 flex items-center justify-between p-2 rounded-full bg-[#111916]/95 dark:bg-[#1E1F20]/95 backdrop-blur-md shadow-xl border border-amber-500/30 text-white">
            <div className="flex items-center gap-2 pl-3 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="text-xs font-semibold truncate">
                {editedCount > 0 ? `${editedCount} unsaved scores` : 'Unsaved edits'}
              </span>
            </div>
            <button
              type="submit"
              disabled={isSaving || isPending}
              className="h-8 px-4 btn-jiddah-cta text-xs font-semibold rounded-full inline-flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              {isSaving || isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save</span>
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

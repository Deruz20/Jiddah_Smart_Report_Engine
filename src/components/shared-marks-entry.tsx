// @ts-nocheck
'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
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
} from 'lucide-react'
import { EnrollmentData, CircularMarkRow, TheologyMarkRow, TermData } from '@/types/models'
import { UnassignedTeacherState } from './UnassignedTeacherState'

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
  const [activeView, setActiveView] = useState<'secular' | 'theology' | 'both'>(allowedDepartment)
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all')
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('')
  const [searchDropdownOpen, setSearchDropdownOpen] = useState<boolean>(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({})
  const searchBoxRef = useRef<HTMLDivElement>(null)

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

  const selectedEnrollment = useMemo(
    () => enrollments.find((e) => e.id === selectedEnrollmentId) || null,
    [enrollments, selectedEnrollmentId]
  )

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

  const validateAndApplyScore = (
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
  }

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
            className={`score-input w-[68px] sm:w-[74px] h-9 sm:h-10 px-2 text-center text-sm font-mono font-bold tabular-nums rounded-lg border transition-all outline-none focus:ring-2 ${
              fieldError
                ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 focus:ring-rose-500/25'
                : isHigh
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 focus:border-emerald-600 focus:ring-emerald-500/25'
                : isLow
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200 focus:border-amber-600 focus:ring-amber-500/25'
                : 'border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-primary)] focus:bg-[var(--bg-card)] focus:border-emerald-600 focus:ring-emerald-500/25'
            }`}
          />
          {badge && (
            <span
              className={`inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded text-[10px] sm:text-[11px] font-extrabold border ${badge.bg} ${badge.text} ${badge.border}`}
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
    <div className="w-full max-w-full min-w-0 space-y-4 pb-8">
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

      <form onSubmit={handleFormSubmit} className="space-y-4 w-full min-w-0">
        {/* Step 1: Integrated Filter & Assessment Command Bar */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 w-full min-w-0">
          {/* Top Row: Academic Context & Student Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end w-full min-w-0">
            {/* Term Selector */}
            <div className="lg:col-span-3 min-w-0">
              <label
                htmlFor="marks-term-select"
                className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5"
              >
                Academic Term
              </label>
              <select
                id="marks-term-select"
                aria-label="Term"
                value={selectedTermId}
                onChange={(e) => onSelectTerm(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 text-xs font-semibold border border-[var(--border)] bg-[var(--bg-sunken)] hover:bg-[var(--bg-hover)] rounded-xl text-[var(--text-primary)] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 truncate"
              >
                <option value="">Select term...</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {`${term.label} (${term.academic_year})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Filter */}
            <div className="lg:col-span-2 min-w-0">
              <label
                htmlFor="marks-class-select"
                className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5"
              >
                Class Cohort
              </label>
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
                className="w-full min-h-[42px] px-3 py-2 text-xs font-semibold border border-[var(--border)] bg-[var(--bg-sunken)] hover:bg-[var(--bg-hover)] rounded-xl text-[var(--text-primary)] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 truncate"
              >
                <option value="all">All Classes ({enrollments.length})</option>
                {classOptions.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Searchable Student Combobox */}
            <div ref={searchBoxRef} className="sm:col-span-2 lg:col-span-4 relative min-w-0">
              <label
                htmlFor="marks-student-search"
                className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5"
              >
                Student Quick Search ({filteredEnrollments.length})
              </label>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 pointer-events-none" />
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
                  placeholder="Type to filter by name, class, adm no..."
                  className="w-full min-h-[42px] pl-9 pr-8 py-2 text-xs font-medium border border-[var(--border)] bg-[var(--bg-sunken)] focus:bg-[var(--bg-card)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
                {studentSearchQuery && (
                  <button
                    type="button"
                    aria-label="Clear student search"
                    onClick={() => {
                      setStudentSearchQuery('')
                      setSearchDropdownOpen(false)
                    }}
                    className="absolute right-2.5 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {searchDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl z-40 divide-y divide-[var(--border)]">
                  {filteredEnrollments.length === 0 ? (
                    <div className="px-3.5 py-3 text-xs text-[var(--text-muted)] text-center">
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
                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                            isSel
                              ? 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 font-bold'
                              : 'hover:bg-[var(--bg-hover)] text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate font-semibold">{s.name}</div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate">
                              {s.admission_number || 'ADM'} &bull; {s.circular_class}
                            </div>
                          </div>
                          <span className="shrink-0 px-2 py-0.5 rounded-md bg-[var(--bg-sunken)] border border-[var(--border)] text-[var(--text-secondary)] text-[10px] font-bold">
                            {s.circular_class}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* Active Student Select + Stepper Controls */}
            <div className="sm:col-span-2 lg:col-span-3 min-w-0">
              <label
                htmlFor="marks-student-select"
                className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5"
              >
                Active Student
              </label>
              <div className="flex items-center gap-1.5 min-w-0">
                <select
                  id="marks-student-select"
                  aria-label="Student"
                  value={selectedEnrollmentId}
                  onChange={(e) => {
                    onSelectEnrollment(e.target.value)
                    setSuccess(false)
                  }}
                  className="flex-1 min-w-0 min-h-[42px] px-3 py-2 text-xs font-semibold border border-[var(--border)] bg-[var(--bg-sunken)] hover:bg-[var(--bg-hover)] rounded-xl text-[var(--text-primary)] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 truncate"
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
                  className="min-h-[42px] min-w-[38px] flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer shrink-0 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepStudent(1)}
                  disabled={filteredEnrollments.length <= 1}
                  title="Next student"
                  aria-label="Next student"
                  className="min-h-[42px] min-w-[38px] flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer shrink-0 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Exam & View Controls + Save Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
            <div className="flex flex-wrap items-center gap-2">
              {/* Exam Column Pills */}
              <div
                className="flex items-center gap-1 p-1 bg-[var(--bg-sunken)] border border-[var(--border)] rounded-xl"
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
                    className={`h-8 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      examType === type
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Department View Switcher */}
              {allowedDepartment === 'both' && (
                <div
                  className="flex items-center gap-1 p-1 bg-[var(--bg-sunken)] border border-[var(--border)] rounded-xl"
                  aria-label="Department View"
                >
                  {(['both', 'secular', 'theology'] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setActiveView(view)}
                      className={`h-8 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        activeView === view
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              )}

              {/* Subject Filter (Compact Pill) */}
              {circularMarks.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider hidden sm:inline">
                    Subject:
                  </span>
                  <select
                    id="marks-subject-select"
                    aria-label="Subject Filter"
                    value={selectedSubjectFilter}
                    onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                    className="h-8 px-2 text-xs font-semibold border border-[var(--border)] bg-[var(--bg-sunken)] hover:bg-[var(--bg-hover)] rounded-lg text-[var(--text-primary)] outline-none focus:border-emerald-600 max-w-[150px] truncate"
                  >
                    <option value="all">All ({circularMarks.length})</option>
                    {circularMarks.map((m) => (
                      <option key={m.subject_id} value={m.subject_id}>
                        {m.subject_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Quick Save Action in Header */}
            <div className="flex items-center gap-2.5 ml-auto shrink-0">
              {hasUnsavedChanges && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved edits
                </span>
              )}
              <button
                type="submit"
                disabled={isSaving || isPending || !selectedEnrollment}
                className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center justify-center gap-2 disabled:opacity-40 transition cursor-pointer"
              >
                {isSaving || isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : success ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>
                  {isSaving || isPending ? 'Saving...' : 'Save Marks'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2.5 p-4 text-rose-800 dark:text-rose-200 bg-rose-500/10 rounded-2xl border border-rose-500/25 text-xs font-bold"
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
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-card)]">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                <GraduationCap className="w-6 h-6" />
              </div>
              <p className="text-[var(--text-primary)] font-bold text-base">No Student Selected</p>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mt-1">
                Choose an academic term and student cohort from the top bar to record assessment marks.
              </p>
            </div>
          ) : isFetching || isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
              <RefreshCw className="w-7 h-7 animate-spin text-emerald-600 mb-3" />
              <p className="text-[var(--text-primary)] text-sm font-bold">Loading student assessment sheet...</p>
            </div>
          ) : selectedEnrollment ? (
            <div className="space-y-4 w-full min-w-0">
              {/* Step 2: Active Student Context Banner */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold text-base border border-emerald-500/30 shrink-0">
                    {selectedEnrollment.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] truncate">
                      {selectedEnrollment.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] tabular-nums mt-1">
                      <span className="bg-[var(--bg-sunken)] px-2.5 py-0.5 rounded-md border border-[var(--border)] font-mono text-[var(--text-primary)]">
                        {selectedEnrollment.admission_number || 'ADM'}
                      </span>
                      <span className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-md border border-emerald-500/20 font-bold">
                        {selectedEnrollment.circular_class}
                      </span>
                      {liveSummary.totalSubjects > 0 && (
                        <span className="bg-blue-500/10 text-blue-800 dark:text-blue-300 px-2.5 py-0.5 rounded-md border border-blue-500/20">
                          {liveSummary.columnLabel}: {liveSummary.scoredCount}/{liveSummary.totalSubjects} scored &bull; Total {liveSummary.total} &bull; Avg {liveSummary.avg}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedEnrollment.theology_class_arabic && (
                  <div className="text-right shrink-0 ml-auto">
                    <p className="text-sm font-bold text-[var(--text-primary)]" dir="rtl">
                      {selectedEnrollment.arabic_name || selectedEnrollment.name}
                    </p>
                    <span
                      className="inline-block text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-md border border-amber-500/30 mt-1"
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
                    ? 'grid grid-cols-1 xl:grid-cols-2 gap-4 items-start w-full min-w-0'
                    : 'space-y-4 w-full min-w-0'
                }
              >
                {/* Secular Marks Card */}
                {(activeView === 'both' || activeView === 'secular') && (
                  <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xs overflow-hidden w-full min-w-0">
                    <div className="px-4 py-3 bg-[var(--bg-sunken)] border-b border-[var(--border)] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
                          examType === 'all' ? 'min-w-[480px]' : 'min-w-[360px]'
                        }`}
                      >
                        <thead>
                          <tr className="bg-[var(--bg-sunken)] border-b border-[var(--border)] text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            <th
                              data-testid="frozen-first-column-header"
                              className="sticky left-0 z-20 bg-[var(--bg-sunken)] px-4 py-2.5 border-r border-[var(--border)] min-w-[180px] max-w-[260px]"
                            >
                              Subject
                            </th>
                            <th className="hidden sm:table-cell px-2 py-2.5 text-center w-14">Core</th>
                            {['bot', 'all'].includes(examType) && (
                              <th className="px-2 py-2.5 text-center w-28">BOT (100)</th>
                            )}
                            {['mot', 'all'].includes(examType) && (
                              <th className="px-2 py-2.5 text-center w-28">MOT (100)</th>
                            )}
                            {['eot', 'all'].includes(examType) && (
                              <th className="px-2 py-2.5 text-center w-28">EOT (100)</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)] text-xs">
                          {sortedCircularMarks.map((mark, idx) => (
                            <tr key={mark.subject_id} className="hover:bg-[var(--bg-hover)] transition-colors">
                              {/* Frozen First Column */}
                              <td
                                data-testid={`frozen-cell-${idx}`}
                                className="sticky left-0 z-10 bg-[var(--bg-card)] px-4 py-2 border-r border-[var(--border)] min-w-[180px] max-w-[260px]"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-[var(--text-primary)] truncate" title={mark.subject_name}>
                                    {mark.subject_name}
                                  </span>
                                  {mark.is_core && (
                                    <span
                                      className="sm:hidden inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold border border-emerald-500/30 shrink-0"
                                      title="Core subject"
                                    >
                                      ✓
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-[var(--text-muted)] truncate leading-tight" title={selectedEnrollment.name}>
                                  {selectedEnrollment.name}
                                </div>
                              </td>
                              <td className="hidden sm:table-cell px-2 py-2 text-center">
                                {mark.is_core ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-muted)]">—</span>
                                )}
                              </td>
                              {['bot', 'all'].includes(examType) && (
                                <td className="px-2 py-2 text-center">
                                  {renderScoreCell('secular', mark.subject_id, mark.subject_name, 'bot', mark.bot_score, idx)}
                                </td>
                              )}
                              {['mot', 'all'].includes(examType) && (
                                <td className="px-2 py-2 text-center">
                                  {renderScoreCell('secular', mark.subject_id, mark.subject_name, 'mot', mark.mot_score, idx)}
                                </td>
                              )}
                              {['eot', 'all'].includes(examType) && (
                                <td className="px-2 py-2 text-center">
                                  {renderScoreCell('secular', mark.subject_id, mark.subject_name, 'eot', mark.eot_score, idx)}
                                </td>
                              )}
                            </tr>
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
                    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-xs overflow-hidden w-full min-w-0">
                      <div className="px-4 py-3 bg-[var(--bg-sunken)] border-b border-[var(--border)] flex items-center justify-between gap-2">
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
                            examType === 'all' ? 'min-w-[400px]' : 'min-w-[300px]'
                          }`}
                        >
                          <thead>
                            <tr className="bg-[var(--bg-sunken)] border-b border-[var(--border)] text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                              <th className="sticky left-0 z-20 bg-[var(--bg-sunken)] px-4 py-2.5 border-r border-[var(--border)] min-w-[180px] max-w-[260px]">
                                Subject (المادة)
                              </th>
                              {['mot', 'all'].includes(examType) && (
                                <th className="px-2 py-2.5 text-center w-28">MOT (100)</th>
                              )}
                              {['eot', 'all'].includes(examType) && (
                                <th className="px-2 py-2.5 text-center w-28">EOT (100)</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)] text-xs">
                            {theologyMarks.map((mark, idx) => (
                              <tr key={mark.subject_id} className="hover:bg-[var(--bg-hover)] transition-colors">
                                <td className="sticky left-0 z-10 bg-[var(--bg-card)] px-4 py-2 border-r border-[var(--border)] min-w-[180px] max-w-[260px]">
                                  <div className="font-bold text-[var(--text-primary)] truncate text-sm" dir="rtl">
                                    {mark.subject_name_arabic}
                                  </div>
                                  <div className="text-[10px] text-[var(--text-muted)] truncate leading-tight">
                                    {selectedEnrollment.name}
                                  </div>
                                </td>
                                {['mot', 'all'].includes(examType) && (
                                  <td className="px-2 py-2 text-center">
                                    {renderScoreCell('theology', mark.subject_id, mark.subject_name_arabic, 'mot', mark.mot_score, idx)}
                                  </td>
                                )}
                                {['eot', 'all'].includes(examType) && (
                                  <td className="px-2 py-2 text-center">
                                    {renderScoreCell('theology', mark.subject_id, mark.subject_name_arabic, 'eot', mark.eot_score, idx)}
                                  </td>
                                )}
                              </tr>
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

        {/* Integrated Form Footer Action Bar */}
        {selectedEnrollment && (
          <div
            data-testid="sticky-save-bar"
            className="pt-2 pb-2"
          >
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-3 sm:px-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    Object.keys(fieldErrors).length > 0
                      ? 'bg-rose-600'
                      : hasUnsavedChanges
                      ? 'bg-amber-500 animate-pulse'
                      : success
                      ? 'bg-emerald-600'
                      : 'bg-emerald-500'
                  }`}
                />
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {Object.keys(fieldErrors).length > 0
                    ? `${Object.keys(fieldErrors).length} field error(s) — fix highlighted scores (0–100)`
                    : hasUnsavedChanges
                    ? `Unsaved changes for ${selectedEnrollment.name}`
                    : success
                    ? 'All marks saved to database'
                    : `Ready — ${selectedEnrollment.name}`}
                </span>
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                {hasUnsavedChanges && (
                  <button
                    type="button"
                    onClick={() => {
                      setHasUnsavedChanges(false)
                      setFieldErrors({})
                      setRawInputs({})
                      toast.info('Unsaved score edits cleared')
                    }}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-sunken)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="submit"
                  data-testid="save-marks-submit"
                  disabled={isSaving || isPending}
                  className="min-h-[40px] px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center justify-center gap-2 disabled:opacity-40 transition cursor-pointer"
                >
                  {isSaving || isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : success ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>
                    {isSaving || isPending
                      ? 'Saving...'
                      : `Save ${examType === 'all' ? 'All Marks' : `${examType.toUpperCase()} Marks`}`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

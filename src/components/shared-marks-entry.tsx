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
} from 'lucide-react'
import { EnrollmentData, CircularMarkRow, TheologyMarkRow, TermData } from '@/types/models'

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
  if (n >= 85) return { grade: 'ممتاز', bg: 'bg-emerald-50', text: 'text-emerald-800 font-bold', border: 'border-emerald-300' }
  if (n >= 75) return { grade: 'جيد جدا', bg: 'bg-emerald-50/80', text: 'text-emerald-700 font-bold', border: 'border-emerald-200' }
  if (n >= 60) return { grade: 'جيد', bg: 'bg-blue-50', text: 'text-blue-700 font-bold', border: 'border-blue-200' }
  if (n >= 50) return { grade: 'مقبول', bg: 'bg-amber-50', text: 'text-amber-800 font-bold', border: 'border-amber-200' }
  return { grade: 'ضعيف', bg: 'bg-rose-50', text: 'text-rose-700 font-bold', border: 'border-rose-200' }
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
  if (n >= 90) return { grade: 'D1', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
  if (n >= 80) return { grade: 'D2', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' }
  if (n >= 70) return { grade: 'C3', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
  if (n >= 60) return { grade: 'C4', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
  if (n >= 55) return { grade: 'C5', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' }
  if (n >= 50) return { grade: 'C6', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' }
  if (n >= 45) return { grade: 'P7', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
  if (n >= 40) return { grade: 'P8', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' }
  return { grade: 'F9', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }
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
      if (e.circular_class) set.add(e.circular_class)
    })
    return Array.from(set).sort()
  }, [enrollments])

  // Filtered enrollments by class selector AND search input
  const filteredEnrollments = useMemo(() => {
    let list = enrollments
    if (selectedClassFilter !== 'all') {
      list = list.filter((e) => e.circular_class === selectedClassFilter)
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
      <div className="flex flex-col items-center justify-center min-w-[88px]">
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
            data-col={type}
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
              }
            }}
            className={`score-input w-[72px] min-h-[38px] sm:min-h-[42px] px-2 py-1 text-center text-sm font-mono font-bold tabular-nums rounded-xl border transition-all outline-none focus:ring-2 ${
              fieldError
                ? 'border-rose-500 bg-rose-50 text-rose-900 focus:ring-rose-500/20'
                : isHigh
                ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 focus:border-[#059669] focus:ring-emerald-500/20'
                : isLow
                ? 'border-amber-300 bg-amber-50/70 text-amber-900 focus:border-amber-600 focus:ring-amber-500/20'
                : 'border-stone-200 bg-[#F8FAFC] text-stone-900 focus:bg-white focus:border-[#059669] focus:ring-emerald-500/20'
            }`}
          />
          {badge && (
            <span
              className={`inline-flex items-center justify-center min-w-[28px] h-5 sm:h-6 px-1.5 rounded-md text-[10px] sm:text-[11px] font-extrabold border ${badge.bg} ${badge.text} ${badge.border}`}
              dir={curriculum === 'theology' ? 'rtl' : 'ltr'}
            >
              {badge.grade}
            </span>
          )}
        </div>
        {fieldError && (
          <span
            data-testid={`field-error-${curriculum}-${subjectId}-${type}`}
            className="text-[10px] font-bold text-rose-600 mt-1 leading-tight text-center"
          >
            {fieldError}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-full min-w-0 space-y-2.5 pb-4">
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

      <form onSubmit={handleFormSubmit} className="space-y-3.5 w-full min-w-0">
        {/* Sleek Hybrid Filter & Search Bar (Matches Live Vercel App + Mobile-First Compact Layout) */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3 w-full min-w-0">
          {/* Row 1: Term + Class Cohort + Searchable Student Filter + Subject Filter */}
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-2.5 items-end w-full min-w-0">
            {/* Term Selector */}
            <div className="col-span-1 lg:col-span-2 min-w-0">
              <label
                htmlFor="marks-term-select"
                className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1"
              >
                Term
              </label>
              <select
                id="marks-term-select"
                aria-label="Term"
                value={selectedTermId}
                onChange={(e) => onSelectTerm(e.target.value)}
                className="w-full max-w-full min-w-0 min-h-[44px] px-2.5 py-2 text-xs font-semibold border border-stone-200 bg-[#F8FAFC] hover:bg-stone-50 rounded-xl text-stone-900 outline-none focus:border-[#059669] truncate"
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
            <div className="col-span-1 lg:col-span-2 min-w-0">
              <label
                htmlFor="marks-class-select"
                className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1"
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
                className="w-full max-w-full min-w-0 min-h-[44px] px-2.5 py-2 text-xs font-semibold border border-stone-200 bg-[#F8FAFC] hover:bg-stone-50 rounded-xl text-stone-900 outline-none focus:border-[#059669] truncate"
              >
                <option value="all">All Classes ({enrollments.length})</option>
                {classOptions.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Searchable Student Filter Combobox (Live Vercel Feature!) */}
            <div ref={searchBoxRef} className="col-span-2 lg:col-span-4 relative min-w-0">
              <label
                htmlFor="marks-student-search"
                className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1"
              >
                Search Student ({filteredEnrollments.length} matching)
              </label>
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 pointer-events-none" />
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
                  className="w-full min-h-[44px] pl-8 pr-8 py-2 text-xs font-medium border border-stone-200 bg-[#F8FAFC] focus:bg-white rounded-xl text-stone-900 placeholder:text-stone-400 outline-none focus:border-[#059669] focus:ring-2 focus:ring-emerald-500/15"
                />
                {studentSearchQuery && (
                  <button
                    type="button"
                    aria-label="Clear student search"
                    onClick={() => {
                      setStudentSearchQuery('')
                      setSearchDropdownOpen(false)
                    }}
                    className="absolute right-2 p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {searchDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto bg-white border border-stone-200 rounded-xl shadow-xl z-40 divide-y divide-stone-100">
                  {filteredEnrollments.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-stone-500 text-center">
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
                          className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                            isSel ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-stone-50 text-stone-800'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="truncate">{s.name}</div>
                            <div className="text-[10px] text-stone-500 truncate">
                              {s.admission_number || 'ADM'} &bull; {s.circular_class}
                            </div>
                          </div>
                          <span className="shrink-0 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-semibold">
                            {s.circular_class}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {/* Active Student Select + Prev/Next Quick Stepper */}
            <div className="col-span-2 sm:col-span-1 lg:col-span-3 min-w-0">
              <label
                htmlFor="marks-student-select"
                className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1"
              >
                Active Student
              </label>
              <div className="flex items-center gap-1 min-w-0">
                <select
                  id="marks-student-select"
                  aria-label="Student"
                  value={selectedEnrollmentId}
                  onChange={(e) => {
                    onSelectEnrollment(e.target.value)
                    setSuccess(false)
                  }}
                  className="flex-1 max-w-full min-w-0 min-h-[44px] px-2.5 py-2 text-xs font-semibold border border-stone-200 bg-[#F8FAFC] hover:bg-stone-50 rounded-xl text-stone-900 outline-none focus:border-[#059669] truncate"
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
                  className="min-h-[44px] min-w-[38px] flex items-center justify-center rounded-xl border border-stone-200 bg-[#F8FAFC] hover:bg-stone-100 text-stone-700 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepStudent(1)}
                  disabled={filteredEnrollments.length <= 1}
                  title="Next student"
                  aria-label="Next student"
                  className="min-h-[44px] min-w-[38px] flex items-center justify-center rounded-xl border border-stone-200 bg-[#F8FAFC] hover:bg-stone-100 text-stone-700 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subject Filter */}
            <div className="col-span-2 sm:col-span-1 lg:col-span-1 min-w-0">
              <label
                htmlFor="marks-subject-select"
                className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1"
              >
                Subject
              </label>
              <select
                id="marks-subject-select"
                aria-label="Subject Filter"
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="w-full max-w-full min-w-0 min-h-[44px] px-2 py-2 text-xs font-semibold border border-stone-200 bg-[#F8FAFC] hover:bg-stone-50 rounded-xl text-stone-900 outline-none focus:border-[#059669] truncate"
              >
                <option value="all">All ({circularMarks.length})</option>
                {circularMarks.map((m) => (
                  <option key={m.subject_id} value={m.subject_id}>
                    {m.subject_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Pill Controls (BOT | MOT | EOT | ALL and BOTH | SECULAR | THEOLOGY) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-stone-100">
            <div
              className="flex items-center gap-1 p-1 bg-[#F1F5F9] border border-stone-200/80 rounded-xl max-w-full overflow-x-auto"
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
                  className={`min-h-[36px] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all cursor-pointer shrink-0 ${
                    examType === type
                      ? 'bg-[#059669] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-white/70'
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>

            {allowedDepartment === 'both' && (
              <div
                className="flex items-center gap-1 p-1 bg-[#F1F5F9] border border-stone-200/80 rounded-xl max-w-full overflow-x-auto"
                aria-label="Department View"
              >
                {(['both', 'secular', 'theology'] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setActiveView(view)}
                    className={`min-h-[36px] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all cursor-pointer shrink-0 ${
                      activeView === view
                        ? 'bg-[#0F172A] text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/70'
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            )}

            {/* Docked Top Save Action */}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              {hasUnsavedChanges && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved edits
                </span>
              )}
              <button
                type="submit"
                disabled={isSaving || isPending || !selectedEnrollment}
                className="min-h-[38px] px-4 py-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center justify-center gap-2 disabled:opacity-50 transition cursor-pointer"
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
            className="flex items-center gap-2.5 p-3.5 text-rose-800 bg-rose-50 rounded-xl border border-rose-200 text-xs font-semibold"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!error && (
          !selectedEnrollmentId ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-stone-200 border-dashed bg-white">
              <p className="text-stone-800 font-bold text-sm">No Student Selected</p>
              <p className="text-xs text-stone-500 max-w-xs mt-1">
                Choose an academic term and student above to enter assessment marks.
              </p>
            </div>
          ) : isFetching || isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-stone-200 bg-white">
              <RefreshCw className="w-6 h-6 animate-spin text-[#059669] mb-2" />
              <p className="text-stone-700 text-xs font-semibold">Loading student assessment sheet...</p>
            </div>
          ) : selectedEnrollment ? (
            <div className="space-y-4 w-full min-w-0">
              {/* Active Student Context Banner with Live Intelligence Badges */}
              <div className="bg-white border border-stone-200/90 rounded-2xl p-3.5 sm:px-5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-[#059669] font-extrabold text-sm border border-emerald-200 shrink-0">
                    {selectedEnrollment.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-stone-900 truncate">
                      {selectedEnrollment.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-stone-600 tabular-nums mt-0.5">
                      <span className="bg-[#F8FAFC] px-2 py-0.5 rounded-md border border-stone-200 font-mono">
                        {selectedEnrollment.admission_number || 'ADM'}
                      </span>
                      <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200">
                        {selectedEnrollment.circular_class}
                      </span>
                      {liveSummary.totalSubjects > 0 && (
                        <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-md border border-blue-200">
                          {liveSummary.columnLabel}: {liveSummary.scoredCount}/{liveSummary.totalSubjects} &bull; Total {liveSummary.total} &bull; Avg {liveSummary.avg}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedEnrollment.theology_class_arabic && (
                  <div className="text-right shrink-0 ml-auto">
                    <p className="text-xs font-bold text-stone-800" dir="rtl">
                      {selectedEnrollment.arabic_name || selectedEnrollment.name}
                    </p>
                    <span
                      className="inline-block text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 mt-0.5"
                      dir="rtl"
                    >
                      {selectedEnrollment.theology_class_arabic}
                    </span>
                  </div>
                )}
              </div>

              {/* Side-by-side on desktop when BOTH is selected, or stacked on mobile */}
              <div
                className={
                  activeView === 'both' &&
                  theologyMarks.length > 0 &&
                  examType !== 'bot' &&
                  selectedEnrollment?.theology_status !== 'not_applicable'
                    ? 'grid grid-cols-1 lg:grid-cols-2 gap-4 items-start w-full min-w-0'
                    : 'space-y-4 w-full min-w-0'
                }
              >
                {/* Horizontally Scrollable Secular Marks Grid with Frozen First Column */}
                {(activeView === 'both' || activeView === 'secular') && (
                  <div className="bg-white border border-stone-200/90 rounded-2xl shadow-xs overflow-hidden w-full min-w-0">
                    <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-stone-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#059669]" />
                        <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                          Secular Marks
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Press Enter for next row
                      </span>
                    </div>

                    <div
                      data-testid="marks-scroll-grid"
                      className="w-full max-w-full overflow-x-auto overscroll-x-contain"
                    >
                      <table
                        className={`w-full border-collapse text-left tabular-nums ${
                          examType === 'all' ? 'min-w-[420px]' : ''
                        }`}
                      >
                        <thead>
                          <tr className="bg-stone-50/80 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                            <th
                              data-testid="frozen-first-column-header"
                              className="sticky left-0 z-20 bg-stone-50 px-3 py-2 border-r border-stone-200"
                            >
                              Subject
                            </th>
                            <th className="hidden sm:table-cell px-2 py-2 text-center w-14">Core</th>
                            {['bot', 'all'].includes(examType) && (
                              <th className="px-2 py-2 text-center w-28">BOT (100)</th>
                            )}
                            {['mot', 'all'].includes(examType) && (
                              <th className="px-2 py-2 text-center w-28">MOT (100)</th>
                            )}
                            {['eot', 'all'].includes(examType) && (
                              <th className="px-2 py-2 text-center w-28">EOT (100)</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-xs">
                          {sortedCircularMarks.map((mark, idx) => (
                            <tr key={mark.subject_id} className="hover:bg-stone-50/70 transition-colors">
                              {/* Frozen First Column */}
                              <td
                                data-testid={`frozen-cell-${idx}`}
                                className="sticky left-0 z-10 bg-white px-3 py-1.5 border-r border-stone-200"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-stone-900 truncate" title={mark.subject_name}>
                                    {mark.subject_name}
                                  </span>
                                  {mark.is_core && (
                                    <span
                                      className="sm:hidden inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-50 text-[#059669] text-[9px] font-bold border border-emerald-200 shrink-0"
                                      title="Core subject"
                                    >
                                      ✓
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-stone-400 truncate leading-tight" title={selectedEnrollment.name}>
                                  {selectedEnrollment.name}
                                </div>
                              </td>
                              <td className="hidden sm:table-cell px-2 py-1.5 text-center">
                                {mark.is_core ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-[#059669] text-[10px] font-bold border border-emerald-200">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="text-stone-300">—</span>
                                )}
                              </td>
                              {['bot', 'all'].includes(examType) && (
                                <td className="px-2 py-1.5 text-center">
                                  {renderScoreCell('secular', mark.subject_id, mark.subject_name, 'bot', mark.bot_score, idx)}
                                </td>
                              )}
                              {['mot', 'all'].includes(examType) && (
                                <td className="px-2 py-1.5 text-center">
                                  {renderScoreCell('secular', mark.subject_id, mark.subject_name, 'mot', mark.mot_score, idx)}
                                </td>
                              )}
                              {['eot', 'all'].includes(examType) && (
                                <td className="px-2 py-1.5 text-center">
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

                {/* Horizontally Scrollable Theology Marks Grid with Frozen First Column */}
                {(activeView === 'both' || activeView === 'theology') &&
                  theologyMarks.length > 0 &&
                  examType !== 'bot' &&
                  selectedEnrollment?.theology_status !== 'not_applicable' && (
                    <div className="bg-white border border-stone-200/90 rounded-2xl shadow-xs overflow-hidden w-full min-w-0">
                      <div className="px-4 py-2 bg-[#F8FAFC] border-b border-stone-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-600" />
                          <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                            Theology Marks (المواد الشرعية)
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-500 font-medium">
                          MOT / EOT
                        </span>
                      </div>

                      <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
                        <table
                          className={`w-full border-collapse text-left tabular-nums ${
                            examType === 'all' ? 'min-w-[340px]' : ''
                          }`}
                        >
                          <thead>
                            <tr className="bg-stone-50/80 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                              <th className="sticky left-0 z-20 bg-stone-50 px-3 py-2 border-r border-stone-200">
                                Subject (المادة)
                              </th>
                              {['mot', 'all'].includes(examType) && (
                                <th className="px-2 py-2 text-center w-28">MOT (100)</th>
                              )}
                              {['eot', 'all'].includes(examType) && (
                                <th className="px-2 py-2 text-center w-28">EOT (100)</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-xs">
                            {theologyMarks.map((mark, idx) => (
                              <tr key={mark.subject_id} className="hover:bg-stone-50/70 transition-colors">
                                <td className="sticky left-0 z-10 bg-white px-3 py-1.5 border-r border-stone-200">
                                  <div className="font-bold text-stone-900 truncate" dir="rtl">
                                    {mark.subject_name_arabic}
                                  </div>
                                  <div className="text-[10px] text-stone-400 truncate leading-tight">
                                    {selectedEnrollment.name}
                                  </div>
                                </td>
                                {['mot', 'all'].includes(examType) && (
                                  <td className="px-2 py-1.5 text-center">
                                    {renderScoreCell('theology', mark.subject_id, mark.subject_name_arabic, 'mot', mark.mot_score, idx)}
                                  </td>
                                )}
                                {['eot', 'all'].includes(examType) && (
                                  <td className="px-2 py-1.5 text-center">
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
            className="pt-3 pb-2"
          >
            <div className="bg-white border border-stone-200/90 rounded-2xl p-2.5 sm:px-4 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
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
                <span className="text-xs font-bold text-stone-800 truncate">
                  {Object.keys(fieldErrors).length > 0
                    ? `${Object.keys(fieldErrors).length} field error(s) — fix highlighted scores (0–100)`
                    : hasUnsavedChanges
                    ? `Unsaved changes for ${selectedEnrollment.name}`
                    : success
                    ? 'All marks saved to database'
                    : `Ready — ${selectedEnrollment.name}`}
                </span>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {hasUnsavedChanges && (
                  <button
                    type="button"
                    onClick={() => {
                      setHasUnsavedChanges(false)
                      setFieldErrors({})
                      setRawInputs({})
                      toast.info('Unsaved score edits cleared')
                    }}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="submit"
                  data-testid="save-marks-submit"
                  disabled={isSaving || isPending}
                  className="min-h-[44px] px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 transition cursor-pointer"
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

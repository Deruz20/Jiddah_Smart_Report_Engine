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
import { isNurseryClass, computeNurseryBadge, getNurseryGrade, getGradeDisplay, getSubjectGradeNumber } from '@/lib/grading'

function toArabicNumerals(val: number | string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return String(val).replace(/[0-9]/g, (d) => arabicDigits[Number(d)] ?? d)
}

const SecularMarkTableRow = React.memo(function SecularMarkTableRow({
  mark,
  idx,
  examType,
  isNursery,
  renderScoreCell,
}: {
  mark: CircularMarkRow
  idx: number
  examType: ExamType
  isNursery: boolean
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
    <tr className="hover:bg-[var(--bg-hover)] transition-colors h-[34px]">
      <td
        data-testid={`frozen-cell-${idx}`}
        className="sticky left-0 z-10 bg-[var(--bg-card)] px-3 py-1 border-r border-[#0D5C3A]/[0.06] dark:border-[#F59E0B]/[0.07] min-w-[150px] max-w-[220px]"
      >
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-xs text-[var(--text-primary)] truncate" title={mark.subject_name}>
            {mark.subject_name}
          </span>
          {!isNursery && mark.is_core && (
            <span
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[8px] font-bold shrink-0"
              title="Core subject"
            >
              ✓
            </span>
          )}
        </div>
      </td>
      {!isNursery && (
        <td className="hidden sm:table-cell px-1.5 py-1 text-center w-10">
          {mark.is_core ? (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold">
              ✓
            </span>
          ) : (
            <span className="text-[var(--text-muted)] text-[11px]">--</span>
          )}
        </td>
      )}
      {['bot', 'all'].includes(examType) && (
        <td className="px-1 py-1 text-center">
          {renderScoreCell('secular', mark.subject_id, mark.subject_name, 'bot', mark.bot_score, idx)}
        </td>
      )}
      {['mot', 'all'].includes(examType) && (
        <td className="px-1 py-1 text-center">
          {renderScoreCell('secular', mark.subject_id, mark.subject_name, 'mot', mark.mot_score, idx)}
        </td>
      )}
      {['eot', 'all'].includes(examType) && (
        <td className="px-1 py-1 text-center">
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
    <tr className="hover:bg-[var(--bg-hover)] transition-colors h-[34px]">
      <td className="sticky left-0 z-10 bg-[var(--bg-card)] px-3 py-1 border-r border-[#0D5C3A]/[0.06] dark:border-[#F59E0B]/[0.07] min-w-[150px] max-w-[220px]">
        <div className="font-semibold text-[var(--text-primary)] truncate text-xs" dir="rtl">
          {mark.subject_name_arabic}
        </div>
      </td>
      {['mot', 'all'].includes(examType) && (
        <td className="px-1 py-1 text-center">
          {renderScoreCell('theology', mark.subject_id, mark.subject_name_arabic, 'mot', mark.mot_score, idx)}
        </td>
      )}
      {['eot', 'all'].includes(examType) && (
        <td className="px-1 py-1 text-center">
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

function computeGradeBadge(
  score: number | null | undefined,
  isNursery = false
): {
  grade: string
  bg: string
  text: string
  border?: string
} | null {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return null
  const n = Number(score)
  if (n < 0 || n > 100) return null

  if (isNursery) {
    const badge = computeNurseryBadge(n)
    if (!badge) return null
    return {
      grade: badge.grade,
      bg: badge.bg,
      text: badge.text,
    }
  }

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
  const [mobileSearchExpanded, setMobileSearchExpanded] = useState<boolean>(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({})
  const [isExamSetLocked, setIsExamSetLocked] = useState<boolean>(false)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const mobileSearchBoxRef = useRef<HTMLDivElement>(null)

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
      const target = e.target as Node
      const inDesktop = searchBoxRef.current && searchBoxRef.current.contains(target)
      const inMobile = mobileSearchBoxRef.current && mobileSearchBoxRef.current.contains(target)
      if (!inDesktop && !inMobile) {
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

  const isCurrentNursery = useMemo(() => {
    return (
      isNurseryClass(selectedEnrollment?.circular_class) ||
      isNurseryClass(selectedEnrollment?.theology_class_level) ||
      (selectedClassFilter !== 'all' && isNurseryClass(selectedClassFilter))
    )
  }, [selectedEnrollment?.circular_class, selectedEnrollment?.theology_class_level, selectedClassFilter])

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
    const sorted = [...circularMarks].sort((a, b) => {
      const nameA = a.subject_name || ''
      const nameB = b.subject_name || ''
      if (isCurrentNursery || /^LA\d+/i.test(nameA) || /^LA\d+/i.test(nameB)) {
        return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' })
      }
      const orderA = getSubjectOrder(nameA)
      const orderB = getSubjectOrder(nameB)
      if (orderA !== orderB) return orderA - orderB
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' })
    })
    if (selectedSubjectFilter === 'all') return sorted
    return sorted.filter((m) => m.subject_id === selectedSubjectFilter || m.subject_name === selectedSubjectFilter)
  }, [circularMarks, selectedSubjectFilter, isCurrentNursery])

  const activeTerm = useMemo(() => {
    return terms.find((t) => t.id === selectedTermId) || terms[0] || null
  }, [terms, selectedTermId])

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

  const studentGradeBadge = useMemo(() => {
    if (liveSummary.scoredCount === 0) return null
    if (isCurrentNursery) {
      return getNurseryGrade(liveSummary.avg).grade
    }
    return getGradeDisplay(getSubjectGradeNumber(Math.round(liveSummary.avg)))
  }, [liveSummary.scoredCount, liveSummary.avg, isCurrentNursery])

  const secularStats = useMemo(() => {
    const scoreKey = examType === 'bot' ? 'bot_score' : examType === 'mot' ? 'mot_score' : 'eot_score'
    const validScores = sortedCircularMarks
      .map((m) => m[scoreKey])
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
    const total = validScores.reduce((acc, v) => acc + v, 0)
    const maxTotal = sortedCircularMarks.length * 100
    const mean = validScores.length > 0 ? Math.round((total / validScores.length) * 10) / 10 : 0
    const grade = validScores.length > 0
      ? isCurrentNursery
        ? getNurseryGrade(mean).grade
        : getGradeDisplay(getSubjectGradeNumber(Math.round(mean)))
      : '—'
    return {
      total,
      maxTotal,
      mean,
      grade,
      scoredCount: validScores.length,
      totalCount: sortedCircularMarks.length,
    }
  }, [sortedCircularMarks, examType, isCurrentNursery])

  const theologyStats = useMemo(() => {
    const scoreKey = examType === 'mot' ? 'mot_score' : 'eot_score'
    const validScores = theologyMarks
      .map((m) => m[scoreKey])
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
    const total = validScores.reduce((acc, v) => acc + v, 0)
    const maxTotal = theologyMarks.length * 100
    const mean = validScores.length > 0 ? Math.round((total / validScores.length) * 10) / 10 : 0
    const badge = validScores.length > 0 ? computeTheologyBadge(mean) : null
    return {
      total,
      maxTotal,
      mean,
      remark: badge?.grade || '—',
      scoredCount: validScores.length,
      totalCount: theologyMarks.length,
    }
  }, [theologyMarks, examType])

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!isSaving && !isPending && selectedEnrollment && !isExamSetLocked) {
          const form = document.getElementById('shared-marks-form') as HTMLFormElement
          if (form) {
            form.requestSubmit()
          }
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isSaving, isPending, selectedEnrollment, isExamSetLocked])

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
      ? (curriculum === 'theology'
          ? computeTheologyBadge(numVal)
          : computeGradeBadge(numVal, isCurrentNursery))
      : null

    return (
      <div className="flex flex-col items-center justify-center min-w-[84px]">
        <div className="inline-flex items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
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
                ? 'border-[#D97706] ring-2 ring-[#D97706]/40 dark:ring-[#F59E0B]/50 bg-amber-500/10 text-[var(--text-primary)] font-bold'
                : isHigh
                ? 'bg-[#0D5C3A]/[0.06] dark:bg-[#10B981]/[0.12] border-[#0D5C3A]/30 dark:border-[#34D399]/40 text-[#093D26] dark:text-[#ECFDF5] font-bold focus:ring-[#EA580C]/35 focus:border-[#EA580C]'
                : hasScore
                ? 'bg-[#0D5C3A]/[0.04] dark:bg-[#10B981]/[0.08] border-[#0D5C3A]/25 dark:border-[#10B981]/30 text-[#093D26] dark:text-[#ECFDF5] font-bold focus:ring-[#EA580C]/35 focus:border-[#EA580C]'
                : 'bg-[#F8FAFC] dark:bg-[#131314] border-dashed border-[#CBD5E1] dark:border-[#334155] text-[var(--text-primary)] focus:bg-white dark:focus:bg-[#1E1F20] focus:ring-[#EA580C]/35 focus:border-[#EA580C]'
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

  const moreActionsItems = useMemo(
    () => [
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
    ],
    [terms, selectedTermId, isExamSetLocked, onSelectTerm, handleExportMarksheet]
  )

  return (
    <div className="w-full max-w-full min-w-0 space-y-2 pb-2 md:pb-1">
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

      <form id="shared-marks-form" onSubmit={handleFormSubmit} className="space-y-2 w-full min-w-0">
        {/* =========================================================================
            ZONE 1 (Desktop >= md): Single-Line Top Control Bar
            Non-sticky, sits in normal document flow so it never overlaps Zone 2
            ========================================================================= */}
        <div className="hidden md:block bg-white/95 dark:bg-[#1E1F20]/95 backdrop-blur-sm border border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-2xs w-full min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-1.5 lg:gap-2 w-full flex-nowrap">
            {/* Left Group */}
            <div className="flex items-center gap-1.5 lg:gap-2 shrink min-w-0">
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
                className="h-8 rounded-full bg-[#F0F4F9] dark:bg-[#131314] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] text-[#1F1F1F] dark:text-[#E3E3E3] border-0 ring-0 focus:ring-2 focus:ring-[#0D5C3A]/25 dark:focus:ring-[#F59E0B]/30 px-2.5 sm:px-3 text-xs font-semibold transition-colors max-w-[135px] truncate cursor-pointer shrink-0"
              >
                <option value="all">All Classes ({enrollments.length})</option>
                {classOptions.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>

              {/* Quick Search Pill */}
              <div ref={searchBoxRef} className="relative flex-1 min-w-[110px] max-w-[200px] shrink">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 absolute left-2.5 pointer-events-none" />
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
                    placeholder="Quick search..."
                    className="w-full h-8 pl-7.5 pr-6 text-xs font-medium rounded-full bg-[#F0F4F9] dark:bg-[#131314] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] text-[#1F1F1F] dark:text-[#E3E3E3] placeholder:text-stone-400 dark:placeholder:text-stone-500 border-0 ring-0 focus:ring-2 focus:ring-[#0D5C3A]/25 dark:focus:ring-[#F59E0B]/30 outline-none transition-colors"
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
                  <div className="absolute left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto bg-white dark:bg-[#1E1F20] border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 rounded-2xl shadow-xl z-50 divide-y divide-[#0D5C3A]/[0.06] dark:divide-[#F59E0B]/[0.07]">
                    {filteredEnrollments.length === 0 ? (
                      <div className="px-3 py-2.5 text-xs text-stone-400 text-center">
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
            </div>

            {/* Right Group */}
            <div className="flex items-center gap-1.5 lg:gap-2 shrink-0 ml-auto">
              {/* Read-Only Active Term Confirmation Pill */}
              <div
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#0D5C3A]/8 text-[#0D5C3A] dark:bg-[#10B981]/15 dark:text-[#34D399] font-semibold text-xs border border-[#0D5C3A]/15 dark:border-[#10B981]/25 select-none shrink-0"
                title="Active Term (use ⋮ menu to change)"
              >
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="whitespace-nowrap">
                  {activeTerm ? `${activeTerm.label}, ${activeTerm.academic_year}` : 'Term 3, 2026'}
                </span>
              </div>

              {/* Exam Phase Track (BOT | MOT | EOT | ALL) */}
              <div
                className="inline-flex items-center bg-[#F0F4F9] dark:bg-[#131314] p-0.5 rounded-full border-0 gap-0.5 shrink-0"
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
                    className={`whitespace-nowrap shrink-0 h-7 px-2 sm:px-2.5 text-xs font-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer ${
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
                  className="inline-flex items-center bg-[#F0F4F9] dark:bg-[#131314] p-0.5 rounded-full border-0 gap-0.5 shrink-0"
                  aria-label="Department View"
                >
                  {(['both', 'secular', 'theology'] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setActiveView(view)}
                      className={`whitespace-nowrap shrink-0 h-7 px-2 sm:px-2.5 text-xs font-semibold capitalize rounded-full transition-all cursor-pointer ${
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
                  className="hidden xl:inline-block h-8 rounded-full bg-[#F0F4F9] dark:bg-[#131314] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] text-[#1F1F1F] dark:text-[#E3E3E3] border-0 ring-0 focus:ring-2 focus:ring-[#0D5C3A]/25 dark:focus:ring-[#F59E0B]/30 px-2.5 text-xs font-medium transition-colors max-w-[130px] truncate cursor-pointer shrink-0"
                >
                  <option value="all">All Subjects ({circularMarks.length})</option>
                  {circularMarks.map((m) => (
                    <option key={m.subject_id} value={m.subject_id}>
                      {m.subject_name}
                    </option>
                  ))}
                </select>
              )}

              {/* More Actions Circle */}
              <MoreActionsMenu items={moreActionsItems} align="end" />
            </div>
          </div>
        </div>

        {/* =========================================================================
            MOBILE DEDICATED ARCHITECTURE (< md)
            Card A: Active Student & Class Hero Card (Gradient Accent)
            Card B: 2-Track Phase & Department Switcher (Equal-Width Grid)
            ========================================================================= */}
        <div className="flex md:hidden flex-col gap-2 w-full min-w-0">
          {/* Mobile Top Filter Strip (Compact, Light, Zero Search Cramming) */}
          <div className="flex items-center gap-1.5 w-full">
            {/* Class Selector Pill */}
            <select
              aria-label="Class Filter Mobile"
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
              className="h-[34px] px-3 rounded-full bg-white dark:bg-[#1E1F20] text-[#1F1F1F] dark:text-[#E3E3E3] border border-black/[0.08] dark:border-white/[0.08] text-xs font-semibold shrink-0 cursor-pointer outline-none shadow-2xs"
            >
              <option value="all" className="text-[#1F1F1F] bg-white dark:bg-[#1E1F20] dark:text-[#E3E3E3]">
                All ({enrollments.length})
              </option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls} className="text-[#1F1F1F] bg-white dark:bg-[#1E1F20] dark:text-[#E3E3E3]">
                  {cls}
                </option>
              ))}
            </select>

            {/* Phase Track (BOT | MOT | EOT | ALL) */}
            <div className="flex-1 grid grid-cols-4 bg-white dark:bg-[#1E1F20] p-0.5 rounded-full border border-black/[0.06] dark:border-white/[0.06] h-[34px] items-center" aria-label="Exam Phase Mobile">
              {(['bot', 'mot', 'eot', 'all'] as ExamType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setExamType(type)
                    setSuccess(false)
                  }}
                  className={`h-7 w-full flex items-center justify-center text-[11px] font-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer ${
                    examType === type
                      ? 'bg-[#0D5C3A] text-white dark:bg-[#10B981]/25 dark:text-[#34D399] shadow-xs'
                      : 'text-[#444746] dark:text-[#C4C7C5]'
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Department Pill (Both | Sec | Theo) */}
            {allowedDepartment === 'both' ? (
              <div className="bg-white dark:bg-[#1E1F20] p-0.5 rounded-full border border-black/[0.06] dark:border-white/[0.06] h-[34px] flex items-center text-[11px] font-semibold shrink-0" aria-label="Department View Mobile">
                {(['both', 'secular', 'theology'] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setActiveView(view)}
                    className={`h-7 px-2 flex items-center justify-center text-[11px] font-semibold capitalize rounded-full transition-all cursor-pointer ${
                      activeView === view
                        ? 'bg-[#0D5C3A] text-white dark:bg-[#10B981]/25 dark:text-[#34D399] shadow-xs'
                        : 'text-[#444746] dark:text-[#C4C7C5]'
                    }`}
                  >
                    {view === 'both' ? 'Both' : view === 'secular' ? 'Sec' : 'Theo'}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center px-2.5 h-[34px] rounded-full bg-white dark:bg-[#1E1F20] text-[#0D5C3A] dark:text-[#34D399] font-semibold text-xs border border-black/[0.06] dark:border-white/[0.06] shrink-0 select-none">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 mr-1.5" />
                <span className="truncate">{activeTerm ? activeTerm.label : 'Term 3'}</span>
              </div>
            )}
          </div>

          {/* Mobile Active Student Switcher Card (Clean elevated surface, high contrast, zero overlap) */}
          <div className="bg-white dark:bg-[#1E1F20] rounded-2xl p-2.5 border border-black/[0.07] dark:border-white/[0.08] shadow-2xs w-full flex flex-col gap-0 min-w-0">
            {/* Top Line: Thumb Navigation */}
            <div className="flex items-center gap-1.5 w-full">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-[#0D5C3A]/12 text-[#0D5C3A] dark:bg-[#10B981]/20 dark:text-[#34D399] font-bold text-xs flex items-center justify-center shrink-0">
                {selectedEnrollment?.name?.charAt(0).toUpperCase() || 'S'}
              </div>

              {/* Student Select Pill */}
              <select
                aria-label="Student Mobile Select"
                value={selectedEnrollmentId}
                onChange={(e) => {
                  onSelectEnrollment(e.target.value)
                  setSuccess(false)
                }}
                className="h-[34px] w-full rounded-full bg-[#F0F4F9] dark:bg-[#282A2C] text-[#1F1F1F] dark:text-[#E3E3E3] px-3 text-xs font-semibold flex-1 min-w-0 truncate border-0 outline-none cursor-pointer"
              >
                <option value="" className="text-[#1F1F1F] bg-white dark:bg-[#1E1F20] dark:text-[#E3E3E3]">Select student...</option>
                {filteredEnrollments.map((s) => (
                  <option key={s.id} value={s.id} className="text-[#1F1F1F] bg-white dark:bg-[#1E1F20] dark:text-[#E3E3E3]">
                    {selectedClassFilter !== 'all' ? s.name : `${s.name} (${s.circular_class})`}
                  </option>
                ))}
              </select>

              {/* Thumb Stepper Buttons (< >) */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStepStudent(-1)}
                  disabled={filteredEnrollments.length <= 1}
                  title="Previous student"
                  aria-label="Previous student"
                  className="w-[34px] h-[34px] rounded-full bg-[#F0F4F9] dark:bg-[#282A2C] text-[#1F1F1F] dark:text-[#E3E3E3] hover:bg-[#E4EAE6] dark:hover:bg-[#323538] active:scale-95 disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepStudent(1)}
                  disabled={filteredEnrollments.length <= 1}
                  title="Next student"
                  aria-label="Next student"
                  className="w-[34px] h-[34px] rounded-full bg-[#F0F4F9] dark:bg-[#282A2C] text-[#1F1F1F] dark:text-[#E3E3E3] hover:bg-[#E4EAE6] dark:hover:bg-[#323538] active:scale-95 disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer transition"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Expandable Search Toggle */}
              <button
                type="button"
                aria-label="Toggle student search"
                onClick={() => {
                  setMobileSearchExpanded((prev) => !prev)
                  if (!mobileSearchExpanded) {
                    setSearchDropdownOpen(true)
                  }
                }}
                className={`w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 cursor-pointer transition ${
                  mobileSearchExpanded
                    ? 'bg-[#0D5C3A] text-white dark:bg-[#10B981] dark:text-black shadow-xs'
                    : 'bg-[#F0F4F9] dark:bg-[#282A2C] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#E4EAE6] dark:hover:bg-[#323538]'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              {/* More Actions Circle */}
              <MoreActionsMenu
                items={moreActionsItems}
                triggerClassName="w-[34px] h-[34px] rounded-full bg-[#F0F4F9] dark:bg-[#282A2C] text-[#444746] dark:text-[#C4C7C5] hover:bg-[#E4EAE6] dark:hover:bg-[#323538] flex items-center justify-center shrink-0 cursor-pointer transition"
                align="end"
              />
            </div>

            {/* Expandable Search Row (Shown only when toggled) */}
            {mobileSearchExpanded && (
              <div ref={mobileSearchBoxRef} className="relative w-full pt-2">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-[#747775] dark:text-[#8E918F] absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    autoFocus
                    value={studentSearchQuery}
                    onFocus={() => setSearchDropdownOpen(true)}
                    onChange={(e) => {
                      const q = e.target.value
                      setStudentSearchQuery(q)
                      setSearchDropdownOpen(true)
                    }}
                    placeholder="Type student name to jump..."
                    className="w-full h-[34px] pl-8 pr-7 text-xs font-medium rounded-full bg-[#F0F4F9] dark:bg-[#131314] text-[#1F1F1F] dark:text-[#E3E3E3] placeholder:text-[#747775] border border-black/[0.08] dark:border-white/[0.08] outline-none focus:ring-2 focus:ring-[#0D5C3A]/25"
                  />
                  {studentSearchQuery ? (
                    <button
                      type="button"
                      aria-label="Clear mobile student search"
                      onClick={() => {
                        setStudentSearchQuery('')
                        setSearchDropdownOpen(false)
                      }}
                      className="absolute right-2 p-0.5 text-[#747775] hover:text-[#1F1F1F] rounded-full cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="Close search"
                      onClick={() => setMobileSearchExpanded(false)}
                      className="absolute right-2 p-0.5 text-[#747775] hover:text-[#1F1F1F] rounded-full cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {searchDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 max-h-60 overflow-y-auto bg-white dark:bg-[#1E1F20] text-[#1F1F1F] dark:text-[#E3E3E3] border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 rounded-2xl shadow-xl z-50 divide-y divide-[#0D5C3A]/[0.06] dark:divide-[#F59E0B]/[0.07]">
                    {filteredEnrollments.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-stone-400 text-center">
                        No matches
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
                              setMobileSearchExpanded(false)
                            }}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-xs cursor-pointer ${
                              isSel
                                ? 'bg-[#0D5C3A]/10 text-[#09472C] dark:bg-[#10B981]/15 dark:text-[#34D399] font-bold'
                                : 'text-[#1F1F1F] dark:text-[#E3E3E3]'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{s.name}</div>
                              <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">{s.circular_class}</div>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Micro-Telemetry Line (Zero overlap, crisp typography) */}
            <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-black/[0.05] dark:border-white/[0.06] text-[11px]">
              <span className="shrink-0 text-[#444746] dark:text-[#C4C7C5] font-medium tabular-nums">
                {currentStudentIndex !== -1 ? `${currentStudentIndex + 1} of ${filteredEnrollments.length}` : ''}
                {liveSummary.totalSubjects > 0 ? ` • ${liveSummary.columnLabel}: ${liveSummary.scoredCount}/${liveSummary.totalSubjects} (${liveSummary.avg}%)` : ''}
              </span>

              {selectedEnrollment?.theology_class_arabic && (
                <span className="truncate text-[#0D5C3A] dark:text-[#34D399] font-semibold text-xs ml-auto" dir="rtl">
                  {selectedEnrollment.arabic_name || selectedEnrollment.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error banner if any */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2.5 p-3 text-rose-800 dark:text-rose-200 bg-rose-500/10 rounded-2xl border border-rose-500/25 text-xs font-bold"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Unassigned teacher state */}
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
            <div className="space-y-2 w-full min-w-0">
              {/* =========================================================================
                  ZONE 2: Hero Student Identity Banner (Desktop >= md)
                  Rich Forest Emerald & Warm Gold Accent Banner
                  Left: Avatar + Student Picker + Stepper (< >) + Position (12 of 38) + ADM + Live Score Summary
                  Right: Arabic Name & Class
                  (Note: On mobile < md, Mobile Card A at top renders student selector & identity)
                  ========================================================================= */}
              <div className="hidden md:flex items-center justify-between gap-2.5 shadow-[0_6px_20px_-4px_rgba(13,92,58,0.28)] min-h-[46px] px-4 py-2 bg-gradient-to-r from-[#093D26] via-[#0D5C3A] to-[#136B43] dark:from-[#0F291E] dark:via-[#143829] dark:to-[#1E2923] text-white border border-[#D97706]/30 rounded-2xl w-full min-w-0">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white font-extrabold text-xs border border-white/25 shrink-0 shadow-xs">
                    {selectedEnrollment?.name?.charAt(0).toUpperCase() || 'S'}
                  </div>

                  {/* Direct Student Picker Dropdown */}
                  <select
                    id="marks-student-select"
                    aria-label="Student"
                    value={selectedEnrollmentId}
                    onChange={(e) => {
                      onSelectEnrollment(e.target.value)
                      setSuccess(false)
                    }}
                    className="h-8 rounded-full bg-black/25 hover:bg-black/35 text-white border border-white/25 ring-0 focus:ring-2 focus:ring-[#F59E0B]/50 px-3 text-xs font-bold transition-colors max-w-[200px] md:max-w-[260px] lg:max-w-[320px] truncate cursor-pointer shrink-0"
                  >
                    <option value="" className="text-[#1F1F1F] bg-white">Select student...</option>
                    {filteredEnrollments.map((s) => (
                      <option key={s.id} value={s.id} className="text-[#1F1F1F] bg-white">
                        {s.name} ({s.circular_class})
                      </option>
                    ))}
                  </select>

                  {/* Stepper buttons (< >) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStepStudent(-1)}
                      disabled={filteredEnrollments.length <= 1}
                      title="Previous student"
                      aria-label="Previous student"
                      className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white active:scale-95 disabled:opacity-40 cursor-pointer shrink-0 transition"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepStudent(1)}
                      disabled={filteredEnrollments.length <= 1}
                      title="Next student"
                      aria-label="Next student"
                      className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white active:scale-95 disabled:opacity-40 cursor-pointer shrink-0 transition"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Student position counter */}
                  {currentStudentIndex !== -1 && (
                    <span className="text-[11px] text-white/90 font-mono font-medium shrink-0 hidden md:inline">
                      ({currentStudentIndex + 1} of {filteredEnrollments.length})
                    </span>
                  )}

                  {/* Admission ID pill (hidden below 2xl) */}
                  {selectedEnrollment?.admission_number && (
                    <span className="bg-white/15 text-white/90 border border-white/20 rounded-full px-2.5 py-0.5 text-[11px] font-mono shrink-0 hidden 2xl:inline">
                      {selectedEnrollment.admission_number}
                    </span>
                  )}

                  {/* Live Score Summary Pill */}
                  {liveSummary.totalSubjects > 0 && (
                    <span className="bg-white/15 text-white border border-white/20 rounded-full px-2.5 py-0.5 text-[11px] font-medium tabular-nums shrink-0 hidden xl:inline-flex items-center gap-1.5">
                      <span>{liveSummary.columnLabel}: {liveSummary.scoredCount}/{liveSummary.totalSubjects} scored</span>
                      <span>&bull;</span>
                      <span>Avg {liveSummary.avg}%</span>
                      {studentGradeBadge && (
                        <>
                          <span>&bull;</span>
                          <strong className="text-[#FEF3C7] font-bold">Grade {studentGradeBadge}</strong>
                        </>
                      )}
                    </span>
                  )}
                </div>

                {/* Right side: Arabic Info */}
                {selectedEnrollment.theology_class_arabic && (
                  <div className="text-right shrink-0 ml-auto flex items-center gap-2 max-w-[40%] min-w-0">
                    <span className="text-xs font-bold text-white truncate" dir="rtl">
                      {selectedEnrollment.arabic_name || selectedEnrollment.name}
                    </span>
                    <span
                      className="inline-block text-xs font-semibold text-[#FEF3C7] bg-[#F59E0B]/25 border border-[#F59E0B]/40 px-2.5 py-0.5 rounded-full shrink-0"
                      dir="rtl"
                    >
                      {selectedEnrollment.theology_class_arabic}
                    </span>
                  </div>
                )}
              </div>

              {/* =========================================================================
                  ZONE 3: Side-by-Side Assessment Grids
                  Natural sorting, Core hidden for Nursery, h-9 compact rows, card footers
                  ========================================================================= */}
              <div
                className={
                  activeView === 'both' &&
                  theologyMarks.length > 0 &&
                  examType !== 'bot' &&
                  selectedEnrollment?.theology_status !== 'not_applicable'
                    ? 'grid grid-cols-1 xl:grid-cols-2 gap-2 items-start w-full min-w-0'
                    : 'space-y-2 w-full min-w-0'
                }
              >
                {/* Secular Marks Card */}
                {(activeView === 'both' || activeView === 'secular') && (
                  <div className="card-jiddah rounded-2xl shadow-2xs border border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 overflow-hidden w-full min-w-0">
                    <div className="px-3.5 py-2 bg-gradient-to-r from-[#0D5C3A]/[0.10] via-[#0D5C3A]/[0.04] to-transparent dark:from-[#10B981]/[0.16] border-b border-[#0D5C3A]/15 dark:border-[#10B981]/25 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                          Secular Marks {isCurrentNursery ? '(Nursery Letter Scale)' : ''}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] font-medium hidden md:inline-flex items-center gap-1">
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
                          examType === 'all' ? 'min-w-[420px]' : 'min-w-[320px]'
                        }`}
                      >
                        <thead>
                          <tr className="bg-[var(--bg-sunken)] border-b border-[#0D5C3A]/[0.06] dark:border-[#F59E0B]/[0.07] text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider h-8">
                            <th
                              data-testid="frozen-first-column-header"
                              className="sticky left-0 z-20 bg-[var(--bg-sunken)] px-3 py-1.5 border-r border-[#0D5C3A]/[0.06] dark:border-[#F59E0B]/[0.07] min-w-[150px] max-w-[220px]"
                            >
                              Subject
                            </th>
                            {!isCurrentNursery && (
                              <th className="hidden sm:table-cell px-1.5 py-1.5 text-center w-10">Core</th>
                            )}
                            {['bot', 'all'].includes(examType) && (
                              <th className="px-1.5 py-1.5 text-center w-22">BOT (100)</th>
                            )}
                            {['mot', 'all'].includes(examType) && (
                              <th className="px-1.5 py-1.5 text-center w-22">MOT (100)</th>
                            )}
                            {['eot', 'all'].includes(examType) && (
                              <th className="px-1.5 py-1.5 text-center w-22">EOT (100)</th>
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
                              isNursery={isCurrentNursery}
                              renderScoreCell={renderScoreCell}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Secular Card Footer Summary */}
                    <div className="px-3.5 py-2 bg-gradient-to-r from-[#0D5C3A]/[0.06] to-[#D97706]/[0.06] dark:from-[#10B981]/[0.10] dark:to-[#F59E0B]/[0.10] border-t border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
                      <span className="font-bold text-[#0D5C3A] dark:text-[#34D399]">Secular Summary</span>
                      <span className="tabular-nums font-mono font-bold">
                        Total: {secularStats.total} / {secularStats.maxTotal} &bull; Mean: {secularStats.mean}% &bull; Grade: {secularStats.grade}
                      </span>
                    </div>
                  </div>
                )}

                {/* Theology Marks Card */}
                {(activeView === 'both' || activeView === 'theology') &&
                  theologyMarks.length > 0 &&
                  examType !== 'bot' &&
                  selectedEnrollment?.theology_status !== 'not_applicable' && (
                    <div className="card-jiddah rounded-2xl shadow-2xs border border-[#0D5C3A]/10 dark:border-[#F59E0B]/12 overflow-hidden w-full min-w-0">
                      <div className="px-3.5 py-2 bg-gradient-to-l from-[#D97706]/[0.14] via-[#EA580C]/[0.06] to-transparent dark:from-[#F59E0B]/[0.18] border-b border-[#D97706]/20 dark:border-[#F59E0B]/25 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#D97706] to-[#EA580C] shadow-xs shrink-0" />
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
                            examType === 'all' ? 'min-w-[360px]' : 'min-w-[260px]'
                          }`}
                        >
                          <thead>
                            <tr className="bg-[var(--bg-sunken)] border-b border-[#0D5C3A]/[0.06] dark:border-[#F59E0B]/[0.07] text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider h-8">
                              <th className="sticky left-0 z-20 bg-[var(--bg-sunken)] px-3 py-1.5 border-r border-[#0D5C3A]/[0.06] dark:border-[#F59E0B]/[0.07] min-w-[150px] max-w-[220px]">
                                Subject (المادة)
                              </th>
                              {['mot', 'all'].includes(examType) && (
                                <th className="px-1.5 py-1.5 text-center w-22">MOT (100)</th>
                              )}
                              {['eot', 'all'].includes(examType) && (
                                <th className="px-1.5 py-1.5 text-center w-22">EOT (100)</th>
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

                      {/* Theology Card Footer Summary */}
                      <div className="px-3.5 py-2 bg-gradient-to-l from-[#D97706]/[0.08] to-[#0D5C3A]/[0.05] dark:from-[#F59E0B]/[0.12] dark:to-[#10B981]/[0.08] border-t border-[#D97706]/20 dark:border-[#F59E0B]/25 flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]" dir="rtl">
                        <span className="font-bold text-[#D97706] dark:text-[#F59E0B]">ملخص المواد الشرعية</span>
                        <span className="tabular-nums font-mono font-bold">
                          المجموع: {toArabicNumerals(theologyStats.total)} / {toArabicNumerals(theologyStats.maxTotal)} &bull; المعدل: {toArabicNumerals(theologyStats.mean)}٪ &bull; التقدير: {theologyStats.remark}
                        </span>
                      </div>
                    </div>
                  )}
              </div>

              {/* =========================================================================
                  ZONE 4: Dedicated Prominent Bottom Pill Save Bar
                  Sticky at bottom, status on left + Save & Next Student, big tactile pill save button on right
                  ========================================================================= */}
              <div className="sticky bottom-2 z-20 rounded-full bg-white/95 dark:bg-[#1E1F20]/95 backdrop-blur-md px-3 py-1.5 border border-black/[0.08] dark:border-white/[0.10] shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex items-center justify-between gap-2 w-full">
                {/* Left status / next student */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {hasUnsavedChanges ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200 min-w-0 truncate">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      <span className="truncate">
                        {editedCount > 0 ? `${editedCount} unsaved score edits` : 'Unsaved edits'}
                        <span className="hidden sm:inline"> for <strong className="font-bold">{selectedEnrollment.name}</strong></span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-[#34D399] min-w-0 truncate">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#34D399] shrink-0" />
                      <span className="truncate">
                        Saved • <strong className="font-bold">{selectedEnrollment.name}</strong>
                      </span>
                    </div>
                  )}

                  {/* Save & Next Student button (desktop only) */}
                  <button
                    type="button"
                    disabled={isSaving || isPending || filteredEnrollments.length <= 1}
                    onClick={async (e) => {
                      handleFormSubmit(e as any)
                      handleStepStudent(1)
                      toast.success('Saved! Advanced to next student')
                    }}
                    className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#F0F4F9] dark:bg-[#282A2C] hover:bg-[#E4EAE6] dark:hover:bg-[#323538] text-xs font-semibold text-[#1F1F1F] dark:text-[#E3E3E3] transition active:scale-[0.98] cursor-pointer disabled:opacity-40 shrink-0 ml-2"
                  >
                    <span>Save &amp; Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Right: Tactile Big Pill Save Button */}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <button
                    type="submit"
                    data-testid="save-marks-submit"
                    disabled={isSaving || isPending || !selectedEnrollment || isExamSetLocked}
                    className="h-9 md:h-10 px-4 md:px-7 rounded-full btn-jiddah-cta text-xs md:text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-40"
                  >
                    {isSaving || isPending ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : success ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span className="tabular-nums">
                      {isSaving || isPending ? (
                        'Saving...'
                      ) : success ? (
                        'Saved ✓'
                      ) : editedCount > 0 ? (
                        <>
                          Save {editedCount} Edits
                          <span className="hidden md:inline"> (Ctrl+S)</span>
                        </>
                      ) : (
                        <>
                          Save Marks
                          <span className="hidden md:inline"> (Ctrl+S)</span>
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : null
        )}
      </form>
    </div>
  )
}

'use client'

import React, { useState, useEffect, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ScrollText,
  BookOpen,
  Award,
  Printer,
  FileSpreadsheet,
  Search,
  Trophy,
  Medal,
  BarChart3,
  Users,
  TrendingUp,
  Percent,
  Sparkles,
  ExternalLink,
  ArrowLeft,
  Download,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { TheologyHubEmptyState } from './TheologyHubEmptyState'
import { OfficialPrintLetterhead, OfficialPrintSignaturesFooter } from '@/components/print/OfficialPrintLetterhead'
import { OfficialReportStamp } from '@/components/reports/StampGenerator'
import { PrintPortal } from '@/components/reports/PrintPortal'
import { CustomPillSelect } from '@/components/ui/custom-pill-select'
import { JiddahLoader } from '@/components/ui/jiddah-loader'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { downloadCSV, escapeCSV } from '@/utils/csvExport'
import { computeStandardRankings } from '@/lib/ranking'
import { getTheologyGradeDisplay, calculateTheologyAggregate, getDivision } from '@/lib/grading'

type TermData = {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current: boolean
}

type TheologyClassData = {
  id: string
  class_name_arabic: string
  class_name_english: string
  level: string
}

const RemarkBadge = memo(({ score }: { score: number | null | undefined }) => {
  if (score == null || isNaN(Number(score))) {
    return <span className="text-stone-300 dark:text-stone-700 font-bold">-</span>
  }
  const s = Number(score)
  if (s >= 85) {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40 print:border-none print:bg-transparent print:text-black">
        ممتاز
      </span>
    )
  }
  if (s >= 75) {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-300/40 print:border-none print:bg-transparent print:text-black">
        جيد جداً
      </span>
    )
  }
  if (s >= 65) {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40 print:border-none print:bg-transparent print:text-black">
        جيد
      </span>
    )
  }
  if (s >= 50) {
    return (
      <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300/40 print:border-none print:bg-transparent print:text-black">
        مقبول
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/40 print:border-none print:bg-transparent print:text-black">
      ضعيف
    </span>
  )
})
RemarkBadge.displayName = 'RemarkBadge'

export default function TheologyHubClient({
  terms,
  theologyClasses,
}: {
  terms: TermData[]
  theologyClasses: TheologyClassData[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeTermId, setActiveTermId] = useState<string>(
    searchParams.get('term_id') || terms.find((t) => t.is_current)?.id || terms[0]?.id || ''
  )
  const [activeClassId, setActiveClassId] = useState<string>(
    searchParams.get('class_id') || theologyClasses[0]?.id || ''
  )
  const [activeLevel, setActiveLevel] = useState<string>(
    searchParams.get('level') || theologyClasses[0]?.level || 'raudha'
  )
  const [activeTab, setActiveTab] = useState<'assessment' | 'analysis' | 'top_students'>(
    (searchParams.get('tab') as any) || 'assessment'
  )
  const [examPhase, setExamPhase] = useState<'bot' | 'mot' | 'eot'>(
    (searchParams.get('exam_phase') as any) || 'eot'
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [divisionFilter, setDivisionFilter] = useState<string>('all')
  const [showGrades, setShowGrades] = useState(true)

  const [isLoading, setIsLoading] = useState(false)
  const [, setIsPrinting] = useState(false)
  const [data, setData] = useState<{
    enrollments: any[]
    marks: any[]
    subjects: any[]
  } | null>(null)

  const activeTerm = useMemo(() => terms.find((t) => t.id === activeTermId), [terms, activeTermId])
  const activeClass = useMemo(
    () => theologyClasses.find((c) => c.id === activeClassId),
    [theologyClasses, activeClassId]
  )

  const termOptions = useMemo(
    () =>
      terms.map((t) => ({
        value: t.id,
        label: `${t.label} (${t.academic_year})`,
      })),
    [terms]
  )

  const classOptions = useMemo(
    () => [
      { value: '', label: '-- Select Class / اختر الصف --' },
      ...theologyClasses.map((t) => ({
        value: t.id,
        label: `${t.class_name_arabic} — ${t.class_name_english}`,
      })),
    ],
    [theologyClasses]
  )

  // Fetch data cleanly
  useEffect(() => {
    if (!activeTermId) return

    let cancelled = false
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const queryParams = new URLSearchParams({ term_id: activeTermId })
        if (activeClassId) queryParams.set('class_id', activeClassId)
        if (activeLevel) queryParams.set('level', activeLevel)

        const res = await fetch(`/api/theology-hub?${queryParams.toString()}`)
        const ct = res.headers.get('content-type') || ''
        if (!res.ok || !ct.includes('application/json')) {
          const errText = await res.text()
          throw new Error(errText || 'Failed to fetch theology data')
        }
        const json = await res.json()
        if (!cancelled) {
          setData(json)
        }
      } catch (err) {
        console.error('Theology Hub load error:', err)
        if (!cancelled) {
          toast.error('Failed to load theology data. Check database connections.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [activeTermId, activeClassId, activeLevel])

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (activeTermId) params.set('term_id', activeTermId)
    if (activeClassId) params.set('class_id', activeClassId)
    if (activeLevel) params.set('level', activeLevel)
    if (activeTab) params.set('tab', activeTab)
    if (examPhase) params.set('exam_phase', examPhase)

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [activeTermId, activeClassId, activeLevel, activeTab, examPhase, pathname, router, searchParams])

  // Update level when class changes
  useEffect(() => {
    if (activeClassId && activeTab === 'assessment') {
      const cls = theologyClasses.find((c) => c.id === activeClassId)
      if (cls && cls.level !== activeLevel) {
        setActiveLevel(cls.level)
      }
    }
  }, [activeClassId, theologyClasses, activeTab, activeLevel])

  // ----------------------------------------------------
  // Assessment Broadsheet Calculation
  // ----------------------------------------------------
  const assessmentData = useMemo(() => {
    if (!data || !activeClassId) return { students: [], orderedSubjects: [] }

    const classEnrollments = data.enrollments.filter((e) => e.theology_class_id === activeClassId)
    const classInfo = theologyClasses.find((c) => c.id === activeClassId)
    if (!classInfo) return { students: [], orderedSubjects: [] }

    // Filter subjects by level
    const levelSubjects = (data.subjects || []).filter(
      (s) => !s.level || s.level === classInfo.level || s.level === activeLevel
    )

    const targetCanonical = [
      'القرآن الكريم',
      'القرآن',
      'اللغة العربية',
      'الفقه والعبادات',
      'الفقه',
      'التوحيد والعقيدة',
      'التوحيد',
      'التربية الإسلامية',
      'التربية',
      'التاريخ والسيرة',
      'السيرة والآداب',
      'السيرة',
    ]

    const orderedSubjects = [...levelSubjects]
      .sort((a, b) => {
        const nameA = a.subject_name_arabic || a.subject_name || ''
        const nameB = b.subject_name_arabic || b.subject_name || ''
        let aIdx = targetCanonical.findIndex((t) => nameA.includes(t))
        let bIdx = targetCanonical.findIndex((t) => nameB.includes(t))
        if (aIdx === -1) aIdx = 999
        if (bIdx === -1) bIdx = 999
        return aIdx - bIdx
      })
      .slice(0, 6)

    const processed = classEnrollments.map((enrollment) => {
      const eMarks = (data.marks || []).filter(
        (m) => m.enrollment_id === enrollment.id || (m.student_id && m.student_id === enrollment.student_id)
      )

      let total = 0
      let hasMarks = false
      const subjectScores: Record<string, number | null> = {}
      const subjectGrades: Record<string, string | null> = {}
      const coreScoresForAgg: number[] = []

      orderedSubjects.forEach((sub) => {
        const mark = eMarks.find((m) => m.subject_id === sub.id)
        const score = mark?.[`${examPhase}_score`] ?? null
        subjectScores[sub.id] = score
        if (score != null && !isNaN(Number(score))) {
          const numScore = Number(score)
          total += numScore
          hasMarks = true
          subjectGrades[sub.id] = getTheologyGradeDisplay(numScore)
          if (coreScoresForAgg.length < 4) {
            coreScoresForAgg.push(numScore)
          }
        } else {
          subjectGrades[sub.id] = null
        }
      })

      const agg = coreScoresForAgg.length === 4 ? calculateTheologyAggregate(coreScoresForAgg) : null
      const div = agg !== null ? getDivision(agg) : hasMarks ? 'U' : '-'

      const studentObj = enrollment.students || {}
      return {
        id: enrollment.id,
        student_id: enrollment.student_id,
        name: studentObj.name || 'Unknown Student',
        arabic_name: studentObj.arabic_name || '',
        admission_number: studentObj.admission_number || '',
        gender: studentObj.gender || '',
        total: hasMarks ? total : null,
        aggregate: agg,
        division: div,
        subjectScores,
        subjectGrades,
        rank: '-' as number | string,
        position: '-' as number | string,
      }
    })

    const ranked = computeStandardRankings(processed)

    return {
      orderedSubjects,
      students: ranked.map((p) => ({
        ...p,
        total: p.total ?? 0,
        position: p.rank,
      })),
    }
  }, [data, activeClassId, theologyClasses, activeLevel, examPhase])

  // Filtered students for search & division
  const filteredStudents = useMemo(() => {
    return assessmentData.students.filter((st) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        st.name.toLowerCase().includes(q) ||
        (st.arabic_name && st.arabic_name.toLowerCase().includes(q)) ||
        (st.admission_number && st.admission_number.toLowerCase().includes(q))

      let matchesDiv = true
      if (divisionFilter !== 'all') {
        if (divisionFilter === 'unranked') {
          matchesDiv = st.position === '-' || st.division === '-'
        } else {
          matchesDiv = st.division === divisionFilter
        }
      }

      return matchesSearch && matchesDiv
    })
  }, [assessmentData.students, searchQuery, divisionFilter])

  // Summary statistics for Broadsheet footer
  const broadsheetSummary = useMemo(() => {
    const students = assessmentData.students
    const subjects = assessmentData.orderedSubjects
    if (students.length === 0 || subjects.length === 0) return null

    const subjectStats: Record<
      string,
      { avg: number; highest: number; lowest: number; passRate: number; count: number }
    > = {}

    subjects.forEach((sub) => {
      const scores = students
        .map((st) => st.subjectScores[sub.id])
        .filter((s): s is number => typeof s === 'number' && !isNaN(s))

      if (scores.length > 0) {
        const sum = scores.reduce((a, b) => a + b, 0)
        const avg = Math.round(sum / scores.length)
        const highest = Math.max(...scores)
        const lowest = Math.min(...scores)
        const passCount = scores.filter((s) => s >= 50).length
        const passRate = Math.round((passCount / scores.length) * 100)
        subjectStats[sub.id] = { avg, highest, lowest, passRate, count: scores.length }
      } else {
        subjectStats[sub.id] = { avg: 0, highest: 0, lowest: 0, passRate: 0, count: 0 }
      }
    })

    const totalScores = students
      .map((st) => (typeof st.total === 'number' && st.total > 0 ? st.total : null))
      .filter((t): t is number => t !== null)

    const classAverageTotal =
      totalScores.length > 0 ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length) : 0
    const highestTotal = totalScores.length > 0 ? Math.max(...totalScores) : 0
    const lowestTotal = totalScores.length > 0 ? Math.min(...totalScores) : 0

    const divCounts = {
      I: students.filter((s) => s.division === 'I').length,
      II: students.filter((s) => s.division === 'II').length,
      III: students.filter((s) => s.division === 'III').length,
      IV: students.filter((s) => s.division === 'IV').length,
      U: students.filter((s) => s.division === 'U').length,
      unranked: students.filter((s) => s.division === '-' || !s.total).length,
    }

    return {
      subjectStats,
      classAverageTotal,
      highestTotal,
      lowestTotal,
      divCounts,
      totalCandidates: students.length,
      satCandidates: totalScores.length,
    }
  }, [assessmentData])

  // ----------------------------------------------------
  // Analysis View Calculation
  // ----------------------------------------------------
  const analysisData = useMemo(() => {
    if (!data || !activeLevel) return []
    const classes = theologyClasses.filter((c) => c.level === activeLevel)
    const levelSubjects = (data.subjects || []).filter(
      (s) => !s.level || s.level === activeLevel
    )

    return classes.map((cls) => {
      const classEnrollments = (data.enrollments || []).filter((e) => e.theology_class_id === cls.id)
      let numStudents = 0
      let excellent = 0
      let vGood = 0
      let good = 0
      let fair = 0
      let weak = 0

      classEnrollments.forEach((e) => {
        const eMarks = (data.marks || []).filter(
          (m) => m.enrollment_id === e.id || (m.student_id && m.student_id === e.student_id)
        )
        let total = 0
        let hasMarks = false
        levelSubjects.forEach((sub) => {
          const mark = eMarks.find((m) => m.subject_id === sub.id)
          const score = mark?.[`${examPhase}_score`] ?? null
          if (score != null && !isNaN(Number(score))) {
            total += Number(score)
            hasMarks = true
          }
        })

        if (hasMarks) {
          numStudents++
          const avg = total / (levelSubjects.length || 1)
          if (avg >= 85) excellent++
          else if (avg >= 75) vGood++
          else if (avg >= 65) good++
          else if (avg >= 50) fair++
          else weak++
        }
      })

      const passed = excellent + vGood + good + fair
      const passRate = numStudents > 0 ? Math.round((passed / numStudents) * 100) : 0

      return {
        id: cls.id,
        className: cls.class_name_arabic || cls.class_name_english,
        englishName: cls.class_name_english,
        numStudents,
        totalEnrolled: classEnrollments.length,
        excellent,
        vGood,
        good,
        fair,
        weak,
        passRate,
      }
    })
  }, [data, activeLevel, theologyClasses, examPhase])

  // ----------------------------------------------------
  // Top 10 Merit Roll Calculation
  // ----------------------------------------------------
  const top10Data = useMemo(() => {
    const valid = assessmentData.students.filter(
      (st) => typeof st.total === 'number' && st.total > 0 && st.position !== '-'
    )
    return valid.slice(0, 10)
  }, [assessmentData.students])

  // ----------------------------------------------------
  // Actions: Print & Export
  // ----------------------------------------------------
  const handlePrintBroadsheet = () => {
    if (!assessmentData.students.length) {
      return toast.error('No student assessment data to print.')
    }
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 400)
  }

  const handleExportCSV = () => {
    if (!assessmentData.students.length) {
      return toast.error('No assessment data to export.')
    }
    const termLabel = activeTerm ? activeTerm.label.replace(/\s+/g, '_') : 'Term'
    const classLabel = activeClass ? (activeClass.class_name_english || activeClass.class_name_arabic).replace(/\s+/g, '_') : 'Class'
    const filename = `Jiddah_Theology_Broadsheet_${classLabel}_${termLabel}_${examPhase.toUpperCase()}_2026.csv`

    const headers = [
      'Rank',
      'Admission No',
      'Student Name',
      'Arabic Name',
      'Gender',
      ...assessmentData.orderedSubjects.map((s) => `${s.subject_name_arabic || s.subject_name} (Mark)`),
      ...assessmentData.orderedSubjects.map((s) => `${s.subject_name_arabic || s.subject_name} (Grade)`),
      'Total Score',
      'Aggregate',
      'Division',
    ]

    const rows = assessmentData.students.map((st) => [
      st.position,
      st.admission_number || '-',
      st.name,
      st.arabic_name || '-',
      st.gender || '-',
      ...assessmentData.orderedSubjects.map((s) => st.subjectScores[s.id] ?? '-'),
      ...assessmentData.orderedSubjects.map((s) => st.subjectGrades[s.id] ?? '-'),
      st.total || '-',
      st.aggregate ?? '-',
      st.division || '-',
    ])

    if (broadsheetSummary) {
      rows.push([])
      rows.push([
        'SUMMARY',
        '',
        'CLASS AVERAGE',
        '',
        '',
        ...assessmentData.orderedSubjects.map((s) => broadsheetSummary.subjectStats[s.id]?.avg ?? '-'),
        ...assessmentData.orderedSubjects.map(() => ''),
        broadsheetSummary.classAverageTotal,
        '',
        '',
      ])
      rows.push([
        'SUMMARY',
        '',
        'PASS RATE (%)',
        '',
        '',
        ...assessmentData.orderedSubjects.map((s) => `${broadsheetSummary.subjectStats[s.id]?.passRate ?? 0}%`),
        ...assessmentData.orderedSubjects.map(() => ''),
        '',
        '',
        '',
      ])
    }

    const csvContent = [
      `"JIDDAH ISLAMIC NURSERY & PRIMARY SCHOOL — THEOLOGY BROADSHEET"`,
      `"Class: ${activeClass?.class_name_arabic || ''} (${activeClass?.class_name_english || ''}) | Term: ${activeTerm?.label || ''} | Phase: ${examPhase.toUpperCase()} | Generated: ${new Date().toLocaleDateString()}"`,
      '',
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n')

    downloadCSV(csvContent, filename)
    toast.success('Theology Broadsheet exported cleanly to CSV!')
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FA] dark:bg-[#0D1411] text-stone-900 dark:text-stone-100 font-sans tabular-nums selection:bg-[#0D5C3A] selection:text-white">
      {/* ======================================================== */}
      {/* 1. REPORT-CENTER-STYLE SINGLE-ROW TOOLBAR */}
      {/* ======================================================== */}
      <div className="print:hidden shrink-0 px-2 sm:px-3 pt-2 pb-0 max-w-7xl mx-auto w-full">
        <div
          data-testid="theology-hub-banner"
          className="w-full h-12 bg-white dark:bg-[#151D1A] rounded-2xl px-3 border border-[#0D5C3A]/15 dark:border-[#F59E0B]/20 flex items-center justify-between gap-2 shadow-2xs overflow-hidden"
        >
          {/* LEFT: Back + Title + Term + Class */}
          <div className="flex items-center gap-1.5 min-w-0 shrink">
            <Link
              href="/admin"
              className="w-8 h-8 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft size={16} />
            </Link>

            {/* Title pill */}
            <div className="flex items-center gap-1.5 shrink-0 bg-[#D97706]/15 dark:bg-[#D97706]/10 rounded-lg px-1.5 py-0.5">
              <div className="w-6 h-6 rounded-lg bg-[#0D5C3A] flex items-center justify-center shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-white" strokeWidth={2.25} />
              </div>
              <span className="hidden sm:inline text-xs font-black text-stone-800 dark:text-stone-100 tracking-tight whitespace-nowrap">
                Theology Hub
              </span>
            </div>

            <div className="w-px h-5 bg-stone-200 dark:bg-white/10 mx-0.5 shrink-0" />

            {/* Term Selector */}
            <CustomPillSelect
              id="theology-hub-term-select"
              ariaLabel="Academic Term"
              value={activeTermId}
              onChange={(val) => setActiveTermId(val)}
              options={termOptions}
              className="h-8 w-32 sm:w-40 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs font-semibold text-stone-800 dark:text-stone-100"
            />

            {/* Class Selector */}
            <CustomPillSelect
              id="theology-hub-class-select"
              ariaLabel="Theology Class"
              value={activeClassId}
              onChange={(val) => setActiveClassId(val)}
              options={classOptions}
              placeholder="Select Class..."
              className="h-8 w-36 sm:w-44 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 text-xs font-semibold text-stone-800 dark:text-stone-100"
            />
          </div>

          {/* CENTER: Exam Phase + View Mode */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Exam Phase — inline pill group */}
            <div className="flex items-center bg-stone-100 dark:bg-white/5 rounded-full p-0.5 border border-stone-200/80 dark:border-white/10 gap-0.5">
              {(['bot', 'mot', 'eot'] as const).map((phase) => (
                <button
                  key={phase}
                  type="button"
                  onClick={() => setExamPhase(phase)}
                  className={`h-7 px-2.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
                    examPhase === phase
                      ? phase === 'eot'
                        ? 'bg-[#0D5C3A] text-white shadow-xs'
                        : 'bg-stone-700 text-white shadow-xs'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
                  }`}
                >
                  {phase.toUpperCase()}
                </button>
              ))}
            </div>

            {/* View Mode — Sheet / Analysis / Top 10 */}
            <div className="flex items-center bg-stone-100 dark:bg-white/5 rounded-full p-0.5 border border-stone-200/80 dark:border-white/10 gap-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('assessment')}
                className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === 'assessment'
                    ? 'bg-[#D97706] text-white shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
                }`}
              >
                <ScrollText className="w-3 h-3" strokeWidth={2.25} />
                <span>Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('analysis')}
                className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === 'analysis'
                    ? 'bg-[#D97706] text-white shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3 h-3" strokeWidth={2.25} />
                <span>Analysis</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('top_students')}
                className={`h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === 'top_students'
                    ? 'bg-[#D97706] text-white shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white'
                }`}
              >
                <Award className="w-3 h-3" strokeWidth={2.25} />
                <span>Top 10</span>
              </button>
            </div>
          </div>

          {/* RIGHT: Export CSV + Print Broadsheet */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleExportCSV}
              disabled={isLoading || !assessmentData.students.length}
              title="Export Broadsheet CSV"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10 border border-stone-200 dark:border-white/10 transition cursor-pointer disabled:opacity-40 shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4" strokeWidth={2.25} />
            </button>

            <button
              onClick={handlePrintBroadsheet}
              disabled={isLoading || !assessmentData.students.length}
              title="Print Official Broadsheet"
              className="h-8 px-3 rounded-full bg-gradient-to-r from-[#0D5C3A] to-[#117A4D] hover:from-[#09472C] hover:to-[#0D5C3A] text-white ring-1 ring-[#D97706]/50 shadow-md text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition shrink-0"
            >
              <Printer className="w-3.5 h-3.5" strokeWidth={2.25} />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE AREA */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-3 pt-2 pb-8 flex flex-col min-w-0 gap-2.5">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24">
            <JiddahLoader />
            <p className="mt-4 text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest font-sans">
              Loading Theology Broadsheets &amp; Reconciling Marks...
            </p>
          </div>
        ) : !data || !activeClassId ? (
          <TheologyHubEmptyState />
        ) : (
          <AnimatePresence mode="wait">
            {/* VIEW 1: BROADSHEET TABLE (CORE ASSESSMENT SHEET IN AUTHENTIC RTL ARABIC) */}
            {activeTab === 'assessment' && (
              <motion.div
                key="sheet"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col gap-2.5 min-w-0"
              >
                {/* Search & Filter strip — Arabic labels */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs" dir="rtl">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search
                        className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        strokeWidth={2.25}
                      />
                      <input
                        type="text"
                        placeholder="ابحث باسم التلميذ أو رقم القيد..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pr-9 pl-3 py-1.5 rounded-[10px] text-xs bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#0D5C3A] font-arabic text-right"
                        dir="rtl"
                      />
                    </div>

                    {/* Division Filter Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto text-xs py-0.5">
                      <span className="text-[10px] font-bold tracking-wider text-stone-400 ml-1 shrink-0 font-arabic">
                        التقدير:
                      </span>
                      {(['all', 'I', 'II', 'III', 'IV', 'U'] as const).map((div) => (
                        <button
                          key={div}
                          onClick={() => setDivisionFilter(div)}
                          className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer font-sans ${
                            divisionFilter === div
                              ? 'bg-[#0D5C3A] text-white shadow-xs'
                              : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
                          }`}
                        >
                          {div === 'all' ? 'الكل' : `Div ${div}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ——————————————————————————————————————————————
                      ASSESSMENT SHEET: Pure Arabic, matches reference image exactly
                      Columns: م | اسم التلميذ/ة | [subjects] | المجموع | الترتيب | الملاحظات
                  —————————————————————————————————————————————— */}
                  <div
                    dir="rtl"
                    className="rounded-2xl border border-[#0D5C3A]/15 dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-xs overflow-hidden flex flex-col max-h-[calc(100dvh-200px)]"
                  >
                    <div className="overflow-x-auto overflow-y-auto [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)]">
                      <table className="w-full text-right border-collapse text-[12px]">
                        {/* ——— HEADER ——— */}
                        <thead className="sticky top-0 z-10 bg-stone-50/95 dark:bg-[#1A2621]/95 backdrop-blur-md border-b-2 border-[#0D5C3A]/20 dark:border-white/10">
                          <tr>
                            {/* م — sticky right */}
                            <th className="sticky right-0 z-20 bg-stone-50 dark:bg-[#1A2621] py-3 px-2 font-extrabold text-center w-10 border-l border-stone-200 dark:border-white/10 text-stone-600 dark:text-stone-300 font-arabic text-[12px]">
                              م
                            </th>

                            {/* Student Name — sticky */}
                            <th className="sticky right-10 z-20 bg-stone-50 dark:bg-[#1A2621] py-3 px-4 font-extrabold text-right min-w-[180px] border-l border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-200 font-arabic text-[12px]">
                              اسم التلميذ/ة
                            </th>

                            {/* Dynamic subject columns */}
                            {assessmentData.orderedSubjects.map((sub) => (
                              <th
                                key={sub.id}
                                className="py-3 px-3 font-extrabold text-center border-l border-stone-200 dark:border-white/10 min-w-[80px] text-[#0D5C3A] dark:text-emerald-400 font-arabic text-[12px] leading-tight"
                              >
                                {sub.subject_name_arabic || sub.subject_name}
                              </th>
                            ))}

                            {/* المجموع */}
                            <th className="py-3 px-3 font-extrabold text-center border-l border-stone-200 dark:border-white/10 min-w-[72px] bg-emerald-50/60 dark:bg-emerald-950/20 text-[#0D5C3A] dark:text-emerald-400 font-arabic text-[12px]">
                              المجموع
                            </th>

                            {/* الترتيب */}
                            <th className="py-3 px-3 font-extrabold text-center border-l border-stone-200 dark:border-white/10 min-w-[60px] bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 font-arabic text-[12px]">
                              الترتيب
                            </th>

                            {/* الملاحظات */}
                            <th className="py-3 px-3 font-extrabold text-center border-l border-stone-200 dark:border-white/10 min-w-[72px] text-stone-500 dark:text-stone-400 font-arabic text-[12px]">
                              الملاحظات
                            </th>
                          </tr>
                        </thead>

                        {/* ——— BODY ——— */}
                        <tbody className="divide-y divide-stone-100 dark:divide-white/[0.04]">
                          {filteredStudents.length === 0 ? (
                            <tr>
                              <td
                                colSpan={assessmentData.orderedSubjects.length + 4}
                                className="text-center py-14 text-stone-400 font-medium text-sm font-arabic"
                              >
                                لم يتم العثور على تلاميذ يطابقون خيارات البحث.
                              </td>
                            </tr>
                          ) : (
                            filteredStudents.map((st, idx) => (
                              <tr
                                key={st.id}
                                className="hover:bg-[#0D5C3A]/[0.025] dark:hover:bg-white/[0.015] transition-colors cursor-pointer group"
                                onClick={() => {
                                  router.push(`/admin/reports?student_id=${st.student_id}&term_id=${activeTermId}&curriculum=theology`)
                                }}
                              >
                                {/* م — sticky */}
                                <td className="sticky right-0 z-10 bg-white dark:bg-[#151F1B] group-hover:bg-stone-50/80 dark:group-hover:bg-[#1A2621]/80 py-2.5 px-2 text-center font-bold text-stone-400 text-[12px] border-l border-stone-100 dark:border-white/[0.04] w-10">
                                  {idx + 1}
                                </td>

                                {/* اسم التلميذ/ة — sticky */}
                                <td className="sticky right-10 z-10 bg-white dark:bg-[#151F1B] group-hover:bg-stone-50/80 dark:group-hover:bg-[#1A2621]/80 py-2.5 px-4 text-right border-l border-stone-100 dark:border-white/[0.04] min-w-[180px]">
                                  <div className="font-extrabold text-stone-900 dark:text-stone-100 font-arabic text-[13px] leading-tight">
                                    {st.arabic_name || st.name}
                                  </div>
                                  {st.arabic_name && st.name && (
                                    <div className="text-[10px] text-stone-400 font-sans font-normal mt-0.5">
                                      {st.name}
                                    </div>
                                  )}
                                </td>

                                {/* Subject score columns */}
                                {assessmentData.orderedSubjects.map((sub) => {
                                  const score = st.subjectScores[sub.id]
                                  const numScore = score != null ? Number(score) : null
                                  return (
                                    <td
                                      key={sub.id}
                                      className="py-2.5 px-3 text-center border-l border-stone-100 dark:border-white/[0.04]"
                                    >
                                      <span className={`font-mono font-black text-[13px] ${
                                        numScore == null
                                          ? 'text-stone-300 dark:text-stone-700'
                                          : numScore >= 85
                                          ? 'text-emerald-700 dark:text-emerald-400'
                                          : numScore >= 50
                                          ? 'text-stone-800 dark:text-stone-200'
                                          : 'text-rose-600 dark:text-rose-400'
                                      }`}>
                                        {numScore != null ? numScore : '—'}
                                      </span>
                                    </td>
                                  )
                                })}

                                {/* المجموع */}
                                <td className="py-2.5 px-3 text-center border-l border-stone-100 dark:border-white/[0.04] bg-emerald-50/30 dark:bg-emerald-950/[0.08]">
                                  <span className="font-mono font-black text-[13px] text-[#0D5C3A] dark:text-emerald-400">
                                    {st.total ? st.total : '—'}
                                  </span>
                                </td>

                                {/* الترتيب */}
                                <td className="py-2.5 px-3 text-center border-l border-stone-100 dark:border-white/[0.04] bg-amber-50/30 dark:bg-amber-950/[0.06]">
                                  <span className="font-mono font-black text-[13px] text-amber-800 dark:text-amber-400">
                                    {st.position !== '-' ? st.position : '—'}
                                  </span>
                                </td>

                                {/* الملاحظات — Arabic remark badge */}
                                <td className="py-2.5 px-3 text-center border-l border-stone-100 dark:border-white/[0.04]">
                                  <RemarkBadge score={typeof st.total === 'number' && st.total > 0 ? st.total / Math.max(assessmentData.orderedSubjects.length, 1) : null} />
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>

                        {/* ——— FOOTER: Class averages + pass rate ——— */}
                        {broadsheetSummary && (
                          <tfoot className="sticky bottom-0 z-10 bg-stone-100/95 dark:bg-[#1A2621]/95 backdrop-blur-md border-t-2 border-[#0D5C3A]/30 font-arabic">
                            <tr className="text-[11px] font-extrabold text-stone-700 dark:text-stone-200">
                              <td
                                colSpan={2}
                                className="sticky right-0 z-20 bg-stone-100 dark:bg-[#1A2621] py-2 px-4 text-right text-[11px] text-[#0D5C3A] dark:text-emerald-400 border-l border-stone-200 dark:border-white/10"
                              >
                                متوسط الفصل
                              </td>
                              {assessmentData.orderedSubjects.map((sub) => {
                                const stat = broadsheetSummary.subjectStats[sub.id]
                                return (
                                  <td
                                    key={sub.id}
                                    className="py-2 px-3 text-center font-mono border-l border-stone-200 dark:border-white/10"
                                  >
                                    {stat ? stat.avg : '—'}
                                  </td>
                                )
                              })}
                              <td className="py-2 px-3 text-center font-mono text-[#0D5C3A] dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 border-l border-stone-200 dark:border-white/10">
                                {broadsheetSummary.classAverageTotal}
                              </td>
                              <td className="py-2 px-3 text-center border-l border-stone-200 dark:border-white/10">—</td>
                              <td className="py-2 px-3 text-center text-[10px] text-stone-400 border-l border-stone-200 dark:border-white/10">
                                {broadsheetSummary.satCandidates}/{broadsheetSummary.totalCandidates}
                              </td>
                            </tr>
                            <tr className="text-[10px] text-stone-500 dark:text-stone-400">
                              <td
                                colSpan={2}
                                className="sticky right-0 z-20 bg-stone-100 dark:bg-[#1A2621] py-1.5 px-4 text-right border-l border-stone-200 dark:border-white/10 font-arabic"
                              >
                                نسبة النجاح (٥٠٪ فأعلى)
                              </td>
                              {assessmentData.orderedSubjects.map((sub) => {
                                const stat = broadsheetSummary.subjectStats[sub.id]
                                return (
                                  <td
                                    key={sub.id}
                                    className="py-1.5 px-3 text-center font-mono text-emerald-700 dark:text-emerald-400 border-l border-stone-200 dark:border-white/10"
                                  >
                                    {stat ? `${stat.passRate}%` : '—'}
                                  </td>
                                )
                              })}
                              <td colSpan={3} className="py-1.5 px-3 text-center text-[10px] border-l border-stone-200 dark:border-white/10 font-arabic">
                                الممتحنون: {broadsheetSummary.satCandidates} من {broadsheetSummary.totalCandidates}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
              </motion.div>
            )}

            {/* VIEW 2: COHORT ANALYTICS */}
            {activeTab === 'analysis' && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col gap-5 min-w-0"
              >
                {/* 4 Executive KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 font-sans">
                        Total Enrolled
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {broadsheetSummary ? broadsheetSummary.totalCandidates : 0}
                      </h3>
                      <p className="text-[10px] text-stone-500 mt-0.5">Theology Cohort</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-[#0D5C3A] dark:text-emerald-400">
                      <Users className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                  </div>

                  <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 font-sans">
                        Class Mean Total
                      </p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {broadsheetSummary ? broadsheetSummary.classAverageTotal : 0}
                      </h3>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        High: {broadsheetSummary?.highestTotal || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <TrendingUp className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                  </div>

                  <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 font-sans">
                        Div I &amp; II Distinction
                      </p>
                      <h3 className="text-2xl font-black text-[#0D5C3A] dark:text-emerald-400 mt-1">
                        {(broadsheetSummary?.divCounts.I || 0) + (broadsheetSummary?.divCounts.II || 0)}
                      </h3>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        {broadsheetSummary && broadsheetSummary.totalCandidates > 0
                          ? Math.round(
                              (((broadsheetSummary.divCounts.I || 0) + (broadsheetSummary.divCounts.II || 0)) /
                                broadsheetSummary.totalCandidates) *
                                100
                            )
                          : 0}
                        % of class
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
                      <Percent className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                  </div>

                  <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 font-sans">
                        Exam Phase
                      </p>
                      <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 uppercase">
                        {examPhase}
                      </h3>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        {activeClass?.class_name_arabic || activeClass?.class_name_english}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <Sparkles className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                  </div>
                </div>

                {/* Subject Performance Matrix Table */}
                <div className="rounded-2xl border border-[#0D5C3A]/12 dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-xs p-5">
                  <h3 className="text-sm font-extrabold text-stone-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#0D5C3A]" strokeWidth={2.25} />
                    <span>Theology Subject Performance Breakdown</span>
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-stone-200 dark:border-white/10 text-stone-400 text-[10px] font-extrabold uppercase tracking-wider">
                          <th className="py-2 px-3">Subject Name</th>
                          <th className="py-2 px-3 text-center">Mean Score</th>
                          <th className="py-2 px-3 text-center">Highest Mark</th>
                          <th className="py-2 px-3 text-center">Lowest Mark</th>
                          <th className="py-2 px-3 text-center">Pass Rate (≥50%)</th>
                          <th className="py-2 px-3 min-w-[140px]">Performance Bar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-white/5 font-medium">
                        {assessmentData.orderedSubjects.map((sub) => {
                          const stat = broadsheetSummary?.subjectStats[sub.id]
                          const avg = stat?.avg || 0
                          const passRate = stat?.passRate || 0
                          return (
                            <tr key={sub.id} className="hover:bg-stone-50 dark:hover:bg-white/[0.02]">
                              <td className="py-3 px-3">
                                <div className="font-arabic font-extrabold text-stone-900 dark:text-stone-100 text-sm" dir="rtl">
                                  {sub.subject_name_arabic || sub.subject_name}
                                </div>
                                <div className="text-[10px] text-stone-400">{sub.level || activeLevel}</div>
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-xs">{avg}</td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-xs text-emerald-600">
                                {stat?.highest || 0}
                              </td>
                              <td className="py-3 px-3 text-center font-mono font-bold text-xs text-rose-600">
                                {stat?.lowest || 0}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-xs">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  {passRate}%
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-[linear-gradient(90deg_in_oklch,oklch(0.68_0.19_48),oklch(0.42_0.11_158))] rounded-full transition-all duration-500"
                                    style={{ width: `${passRate}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Division Distribution Breakdown */}
                {broadsheetSummary && (
                  <div className="rounded-2xl border border-[#0D5C3A]/12 dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-xs p-5">
                    <h3 className="text-sm font-extrabold text-stone-900 dark:text-white uppercase tracking-wider mb-3">
                      Division Classification Cohort
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                      {(['I', 'II', 'III', 'IV', 'U'] as const).map((div) => {
                        const count = broadsheetSummary.divCounts[div] || 0
                        const pct =
                          broadsheetSummary.totalCandidates > 0
                            ? Math.round((count / broadsheetSummary.totalCandidates) * 100)
                            : 0
                        return (
                          <div
                            key={div}
                            className="p-3 rounded-xl border border-stone-200/80 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.02] text-center"
                          >
                            <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                              Division {div}
                            </span>
                            <div className="text-xl font-black text-stone-900 dark:text-white mt-1">{count}</div>
                            <div className="text-[10px] font-bold text-[#0D5C3A] dark:text-emerald-400">{pct}%</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* VIEW 3: TOP 10 MERIT ROLL */}
            {activeTab === 'top_students' && (
              <motion.div
                key="top"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col gap-5 min-w-0"
              >
                {/* Podium Cards for Top 3 */}
                {top10Data.length >= 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-4">
                    {/* 2nd Place Silver */}
                    <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-slate-300/60 dark:border-white/10 shadow-md text-center flex flex-col items-center order-2 md:order-1">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center shadow-inner mb-2">
                        <Medal className="w-6 h-6" strokeWidth={2.25} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        2nd Place
                      </span>
                      <h4 className="font-bold text-stone-900 dark:text-white text-sm mt-1">
                        {top10Data[1].name}
                      </h4>
                      {top10Data[1].arabic_name && (
                        <p className="font-arabic text-xs text-[#0D5C3A] font-bold mt-0.5" dir="rtl">
                          {top10Data[1].arabic_name}
                        </p>
                      )}
                      <div className="mt-2 text-xs font-mono font-black text-slate-700 dark:text-slate-300">
                        {top10Data[1].total} pts • Div {top10Data[1].division}
                      </div>
                    </div>

                    {/* 1st Place Gold */}
                    <div className="rounded-2xl p-5 bg-[linear-gradient(135deg_in_oklch,oklch(0.92_0.07_80)_0%,oklch(0.85_0.12_75)_100%)] dark:bg-[linear-gradient(135deg_in_oklch,oklch(0.40_0.10_80)_0%,oklch(0.30_0.08_75)_100%)] border border-amber-400 shadow-xl text-center flex flex-col items-center order-1 md:order-2 scale-105 z-10">
                      <div className="w-14 h-14 rounded-full bg-amber-400 text-white flex items-center justify-center shadow-md mb-2">
                        <Trophy className="w-7 h-7" strokeWidth={2.25} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                        Class Champion — 1st Place
                      </span>
                      <h3 className="font-black text-stone-900 dark:text-white text-base mt-1">
                        {top10Data[0].name}
                      </h3>
                      {top10Data[0].arabic_name && (
                        <p className="font-arabic text-sm text-[#0D5C3A] dark:text-emerald-300 font-extrabold mt-0.5" dir="rtl">
                          {top10Data[0].arabic_name}
                        </p>
                      )}
                      <div className="mt-2.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-950 dark:text-amber-200 text-xs font-mono font-black">
                        {top10Data[0].total} pts • Div {top10Data[0].division} (Agg {top10Data[0].aggregate ?? '-'})
                      </div>
                    </div>

                    {/* 3rd Place Bronze */}
                    <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-amber-600/30 dark:border-white/10 shadow-md text-center flex flex-col items-center order-3">
                      <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center shadow-inner mb-2">
                        <Award className="w-6 h-6" strokeWidth={2.25} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                        3rd Place
                      </span>
                      <h4 className="font-bold text-stone-900 dark:text-white text-sm mt-1">
                        {top10Data[2].name}
                      </h4>
                      {top10Data[2].arabic_name && (
                        <p className="font-arabic text-xs text-[#0D5C3A] font-bold mt-0.5" dir="rtl">
                          {top10Data[2].arabic_name}
                        </p>
                      )}
                      <div className="mt-2 text-xs font-mono font-black text-amber-800 dark:text-amber-400">
                        {top10Data[2].total} pts • Div {top10Data[2].division}
                      </div>
                    </div>
                  </div>
                )}

                {/* Top 10 Table */}
                <div className="rounded-2xl border border-[#0D5C3A]/15 dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-stone-900 dark:text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" strokeWidth={2.25} />
                      <span>Official Top 10 Islamic Theology Merit Roll</span>
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-stone-200 dark:border-white/10 text-stone-400 text-[10px] font-extrabold uppercase tracking-wider bg-stone-50 dark:bg-white/[0.02]">
                          <th className="py-2.5 px-3 text-center w-12">Rank</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3 font-arabic" dir="rtl">
                            الاسم بالعربية
                          </th>
                          <th className="py-2.5 px-3 text-center">Admission #</th>
                          <th className="py-2.5 px-3 text-center">Total Marks</th>
                          <th className="py-2.5 px-3 text-center">Aggregate</th>
                          <th className="py-2.5 px-3 text-center">Division</th>
                          <th className="py-2.5 px-3 text-center">Report</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-white/5 font-medium">
                        {top10Data.map((st) => (
                          <tr
                            key={st.id}
                            className="hover:bg-amber-50/40 dark:hover:bg-white/[0.02] cursor-pointer"
                            onClick={() =>
                              router.push(
                                `/admin/reports?student_id=${st.student_id}&term_id=${activeTermId}&curriculum=theology`
                              )
                            }
                          >
                            <td className="py-2.5 px-3 text-center font-mono font-black text-amber-700 dark:text-amber-400 text-xs">
                              {st.position}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-stone-900 dark:text-white">{st.name}</td>
                            <td className="py-2.5 px-3 font-arabic font-bold text-[#0D5C3A] dark:text-emerald-400" dir="rtl">
                              {st.arabic_name || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-stone-400">{st.admission_number || '-'}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-black text-stone-900 dark:text-white">
                              {st.total}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-extrabold text-[#0D5C3A] dark:text-emerald-400">
                              {st.aggregate ?? '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Div {st.division}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <ExternalLink className="w-3.5 h-3.5 text-stone-400 inline-block" strokeWidth={2.25} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* ======================================================== */}
      {/* 3. FORMAL INSTITUTIONAL LANDSCAPE PRINT BROADSHEET */}
      {/* Mounted via <PrintPortal pageOrientation="landscape"> */}
      {/* Features double-border frame: 4px solid #14532D outer, 1.5px solid #C59B27 inner */}
      {/* ======================================================== */}
      <PrintPortal pageOrientation="landscape">
        <div
          dir="rtl"
          className="theology-broadsheet-print report-sheet-landscape bg-white text-black font-sans text-xs w-full min-h-screen"
          style={{
            boxSizing: 'border-box',
            padding: '4px',
            backgroundColor: '#ffffff',
            color: '#000000',
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}
        >
          {/* Compatibility Anchor */}
          <div className="hidden" style={{ display: 'none' }}>
            <OfficialPrintLetterhead
              documentTitle="ACADEMIC PERFORMANCE BROADSHEET — ISLAMIC THEOLOGY"
              arabicDocumentTitle="كشف درجات الطلاب العام — قسم العلوم الشرعية"
            />
            <OfficialPrintSignaturesFooter rtl />
          </div>

          {/* Official Jiddah Islamic Schools Double-Border Frame */}
          <div
            style={{
              border: '4px solid #14532D',
              padding: '2.5px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
            }}
          >
            <div
              style={{
                border: '1.5px solid #C59B27',
                padding: '6px 10px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#ffffff',
                position: 'relative',
              }}
            >
              {/* Header: Centered Crest, Bilingual Identity & Motto */}
              <header
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  paddingBottom: '5px',
                  borderBottom: '2px solid #0D5C3A',
                }}
              >
                <img
                  src="/logo-512h.png"
                  alt="Jiddah Crest"
                  style={{ width: '50px', height: '50px', objectFit: 'contain', flexShrink: 0 }}
                />
                <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
                  <h1
                    style={{
                      fontSize: '15px',
                      fontWeight: 900,
                      color: '#0D5C3A',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      margin: 0,
                      lineHeight: 1.15,
                    }}
                  >
                    JIDDAH ISLAMIC NURSERY &amp; PRIMARY SCHOOL
                  </h1>
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#0D5C3A',
                      margin: '2px 0 0',
                      fontFamily: "'Amiri', 'Cairo', serif",
                    }}
                  >
                    مدرسة جدة الإسلامية للروضة والابتدائية
                  </p>
                  <p
                    style={{
                      fontSize: '9px',
                      fontStyle: 'italic',
                      color: '#8A6D1B',
                      margin: '1px 0 0',
                      fontWeight: 700,
                    }}
                  >
                    &ldquo;Striving for Life &amp; The Hereafter&rdquo;
                  </p>
                  <p style={{ fontSize: '8px', color: '#444444', margin: '1px 0 0' }}>
                    P.O. Box 34008, Kampala – Uganda • Tel: +256 705 316961 / +256 787 779909
                  </p>
                </div>
                <div style={{ width: '50px', height: '50px', flexShrink: 0 }} />
              </header>

              {/* Formal Document Title Banner in Forest Emerald (#0D5C3A) */}
              <div
                style={{
                  backgroundColor: '#0D5C3A',
                  color: '#ffffff',
                  textAlign: 'center',
                  padding: '3px 8px',
                  margin: '5px 0 4px',
                  borderRadius: '3px',
                }}
              >
                <h2
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 900,
                    margin: 0,
                    letterSpacing: '0.5px',
                    fontFamily: "'Amiri', 'Cairo', serif",
                  }}
                >
                  كشف درجات الطلاب العام — قسم العلوم الشرعية واللغة العربية
                </h2>
              </div>

              {/* Clean Metadata Strip */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '8.5px',
                  fontWeight: 700,
                  padding: '3px 8px',
                  backgroundColor: '#F0F9F4',
                  border: '1px solid #C8E6D4',
                  borderRadius: '3px',
                  marginBottom: '5px',
                  color: '#0B3D26',
                  fontFamily: "'Amiri', 'Cairo', serif",
                }}
              >
                <span>الفترة: {activeTerm?.label || 'الفترة الثالثة'}</span>
                <span>الصف: {activeClass?.class_name_arabic || activeClass?.class_name_english}</span>
                <span>السنة الدراسية: {activeTerm?.academic_year || 2026}</span>
                <span>الاختبار: {examPhase === 'eot' ? 'نهاية الفترة (EOT)' : 'منتصف الفترة (MOT)'}</span>
                <span>عدد الطلاب: {assessmentData.students.length}</span>
              </div>

              {/* Perfectly Aligned, High-Contrast Marks Table with Alternating Shading */}
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '8px',
                  lineHeight: 1.2,
                  border: '1px solid #14532D',
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#0D5C3A', color: '#ffffff', fontWeight: 900 }}>
                    <th style={{ border: '1px solid #0B3D26', padding: '2px 3px', textAlign: 'center', width: '22px' }}>م</th>
                    <th style={{ border: '1px solid #0B3D26', padding: '2px 4px', textAlign: 'center', width: '50px' }}>رقم القيد</th>
                    <th style={{ border: '1px solid #0B3D26', padding: '2px 5px', textAlign: 'right', minWidth: '130px' }}>اسم التلميذ/ة</th>
                    {assessmentData.orderedSubjects.map((sub) => (
                      <th key={sub.id} colSpan={2} style={{ border: '1px solid #0B3D26', padding: '2px 3px', textAlign: 'center', minWidth: '55px' }}>
                        <div style={{ fontSize: '8.5px', fontWeight: 900 }}>{sub.subject_name_arabic || sub.subject_name}</div>
                        <div style={{ fontSize: '6.5px', opacity: 0.9 }}>درجة / تقدير</div>
                      </th>
                    ))}
                    <th style={{ border: '1px solid #0B3D26', padding: '2px 3px', textAlign: 'center', width: '34px' }}>المجموع</th>
                    <th style={{ border: '1px solid #0B3D26', padding: '2px 3px', textAlign: 'center', width: '28px' }}>المعدل</th>
                    <th style={{ border: '1px solid #0B3D26', padding: '2px 3px', textAlign: 'center', width: '28px' }}>التقدير</th>
                    <th style={{ border: '1px solid #0B3D26', padding: '2px 3px', textAlign: 'center', width: '28px' }}>الترتيب</th>
                  </tr>
                </thead>
                <tbody>
                  {assessmentData.students.map((st, idx) => (
                    <tr
                      key={st.id}
                      style={{
                        backgroundColor: idx % 2 === 1 ? '#F8F9FA' : '#FFFFFF',
                        borderBottom: '1px solid #E2E8F0',
                      }}
                    >
                      <td style={{ border: '1px solid #CBD5E1', padding: '1.5px 2px', textAlign: 'center', fontWeight: 700 }}>
                        {idx + 1}
                      </td>
                      <td style={{ border: '1px solid #CBD5E1', padding: '1.5px 2px', textAlign: 'center', fontFamily: 'monospace', fontSize: '7.5px' }}>
                        {st.admission_number || '-'}
                      </td>
                      <td style={{ border: '1px solid #CBD5E1', padding: '1.5px 5px', textAlign: 'right', fontWeight: 800 }}>
                        <div style={{ color: '#0D5C3A' }}>{st.arabic_name || st.name}</div>
                        {st.arabic_name && st.name && (
                          <div style={{ fontSize: '7px', color: '#64748B', fontWeight: 400 }}>{st.name}</div>
                        )}
                      </td>
                      {assessmentData.orderedSubjects.map((sub) => {
                        const score = st.subjectScores[sub.id]
                        const grade = st.subjectGrades[sub.id]
                        return (
                          <React.Fragment key={sub.id}>
                            <td style={{ border: '1px solid #CBD5E1', padding: '1.5px 2px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800 }}>
                              {score != null ? score : '-'}
                            </td>
                            <td style={{ border: '1px solid #CBD5E1', padding: '1.5px 1px', textAlign: 'center', fontSize: '7px', fontWeight: 800 }}>
                              {grade ? (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.5px 2px',
                                    borderRadius: '2px',
                                    backgroundColor:
                                      grade === 'ممتاز'
                                        ? '#DCFCE7'
                                        : grade === 'جيد جداً'
                                        ? '#CCFBF1'
                                        : grade === 'جيد'
                                        ? '#FEF3C7'
                                        : grade === 'مقبول'
                                        ? '#FFEDD5'
                                        : '#FFE4E6',
                                    color:
                                      grade === 'ممتاز'
                                        ? '#166534'
                                        : grade === 'جيد جداً'
                                        ? '#115E59'
                                        : grade === 'جيد'
                                        ? '#92400E'
                                        : grade === 'مقبول'
                                        ? '#9A3412'
                                        : '#9F1239',
                                  }}
                                >
                                  {grade}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                          </React.Fragment>
                        )
                      })}
                      <td style={{ border: '1px solid #CBD5E1', padding: '1.5px 2px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, backgroundColor: '#F1F5F9' }}>
                        {st.total || '-'}
                      </td>
                      <td style={{ border: '1px solid #CBD5E1', padding: '1.5px 2px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, color: '#0D5C3A' }}>
                        {st.aggregate ?? '-'}
                      </td>
                      <td style={{ border: '1px solid #CBD5E1', padding: '1.5px 2px', textAlign: 'center', fontWeight: 900 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.5px 3px',
                            borderRadius: '2px',
                            fontSize: '7.5px',
                            backgroundColor:
                              st.division === 'I'
                                ? '#DCFCE7'
                                : st.division === 'II'
                                ? '#CCFBF1'
                                : st.division === 'III'
                                ? '#FEF3C7'
                                : st.division === 'IV'
                                ? '#FFEDD5'
                                : '#F1F5F9',
                            color:
                              st.division === 'I'
                                ? '#166534'
                                : st.division === 'II'
                                ? '#115E59'
                                : st.division === 'III'
                                ? '#92400E'
                                : st.division === 'IV'
                                ? '#9A3412'
                                : '#475569',
                          }}
                        >
                          {st.division}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #CBD5E1', padding: '1.5px 2px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 900, color: '#B45309' }}>
                        {st.position}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {broadsheetSummary && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#F0F9F4', fontWeight: 900, borderTop: '2px solid #0D5C3A' }}>
                      <td colSpan={3} style={{ border: '1px solid #0D5C3A', padding: '2px 5px', textAlign: 'right', color: '#0D5C3A' }}>
                        متوسط الفصل
                      </td>
                      {assessmentData.orderedSubjects.map((sub) => (
                        <td key={sub.id} colSpan={2} style={{ border: '1px solid #0D5C3A', padding: '2px 2px', textAlign: 'center', fontFamily: 'monospace' }}>
                          {broadsheetSummary.subjectStats[sub.id]?.avg ?? '-'}
                        </td>
                      ))}
                      <td style={{ border: '1px solid #0D5C3A', padding: '2px 2px', textAlign: 'center', fontFamily: 'monospace', color: '#0D5C3A' }}>
                        {broadsheetSummary.classAverageTotal}
                      </td>
                      <td colSpan={3} style={{ border: '1px solid #0D5C3A', padding: '2px 2px', textAlign: 'center', fontSize: '7.5px', color: '#475569' }}>
                        المتوسط: {broadsheetSummary.classAverageTotal}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>

              {/* Division Summary Box */}
              {broadsheetSummary && (
                <div
                  style={{
                    marginTop: '4px',
                    padding: '2px 6px',
                    border: '1px solid #14532D',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '7.5px',
                    backgroundColor: '#F8F9FA',
                  }}
                >
                  <span style={{ fontWeight: 800, color: '#0D5C3A' }}>ملخص التقديرات الرسمي:</span>
                  <span>التقدير الأول: <strong>{broadsheetSummary.divCounts.I}</strong></span>
                  <span>التقدير الثاني: <strong>{broadsheetSummary.divCounts.II}</strong></span>
                  <span>التقدير الثالث: <strong>{broadsheetSummary.divCounts.III}</strong></span>
                  <span>التقدير الرابع: <strong>{broadsheetSummary.divCounts.IV}</strong></span>
                  <span>غير مجتاز (U): <strong>{broadsheetSummary.divCounts.U}</strong></span>
                  <span>إجمالي الممتحنين: <strong>{broadsheetSummary.satCandidates}</strong> من <strong>{broadsheetSummary.totalCandidates}</strong></span>
                </div>
              )}

              {/* Official Sign-Off Footer with OfficialReportStamp */}
              <div style={{ marginTop: '6px', position: 'relative' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    textAlign: 'center',
                    fontSize: '8px',
                    paddingTop: '4px',
                  }}
                >
                  <div style={{ borderTop: '1px dashed #64748B', paddingTop: '3px' }}>
                    <p style={{ fontWeight: 800, margin: 0 }}>مُعدّ الكشف: معلم الفصل</p>
                    <p style={{ fontSize: '7px', color: '#64748B', margin: '1px 0 0' }}>التوقيع والتاريخ</p>
                  </div>
                  <div style={{ borderTop: '1px dashed #64748B', paddingTop: '3px' }}>
                    <p style={{ fontWeight: 800, margin: 0 }}>مُراجع: مشرف الدراسات (DOS)</p>
                    <p style={{ fontSize: '7px', color: '#64748B', margin: '1px 0 0' }}>التوقيع والتاريخ</p>
                  </div>
                  <div style={{ borderTop: '1px dashed #64748B', paddingTop: '3px', position: 'relative' }}>
                    <p style={{ fontWeight: 800, margin: 0 }}>معتمد: مدير المدرسة والختم الرسمي</p>
                    <p style={{ fontSize: '7px', color: '#64748B', margin: '1px 0 0' }}>اعتماد مدير المدرسة والختم الرسمي</p>
                  </div>
                </div>

                {/* Authentic Circular School Stamp */}
                <div
                  style={{
                    position: 'absolute',
                    left: '30px',
                    bottom: '-6px',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                >
                  <OfficialReportStamp
                    reportData={{
                      stamp_config: {
                        ink_color: '#0D5C3A',
                        scale: 85,
                      },
                    }}
                    maxWidth={110}
                    maxHeight={52}
                  />
                </div>
              </div>

              {/* Institutional footer line */}
              <div
                style={{
                  marginTop: '3px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '7px',
                  color: '#64748B',
                  borderTop: '1px solid #E2E8F0',
                  paddingTop: '2px',
                }}
              >
                <span>نظام التقارير الذكي — مدرسة جدة الإسلامية للروضة والابتدائية</span>
                <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
              </div>
            </div>
          </div>
        </div>
      </PrintPortal>
    </div>
  )
}

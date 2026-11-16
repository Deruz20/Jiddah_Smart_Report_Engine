'use client'

import React, { useState, useEffect, useMemo, memo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Loader2,
  ScrollText,
  BookOpen,
  Award,
  Download,
  Printer,
  FileSpreadsheet,
  ChevronDown,
  Search,
  Filter,
  Eye,
  Trophy,
  Medal,
  CheckCircle2,
  BarChart3,
  Users,
  TrendingUp,
  Percent,
  Sparkles,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { TheologyHubEmptyState } from './TheologyHubEmptyState'
import { OfficialPrintLetterhead, OfficialPrintSignaturesFooter } from '@/components/print/OfficialPrintLetterhead'
import { OfficialReportStamp } from '@/components/reports/StampGenerator'
import { PrintPortal } from '@/components/reports/PrintPortal'
import { CustomPillSelect } from '@/components/ui/custom-pill-select'
import { JiddahLoader } from '@/components/ui/jiddah-loader'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { generateAssessmentCSV, generateAnalysisCSV, generateTopStudentsCSV, downloadCSV, escapeCSV } from '@/utils/csvExport'
import { computeStandardRankings } from '@/lib/ranking'
import { getTheologyGradeNumber, getTheologyGradeDisplay, calculateTheologyAggregate, getDivision } from '@/lib/grading'

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
  const [isPrinting, setIsPrinting] = useState(false)
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
      { value: '', label: '-- اختر الصف / Select Class --' },
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
      'التربية الإسلامية',
      'التربية',
      'التوحيد والعقيدة',
      'التوحيد',
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
        className: cls.class_name_arabic,
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
    const classLabel = activeClass ? activeClass.class_name_english.replace(/\s+/g, '_') : 'Class'
    const filename = `Jiddah_Theology_Broadsheet_${classLabel}_${termLabel}_${examPhase.toUpperCase()}_2026.csv`

    const headers = [
      'Rank',
      'Admission No',
      'Student Name',
      'Arabic Name',
      'Gender',
      ...assessmentData.orderedSubjects.map((s) => `${s.subject_name_arabic} (Mark)`),
      ...assessmentData.orderedSubjects.map((s) => `${s.subject_name_arabic} (Grade)`),
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
      {/* 1. COMMANDING FOREST EMERALD + WARM MARIGOLD HEADER BANNER */}
      {/* ======================================================== */}
      <div className="print:hidden p-3 sm:p-5 max-w-7xl mx-auto w-full shrink-0">
        <div
          data-testid="theology-hub-banner"
          className="rounded-2xl p-3 sm:p-4 bg-[linear-gradient(135deg_in_oklch,oklch(0.38_0.12_155)_0%,oklch(0.28_0.09_160)_100%)] text-white shadow-xl border border-white/10"
        >
          {/* Top Title & Quick Actions Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D97706]/15 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-white/15 shadow-inner">
                <BookOpen className="w-5 h-5" strokeWidth={2.25} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                    مركز العلوم الشرعية — Theology Hub
                  </h1>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EA580C]/30 text-[#FED7AA] border border-[#EA580C]/40">
                    IPLE Standards
                  </span>
                </div>
                <p className="text-[11px] font-medium text-emerald-200/80">
                  Comprehensive Academic Broadsheet, Cohort Analytics &amp; Islamic Theology Merit Roll
                </p>
              </div>
            </div>

            {/* Print & CSV Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintBroadsheet}
                disabled={isLoading || !assessmentData.students.length}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-bold bg-white/15 hover:bg-white/25 active:scale-95 text-white border border-white/20 transition-all duration-150 backdrop-blur-md shadow-xs disabled:opacity-50"
              >
                <Printer className="w-4 h-4 text-emerald-300" strokeWidth={2.25} />
                <span>Print Broadsheet</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={isLoading || !assessmentData.students.length}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-bold bg-[linear-gradient(135deg_in_oklch,oklch(0.68_0.19_48),oklch(0.60_0.17_44))] hover:brightness-110 active:scale-95 text-white border border-amber-300/30 transition-all duration-150 shadow-md disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-100" strokeWidth={2.25} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Controls Bar Row: Concentric Radius + OKLCH Hierarchy */}
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-center">
            {/* Academic Term */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200/90 mb-1">
                Academic Term
              </label>
              <CustomPillSelect
                id="theology-hub-term-select"
                ariaLabel="Academic Term"
                value={activeTermId}
                onChange={(val) => setActiveTermId(val)}
                options={termOptions}
                className="w-full h-10 rounded-[10px] bg-black/20 hover:bg-black/30 text-white border border-white/15 text-xs font-semibold"
              />
            </div>

            {/* Class Cohort */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200/90 mb-1">
                Theology Class / الصف
              </label>
              <CustomPillSelect
                id="theology-hub-class-select"
                ariaLabel="Theology Class"
                value={activeClassId}
                onChange={(val) => setActiveClassId(val)}
                options={classOptions}
                placeholder="Select Class..."
                className="w-full h-10 rounded-[10px] bg-black/20 hover:bg-black/30 text-white border border-white/15 text-xs font-semibold"
              />
            </div>

            {/* Dashboard View Mode Toggle */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200/90 mb-1">
                View Mode
              </label>
              <div className="h-10 rounded-xl p-1 bg-black/25 backdrop-blur-md border border-white/15 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('assessment')}
                  className={`flex-1 h-full rounded-[8px] flex items-center justify-center gap-1 text-xs font-bold transition-all duration-200 ${
                    activeTab === 'assessment'
                      ? 'bg-[linear-gradient(135deg_in_oklch,oklch(0.68_0.19_48),oklch(0.60_0.17_44))] text-white shadow-xs'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ScrollText className="w-3.5 h-3.5" strokeWidth={2.25} />
                  <span>Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('analysis')}
                  className={`flex-1 h-full rounded-[8px] flex items-center justify-center gap-1 text-xs font-bold transition-all duration-200 ${
                    activeTab === 'analysis'
                      ? 'bg-[linear-gradient(135deg_in_oklch,oklch(0.68_0.19_48),oklch(0.60_0.17_44))] text-white shadow-xs'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" strokeWidth={2.25} />
                  <span>Analysis</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('top_students')}
                  className={`flex-1 h-full rounded-[8px] flex items-center justify-center gap-1 text-xs font-bold transition-all duration-200 ${
                    activeTab === 'top_students'
                      ? 'bg-[linear-gradient(135deg_in_oklch,oklch(0.68_0.19_48),oklch(0.60_0.17_44))] text-white shadow-xs'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" strokeWidth={2.25} />
                  <span>Top 10</span>
                </button>
              </div>
            </div>

            {/* Exam Phase Toggle */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-200/90 mb-1">
                Exam Phase
              </label>
              <div className="h-10 rounded-xl p-1 bg-black/25 backdrop-blur-md border border-white/15 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setExamPhase('mot')}
                  className={`flex-1 h-full rounded-[8px] flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                    examPhase === 'mot'
                      ? 'bg-white/25 text-white shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  MOT
                </button>
                <button
                  type="button"
                  onClick={() => setExamPhase('eot')}
                  className={`flex-1 h-full rounded-[8px] flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                    examPhase === 'eot'
                      ? 'bg-emerald-500/90 text-white shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  EOT
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN WORKSPACE AREA */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-5 pb-8 flex flex-col min-w-0">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24">
            <JiddahLoader />
            <p className="mt-4 text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
              Loading Theology Broadsheets &amp; Reconciling Marks...
            </p>
          </div>
        ) : !data || !activeClassId ? (
          <TheologyHubEmptyState />
        ) : (
          <AnimatePresence mode="wait">
            {/* VIEW 1: BROADSHEET TABLE */}
            {activeTab === 'assessment' && (
              <motion.div
                key="sheet"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col gap-3 min-w-0"
              >
                {/* Search, Filter & Quick-Stats Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 sm:p-3 rounded-xl bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <div className="relative flex-1">
                      <Search
                        className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2"
                        strokeWidth={2.25}
                      />
                      <input
                        type="text"
                        placeholder="Search student by name, Arabic name, or admission #..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#0D5C3A]"
                      />
                    </div>
                  </div>

                  {/* Division Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto text-xs py-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mr-1 shrink-0">
                      Division:
                    </span>
                    {(['all', 'I', 'II', 'III', 'IV', 'U'] as const).map((div) => (
                      <button
                        key={div}
                        onClick={() => setDivisionFilter(div)}
                        className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                          divisionFilter === div
                            ? 'bg-[#0D5C3A] text-white shadow-xs'
                            : 'bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {div === 'all' ? 'All' : `Div ${div}`}
                      </button>
                    ))}
                  </div>

                  {/* Toggle: Grades vs Scores Only */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowGrades(!showGrades)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold border border-[#0D5C3A]/20 dark:border-white/10 bg-emerald-50/60 dark:bg-emerald-950/30 text-[#0D5C3A] dark:text-emerald-300 hover:bg-emerald-100/60 transition-colors"
                    >
                      {showGrades ? 'Hide Subject Grades' : 'Show Subject Grades'}
                    </button>
                  </div>
                </div>

                {/* Broadsheet Container with Concentric Radius & Masked Scroll Edges */}
                <div className="rounded-2xl border border-[#0D5C3A]/15 dark:border-white/10 bg-white dark:bg-[#151F1B] shadow-xs overflow-hidden flex flex-col max-h-[calc(100dvh-230px)]">
                  <div className="overflow-x-auto overflow-y-auto [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)]">
                    <table className="w-full text-left border-collapse text-xs">
                      {/* Table Header */}
                      <thead className="sticky top-0 z-10 bg-stone-100/90 dark:bg-[#1A2621]/90 backdrop-blur-md text-stone-700 dark:text-stone-200 border-b border-stone-200 dark:border-white/10">
                        <tr>
                          <th className="sticky left-0 z-20 bg-stone-100 dark:bg-[#1A2621] py-2.5 px-3 font-extrabold text-[11px] uppercase tracking-wider text-center w-12 border-r border-stone-200 dark:border-white/10">
                            #
                          </th>
                          <th className="sticky left-12 z-20 bg-stone-100 dark:bg-[#1A2621] py-2.5 px-3 font-extrabold text-[11px] uppercase tracking-wider min-w-[200px] border-r border-stone-200 dark:border-white/10">
                            Student Name &amp; Arabic
                          </th>
                          {assessmentData.orderedSubjects.map((sub) => (
                            <th
                              key={sub.id}
                              colSpan={showGrades ? 2 : 1}
                              className="py-2.5 px-2 font-bold text-[11px] text-center border-r border-stone-200 dark:border-white/10 min-w-[90px]"
                            >
                              <div className="font-arabic font-extrabold text-[12px] text-[#0D5C3A] dark:text-emerald-400">
                                {sub.subject_name_arabic || sub.subject_name}
                              </div>
                              <div className="text-[9px] uppercase tracking-tight text-stone-400 dark:text-stone-500 font-sans">
                                {examPhase.toUpperCase()} Mark
                              </div>
                            </th>
                          ))}
                          <th className="py-2.5 px-2.5 font-black text-[11px] text-center bg-stone-200/50 dark:bg-white/5 border-r border-stone-200 dark:border-white/10 min-w-[70px]">
                            Total
                          </th>
                          <th className="py-2.5 px-2 font-black text-[11px] text-center bg-stone-200/50 dark:bg-white/5 border-r border-stone-200 dark:border-white/10 min-w-[60px]">
                            Agg
                          </th>
                          <th className="py-2.5 px-2 font-black text-[11px] text-center bg-stone-200/50 dark:bg-white/5 border-r border-stone-200 dark:border-white/10 min-w-[60px]">
                            Div
                          </th>
                          <th className="py-2.5 px-2.5 font-black text-[11px] text-center bg-amber-500/10 dark:bg-amber-400/10 text-amber-800 dark:text-amber-300 min-w-[55px]">
                            Rank
                          </th>
                          <th className="py-2.5 px-2 text-center text-[10px] uppercase font-bold text-stone-400 min-w-[60px]">
                            Report
                          </th>
                        </tr>
                      </thead>

                      {/* Table Body */}
                      <tbody className="divide-y divide-stone-100 dark:divide-white/5">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td
                              colSpan={assessmentData.orderedSubjects.length * (showGrades ? 2 : 1) + 6}
                              className="text-center py-12 text-stone-400 font-medium text-xs"
                            >
                              No students found matching current filters.
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map((st, idx) => (
                            <tr
                              key={st.id}
                              className="hover:bg-[#0D5C3A]/[0.03] dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                              onClick={() => {
                                router.push(`/admin/reports?student_id=${st.student_id}&term_id=${activeTermId}&curriculum=theology`)
                              }}
                            >
                              {/* Sticky Index */}
                              <td className="sticky left-0 z-10 bg-white dark:bg-[#151F1B] group-hover:bg-stone-50 dark:group-hover:bg-[#1A2621] py-2 px-3 text-center font-bold text-stone-400 text-xs border-r border-stone-100 dark:border-white/5">
                                {idx + 1}
                              </td>

                              {/* Sticky Student Name & Arabic */}
                              <td className="sticky left-12 z-10 bg-white dark:bg-[#151F1B] group-hover:bg-stone-50 dark:group-hover:bg-[#1A2621] py-2 px-3 border-r border-stone-100 dark:border-white/5 min-w-[200px]">
                                <div className="font-bold text-stone-900 dark:text-stone-100 text-xs flex items-center justify-between">
                                  <span>{st.name}</span>
                                  {st.arabic_name && (
                                    <span className="font-arabic font-bold text-[#0D5C3A] dark:text-emerald-400 text-xs ml-2" dir="rtl">
                                      {st.arabic_name}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-stone-400 font-mono">
                                  {st.admission_number || 'No ID'}
                                </div>
                              </td>

                              {/* Subject Columns */}
                              {assessmentData.orderedSubjects.map((sub) => {
                                const score = st.subjectScores[sub.id]
                                return (
                                  <React.Fragment key={sub.id}>
                                    <td className="py-2 px-2 text-center font-mono font-bold text-xs text-stone-800 dark:text-stone-200 border-r border-stone-100 dark:border-white/5">
                                      {score != null ? score : '-'}
                                    </td>
                                    {showGrades && (
                                      <td className="py-2 px-1 text-center border-r border-stone-100 dark:border-white/5">
                                        <RemarkBadge score={score} />
                                      </td>
                                    )}
                                  </React.Fragment>
                                )
                              })}

                              {/* Total */}
                              <td className="py-2 px-2.5 text-center font-mono font-black text-xs text-stone-900 dark:text-white bg-stone-50/50 dark:bg-white/[0.02] border-r border-stone-100 dark:border-white/5">
                                {st.total ? st.total : '-'}
                              </td>

                              {/* Aggregate */}
                              <td className="py-2 px-2 text-center font-mono font-extrabold text-xs text-[#0D5C3A] dark:text-emerald-400 bg-stone-50/50 dark:bg-white/[0.02] border-r border-stone-100 dark:border-white/5">
                                {st.aggregate ?? '-'}
                              </td>

                              {/* Division */}
                              <td className="py-2 px-2 text-center font-bold text-xs border-r border-stone-100 dark:border-white/5">
                                <span
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black ${
                                    st.division === 'I'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : st.division === 'II'
                                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                      : st.division === 'III'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : st.division === 'IV'
                                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                      : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                                  }`}
                                >
                                  {st.division}
                                </span>
                              </td>

                              {/* Rank */}
                              <td className="py-2 px-2.5 text-center font-mono font-black text-xs text-amber-800 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-400/[0.03]">
                                {st.position}
                              </td>

                              {/* Jump to Report Card */}
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(
                                      `/admin/reports?student_id=${st.student_id}&term_id=${activeTermId}&curriculum=theology`
                                    )
                                  }}
                                  className="p-1 rounded-md text-stone-400 hover:text-[#0D5C3A] hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                                  title="View Report Card"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" strokeWidth={2.25} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>

                      {/* Pinned Summary Statistics Footer */}
                      {broadsheetSummary && (
                        <tfoot className="sticky bottom-0 z-10 bg-stone-100 dark:bg-[#1A2621] font-bold text-stone-800 dark:text-stone-200 border-t-2 border-[#0D5C3A]/30">
                          {/* Row 1: Class Averages */}
                          <tr>
                            <td
                              colSpan={2}
                              className="sticky left-0 z-20 bg-stone-100 dark:bg-[#1A2621] py-2 px-3 text-right text-[11px] uppercase tracking-wider font-extrabold text-[#0D5C3A] dark:text-emerald-400 border-r border-stone-200 dark:border-white/10"
                            >
                              Class Average
                            </td>
                            {assessmentData.orderedSubjects.map((sub) => {
                              const stat = broadsheetSummary.subjectStats[sub.id]
                              return (
                                <React.Fragment key={sub.id}>
                                  <td className="py-2 px-2 text-center font-mono font-extrabold text-xs border-r border-stone-200 dark:border-white/10">
                                    {stat ? stat.avg : '-'}
                                  </td>
                                  {showGrades && (
                                    <td className="py-2 px-1 text-center border-r border-stone-200 dark:border-white/10">
                                      <RemarkBadge score={stat?.avg} />
                                    </td>
                                  )}
                                </React.Fragment>
                              )
                            })}
                            <td className="py-2 px-2.5 text-center font-mono font-black text-xs text-[#0D5C3A] dark:text-emerald-400 border-r border-stone-200 dark:border-white/10">
                              {broadsheetSummary.classAverageTotal}
                            </td>
                            <td colSpan={3} className="py-2 px-2 text-center text-[10px] text-stone-400">
                              Mean: {broadsheetSummary.classAverageTotal}
                            </td>
                          </tr>

                          {/* Row 2: Pass Rate */}
                          <tr className="text-stone-600 dark:text-stone-400 text-[10px]">
                            <td
                              colSpan={2}
                              className="sticky left-0 z-20 bg-stone-100 dark:bg-[#1A2621] py-1.5 px-3 text-right uppercase tracking-wider font-bold border-r border-stone-200 dark:border-white/10"
                            >
                              Pass Rate (≥50%)
                            </td>
                            {assessmentData.orderedSubjects.map((sub) => {
                              const stat = broadsheetSummary.subjectStats[sub.id]
                              return (
                                <React.Fragment key={sub.id}>
                                  <td
                                    colSpan={showGrades ? 2 : 1}
                                    className="py-1.5 px-1 text-center font-mono font-bold text-[10px] border-r border-stone-200 dark:border-white/10 text-emerald-700 dark:text-emerald-400"
                                  >
                                    {stat ? `${stat.passRate}%` : '-'}
                                  </td>
                                </React.Fragment>
                              )
                            })}
                            <td
                              colSpan={4}
                              className="py-1.5 px-2 text-center text-[10px] text-stone-500"
                            >
                              Candidates Sat: {broadsheetSummary.satCandidates} / {broadsheetSummary.totalCandidates}
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
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Total Enrolled</p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {broadsheetSummary ? broadsheetSummary.totalCandidates : 0}
                      </h3>
                      <p className="text-[10px] text-stone-500 mt-0.5">Muslim Cohort</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-[#0D5C3A] dark:text-emerald-400">
                      <Users className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                  </div>

                  <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Class Mean Total</p>
                      <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                        {broadsheetSummary ? broadsheetSummary.classAverageTotal : 0}
                      </h3>
                      <p className="text-[10px] text-stone-500 mt-0.5">High: {broadsheetSummary?.highestTotal || 0}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <TrendingUp className="w-5 h-5" strokeWidth={2.25} />
                    </div>
                  </div>

                  <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-[#0D5C3A]/12 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Div I &amp; II Distinction</p>
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
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Exam Phase</p>
                      <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        {examPhase.toUpperCase()}
                      </h3>
                      <p className="text-[10px] text-stone-500 mt-0.5">{activeClass?.class_name_arabic || 'Theology'}</p>
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
                                <div className="font-arabic font-extrabold text-stone-900 dark:text-stone-100 text-sm">
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
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">2nd Place</span>
                      <h4 className="font-bold text-stone-900 dark:text-white text-sm mt-1">{top10Data[1].name}</h4>
                      <p className="font-arabic text-xs text-[#0D5C3A] font-bold mt-0.5">{top10Data[1].arabic_name}</p>
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
                      <h3 className="font-black text-stone-900 dark:text-white text-base mt-1">{top10Data[0].name}</h3>
                      <p className="font-arabic text-sm text-[#0D5C3A] dark:text-emerald-300 font-extrabold mt-0.5">
                        {top10Data[0].arabic_name}
                      </p>
                      <div className="mt-2.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-950 dark:text-amber-200 text-xs font-mono font-black">
                        {top10Data[0].total} pts • Div {top10Data[0].division} (Agg {top10Data[0].aggregate ?? '-'})
                      </div>
                    </div>

                    {/* 3rd Place Bronze */}
                    <div className="rounded-2xl p-4 bg-white dark:bg-[#151F1B] border border-amber-600/30 dark:border-white/10 shadow-md text-center flex flex-col items-center order-3">
                      <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center shadow-inner mb-2">
                        <Award className="w-6 h-6" strokeWidth={2.25} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">3rd Place</span>
                      <h4 className="font-bold text-stone-900 dark:text-white text-sm mt-1">{top10Data[2].name}</h4>
                      <p className="font-arabic text-xs text-[#0D5C3A] font-bold mt-0.5">{top10Data[2].arabic_name}</p>
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
      {/* ======================================================== */}
      <PrintPortal pageOrientation="landscape">
        <div className="p-8 bg-white text-black font-sans text-xs w-full min-h-screen">
          {/* Institutional Letterhead Header */}
          <OfficialPrintLetterhead
            documentTitle="ACADEMIC PERFORMANCE BROADSHEET — ISLAMIC THEOLOGY"
            arabicDocumentTitle="كشف درجات الطلاب العام — قسم العلوم الشرعية"
            metadata={[
              { label: 'Term', value: activeTerm?.label || 'Term 3' },
              { label: 'Class', value: `${activeClass?.class_name_arabic || ''} — ${activeClass?.class_name_english || ''}` },
              { label: 'Phase', value: examPhase.toUpperCase() },
              { label: 'Year', value: activeTerm?.academic_year || 2026 },
              { label: 'Total Candidates', value: assessmentData.students.length },
              { label: 'Date Printed', value: new Date().toLocaleDateString('en-GB') },
            ]}
          />

          {/* Complete Institutional Broadsheet Table */}
          <table className="w-full border-collapse border border-black text-[9px] mt-4">
            <thead>
              <tr className="bg-stone-100 text-black border-b border-black font-extrabold">
                <th className="border border-black p-1 text-center w-6">#</th>
                <th className="border border-black p-1 text-center min-w-[50px]">Adm No</th>
                <th className="border border-black p-1 text-left min-w-[140px]">Student Full Name</th>
                <th className="border border-black p-1 text-right font-arabic min-w-[100px]" dir="rtl">
                  الاسم بالعربية
                </th>
                {assessmentData.orderedSubjects.map((sub) => (
                  <th key={sub.id} colSpan={2} className="border border-black p-1 text-center">
                    <div className="font-arabic font-bold text-[9.5px]">
                      {sub.subject_name_arabic || sub.subject_name}
                    </div>
                    <div className="text-[7.5px] uppercase">Mark / Grade</div>
                  </th>
                ))}
                <th className="border border-black p-1 text-center font-black min-w-[40px]">Total</th>
                <th className="border border-black p-1 text-center font-black min-w-[32px]">Agg</th>
                <th className="border border-black p-1 text-center font-black min-w-[30px]">Div</th>
                <th className="border border-black p-1 text-center font-black min-w-[32px]">Rank</th>
              </tr>
            </thead>
            <tbody>
              {assessmentData.students.map((st, idx) => (
                <tr key={st.id} className="border-b border-stone-300">
                  <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black p-1 text-center font-mono">{st.admission_number || '-'}</td>
                  <td className="border border-black p-1 font-bold">{st.name}</td>
                  <td className="border border-black p-1 text-right font-arabic" dir="rtl">
                    {st.arabic_name || '-'}
                  </td>
                  {assessmentData.orderedSubjects.map((sub) => {
                    const score = st.subjectScores[sub.id]
                    const grade = st.subjectGrades[sub.id]
                    return (
                      <React.Fragment key={sub.id}>
                        <td className="border border-black p-1 text-center font-mono font-bold">
                          {score != null ? score : '-'}
                        </td>
                        <td className="border border-black p-1 text-center font-bold text-[8px]">
                          {grade || '-'}
                        </td>
                      </React.Fragment>
                    )
                  })}
                  <td className="border border-black p-1 text-center font-mono font-black">{st.total || '-'}</td>
                  <td className="border border-black p-1 text-center font-mono font-black">{st.aggregate ?? '-'}</td>
                  <td className="border border-black p-1 text-center font-black">Div {st.division}</td>
                  <td className="border border-black p-1 text-center font-mono font-black">{st.position}</td>
                </tr>
              ))}
            </tbody>
            {broadsheetSummary && (
              <tfoot>
                <tr className="bg-stone-100 font-black border-t-2 border-black">
                  <td colSpan={4} className="border border-black p-1.5 text-right uppercase tracking-wider">
                    Class Average
                  </td>
                  {assessmentData.orderedSubjects.map((sub) => (
                    <td key={sub.id} colSpan={2} className="border border-black p-1.5 text-center font-mono">
                      {broadsheetSummary.subjectStats[sub.id]?.avg ?? '-'}
                    </td>
                  ))}
                  <td className="border border-black p-1.5 text-center font-mono">
                    {broadsheetSummary.classAverageTotal}
                  </td>
                  <td colSpan={3} className="border border-black p-1.5 text-center text-[8px] text-stone-600">
                    Mean Total: {broadsheetSummary.classAverageTotal}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>

          {/* Division Summary Box */}
          {broadsheetSummary && (
            <div className="mt-4 p-2.5 border border-black flex items-center justify-between text-[9px] bg-stone-50">
              <span className="font-bold uppercase tracking-wider">Official Cohort Summary:</span>
              <span>Div I: <strong>{broadsheetSummary.divCounts.I}</strong></span>
              <span>Div II: <strong>{broadsheetSummary.divCounts.II}</strong></span>
              <span>Div III: <strong>{broadsheetSummary.divCounts.III}</strong></span>
              <span>Div IV: <strong>{broadsheetSummary.divCounts.IV}</strong></span>
              <span>Div U: <strong>{broadsheetSummary.divCounts.U}</strong></span>
              <span>Total Sat: <strong>{broadsheetSummary.satCandidates}</strong></span>
            </div>
          )}

          {/* Signatures & Official Stamp Footer */}
          <div className="mt-8 relative">
            <OfficialPrintSignaturesFooter />
            <div className="absolute right-12 -top-4 pointer-events-none">
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
        </div>
      </PrintPortal>
    </div>
  )
}

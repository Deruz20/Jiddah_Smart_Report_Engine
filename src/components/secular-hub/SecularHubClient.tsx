'use client'

import React, { useState, useEffect, useMemo, memo, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Loader2, ScrollText, BookOpen, Award, LayoutDashboard, SearchX, Printer, FileSpreadsheet, Download, Layers, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { generateSecularAssessmentCSV, generateSecularAnalysisCSV, generateSecularTopStudentsCSV } from '@/utils/csvExport'
import { computeStandardRankings } from '@/lib/ranking'
import { isGradableSubject, getSubjectGradeNumber, calculateAggregate, getDivision, getGradeDisplay, isCoreSubject, getNurseryGrade } from '@/lib/grading'
import { TopToolbar } from '../figma-ui/TopToolbar'

const THEME = {
  gold: 'text-amber-800 bg-amber-50 border-amber-200',
  silver: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  bronze: 'text-orange-800 bg-orange-50 border-orange-200',
  neutral: 'text-stone-700 bg-stone-100 border-stone-200',
  danger: 'text-rose-800 bg-rose-50 border-rose-200',
}

const getAchievementTier = (val: string | null | undefined): keyof typeof THEME => {
  if (!val || val === '-') return 'neutral'
  if (val.startsWith('D') || val === 'I' || val === 'A') return 'gold'
  if (val.startsWith('C') || val === 'II' || val === 'B') return 'silver'
  if (val.startsWith('P') || val === 'III' || val === 'C') return 'bronze'
  if (val === 'IV' || val === 'D') return 'neutral'
  return 'danger'
}

const getBadgeStyles = (val: string | null | undefined) => THEME[getAchievementTier(val)]

const getPositionStyles = (pos: number | string | null | undefined) => {
  if (pos === 1 || pos === '1') return 'text-amber-600 font-extrabold text-[15px]'
  if (pos === 2 || pos === '2') return 'text-stone-600 font-extrabold text-[15px]'
  if (pos === 3 || pos === '3') return 'text-orange-700 font-extrabold text-[15px]'
  return 'text-stone-700 font-bold text-[14px]'
}

type TermData = {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current: boolean
}

type CircularClassData = {
  id: string
  class_name: string
  section: string
}

const tableVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03 }
  }
}

const rowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } }
}

const RankBadge = memo(({ rank }: { rank: number | string }) => {
  if (rank === '-') return <span className="text-stone-400 font-medium">-</span>
  const numRank = Number(rank)
  if (numRank === 1) return <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full bg-amber-100 text-amber-700 ring-2 ring-amber-200/50 shadow-xs print:ring-0 print:bg-transparent print:text-black">1</span>
  if (numRank === 2) return <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full bg-stone-200 text-stone-700 ring-2 ring-stone-300/50 shadow-xs print:ring-0 print:bg-transparent print:text-black">2</span>
  if (numRank === 3) return <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full bg-orange-100 text-orange-800 ring-2 ring-orange-200/50 shadow-xs print:ring-0 print:bg-transparent print:text-black">3</span>
  return <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-semibold rounded-full bg-stone-50 text-stone-700 border border-stone-200 print:border-none print:text-black">{rank}</span>
})
RankBadge.displayName = 'RankBadge'

export default function SecularHubClient({
  terms,
  circularClasses
}: {
  terms: TermData[]
  circularClasses: CircularClassData[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeTermId, setActiveTermId] = useState<string>(searchParams.get('term_id') || terms.find(t => t.is_current)?.id || terms[0]?.id || '')
  const [activeClassId, setActiveClassId] = useState<string>(searchParams.get('class_id') || circularClasses[0]?.id || '')
  const [activeLevel, setActiveLevel] = useState<string>(searchParams.get('level') || circularClasses[0]?.section || 'nursery')
  const [activeTab, setActiveTab] = useState<'assessment' | 'analysis' | 'top_students'>((searchParams.get('tab') as any) || 'assessment')
  const [examPhase, setExamPhase] = useState<'bot' | 'mot' | 'eot'>((searchParams.get('exam_phase') as any) || 'eot')

  const [filtersOpen, setFiltersOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isBatchPrinting, setIsBatchPrinting] = useState(false)
  const [data, setData] = useState<{
    enrollments: any[]
    marks: any[]
    subjects: any[]
  } | null>(null)

  useEffect(() => {
    if (!activeTermId) return

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/secular-hub?term_id=${activeTermId}`)
        const ct = res.headers.get('content-type') || ''
        if (!res.ok || !ct.includes('application/json')) throw new Error('Failed to fetch data')
        const json = await res.json()
        setData(json)
      } catch {
        toast.error('Failed to load secular data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [activeTermId])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (activeTermId) params.set('term_id', activeTermId)
    if (activeClassId) params.set('class_id', activeClassId)
    if (activeLevel) params.set('level', activeLevel)
    if (activeTab) params.set('tab', activeTab)
    if (examPhase) params.set('exam_phase', examPhase)

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [activeTermId, activeClassId, activeLevel, activeTab, examPhase, pathname, router, searchParams])

  const computeAssessmentDataForClass = useCallback((classId: string) => {
    if (!data || !classId) return { students: [], orderedSubjects: [] }

    const classEnrollments = data.enrollments.filter(e => e.circular_class_id === classId)
    const classInfo = circularClasses.find(c => c.id === classId)
    if (!classInfo) return { students: [], orderedSubjects: [] }

    const assessmentLevel = classInfo.section?.toLowerCase().replace(/\s+/g, '_') || ''
    const levelSubjects = data.subjects.filter(s => s.section?.toLowerCase() === classInfo.section?.toLowerCase())

    const filteredSubjects = levelSubjects.filter(sub => {
      if (classInfo.class_name?.toLowerCase().includes('top') && sub.subject_name.toLowerCase().includes('writing')) {
        return false
      }
      return true
    })

    const orderedSubjects = [...filteredSubjects].sort((a, b) => a.subject_name.localeCompare(b.subject_name))

    const processed = classEnrollments.map(enrollment => {
      const eMarks = data.marks.filter(m => m.enrollment_id === enrollment.id)

      let total = 0
      const subjectScores: Record<string, number | null> = {}
      const subjectAggregates: Record<string, number | null> = {}
      const subjectGrades: Record<string, string | null> = {}
      const scoresForAgg: { subject_name: string; score: number }[] = []

      orderedSubjects.forEach(sub => {
        const mark = eMarks.find(m => m.subject_id === sub.id)
        const scoreKey = `${examPhase}_score` as 'bot_score' | 'mot_score' | 'eot_score'
        const score = mark?.[scoreKey] != null ? mark[scoreKey] : null
        subjectScores[sub.id] = score
        if (score != null) {
          if (assessmentLevel === 'nursery') {
            const nGrade = getNurseryGrade(score)
            subjectGrades[sub.id] = nGrade.grade
            subjectAggregates[sub.id] = nGrade.grade === 'A' ? 1 : nGrade.grade === 'B' ? 2 : nGrade.grade === 'C' ? 3 : nGrade.grade === 'D' ? 5 : 9
            if (isGradableSubject(sub.subject_name, 'nursery')) {
              total += score
              scoresForAgg.push({ subject_name: sub.subject_name, score: score })
            }
          } else {
            const gradeNum = getSubjectGradeNumber(score)
            subjectAggregates[sub.id] = gradeNum
            subjectGrades[sub.id] = getGradeDisplay(gradeNum)
            if (isCoreSubject(sub.subject_name, assessmentLevel)) {
              total += score
              scoresForAgg.push({ subject_name: sub.subject_name, score: score })
            }
          }
        } else {
          subjectAggregates[sub.id] = null
          subjectGrades[sub.id] = null
        }
      })

      const agg = assessmentLevel === 'nursery' ? null : calculateAggregate(scoresForAgg, assessmentLevel)
      const div = agg !== null ? getDivision(agg) : 'X'

      return {
        id: enrollment.id,
        name: enrollment.students?.name || 'Unknown Student',
        total: total > 0 ? total : null,
        subjectScores,
        subjectAggregates,
        subjectGrades,
        totalAggregate: agg ?? 0,
        division: div,
        rank: 0 as number | string,
        position: '-' as number | string
      }
    })

    const ranked = computeStandardRankings(processed)

    return {
      orderedSubjects,
      students: ranked.map((p) => ({
        ...p,
        total: p.total ?? 0,
        position: p.rank
      }))
    }
  }, [data, circularClasses, examPhase])

  const assessmentData = useMemo(() => computeAssessmentDataForClass(activeClassId), [computeAssessmentDataForClass, activeClassId])

  const analysisData = useMemo(() => {
    if (!data || !activeLevel) return []
    const classes = circularClasses.filter(c => c.section === activeLevel)
    const levelSubjects = data.subjects.filter(s => s.section === activeLevel)
    const orderedSubjects = [...levelSubjects].sort((a, b) => a.subject_name.localeCompare(b.subject_name))

    return classes.map(cls => {
      const classEnrollments = data.enrollments.filter(e => e.circular_class_id === cls.id)
      let numStudents = 0
      let totalAvgMarks = 0
      let highestAvg = 0
      let lowestAvg = 100

      const divCounts: Record<string, number> = { I: 0, II: 0, III: 0, IV: 0, U: 0, X: 0 }
      const gradeCounts: Record<string, number> = activeLevel === 'nursery'
        ? { A: 0, B: 0, C: 0, D: 0, E: 0 }
        : { D1: 0, D2: 0, C3: 0, C4: 0, C5: 0, C6: 0, P7: 0, P8: 0, F9: 0 }

      const clsOrderedSubjects = orderedSubjects.filter(sub => {
        if (cls.class_name?.toLowerCase().includes('top') && sub.subject_name.toLowerCase().includes('writing')) {
          return false
        }
        return true
      })

      classEnrollments.forEach(e => {
        const eMarks = data.marks.filter(m => m.enrollment_id === e.id)

        const subjectScoresForAgg = clsOrderedSubjects.map(sub => {
          const mark = eMarks.find(m => m.subject_id === sub.id)
          const scoreKey = `${examPhase}_score` as 'bot_score' | 'mot_score' | 'eot_score'
          const score = mark?.[scoreKey]
          return { subject_name: sub.subject_name, score: score }
        }).filter(s => s.score != null) as { subject_name: string; score: number }[]

        if (subjectScoresForAgg.length > 0) {
          numStudents++
          let totalScore = 0

          subjectScoresForAgg.forEach(s => {
            totalScore += s.score
            if (activeLevel === 'nursery') {
              const nGrade = getNurseryGrade(s.score).grade
              if (gradeCounts[nGrade] !== undefined) {
                gradeCounts[nGrade]++
              }
            } else {
              const gradeNum = getSubjectGradeNumber(s.score)
              if (gradeNum === 1) gradeCounts.D1++
              else if (gradeNum === 2) gradeCounts.D2++
              else if (gradeNum === 3) gradeCounts.C3++
              else if (gradeNum === 4) gradeCounts.C4++
              else if (gradeNum === 5) gradeCounts.C5++
              else if (gradeNum === 6) gradeCounts.C6++
              else if (gradeNum === 7) gradeCounts.P7++
              else if (gradeNum === 8) gradeCounts.P8++
              else if (gradeNum === 9) gradeCounts.F9++
            }
          })

          const avgScore = totalScore / subjectScoresForAgg.length
          totalAvgMarks += avgScore
          if (avgScore > highestAvg) highestAvg = avgScore
          if (avgScore < lowestAvg) lowestAvg = avgScore

          const aggregate = calculateAggregate(subjectScoresForAgg, activeLevel)
          if (aggregate !== null) {
            const div = getDivision(aggregate)
            divCounts[div] = (divCounts[div] || 0) + 1
          } else {
            divCounts['X'] = (divCounts['X'] || 0) + 1
          }
        }
      })

      if (lowestAvg === 100 && numStudents === 0) lowestAvg = 0

      return {
        id: cls.id,
        className: cls.class_name,
        numStudents,
        highestAvg: highestAvg.toFixed(1),
        lowestAvg: lowestAvg.toFixed(1),
        classAvg: numStudents > 0 ? (totalAvgMarks / numStudents).toFixed(1) : 0,
        divCounts,
        gradeCounts
      }
    })
  }, [data, activeLevel, circularClasses, examPhase])

  const topStudentsData = useMemo(() => {
    if (!data || !activeLevel) return []
    const classes = circularClasses.filter(c => c.section === activeLevel)
    const levelSubjects = data.subjects.filter(s => s.section === activeLevel)

    const orderedSubjects = [...levelSubjects].sort((a, b) => a.subject_name.localeCompare(b.subject_name))

    return classes.map(cls => {
      const clsOrderedSubjects = orderedSubjects.filter(sub => {
        if (cls.class_name?.toLowerCase().includes('top') && sub.subject_name.toLowerCase().includes('writing')) {
          return false
        }
        return true
      })

      const classEnrollments = data.enrollments.filter(e => e.circular_class_id === cls.id)
      const students = classEnrollments.map(e => {
        const eMarks = data.marks.filter(m => m.enrollment_id === e.id)
        let total = 0
        const subjectScores: Record<string, number> = {}
        clsOrderedSubjects.forEach(sub => {
          const mark = eMarks.find(m => m.subject_id === sub.id)
          const scoreKey = `${examPhase}_score` as 'bot_score' | 'mot_score' | 'eot_score'
          const score = mark?.[scoreKey]
          if (score != null) {
            if (activeLevel === 'nursery') {
              if (isGradableSubject(sub.subject_name, 'nursery')) {
                total += score
              }
            } else {
              total += score
            }
            subjectScores[sub.id] = score
          }
        })
        return {
          id: e.id,
          className: cls.class_name,
          name: e.students?.name || 'Unknown Student',
          total: total > 0 ? total : null,
          subjectScores,
          rank: 0 as number | string
        }
      })

      const ranked = computeStandardRankings(students)
      const topStudents = ranked
        .filter(s => typeof s.rank === 'number')
        .slice(0, 10)
        .map(s => ({
          id: s.id,
          className: cls.class_name,
          studentName: s.name,
          total: s.total ?? 0,
          avg: s.total ? parseFloat((s.total / Object.keys(s.subjectScores).length).toFixed(1)) : 0,
          rank: s.rank as number
        }))

      return {
        classId: cls.id,
        className: cls.class_name,
        students: topStudents
      }
    }).filter(group => group.students.length > 0)
  }, [data, activeLevel, circularClasses, examPhase])

  const handlePrint = () => {
    if (isLoading || !data) {
      toast.error('Assessment data is still loading.')
      return
    }

    if (
      (activeTab === 'assessment' && !assessmentData.students.length) ||
      (activeTab === 'analysis' && !analysisData.length) ||
      (activeTab === 'top_students' && !topStudentsData.length)
    ) {
      toast.error('There is no data to print for this view.')
      return
    }

    const originalTitle = document.title
    document.title = `Secular_Hub_${activeLevel}_${activeTab}_${new Date().toISOString().split('T')[0]}`.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    window.print()
    document.title = originalTitle
  }

  const handleBatchPrint = () => {
    if (isLoading || !data || !circularClasses.some(cls => computeAssessmentDataForClass(cls.id).students.length > 0)) {
      toast.error('There is no assessment data to print.')
      return
    }

    setActiveTab('assessment')
    setIsBatchPrinting(true)
    setTimeout(() => {
      const originalTitle = document.title
      document.title = `Secular_Hub_${activeLevel}_Batch_${new Date().toISOString().split('T')[0]}`.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      window.print()
      document.title = originalTitle
      setIsBatchPrinting(false)
    }, 1000)
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied to clipboard!")
    } catch {
      toast.error("Failed to copy link.")
    }
  }

  const handleDownload = () => {
    setIsDownloading(true)
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `secularhub-${activeTab}-${dateStr}.csv`

    setTimeout(() => {
      try {
        if (activeTab === 'assessment') {
          if (!assessmentData.students?.length) return toast.error("No assessment data to download.")
          generateSecularAssessmentCSV(assessmentData.students as any, assessmentData.orderedSubjects, filename, circularClasses.find(c => c.id === activeClassId)?.section === 'nursery')
        } else if (activeTab === 'analysis') {
          if (!analysisData.length) return toast.error("No analysis data to download.")
          generateSecularAnalysisCSV(analysisData as any, filename, activeLevel === 'nursery')
        } else if (activeTab === 'top_students') {
          if (!topStudentsData.length) return toast.error("No top students data to download.")
          generateSecularTopStudentsCSV(topStudentsData.flatMap(g => g.students), filename)
        }
        toast.success("Download generated successfully!")
      } catch {
        toast.error("Failed to generate CSV.")
      } finally {
        setIsDownloading(false)
      }
    }, 50)
  }

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] print:bg-white text-stone-900 font-sans tabular-nums">
      <div className="print:hidden relative z-20 shrink-0">
        <TopToolbar
          printOptions={[
            { label: 'Print Current View', onClick: handlePrint, icon: <Printer size={14} /> },
            { label: 'Batch Print All Classes', onClick: handleBatchPrint, icon: <Layers size={14} /> }
          ]}
          downloadOptions={[
            { label: 'Download Current View (CSV)', onClick: handleDownload, icon: <Download size={14} /> },
            { label: 'Download Assessment Sheet (CSV)', onClick: () => {
                const dateStr = new Date().toISOString().split('T')[0]
                if (!assessmentData.students?.length) return toast.error("No assessment data to download.")
                generateSecularAssessmentCSV(assessmentData.students as any, assessmentData.orderedSubjects, `secularhub-assessment-${dateStr}.csv`, circularClasses.find(c => c.id === activeClassId)?.section === 'nursery')
                toast.success("Assessment CSV generated successfully!")
            }, icon: <FileSpreadsheet size={14} /> },
            { label: 'Download Subject Analysis (CSV)', onClick: () => {
                const dateStr = new Date().toISOString().split('T')[0]
                if (!analysisData.length) return toast.error("No analysis data to download.")
                generateSecularAnalysisCSV(analysisData as any, `secularhub-analysis-${dateStr}.csv`, activeLevel === 'nursery')
                toast.success("Analysis CSV generated successfully!")
            }, icon: <FileSpreadsheet size={14} /> },
            { label: 'Download Top Students (CSV)', onClick: () => {
                const dateStr = new Date().toISOString().split('T')[0]
                if (!topStudentsData.length) return toast.error("No top students data to download.")
                generateSecularTopStudentsCSV(topStudentsData.flatMap(g => g.students), `secularhub-top_students-${dateStr}.csv`)
                toast.success("Top Students CSV generated successfully!")
            }, icon: <FileSpreadsheet size={14} /> },
          ]}
          onShare={handleShare}
          isGenerating={isDownloading}
          searchOpen={filtersOpen}
          onSearchToggle={() => setFiltersOpen(!filtersOpen)}
          title={
            <div className="flex items-center gap-2 text-stone-900">
              <div className="p-1.5 bg-[#059669]/10 rounded-lg text-[#059669]">
                <LayoutDashboard size={16} />
              </div>
              <h1 className="text-sm sm:text-[15px] font-bold tracking-tight">Secular Hub</h1>
            </div>
          }
        />
      </div>

      {/* Control Panel (Filters) */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white border-b border-stone-200 shadow-xs print:hidden shrink-0"
          >
            <div className="px-3 sm:px-5 py-3 max-w-7xl mx-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 items-end">
                {/* Term Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Academic Term</label>
                  <div className="relative flex items-center">
                    <select
                      className="w-full min-h-[42px] appearance-none pl-3 pr-8 py-2 border border-stone-200 hover:border-emerald-500/60 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 rounded-xl bg-slate-50/70 hover:bg-white text-stone-900 text-xs font-semibold outline-none transition cursor-pointer shadow-xs"
                      value={activeTermId}
                      onChange={(e) => setActiveTermId(e.target.value)}
                    >
                      {terms.map(t => (
                        <option key={t.id} value={t.id}>{t.label} ({t.academic_year})</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-stone-400 absolute right-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Contextual Selectors */}
                {activeTab === 'assessment' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Class Cohort</label>
                    <div className="relative flex items-center">
                      <select
                        className="w-full min-h-[42px] appearance-none pl-3 pr-8 py-2 border border-stone-200 hover:border-emerald-500/60 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 rounded-xl bg-slate-50/70 hover:bg-white text-stone-900 text-xs font-semibold outline-none transition cursor-pointer shadow-xs truncate"
                        value={activeClassId}
                        onChange={(e) => setActiveClassId(e.target.value)}
                      >
                        <option value="">-- Select a Class --</option>
                        {circularClasses.map(t => (
                          <option key={t.id} value={t.id}>{t.class_name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-stone-400 absolute right-2.5 pointer-events-none" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Academic Level</label>
                    <div className="relative flex items-center">
                      <select
                        className="w-full min-h-[42px] appearance-none pl-3 pr-8 py-2 border border-stone-200 hover:border-emerald-500/60 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15 rounded-xl bg-slate-50/70 hover:bg-white text-stone-900 text-xs font-semibold outline-none transition cursor-pointer shadow-xs truncate"
                        value={activeLevel}
                        onChange={(e) => setActiveLevel(e.target.value)}
                      >
                        <option value="nursery">Nursery Section</option>
                        <option value="lower_primary">Lower Primary</option>
                        <option value="upper_primary">Upper Primary</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-stone-400 absolute right-2.5 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* View Toggle */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Dashboard View</label>
                  <div className="flex p-1 bg-[#F1F5F9] border border-stone-200/80 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveTab('assessment')}
                      className={`flex-1 min-h-[34px] px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${activeTab === 'assessment' ? 'bg-[#059669] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'}`}
                    >
                      <BookOpen size={12} /> Sheet
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('analysis')}
                      className={`flex-1 min-h-[34px] px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${activeTab === 'analysis' ? 'bg-[#059669] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'}`}
                    >
                      <ScrollText size={12} /> Analysis
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('top_students')}
                      className={`flex-1 min-h-[34px] px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${activeTab === 'top_students' ? 'bg-[#059669] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'}`}
                    >
                      <Award size={12} /> Top 10
                    </button>
                  </div>
                </div>

                {/* Exam Phase Toggle */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Exam Phase</label>
                  <div className="flex p-1 bg-[#F1F5F9] border border-stone-200/80 rounded-xl">
                    {(['bot', 'mot', 'eot'] as const).map((phaseKey) => {
                      const isActive = examPhase === phaseKey
                      const activeColor = phaseKey === 'bot' ? 'bg-blue-600 text-white shadow-xs' : phaseKey === 'mot' ? 'bg-amber-500 text-stone-950 font-bold shadow-xs' : 'bg-[#059669] text-white font-bold shadow-xs'
                      return (
                        <button
                          key={phaseKey}
                          type="button"
                          onClick={() => setExamPhase(phaseKey)}
                          className={`flex-1 min-h-[34px] px-2 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center cursor-pointer ${isActive ? activeColor : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'}`}
                        >
                          {phaseKey}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 p-3 sm:p-5 print:p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full print:hidden">
            <Loader2 className="w-8 h-8 animate-spin text-[#059669] mb-3" />
            <p className="text-stone-600 text-sm font-medium">Loading secular assessment data…</p>
          </div>
        ) : (!data || (!activeClassId && activeTab === 'assessment') || (!activeLevel && (activeTab === 'analysis' || activeTab === 'top_students'))) ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 max-w-md mx-auto">
            <div className="w-16 h-16 bg-[#059669]/10 rounded-2xl flex items-center justify-center mb-4">
              <SearchX className="w-8 h-8 text-[#059669]" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-1">No Cohort Selected</h3>
            <p className="text-xs sm:text-sm text-stone-600">
              Select {activeTab === 'assessment' ? 'a class' : 'an academic level'} above to load secular broadsheets.
            </p>
          </div>
        ) : (
          <div
            id="secular-hub-print-root"
            className="w-full max-w-7xl mx-auto print:max-w-[210mm] print:m-0 report-container"
            data-report-orientation="portrait"
          >
            {activeTab === 'assessment' && (isBatchPrinting || activeClassId) && (
              <>
                {(isBatchPrinting ? circularClasses : circularClasses.filter(c => c.id === activeClassId)).map((cls, classIdx, arr) => {
                  const currentAssessmentData = isBatchPrinting ? computeAssessmentDataForClass(cls.id) : assessmentData
                  if (!currentAssessmentData || !currentAssessmentData.orderedSubjects) return null

                  return (
                    <div key={cls.id} className={isBatchPrinting ? 'hidden print:block print:py-0 print:px-2 text-left' : 'print:py-0 print:px-2 text-left'} style={{ pageBreakAfter: isBatchPrinting && classIdx < arr.length - 1 ? 'always' : 'auto' }}>
                      <div className="text-center mb-8 hidden print:block">
                        <h1 className="text-2xl font-extrabold text-stone-900 print:text-black mb-1 uppercase tracking-wide">Jiddah Islamic Schools</h1>
                        <h3 className="text-xl font-bold mb-4 underline underline-offset-4 text-stone-700 print:text-black uppercase">
                          {examPhase === 'bot' ? 'Beginning of Term Assessment Report' : examPhase === 'eot' ? 'End of Term Assessment Report' : 'Mid-Term Assessment Report'}
                        </h3>
                      </div>

                      <div className="flex flex-wrap justify-between items-center gap-3 mb-6 font-semibold text-stone-700 print:text-black bg-white print:bg-transparent px-4 py-3 rounded-xl border border-stone-200 print:border-none shadow-xs print:shadow-none text-xs">
                        <div>
                          <span className="uppercase text-[11px] tracking-wider text-stone-500 mr-2">Term:</span>
                          <span className="text-[#059669] print:text-black font-bold">{terms.find(t => t.id === activeTermId)?.label}</span>
                        </div>
                        <div>
                          <span className="uppercase text-[11px] tracking-wider text-stone-500 mr-2">Class:</span>
                          <span className="text-[#059669] print:text-black font-bold">{cls.class_name}</span>
                        </div>
                        <div>
                          <span className="uppercase text-[11px] tracking-wider text-stone-500 mr-2">Phase:</span>
                          <span className="text-[#059669] print:text-black font-bold uppercase">{examPhase}</span>
                        </div>
                        <div>
                          <span className="uppercase text-[11px] tracking-wider text-stone-500 mr-2">Year:</span>
                          <span className="text-[#059669] print:text-black font-bold">{terms.find(t => t.id === activeTermId)?.academic_year}</span>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden print:bg-transparent print:border-none print:shadow-none print:rounded-none print:overflow-visible relative">
                        <div className="overflow-x-auto print:overflow-visible relative z-10">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-[#F8FAFC] sticky top-0 z-10 print:bg-transparent print:static border-b border-stone-200 print:border-b-[1.5px] print:border-black">
                              <tr>
                                <th className="px-2.5 py-2 text-stone-600 font-bold text-[10px] uppercase tracking-wider w-9 text-center">#</th>
                                <th className="px-3 py-2 text-stone-600 font-bold text-[10px] uppercase tracking-wider min-w-[140px]">Student Name</th>
                                {currentAssessmentData.orderedSubjects?.flatMap(s => [
                                  <th key={`${s.id}-score`} className="px-1.5 py-2 text-stone-600 font-bold text-[10px] uppercase tracking-wider text-center">
                                    {s.subject_name === 'MATH' ? 'MTC' : s.subject_name === 'SCI' ? 'SCIE' : s.subject_name}
                                  </th>,
                                  <th key={`${s.id}-agg`} className="px-1.5 py-2 text-stone-500 font-bold text-[10px] uppercase tracking-wider text-center">
                                    {cls.section === 'nursery' ? 'GRD' : 'AGG'}
                                  </th>
                                ])}
                                <th className="px-2.5 py-2 text-stone-600 font-bold text-[10px] uppercase tracking-wider text-center">TOTAL</th>
                                {cls.section !== 'nursery' && (
                                  <>
                                    <th className="px-2.5 py-2 text-stone-600 font-bold text-[10px] uppercase tracking-wider text-center">T/L AGG.</th>
                                    <th className="px-2.5 py-2 text-stone-600 font-bold text-[10px] uppercase tracking-wider text-center">DIV</th>
                                  </>
                                )}
                                <th className="px-2.5 py-2 text-stone-600 font-bold text-[10px] uppercase tracking-wider text-center">PSN</th>
                              </tr>
                            </thead>
                            <motion.tbody
                              initial="hidden"
                              animate="visible"
                              variants={tableVariants}
                              className="print:!opacity-100 print:!transform-none"
                            >
                              {currentAssessmentData.students?.map((student, idx) => (
                                <motion.tr
                                  variants={rowVariants}
                                  key={student.id}
                                  className="hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0"
                                >
                                  <td className="px-2.5 py-2 text-center text-stone-500 font-medium text-xs">{idx + 1}</td>
                                  <td className="px-3 py-2 font-bold text-xs text-stone-900 whitespace-nowrap">{student.name}</td>
                                  {currentAssessmentData.orderedSubjects?.flatMap(s => {
                                    const gradeStr = student.subjectGrades?.[s.id] || '-'
                                    return [
                                      <td key={`${s.id}-score`} className="px-1.5 py-2 text-center font-bold text-xs text-stone-700">
                                        {student.subjectScores[s.id] !== undefined && student.subjectScores[s.id] !== null ? student.subjectScores[s.id] : '-'}
                                      </td>,
                                      <td key={`${s.id}-agg`} className="px-1.5 py-2 text-center">
                                        <span className={`inline-flex items-center justify-center min-w-[28px] h-[22px] px-1 rounded font-bold text-[10px] border ${getBadgeStyles(gradeStr)}`}>
                                          {gradeStr}
                                        </span>
                                      </td>
                                    ]
                                  })}
                                  <td className="px-2.5 py-2 text-center">
                                    <div className="inline-flex items-center justify-center h-6 px-2 rounded-lg bg-stone-100 text-stone-900 font-extrabold text-xs border border-stone-200">
                                      {student.total > 0 ? student.total : '-'}
                                    </div>
                                  </td>
                                  {cls.section !== 'nursery' && (
                                    <>
                                      <td className="px-2.5 py-2 text-center">
                                        <div className={`inline-flex items-center justify-center h-6 w-8 rounded-lg font-extrabold text-xs border ${getBadgeStyles(student.division)}`}>
                                          {student.totalAggregate > 0 ? student.totalAggregate : '-'}
                                        </div>
                                      </td>
                                      <td className="px-2.5 py-2 text-center">
                                        <div className={`inline-flex items-center justify-center h-6 w-8 rounded-lg font-extrabold text-xs border ${getBadgeStyles(student.division)}`}>
                                          {student.division}
                                        </div>
                                      </td>
                                    </>
                                  )}
                                  <td className="px-2.5 py-2 text-center">
                                    <span className={getPositionStyles(student.position)}>
                                      {student.total > 0 ? student.position : '-'}
                                    </span>
                                  </td>
                                </motion.tr>
                              ))}
                            </motion.tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Analysis Tab */}
            {activeTab === 'analysis' && activeLevel && (
              <div className="print:py-0 print:px-2 text-left space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-3 font-semibold text-stone-700 bg-white px-4 py-3 rounded-xl border border-stone-200 shadow-xs text-xs">
                  <div>
                    <span className="uppercase text-[11px] tracking-wider text-stone-500 mr-2">Level:</span>
                    <span className="text-[#059669] font-bold uppercase">{activeLevel.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="uppercase text-[11px] tracking-wider text-stone-500 mr-2">Term:</span>
                    <span className="text-[#059669] font-bold">{terms.find(t => t.id === activeTermId)?.label}</span>
                  </div>
                  <div>
                    <span className="uppercase text-[11px] tracking-wider text-stone-500 mr-2">Phase:</span>
                    <span className="text-[#059669] font-bold uppercase">{examPhase}</span>
                  </div>
                  <div>
                    <span className="uppercase text-[11px] tracking-wider text-stone-500 mr-2">Year:</span>
                    <span className="text-[#059669] font-bold">{terms.find(t => t.id === activeTermId)?.academic_year}</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5 space-y-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-3">1. Exam Analysis</h4>
                    <div className="overflow-x-auto border border-stone-200 rounded-xl">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-[#F8FAFC]">
                          <tr>
                            <th className="px-4 py-3 border-b border-stone-200 text-stone-600 font-bold text-xs uppercase tracking-wider">Class Segment</th>
                            <th className="px-4 py-3 border-b border-stone-200 text-stone-600 font-bold text-xs uppercase tracking-wider text-center">Capacity</th>
                            <th className="px-4 py-3 border-b border-stone-200 text-[#059669] font-bold text-xs uppercase tracking-wider text-center">Highest Avg</th>
                            <th className="px-4 py-3 border-b border-stone-200 text-rose-700 font-bold text-xs uppercase tracking-wider text-center">Lowest Avg</th>
                            <th className="px-4 py-3 border-b border-stone-200 text-amber-800 font-bold text-xs uppercase tracking-wider text-center">Class Avg</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysisData.map((cls) => (
                            <tr key={`exam-${cls.id}`} className="hover:bg-stone-50 border-b border-stone-100 last:border-0">
                              <td className="px-4 py-3 font-bold text-stone-900">{cls.className}</td>
                              <td className="px-4 py-3 text-center font-medium text-stone-700">{cls.numStudents}</td>
                              <td className="px-4 py-3 text-center font-bold text-[#059669]">{cls.highestAvg}</td>
                              <td className="px-4 py-3 text-center font-bold text-rose-700">{cls.lowestAvg}</td>
                              <td className="px-4 py-3 text-center font-extrabold text-amber-800">{cls.classAvg}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {activeLevel !== 'nursery' && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-3">2. Division Breakdown</h4>
                      <div className="overflow-x-auto border border-stone-200 rounded-xl">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-[#F8FAFC]">
                            <tr>
                              <th className="px-4 py-3 border-b border-stone-200 text-stone-600 font-bold text-xs uppercase tracking-wider">Class Segment</th>
                              <th className="px-4 py-3 border-b border-stone-200 text-[#059669] font-bold text-xs uppercase tracking-wider text-center">Div I</th>
                              <th className="px-4 py-3 border-b border-stone-200 text-emerald-700 font-bold text-xs uppercase tracking-wider text-center">Div II</th>
                              <th className="px-4 py-3 border-b border-stone-200 text-amber-700 font-bold text-xs uppercase tracking-wider text-center">Div III</th>
                              <th className="px-4 py-3 border-b border-stone-200 text-orange-700 font-bold text-xs uppercase tracking-wider text-center">Div IV</th>
                              <th className="px-4 py-3 border-b border-stone-200 text-rose-700 font-bold text-xs uppercase tracking-wider text-center">Div U</th>
                              <th className="px-4 py-3 border-b border-stone-200 text-stone-500 font-bold text-xs uppercase tracking-wider text-center">Div X</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysisData.map((cls) => (
                              <tr key={`div-${cls.id}`} className="hover:bg-stone-50 border-b border-stone-100 last:border-0">
                                <td className="px-4 py-3 font-bold text-stone-900">{cls.className}</td>
                                <td className="px-4 py-3 text-center font-bold text-[#059669]">{cls.divCounts.I}</td>
                                <td className="px-4 py-3 text-center font-bold text-emerald-700">{cls.divCounts.II}</td>
                                <td className="px-4 py-3 text-center font-bold text-amber-700">{cls.divCounts.III}</td>
                                <td className="px-4 py-3 text-center font-bold text-orange-700">{cls.divCounts.IV}</td>
                                <td className="px-4 py-3 text-center font-bold text-rose-700">{cls.divCounts.U}</td>
                                <td className="px-4 py-3 text-center font-bold text-stone-500">{cls.divCounts.X}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Top Students Tab */}
            {activeTab === 'top_students' && activeLevel && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {topStudentsData.map((cls) => (
                  <div
                    key={cls.classId}
                    className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
                  >
                    <div className="bg-[#F8FAFC] px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                      <h4 className="font-bold text-stone-900 text-sm">{cls.className} Rankings</h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Top {cls.students.length}</span>
                    </div>
                    <div className="overflow-x-auto p-2">
                      <table className="w-full border-collapse">
                        <tbody>
                          {cls.students.map((student, idx) => (
                            <tr key={student.id} className="hover:bg-stone-50 border-b border-stone-100 last:border-0">
                              <td className="px-3 py-2.5 text-center w-12">
                                <RankBadge rank={idx + 1} />
                              </td>
                              <td className="px-3 py-2.5 font-bold text-xs text-stone-900">
                                {student.studentName}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <span className="font-extrabold text-[#059669] text-sm">{Math.round(student.avg)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

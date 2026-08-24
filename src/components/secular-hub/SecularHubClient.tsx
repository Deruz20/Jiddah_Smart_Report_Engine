'use client'

import React, { useState, useEffect, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Loader2, ScrollText, BookOpen, Award, LayoutDashboard, SearchX } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { generateAssessmentCSV, generateAnalysisCSV, generateTopStudentsCSV } from '@/utils/csvExport'
import { computeStandardRankings } from '@/lib/ranking'
import { isGradableSubject, getSubjectGradeNumber, calculateAggregate, getDivision } from '@/lib/grading'
import { TopToolbar } from '../figma-ui/TopToolbar'

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

// ----------------------
// Framer Motion Variants
// ----------------------
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
}

const itemVariants: any = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

// ----------------------
// Helper Components
// ----------------------
const RemarkBadge = memo(({ score }: { score: number }) => {
  if (score >= 75) return <span className="inline-flex items-center justify-center px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full bg-emerald-100/80 text-emerald-700 border border-emerald-200/50 print:bg-transparent print:border-none print:text-black">Excellent</span>
  if (score >= 65) return <span className="inline-flex items-center justify-center px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full bg-indigo-100/80 text-indigo-700 border border-indigo-200/50 print:bg-transparent print:border-none print:text-black">Very Good</span>
  if (score >= 50) return <span className="inline-flex items-center justify-center px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full bg-blue-100/80 text-blue-700 border border-blue-200/50 print:bg-transparent print:border-none print:text-black">Good</span>
  if (score >= 40) return <span className="inline-flex items-center justify-center px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full bg-amber-100/80 text-amber-700 border border-amber-200/50 print:bg-transparent print:border-none print:text-black">Fair</span>
  return <span className="inline-flex items-center justify-center px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full bg-rose-100/80 text-rose-700 border border-rose-200/50 print:bg-transparent print:border-none print:text-black">Poor</span>
})
RemarkBadge.displayName = 'RemarkBadge'

const RankBadge = memo(({ rank }: { rank: number | string }) => {
  if (rank === '-') return <span className="text-slate-400 font-medium">-</span>;
  const numRank = Number(rank);
  if (numRank === 1) return <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full bg-amber-100 text-amber-600 ring-2 ring-amber-200/50 shadow-sm print:ring-0 print:bg-transparent print:text-black">1</span>;
  if (numRank === 2) return <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full bg-slate-200 text-slate-600 ring-2 ring-slate-300/50 shadow-sm print:ring-0 print:bg-transparent print:text-black">2</span>;
  if (numRank === 3) return <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full bg-orange-100 text-orange-700 ring-2 ring-orange-200/50 shadow-sm print:ring-0 print:bg-transparent print:text-black">3</span>;
  return <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-semibold rounded-full bg-slate-50 text-slate-600 border border-slate-200 print:border-none print:text-black">{rank}</span>;
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
  const [activeClassId, setActiveClassId] = useState<string>(searchParams.get('class_id') || '')
  const [activeLevel, setActiveLevel] = useState<string>(searchParams.get('level') || 'nursery')
  const [activeTab, setActiveTab] = useState<'assessment' | 'analysis' | 'top_students'>((searchParams.get('tab') as any) || 'assessment')
  const [examPhase, setExamPhase] = useState<'bot' | 'mot' | 'eot'>((searchParams.get('exam_phase') as any) || 'eot')
  
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [data, setData] = useState<{
    enrollments: any[]
    marks: any[]
    subjects: any[]
  } | null>(null)

  // Fetch Data
  useEffect(() => {
    if (!activeTermId) return

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/secular-hub?term_id=${activeTermId}`)
        if (!res.ok) throw new Error('Failed to fetch data')
        const json = await res.json()
        setData(json)
      } catch (err) {
        toast.error('Failed to load secular data')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [activeTermId])

  // Sync URL State
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (activeTermId) params.set('term_id', activeTermId)
    if (activeClassId) params.set('class_id', activeClassId)
    if (activeLevel) params.set('level', activeLevel)
    if (activeTab) params.set('tab', activeTab)
    if (examPhase) params.set('exam_phase', examPhase)
    
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [activeTermId, activeClassId, activeLevel, activeTab, examPhase, pathname, router, searchParams])

  // Process data for the Assessment Form
  const assessmentData = useMemo(() => {
    if (!data || !activeClassId) return { students: [], orderedSubjects: [] }
    
    const classEnrollments = data.enrollments.filter(e => e.circular_class_id === activeClassId)
    const classInfo = circularClasses.find(c => c.id === activeClassId)
    if (!classInfo) return { students: [], orderedSubjects: [] }
    
    const levelSubjects = data.subjects.filter(s => s.section?.toLowerCase() === classInfo.section?.toLowerCase())
    
    const subjectOrder = {
      'lower_primary': ['ENG', 'MATH', 'LIT I', 'LIT II', 'I.R.E'],
      'upper_primary': ['MATH', 'SST', 'SCI', 'ENG', 'COMP']
    }
    const correctOrder = subjectOrder[classInfo.section?.toLowerCase() as keyof typeof subjectOrder] || []

    const orderedSubjects = [...levelSubjects].sort((a, b) => {
      const aName = a.subject_name.toUpperCase()
      const bName = b.subject_name.toUpperCase()
      
      const aAlias = correctOrder.find(alias => aName.includes(alias)) || aName
      const bAlias = correctOrder.find(alias => bName.includes(alias)) || bName

      const aIndex = correctOrder.indexOf(aAlias)
      const bIndex = correctOrder.indexOf(bAlias)

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return aName.localeCompare(bName)
    })

    const processed = classEnrollments.map(enrollment => {
      const eMarks = data.marks.filter(m => m.enrollment_id === enrollment.id)
      
      let total = 0
      const subjectScores: Record<string, number | null> = {}
      
      orderedSubjects.forEach(sub => {
        const mark = eMarks.find(m => m.subject_id === sub.id)
        const scoreKey = `${examPhase}_score` as 'bot_score' | 'mot_score' | 'eot_score'
        const score = mark?.[scoreKey] != null ? mark[scoreKey] : null
        subjectScores[sub.id] = score
        if (score != null && isGradableSubject(sub.subject_name, classInfo?.class_name)) {
          total += score
        }
      })

      return {
        id: enrollment.id,
        name: enrollment.students?.name || 'Unknown Student',
        total: total > 0 ? total : null,
        subjectScores,
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
  }, [data, activeClassId, circularClasses, examPhase])

  // Process data for the Analysis Form
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
      const gradeCounts: Record<string, number> = { D1: 0, D2: 0, C3: 0, C4: 0, C5: 0, C6: 0, P7: 0, P8: 0, F9: 0 }

      classEnrollments.forEach(e => {
        const eMarks = data.marks.filter(m => m.enrollment_id === e.id)
        
        const subjectScoresForAgg = orderedSubjects.map(sub => {
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

  // Process data for Top Students Form
  const topStudentsData = useMemo(() => {
    if (!data || !activeLevel) return []
    const classes = circularClasses.filter(c => c.section === activeLevel)
    const levelSubjects = data.subjects.filter(s => s.section === activeLevel)
    
    const orderedSubjects = [...levelSubjects].sort((a, b) => a.subject_name.localeCompare(b.subject_name))

    return classes.map(cls => {
      const classEnrollments = data.enrollments.filter(e => e.circular_class_id === cls.id)
      const students = classEnrollments.map(e => {
        const eMarks = data.marks.filter(m => m.enrollment_id === e.id)
        let total = 0
        const subjectScores: Record<string, number> = {}
        orderedSubjects.forEach(sub => {
          const mark = eMarks.find(m => m.subject_id === sub.id)
          const scoreKey = `${examPhase}_score` as 'bot_score' | 'mot_score' | 'eot_score'
          const score = mark?.[scoreKey]
          if (score != null) {
            total += score
            subjectScores[sub.id] = score
          }
        })
        return {
          id: e.id,
          className: cls.class_name,
          name: e.students.name || 'Unknown Student',
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

  const handlePrint = () => window.print()

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
          generateAssessmentCSV(assessmentData.students as any, assessmentData.orderedSubjects, filename)
        } else if (activeTab === 'analysis') {
          if (!analysisData.length) return toast.error("No analysis data to download.")
          generateAnalysisCSV(analysisData, filename)
        } else if (activeTab === 'top_students') {
          if (!topStudentsData.length) return toast.error("No top students data to download.")
          generateTopStudentsCSV(topStudentsData.flatMap(g => g.students), filename)
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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0f172a] print:bg-white text-slate-900 dark:text-slate-100 font-sans">
      
      {/* Enterprise Top Navigation using Theology Hub Component */}
      <div className="print:hidden relative z-40 border-b border-slate-200/60 shadow-sm shrink-0">
        <TopToolbar 
          onPrint={handlePrint}
          onShare={handleShare}
          onDownload={handleDownload}
          isGenerating={isDownloading}
          searchOpen={filtersOpen}
          onSearchToggle={() => setFiltersOpen(!filtersOpen)}
          title={
            <div className="flex items-center gap-2 text-slate-800 dark:text-white">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400">
                <LayoutDashboard size={18} />
              </div>
              <h1 className="text-[15px] font-semibold tracking-tight">Secular Hub</h1>
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
            className="overflow-hidden bg-white dark:bg-[#1e293b] border-b border-slate-200/60 dark:border-slate-800 shadow-sm print:hidden shrink-0"
          >
            <div className="px-4 py-3 max-w-7xl mx-auto">
              <div className="flex flex-wrap items-center gap-4">
                
                {/* Term Selector */}
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Academic Term</label>
                  <select
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 text-sm"
                    value={activeTermId}
                    onChange={(e) => setActiveTermId(e.target.value)}
                  >
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.label} ({t.academic_year})</option>
                    ))}
                  </select>
                </div>

                {/* View Toggle */}
                <div className="flex-col lg:col-span-5 min-w-[300px]">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Dashboard View</label>
                  <div className="flex overflow-x-auto no-scrollbar p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      onClick={() => setActiveTab('assessment')}
                      className={`flex-1 min-w-[120px] py-1.5 px-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'assessment' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <BookOpen size={14} /> Assessment
                    </button>
                    <button
                      onClick={() => setActiveTab('analysis')}
                      className={`flex-1 min-w-[120px] py-1.5 px-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'analysis' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <ScrollText size={14} /> Analysis
                    </button>
                    <button
                      onClick={() => setActiveTab('top_students')}
                      className={`flex-1 min-w-[120px] py-1.5 px-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'top_students' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <Award size={14} /> Top Students
                    </button>
                  </div>
                </div>

                {/* Exam Phase Toggle */}
                <div className="flex-col lg:col-span-2 min-w-[200px]">
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Exam Phase</label>
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <button
                      onClick={() => setExamPhase('bot')}
                      className={`flex-1 py-1.5 px-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center ${examPhase === 'bot' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      BOT
                    </button>
                    <button
                      onClick={() => setExamPhase('mot')}
                      className={`flex-1 py-1.5 px-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center ${examPhase === 'mot' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      MOT
                    </button>
                    <button
                      onClick={() => setExamPhase('eot')}
                      className={`flex-1 py-1.5 px-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center ${examPhase === 'eot' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      EOT
                    </button>
                  </div>
                </div>

                {/* Contextual Selectors */}
                {activeTab === 'assessment' && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Class List</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 text-sm"
                      value={activeClassId}
                      onChange={(e) => setActiveClassId(e.target.value)}
                    >
                      <option value="">-- Select a Class --</option>
                      {circularClasses.map(t => (
                        <option key={t.id} value={t.id}>{t.class_name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(activeTab === 'analysis' || activeTab === 'top_students') && (
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Academic Level</label>
                    <select
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 text-sm"
                      value={activeLevel}
                      onChange={(e) => setActiveLevel(e.target.value)}
                    >
                      <option value="nursery">Nursery Section</option>
                      <option value="lower_primary">Lower Primary</option>
                      <option value="upper_primary">Upper Primary</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 md:p-8 print:p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full print:hidden">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
            <p className="text-slate-500 font-medium">Loading secular data...</p>
          </div>
        ) : (!data || (!activeClassId && activeTab === 'assessment') || (!activeLevel && (activeTab === 'analysis' || activeTab === 'top_students'))) ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-full text-center p-8 max-w-md mx-auto"
          >
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6 ring-8 ring-blue-50/50 dark:ring-blue-900/10">
              <SearchX className="w-10 h-10 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Data Selected</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Please select {activeTab === 'assessment' ? 'a specific class' : 'an academic level'} from the control panel to view the reports.
            </p>
          </motion.div>
        ) : (
          <div className="w-full max-w-7xl mx-auto print:max-w-[210mm] print:m-0 min-h-[297mm]">
            
            {/* Assessment Tab */}
            {activeTab === 'assessment' && activeClassId && (
              <div className="print:p-10 text-left">
                
                {/* Print Header */}
                <div className="text-center mb-8 hidden print:block">
                  <h1 className="text-2xl font-extrabold text-slate-800 print:text-black mb-1 uppercase tracking-wide">Jiddah Islamic Nursery & Primary School</h1>
                  <h3 className="text-xl font-bold mb-4 underline underline-offset-4 text-slate-700 print:text-black uppercase">Mid-Term Assessment Report</h3>
                </div>

                {/* Context Bar */}
                <div className="flex justify-between items-center mb-6 font-semibold text-slate-700 print:text-black bg-white/50 print:bg-transparent px-4 py-3 rounded-xl border border-slate-200/50 print:border-none shadow-sm print:shadow-none">
                  <div>
                    <span className="uppercase text-[11px] tracking-wider text-slate-500 mr-2">Term:</span>
                    <span className="text-blue-800 print:text-black font-bold">{terms.find(t => t.id === activeTermId)?.label}</span>
                  </div>
                  <div>
                    <span className="uppercase text-[11px] tracking-wider text-slate-500 mr-2">Class:</span>
                    <span className="text-blue-800 print:text-black font-bold">{circularClasses.find(c => c.id === activeClassId)?.class_name}</span>
                  </div>
                  <div>
                    <span className="uppercase text-[11px] tracking-wider text-slate-500 mr-2">Phase:</span>
                    <span className="text-blue-800 print:text-black font-bold uppercase">{examPhase}</span>
                  </div>
                  <div>
                    <span className="uppercase text-[11px] tracking-wider text-slate-500 mr-2">Year:</span>
                    <span className="text-blue-800 print:text-black font-bold">{terms.find(t => t.id === activeTermId)?.academic_year}</span>
                  </div>
                </div>

                {/* Glassmorphic Table Container */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 dark:border-slate-800/60 overflow-hidden print:bg-transparent print:border-none print:shadow-none print:rounded-none">
                  <div className="overflow-x-auto shadow-inner print:shadow-none print:overflow-visible">
                    <table className="w-full text-left border-collapse print:border-2 print:border-black">
                      <thead className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md sticky top-0 z-10 print:bg-slate-100 print:static">
                        <tr>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider w-12 text-center print:border print:border-black print:text-black">#</th>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider w-64 print:border print:border-black print:text-black">Student Name</th>
                          {assessmentData.orderedSubjects?.map(s => (
                            <th key={s.id} className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider text-center print:border print:border-black print:text-black">{s.subject_name}</th>
                          ))}
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider text-center w-24 print:border print:border-black print:text-black">Total</th>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider text-center w-24 print:border print:border-black print:text-black">Rank</th>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider text-center w-32 print:border print:border-black print:text-black">Remarks</th>
                        </tr>
                      </thead>
                      <motion.tbody 
                        initial="hidden" 
                        animate="visible" 
                        variants={tableVariants}
                        className="print:!opacity-100 print:!transform-none"
                      >
                        {assessmentData.students?.map((student, idx) => (
                          <motion.tr 
                            variants={rowVariants}
                            key={student.id} 
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200 border-b border-slate-100 dark:border-slate-800 last:border-0 print:border print:border-black print:hover:bg-transparent print:!opacity-100 print:!transform-none"
                          >
                            <td className="px-4 py-3 text-center text-slate-400 font-medium print:border print:border-black print:text-black">{idx + 1}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap print:border print:border-black print:text-black">{student.name}</td>
                            
                            {assessmentData.orderedSubjects?.map(s => (
                              <td key={s.id} className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-300 print:border print:border-black print:text-black">
                                {student.subjectScores[s.id] !== undefined ? student.subjectScores[s.id] : '-'}
                              </td>
                            ))}
                            
                            <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-white print:border print:border-black print:text-black">
                              {student.total > 0 ? student.total : '-'}
                            </td>
                            
                            <td className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400 print:border print:border-black print:text-black">
                              {student.total > 0 ? <RankBadge rank={student.position} /> : '-'}
                            </td>
                            
                            <td className="px-4 py-3 text-center font-medium print:border print:border-black print:text-black">
                              {student.total > 0 ? (
                                <RemarkBadge score={student.total / (assessmentData.orderedSubjects.length || 1)} />
                              ) : '-'}
                            </td>
                          </motion.tr>
                        ))}

                        {/* Empty Rows Padding for Print/Visual Balance */}
                        {Array.from({ length: Math.max(0, 10 - (assessmentData.students?.length || 0)) }).map((_, i) => (
                          <tr key={`empty-${i}`} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 print:border print:border-black print:h-10">
                            <td className="px-4 py-3 print:border print:border-black">&nbsp;</td>
                            <td className="px-4 py-3 print:border print:border-black">&nbsp;</td>
                            {assessmentData.orderedSubjects?.map(s => <td key={`empty-${s.id}`} className="px-4 py-3 print:border print:border-black">&nbsp;</td>)}
                            <td className="px-4 py-3 print:border print:border-black">&nbsp;</td>
                            <td className="px-4 py-3 print:border print:border-black">&nbsp;</td>
                            <td className="px-4 py-3 print:border print:border-black">&nbsp;</td>
                          </tr>
                        ))}
                      </motion.tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Signatures */}
                <div className="flex justify-between items-center mt-12 px-8 text-slate-700 print:text-black hidden print:flex">
                  <div className="text-center">
                    <p className="font-bold mb-6 text-sm uppercase tracking-wider">Class Teacher's Signature</p>
                    <div className="border-b-2 border-dotted border-slate-400 print:border-black w-48"></div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold mb-6 text-sm uppercase tracking-wider">Head of Academics Signature</p>
                    <div className="border-b-2 border-dotted border-slate-400 print:border-black w-48"></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Analysis Tab */}
            {activeTab === 'analysis' && activeLevel && (
              <div className="print:p-10 text-left">
                
                {/* Print Header */}
                <div className="text-center mb-8 hidden print:block">
                  <h1 className="text-2xl font-extrabold text-slate-800 print:text-black mb-1 uppercase tracking-wide">Jiddah Islamic Nursery & Primary School</h1>
                  <h3 className="text-xl font-bold mb-4 underline underline-offset-4 text-slate-700 print:text-black uppercase">Mid-Term Analytics Overview</h3>
                </div>

                {/* Context Bar */}
                <div className="flex justify-between items-center mb-6 font-semibold text-slate-700 print:text-black bg-white/50 print:bg-transparent px-4 py-3 rounded-xl border border-slate-200/50 print:border-none shadow-sm print:shadow-none">
                  <div>
                    <span className="uppercase text-[11px] tracking-wider text-slate-500 mr-2">Level:</span>
                    <span className="text-blue-800 print:text-black font-bold uppercase">{activeLevel.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="uppercase text-[11px] tracking-wider text-slate-500 mr-2">Term:</span>
                    <span className="text-blue-800 print:text-black font-bold">{terms.find(t => t.id === activeTermId)?.label}</span>
                  </div>
                  <div>
                    <span className="uppercase text-[11px] tracking-wider text-slate-500 mr-2">Phase:</span>
                    <span className="text-blue-800 print:text-black font-bold uppercase">{examPhase}</span>
                  </div>
                  <div>
                    <span className="uppercase text-[11px] tracking-wider text-slate-500 mr-2">Year:</span>
                    <span className="text-blue-800 print:text-black font-bold">{terms.find(t => t.id === activeTermId)?.academic_year}</span>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 dark:border-slate-800/60 overflow-hidden print:bg-transparent print:border-none print:shadow-none print:rounded-none">
                  <div className="p-6 space-y-8">
                    {/* 1. Exam Analysis Table */}
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">1. Exam Analysis</h4>
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                        <table className="w-full text-left border-collapse print:border-2 print:border-black">
                          <thead className="bg-slate-50/90 dark:bg-slate-800/90 print:bg-slate-100">
                            <tr>
                              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold text-xs uppercase tracking-wider">Class Segment</th>
                              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold text-xs uppercase tracking-wider text-center">Capacity</th>
                              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-blue-600 font-semibold text-xs uppercase tracking-wider text-center">Highest Avg</th>
                              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-rose-600 font-semibold text-xs uppercase tracking-wider text-center">Lowest Avg</th>
                              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-emerald-600 font-semibold text-xs uppercase tracking-wider text-center">Class Avg</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysisData.map((cls) => (
                              <tr key={`exam-${cls.id}`} className="hover:bg-slate-50/80 border-b border-slate-100 last:border-0 print:border-black">
                                <td className="px-4 py-3 font-bold text-slate-800">{cls.className}</td>
                                <td className="px-4 py-3 text-center font-medium text-slate-600">{cls.numStudents}</td>
                                <td className="px-4 py-3 text-center font-bold text-blue-700">{cls.highestAvg}</td>
                                <td className="px-4 py-3 text-center font-bold text-rose-700">{cls.lowestAvg}</td>
                                <td className="px-4 py-3 text-center font-extrabold text-emerald-700">{cls.classAvg}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 2. Division Breakdown Table */}
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">2. Division Breakdown</h4>
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                        <table className="w-full text-left border-collapse print:border-2 print:border-black">
                          <thead className="bg-slate-50/90 dark:bg-slate-800/90 print:bg-slate-100">
                            <tr>
                              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold text-xs uppercase tracking-wider">Class Segment</th>
                              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-emerald-600 font-semibold text-xs uppercase tracking-wider text-center">Div I</th>
                              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-blue-600 font-semibold text-xs uppercase tracking-wider text-center">Div II</th>
                              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-indigo-600 font-semibold text-xs uppercase tracking-wider text-center">Div III</th>
                              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-amber-600 font-semibold text-xs uppercase tracking-wider text-center">Div IV</th>
                              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-rose-600 font-semibold text-xs uppercase tracking-wider text-center">Div U</th>
                              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-semibold text-xs uppercase tracking-wider text-center">Div X</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysisData.map((cls) => (
                              <tr key={`div-${cls.id}`} className="hover:bg-slate-50/80 border-b border-slate-100 last:border-0 print:border-black">
                                <td className="px-4 py-3 font-bold text-slate-800">{cls.className}</td>
                                <td className="px-4 py-3 text-center font-bold text-emerald-700">{cls.divCounts.I}</td>
                                <td className="px-4 py-3 text-center font-bold text-blue-700">{cls.divCounts.II}</td>
                                <td className="px-4 py-3 text-center font-bold text-indigo-700">{cls.divCounts.III}</td>
                                <td className="px-4 py-3 text-center font-bold text-amber-700">{cls.divCounts.IV}</td>
                                <td className="px-4 py-3 text-center font-bold text-rose-700">{cls.divCounts.U}</td>
                                <td className="px-4 py-3 text-center font-bold text-slate-400">{cls.divCounts.X}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 3. Grade Distribution Table */}
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">3. Grade Distribution</h4>
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                        <table className="w-full text-left border-collapse print:border-2 print:border-black">
                          <thead className="bg-slate-50/90 dark:bg-slate-800/90 print:bg-slate-100">
                            <tr>
                              <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold text-xs uppercase tracking-wider">Class Segment</th>
                              <th className="px-3 py-3 border-b border-slate-200 text-emerald-600 font-bold text-xs text-center">D1</th>
                              <th className="px-3 py-3 border-b border-slate-200 text-emerald-600 font-bold text-xs text-center">D2</th>
                              <th className="px-3 py-3 border-b border-slate-200 text-blue-600 font-bold text-xs text-center">C3</th>
                              <th className="px-3 py-3 border-b border-slate-200 text-blue-600 font-bold text-xs text-center">C4</th>
                              <th className="px-3 py-3 border-b border-slate-200 text-blue-600 font-bold text-xs text-center">C5</th>
                              <th className="px-3 py-3 border-b border-slate-200 text-blue-600 font-bold text-xs text-center">C6</th>
                              <th className="px-3 py-3 border-b border-slate-200 text-amber-600 font-bold text-xs text-center">P7</th>
                              <th className="px-3 py-3 border-b border-slate-200 text-amber-600 font-bold text-xs text-center">P8</th>
                              <th className="px-3 py-3 border-b border-slate-200 text-rose-600 font-bold text-xs text-center">F9</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysisData.map((cls) => (
                              <tr key={`grade-${cls.id}`} className="hover:bg-slate-50/80 border-b border-slate-100 last:border-0 print:border-black">
                                <td className="px-4 py-3 font-bold text-slate-800">{cls.className}</td>
                                <td className="px-3 py-3 text-center font-bold text-emerald-700">{cls.gradeCounts.D1}</td>
                                <td className="px-3 py-3 text-center font-bold text-emerald-700">{cls.gradeCounts.D2}</td>
                                <td className="px-3 py-3 text-center font-bold text-blue-700">{cls.gradeCounts.C3}</td>
                                <td className="px-3 py-3 text-center font-bold text-blue-700">{cls.gradeCounts.C4}</td>
                                <td className="px-3 py-3 text-center font-bold text-blue-700">{cls.gradeCounts.C5}</td>
                                <td className="px-3 py-3 text-center font-bold text-blue-700">{cls.gradeCounts.C6}</td>
                                <td className="px-3 py-3 text-center font-bold text-amber-700">{cls.gradeCounts.P7}</td>
                                <td className="px-3 py-3 text-center font-bold text-amber-700">{cls.gradeCounts.P8}</td>
                                <td className="px-3 py-3 text-center font-bold text-rose-700">{cls.gradeCounts.F9}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Students Tab */}
            {activeTab === 'top_students' && activeLevel && (
              <div className="print:p-10 text-left">
                
                {/* Print Header */}
                <div className="text-center mb-10 hidden print:block">
                  <h1 className="text-2xl font-extrabold text-slate-800 print:text-black mb-1 uppercase tracking-wide">Jiddah Islamic Nursery & Primary School</h1>
                  <h3 className="text-xl font-bold mb-4 underline underline-offset-4 text-slate-700 print:text-black uppercase">Top Performers Leaderboard</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {topStudentsData.map((cls) => {
                    return (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        key={cls.classId} 
                        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 dark:border-slate-800/60 overflow-hidden print:bg-transparent print:border-none print:shadow-none print:rounded-none"
                      >
                        <div className="bg-slate-50/90 backdrop-blur-md p-4 border-b border-slate-200/60 text-center print:border print:border-black print:bg-slate-100 flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-800 print:text-black text-lg">{cls.className} Rankings</h4>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 print:text-black">Top {cls.students.length}</span>
                        </div>
                        <div className="overflow-x-auto print:overflow-visible p-2">
                          <table className="w-full border-collapse print:border-2 print:border-black">
                            <thead className="bg-slate-50/50 print:bg-slate-100 hidden">
                              <tr>
                                <th className="px-4 py-2 text-slate-500 font-semibold text-sm border-b border-slate-200/60 w-12 text-center print:border print:border-black print:text-black">#</th>
                                <th className="px-4 py-2 text-slate-500 font-semibold text-sm border-b border-slate-200/60 text-left print:border print:border-black print:text-black">Name</th>
                                <th className="px-4 py-2 text-slate-500 font-semibold text-sm border-b border-slate-200/60 text-right w-28 print:border print:border-black print:text-black">Average</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cls.students.map((student, idx) => (
                                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors duration-200 border-b border-slate-100 last:border-0 print:border print:border-black">
                                  <td className="px-4 py-3 text-center w-12 print:border print:border-black">
                                    <RankBadge rank={idx + 1} />
                                  </td>
                                  <td className="px-4 py-3 font-bold text-slate-800 print:border print:border-black print:text-black">
                                    {student.studentName}
                                  </td>
                                  <td className="px-4 py-3 text-right print:border print:border-black print:text-black">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 print:hidden">Avg</p>
                                    <p className="font-extrabold text-blue-700 print:text-black text-lg leading-none">{Math.round(student.avg)}</p>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

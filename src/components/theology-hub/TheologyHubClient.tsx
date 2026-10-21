'use client'

import React, { useState, useEffect, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Loader2, ScrollText, BookOpen, Award, Download, Printer, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { TheologyHubEmptyState } from './TheologyHubEmptyState'
import { TopToolbar } from '../figma-ui/TopToolbar'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { generateAssessmentCSV, generateAnalysisCSV, generateTopStudentsCSV } from '@/utils/csvExport'
import { computeStandardRankings } from '@/lib/ranking'

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

const RemarkBadge = memo(({ score }: { score: number }) => {
  if (score >= 85) return <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 print:bg-transparent print:border-none print:text-black">ممتاز</span>
  if (score >= 75) return <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-teal-100 text-teal-800 print:bg-transparent print:border-none print:text-black">جيد جداً</span>
  if (score >= 60) return <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 print:bg-transparent print:border-none print:text-black">جيد</span>
  if (score >= 50) return <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800 print:bg-transparent print:border-none print:text-black">مقبول</span>
  return <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 print:bg-transparent print:border-none print:text-black">ضعيف</span>
})
RemarkBadge.displayName = 'RemarkBadge'

export default function TheologyHubClient({
  terms,
  theologyClasses
}: {
  terms: TermData[]
  theologyClasses: TheologyClassData[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeTermId, setActiveTermId] = useState<string>(searchParams.get('term_id') || terms.find(t => t.is_current)?.id || terms[0]?.id || '')
  const [activeClassId, setActiveClassId] = useState<string>(searchParams.get('class_id') || theologyClasses[0]?.id || '')
  const [activeLevel, setActiveLevel] = useState<string>(searchParams.get('level') || theologyClasses[0]?.level || 'raudha')
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

  useEffect(() => {
    if (!activeTermId) return

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/theology-hub?term_id=${activeTermId}`)
        const ct = res.headers.get('content-type') || ''
        if (!res.ok || !ct.includes('application/json')) throw new Error('Failed to fetch data')
        const json = await res.json()
        setData(json)
      } catch {
        toast.error('Failed to load theology data')
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

  useEffect(() => {
    if (activeClassId && activeTab === 'assessment') {
      const cls = theologyClasses.find(c => c.id === activeClassId)
      if (cls && cls.level !== activeLevel) {
        setActiveLevel(cls.level)
      }
    }
  }, [activeClassId, theologyClasses, activeTab, activeLevel])

  const assessmentData = useMemo(() => {
    if (!data || !activeClassId) return { students: [], orderedSubjects: [] }

    const classEnrollments = data.enrollments.filter(e => e.theology_class_id === activeClassId)
    const classInfo = theologyClasses.find(c => c.id === activeClassId)
    if (!classInfo) return { students: [], orderedSubjects: [] }

    const levelSubjects = data.subjects.filter(s => s.level === classInfo.level)
    const targetSubjects = ['القرآن', 'اللغة العربية', 'الفقه', 'التربية', 'التوحيد', 'السيرة']

    const orderedSubjects = [...levelSubjects].sort((a, b) => {
      let aIdx = targetSubjects.findIndex(t => a.subject_name_arabic.includes(t))
      let bIdx = targetSubjects.findIndex(t => b.subject_name_arabic.includes(t))
      if (aIdx === -1) aIdx = 999
      if (bIdx === -1) bIdx = 999
      return aIdx - bIdx
    }).slice(0, 5)

    const processed = classEnrollments.map(enrollment => {
      const eMarks = data.marks.filter(m => m.enrollment_id === enrollment.id)

      let total = 0
      const subjectScores: Record<string, number | null> = {}

      orderedSubjects.forEach(sub => {
        const mark = eMarks.find(m => m.subject_id === sub.id)
        const score = mark?.[`${examPhase}_score`] ?? null
        subjectScores[sub.id] = score
        if (score != null) total += score
      })

      return {
        id: enrollment.id,
        name: enrollment.students?.name || 'Unknown',
        arabic_name: enrollment.students?.arabic_name,
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
        total: p.total || 0,
        position: p.rank
      }))
    }
  }, [data, activeClassId, theologyClasses, examPhase])

  const analysisData = useMemo(() => {
    if (!data || !activeLevel) return []
    const classes = theologyClasses.filter(c => c.level === activeLevel)
    const levelSubjects = data.subjects.filter(s => s.level === activeLevel)

    const targetSubjects = ['القرآن', 'اللغة العربية', 'الفقه', 'التربية', 'التوحيد', 'السيرة']
    const orderedSubjects = [...levelSubjects].sort((a, b) => {
      let aIdx = targetSubjects.findIndex(t => a.subject_name_arabic.includes(t))
      let bIdx = targetSubjects.findIndex(t => b.subject_name_arabic.includes(t))
      if (aIdx === -1) aIdx = 999
      if (bIdx === -1) bIdx = 999
      return aIdx - bIdx
    }).slice(0, 5)

    return classes.map(cls => {
      const classEnrollments = data.enrollments.filter(e => e.theology_class_id === cls.id)
      let numStudents = 0
      let excellent = 0
      let vGood = 0
      let good = 0
      let fair = 0
      let weak = 0

      classEnrollments.forEach(e => {
        const eMarks = data.marks.filter(m => m.enrollment_id === e.id)
        let total = 0
        let hasMarks = false
        orderedSubjects.forEach(sub => {
          const mark = eMarks.find(m => m.subject_id === sub.id)
          const score = mark?.[`${examPhase}_score`] ?? null
          if (score != null) {
            total += score
            hasMarks = true
          }
        })

        if (hasMarks) {
          numStudents++
          const avg = total / (orderedSubjects.length || 1)
          if (avg >= 85) excellent++
          else if (avg >= 75) vGood++
          else if (avg >= 60) good++
          else if (avg >= 50) fair++
          else weak++
        }
      })

      const passed = excellent + vGood + good + fair
      const passRate = numStudents > 0 ? Math.round((passed / numStudents) * 100) : 0

      return {
        id: cls.id,
        className: cls.class_name_arabic,
        numStudents,
        excellent,
        vGood,
        good,
        fair,
        weak,
        passRate
      }
    })
  }, [data, activeLevel, theologyClasses, examPhase])

  const topStudentsData = useMemo(() => {
    if (!data || !activeLevel) return []
    const classes = theologyClasses.filter(c => c.level === activeLevel)
    const targetSubjects = ['القرآن', 'اللغة العربية', 'الفقه', 'التربية', 'التوحيد', 'السيرة']
    const levelSubjects = data.subjects.filter(s => s.level === activeLevel)
    const orderedSubjects = [...levelSubjects].sort((a, b) => {
      let aIdx = targetSubjects.findIndex(t => a.subject_name_arabic.includes(t))
      let bIdx = targetSubjects.findIndex(t => b.subject_name_arabic.includes(t))
      if (aIdx === -1) aIdx = 999
      if (bIdx === -1) bIdx = 999
      return aIdx - bIdx
    }).slice(0, 5)

    return classes.map(cls => {
      const classEnrollments = data.enrollments.filter(e => e.theology_class_id === cls.id)
      const students = classEnrollments.map(e => {
        const eMarks = data.marks.filter(m => m.enrollment_id === e.id)
        let total = 0
        orderedSubjects.forEach(sub => {
          const mark = eMarks.find(m => m.subject_id === sub.id)
          const score = mark?.[`${examPhase}_score`] ?? null
          if (score != null) total += score
        })
        return {
          id: e.id,
          name: e.students?.name || 'Unknown',
          arabic_name: e.students?.arabic_name,
          className: cls.class_name_arabic,
          studentName: e.students?.arabic_name || e.students?.name || 'Unknown',
          total: total > 0 ? total : null,
          subjectScores: {},
          avg: total / (orderedSubjects.length || 1),
          rank: 0 as number | string
        }
      })

      const ranked = computeStandardRankings(students)
      const topStudents = ranked
        .filter(s => typeof s.rank === 'number')
        .slice(0, 10)
        .map(s => ({
          id: s.id,
          className: cls.class_name_arabic || cls.class_name_english,
          studentName: s.arabic_name || s.name,
          total: s.total ?? 0,
          avg: s.total ? parseFloat((s.total / Object.keys(orderedSubjects).length).toFixed(1)) : 0,
          rank: s.rank as number
        }))

      return {
        classId: cls.id,
        className: cls.class_name_arabic,
        students: topStudents
      }
    }).filter(group => group.students.length > 0)
  }, [data, activeLevel, theologyClasses, examPhase])

  const toArabicNumerals = (num: string | number | null | undefined) => {
    if (num == null || num === '') return ''
    return num.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = async () => {
    try {
      const url = window.location.href
      await navigator.clipboard.writeText(url)
      toast.success("Link copied to clipboard!")
    } catch {
      toast.error("Failed to copy link. Check your browser permissions.")
    }
  }

  const handleDownload = () => {
    setIsDownloading(true)
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `theologyhub-${activeTab}-${dateStr}.csv`

    setTimeout(() => {
      try {
        if (activeTab === 'assessment') {
          if (!assessmentData.students || assessmentData.students.length === 0) {
            toast.error("No assessment data to download.")
            return
          }
          generateAssessmentCSV(assessmentData.students, assessmentData.orderedSubjects, filename)
        } else if (activeTab === 'analysis') {
          if (analysisData.length === 0) {
            toast.error("No analysis data to download.")
            return
          }
          generateAnalysisCSV(analysisData as any, filename)
        } else if (activeTab === 'top_students') {
          if (topStudentsData.length === 0) {
            toast.error("No top students data to download.")
            return
          }
          const rows = topStudentsData.flatMap(g => g.students)
          generateTopStudentsCSV(rows, filename)
        }
        toast.success("Download generated successfully!")
      } catch (err) {
        console.error(err)
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
            { label: 'Print Current View', onClick: handlePrint, icon: <Printer size={14} /> }
          ]}
          downloadOptions={[
            { label: 'Download Current View (CSV)', onClick: handleDownload, icon: <Download size={14} /> },
            { label: 'Download Assessment Sheet (CSV)', onClick: () => {
                const dateStr = new Date().toISOString().split('T')[0]
                if (!assessmentData.students?.length) return toast.error("No assessment data to download.")
                generateAssessmentCSV(assessmentData.students as any, assessmentData.orderedSubjects, `theologyhub-assessment-${dateStr}.csv`)
                toast.success("Assessment CSV generated successfully!")
            }, icon: <FileSpreadsheet size={14} /> },
            { label: 'Download Subject Analysis (CSV)', onClick: () => {
                const dateStr = new Date().toISOString().split('T')[0]
                if (!analysisData.length) return toast.error("No analysis data to download.")
                generateAnalysisCSV(analysisData as any, `theologyhub-analysis-${dateStr}.csv`)
                toast.success("Analysis CSV generated successfully!")
            }, icon: <FileSpreadsheet size={14} /> },
            { label: 'Download Top Students (CSV)', onClick: () => {
                const dateStr = new Date().toISOString().split('T')[0]
                if (!topStudentsData.length) return toast.error("No top students data to download.")
                generateTopStudentsCSV(topStudentsData.flatMap(g => g.students), `theologyhub-top_students-${dateStr}.csv`)
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
                <ScrollText size={16} />
              </div>
              <h1 className="text-sm sm:text-[15px] font-bold tracking-tight">Theology Hub</h1>
            </div>
          }
        />
      </div>

      {/* Controls Area (Filters) */}
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
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Term / Year</label>
                  <select
                    className="w-full min-h-[42px] px-2.5 py-1.5 border border-stone-200 rounded-xl bg-[#F8FAFC] text-stone-900 text-xs font-semibold outline-none focus:border-[#059669]"
                    value={activeTermId}
                    onChange={(e) => setActiveTermId(e.target.value)}
                  >
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.label} ({t.academic_year})</option>
                    ))}
                  </select>
                </div>

                {/* Context Selector (Class / Level) */}
                <div>
                  {activeTab === 'assessment' ? (
                    <>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 text-right" dir="rtl">الصف (Class)</label>
                      <select
                        className="w-full min-h-[42px] px-2.5 py-1.5 border border-stone-200 rounded-xl bg-[#F8FAFC] text-stone-900 text-xs font-semibold outline-none focus:border-[#059669] text-right font-arabic"
                        dir="rtl"
                        value={activeClassId}
                        onChange={(e) => setActiveClassId(e.target.value)}
                      >
                        <option value="">-- اختر الصف --</option>
                        {theologyClasses.map(t => (
                          <option key={t.id} value={t.id}>{t.class_name_arabic} ({t.class_name_english})</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1 text-right" dir="rtl">المرحلة (Level)</label>
                      <select
                        className="w-full min-h-[42px] px-2.5 py-1.5 border border-stone-200 rounded-xl bg-[#F8FAFC] text-stone-900 text-xs font-semibold outline-none focus:border-[#059669] text-right font-arabic"
                        dir="rtl"
                        value={activeLevel}
                        onChange={(e) => setActiveLevel(e.target.value)}
                      >
                        <option value="raudha">الروضة (Nursery)</option>
                        <option value="ibtidaai_lower">الابتدائية السفلى (Lower Primary)</option>
                        <option value="ibtidaai_upper">الابتدائية العليا (Upper Primary)</option>
                      </select>
                    </>
                  )}
                </div>

                {/* View Type */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">View Type</label>
                  <div className="flex p-1 bg-[#F1F5F9] border border-stone-200/80 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveTab('assessment')}
                      className={`flex-1 min-h-[34px] px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${activeTab === 'assessment' ? 'bg-[#059669] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
                    >
                      <BookOpen size={12} /> Sheet
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('analysis')}
                      className={`flex-1 min-h-[34px] px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${activeTab === 'analysis' ? 'bg-[#059669] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
                    >
                      <ScrollText size={12} /> Analysis
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('top_students')}
                      className={`flex-1 min-h-[34px] px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${activeTab === 'top_students' ? 'bg-[#059669] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
                    >
                      <Award size={12} /> Top 10
                    </button>
                  </div>
                </div>

                {/* Exam Phase */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">Exam Phase</label>
                  <div className="flex p-1 bg-[#F1F5F9] border border-stone-200/80 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setExamPhase('mot')}
                      className={`flex-1 min-h-[34px] px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center cursor-pointer ${examPhase === 'mot' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
                    >
                      MOT
                    </button>
                    <button
                      type="button"
                      onClick={() => setExamPhase('eot')}
                      className={`flex-1 min-h-[34px] px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center cursor-pointer ${examPhase === 'eot' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
                    >
                      EOT
                    </button>
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
            <p className="text-stone-600 text-sm font-medium">Loading theology data…</p>
          </div>
        ) : !data || (!activeClassId && activeTab === 'assessment') || (!activeLevel && (activeTab === 'analysis' || activeTab === 'top_students')) ? (
          <TheologyHubEmptyState />
        ) : (
          <div className="w-full max-w-7xl mx-auto print:max-w-[210mm] print:m-0">
            {/* Assessment Tab */}
            {activeTab === 'assessment' && activeClassId && (
              <div className="font-arabic text-right print:py-0 print:px-2" dir="rtl">
                <div className="text-center mb-6">
                  <h1 className="text-xl font-extrabold text-[#059669] mb-1 print:text-black">مدرسة جدة الإسلامية للروضة والابتدائية _ انساغو واكيسو</h1>
                  <h3 className="text-base font-bold mb-2 underline underline-offset-4 text-stone-700 print:text-black">
                    {examPhase === 'bot' ? 'كشف الدرجات لبداية الفترة' : examPhase === 'eot' ? 'كشف الدرجات لنهاية الفترة' : 'كشف الدرجات لمنتصف الفترة'}
                  </h3>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-3 mb-6 font-semibold text-stone-700 print:text-black bg-white print:bg-transparent px-4 py-3 rounded-xl border border-stone-200 print:border-none shadow-xs print:shadow-none text-xs">
                  <div>
                    <span>الفترة: </span>
                    <span className="text-[#059669] print:text-black font-bold px-2">
                      {terms.find(t => t.id === activeTermId)?.label === 'Term 1' ? 'الأولى' : terms.find(t => t.id === activeTermId)?.label === 'Term 2' ? 'الثانية' : 'الثالثة'}
                    </span>
                  </div>
                  <div>
                    <span>الصف: </span>
                    <span className="text-[#059669] print:text-black font-bold px-2">
                      {theologyClasses.find(c => c.id === activeClassId)?.class_name_arabic}
                    </span>
                  </div>
                  <div>
                    <span>الاختبار: </span>
                    <span className="text-[#059669] print:text-black font-bold px-2">
                      {examPhase === 'mot' ? 'منتصف الفترة (MOT)' : 'نهاية الفترة (EOT)'}
                    </span>
                  </div>
                  <div>
                    <span>السنة: </span>
                    <span className="text-[#059669] print:text-black font-bold px-2">
                      {toArabicNumerals(terms.find(t => t.id === activeTermId)?.academic_year || '')}م
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden print:bg-transparent print:border-none print:shadow-none print:rounded-none print:overflow-visible">
                  <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-right border-collapse print:border-2 print:border-black">
                      <thead className="bg-[#F8FAFC] sticky top-0 z-10 print:bg-stone-100 print:static">
                        <tr>
                          <th className="px-2.5 py-2 border-b border-stone-200 text-stone-600 font-bold text-xs w-10 text-center print:border print:border-black print:text-black">م</th>
                          <th className="px-3 py-2 border-b border-stone-200 text-stone-600 font-bold text-xs min-w-[140px] print:border print:border-black print:text-black">اسم التلميذ/ة</th>
                          {assessmentData.orderedSubjects?.map(s => (
                            <th key={s.id} className="px-2.5 py-2 border-b border-stone-200 text-stone-600 font-bold text-xs text-center print:border print:border-black print:text-black">{s.subject_name_arabic}</th>
                          ))}
                          <th className="px-2.5 py-2 border-b border-stone-200 text-stone-600 font-bold text-xs text-center w-20 print:border print:border-black print:text-black">المجموع</th>
                          <th className="px-2.5 py-2 border-b border-stone-200 text-stone-600 font-bold text-xs text-center w-20 print:border print:border-black print:text-black">الترتيب</th>
                          <th className="px-2.5 py-2 border-b border-stone-200 text-stone-600 font-bold text-xs text-center w-28 print:border print:border-black print:text-black">الملاحظات</th>
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
                            className="hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0 print:border print:border-black"
                          >
                            <td className="px-2.5 py-2 text-center text-stone-500 font-medium print:border print:border-black print:text-black">{toArabicNumerals(idx + 1)}</td>
                            <td className="px-3 py-2 font-semibold text-stone-900 whitespace-nowrap print:border print:border-black print:text-black">{student.arabic_name || student.name}</td>
                            {assessmentData.orderedSubjects?.map(s => (
                              <td key={s.id} className="px-2.5 py-2 text-center font-medium text-stone-700 print:border print:border-black print:text-black">
                                {student.subjectScores[s.id] !== undefined && student.subjectScores[s.id] !== null ? toArabicNumerals(student.subjectScores[s.id]!) : '-'}
                              </td>
                            ))}
                            <td className="px-2.5 py-2 text-center font-bold text-stone-900 print:border print:border-black print:text-black">
                              {student.total > 0 ? toArabicNumerals(student.total) : '-'}
                            </td>
                            <td className="px-2.5 py-2 text-center font-bold text-[#059669] print:border print:border-black print:text-black">
                              {student.total > 0 ? toArabicNumerals(student.position) : '-'}
                            </td>
                            <td className="px-2.5 py-2 text-center font-medium print:border print:border-black print:text-black">
                              {student.total > 0 ? (
                                <RemarkBadge score={student.total / (assessmentData.orderedSubjects.length || 1)} />
                              ) : '-'}
                            </td>
                          </motion.tr>
                        ))}
                      </motion.tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis Tab */}
            {activeTab === 'analysis' && activeLevel && (
              <div className="font-arabic text-right print:py-0 print:px-2" dir="rtl">
                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead className="bg-[#F8FAFC]">
                        <tr>
                          <th className="px-4 py-3 border-b border-stone-200 text-stone-600 font-bold text-xs text-center w-32">الصف</th>
                          <th className="px-4 py-3 border-b border-stone-200 text-stone-600 font-bold text-xs text-center">عدد الطلاب</th>
                          <th className="px-4 py-3 border-b border-stone-200 text-[#059669] font-bold text-xs text-center">ممتاز</th>
                          <th className="px-4 py-3 border-b border-stone-200 text-emerald-700 font-bold text-xs text-center">جيد جداً</th>
                          <th className="px-4 py-3 border-b border-stone-200 text-amber-700 font-bold text-xs text-center">جيد</th>
                          <th className="px-4 py-3 border-b border-stone-200 text-orange-700 font-bold text-xs text-center">مقبول</th>
                          <th className="px-4 py-3 border-b border-stone-200 text-rose-700 font-bold text-xs text-center">ضعيف</th>
                          <th className="px-4 py-3 border-b border-stone-200 text-stone-800 font-bold text-xs text-center">نسبة النجاح</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisData.map((cls) => (
                          <tr key={cls.id} className="hover:bg-stone-50 border-b border-stone-100 last:border-0">
                            <td className="px-4 py-3 text-center font-bold text-stone-900">{cls.className}</td>
                            <td className="px-4 py-3 text-center font-medium text-stone-700">{toArabicNumerals(cls.numStudents)}</td>
                            <td className="px-4 py-3 text-center font-semibold text-[#059669]">{toArabicNumerals(cls.excellent)}</td>
                            <td className="px-4 py-3 text-center font-semibold text-emerald-700">{toArabicNumerals(cls.vGood)}</td>
                            <td className="px-4 py-3 text-center font-semibold text-amber-700">{toArabicNumerals(cls.good)}</td>
                            <td className="px-4 py-3 text-center font-semibold text-orange-700">{toArabicNumerals(cls.fair)}</td>
                            <td className="px-4 py-3 text-center font-semibold text-rose-700">{toArabicNumerals(cls.weak)}</td>
                            <td className="px-4 py-3 text-center font-extrabold text-[#059669]" dir="rtl">% {toArabicNumerals(cls.passRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Top Students Tab */}
            {activeTab === 'top_students' && activeLevel && (
              <div className="font-arabic text-right print:py-0 print:px-2 grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
                {topStudentsData.map((cls) => (
                  <div
                    key={cls.classId}
                    className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
                  >
                    <div className="bg-[#F8FAFC] px-4 py-3 border-b border-stone-200 text-center">
                      <h4 className="font-extrabold text-stone-900 text-base">{cls.className}</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead className="bg-stone-50">
                          <tr>
                            <th className="px-4 py-2 text-stone-600 font-semibold text-xs border-b border-stone-200 w-12 text-center">م</th>
                            <th className="px-4 py-2 text-stone-600 font-semibold text-xs border-b border-stone-200 text-right">الاسم</th>
                            <th className="px-4 py-2 text-stone-600 font-semibold text-xs border-b border-stone-200 text-center w-28">المعدل</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cls.students.map((student, idx) => (
                            <tr key={student.id} className="hover:bg-stone-50 border-b border-stone-100 last:border-0">
                              <td className="px-4 py-3 text-center font-bold text-stone-500">{toArabicNumerals(idx + 1)}</td>
                              <td className="px-4 py-3 font-bold text-[#059669]">{student.studentName}</td>
                              <td className="px-4 py-3 text-center font-extrabold text-stone-800">{toArabicNumerals(Math.round(student.avg))}</td>
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

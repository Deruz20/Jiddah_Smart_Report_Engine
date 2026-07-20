'use client'

import React, { useState, useEffect, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Loader2, ScrollText, BookOpen, Award } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from "@/utils/supabase/client"
import { TheologyHubEmptyState } from './TheologyHubEmptyState'
import { TopToolbar } from '../figma-ui/TopToolbar'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { generateAssessmentCSV, generateAnalysisCSV, generateTopStudentsCSV } from '@/utils/csvExport'

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

// ----------------------
// Helper Components
// ----------------------
const RemarkBadge = memo(({ score }: { score: number }) => {
  if (score >= 75) return <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 print:bg-transparent print:border-none print:text-black">ممتاز</span>
  if (score >= 65) return <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-teal-100 text-teal-800 print:bg-transparent print:border-none print:text-black">جيد جداً</span>
  if (score >= 50) return <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 print:bg-transparent print:border-none print:text-black">جيد</span>
  if (score >= 40) return <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800 print:bg-transparent print:border-none print:text-black">مقبول</span>
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
  const [activeClassId, setActiveClassId] = useState<string>(searchParams.get('class_id') || '')
  const [activeLevel, setActiveLevel] = useState<string>(searchParams.get('level') || 'raudha')
  const [activeTab, setActiveTab] = useState<'assessment' | 'analysis' | 'top_students'>((searchParams.get('tab') as any) || 'assessment')
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
        const res = await fetch(`/api/theology-hub?term_id=${activeTermId}`)
        if (!res.ok) throw new Error('Failed to fetch data')
        const json = await res.json()
        setData(json)
      } catch (err) {
        toast.error('Failed to load theology data')
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
    
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [activeTermId, activeClassId, activeLevel, activeTab, pathname, router, searchParams])

  // Process data for the Assessment Form
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
        const score = mark?.mot_score != null ? mark.mot_score : (mark?.eot_score != null ? mark.eot_score : null)
        subjectScores[sub.id] = score
        if (score != null) total += score
      })

      return {
        id: enrollment.id,
        name: enrollment.students.name,
        arabic_name: enrollment.students.arabic_name,
        total,
        subjectScores,
        position: '-' as number | string
      }
    })

    processed.sort((a, b) => b.total - a.total)
    const uniqueTotals = Array.from(new Set(processed.map(p => p.total)))
    
    return {
      orderedSubjects,
      students: processed.map((p) => ({
        ...p,
        position: p.total > 0 ? uniqueTotals.filter(x => x > p.total).length + 1 : '-'
      }))
    }
  }, [data, activeClassId, theologyClasses])

  // Process data for the Analysis Form
  const analysisData = useMemo(() => {
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
          const score = mark?.mot_score != null ? mark.mot_score : mark?.eot_score
          if (score != null) {
            total += score
            hasMarks = true
          }
        })
        
        if (hasMarks) {
          numStudents++
          const avg = total / (orderedSubjects.length || 1)
          if (avg >= 75) excellent++
          else if (avg >= 65) vGood++
          else if (avg >= 50) good++
          else if (avg >= 40) fair++
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
  }, [data, activeLevel, theologyClasses])

  // Process data for Top Students Form
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
          const score = mark?.mot_score != null ? mark.mot_score : mark?.eot_score
          if (score != null) total += score
        })
        return {
          id: e.id,
          className: cls.class_name_arabic,
          studentName: e.students.arabic_name || e.students.name,
          total,
          avg: total / (orderedSubjects.length || 1),
          rank: 0
        }
      }).filter(s => s.total > 0).sort((a, b) => b.total - a.total).slice(0, 5)

      students.forEach((s, i) => s.rank = i + 1)
      
      return {
        classId: cls.id,
        className: cls.class_name_arabic,
        students
      }
    }).filter(group => group.students.length > 0)
  }, [data, activeLevel, theologyClasses])

  // Auto-transliteration for missing arabic names
  React.useEffect(() => {
    if (!assessmentData.students || assessmentData.students.length === 0) return;
    const studentsToTranslate = assessmentData.students.filter(s => !s.arabic_name);
    if (studentsToTranslate.length === 0) return;

    const translateMissingNames = async () => {
      try {
        const namesToTranslate = studentsToTranslate.map(s => s.name);
        const res = await fetch('/api/transliterate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ names: namesToTranslate })
        });
        if (res.ok) {
          const { transliterated } = await res.json();
          const supabase = createClient();
          for (let i = 0; i < studentsToTranslate.length; i++) {
            if (transliterated[i]) {
              await supabase.from('students').update({ arabic_name: transliterated[i] }).eq('id', studentsToTranslate[i].id);
            }
          }
          
          setData(prevData => {
            if (!prevData) return prevData;
            const updatedEnrollments = prevData.enrollments.map(e => {
              const idx = studentsToTranslate.findIndex(s => s.id === e.id);
              if (idx !== -1 && transliterated[idx]) {
                return { ...e, students: { ...e.students, arabic_name: transliterated[idx] } };
              }
              return e;
            });
            return { ...prevData, enrollments: updatedEnrollments };
          });
        }
      } catch (err) {
        console.error("Auto transliteration failed", err);
      }
    };
    translateMissingNames();
  }, [assessmentData.students]);

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
    } catch (err) {
      toast.error("Failed to copy link. Check your browser permissions.")
    }
  }

  const handleDownload = () => {
    setIsDownloading(true)
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `theologyhub-${activeTab}-${dateStr}.csv`
    
    // Slight timeout so UI can show loading state for heavy datasets
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
          generateAnalysisCSV(analysisData, filename)
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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0f172a] print:bg-white">
      {/* TopToolbar */}
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
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-emerald-600 dark:text-emerald-400">
                <ScrollText size={18} />
              </div>
              <h1 className="text-[15px] font-semibold tracking-tight">Theology Hub</h1>
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
            className="overflow-hidden bg-white dark:bg-[#1e293b] border-b border-slate-200/60 dark:border-slate-800 shadow-sm print:hidden shrink-0"
          >
            <div className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
            <select
              className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500"
              value={activeTermId}
              onChange={(e) => setActiveTermId(e.target.value)}
            >
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.label} ({t.academic_year})</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">View Type</label>
            <div className="flex overflow-x-auto no-scrollbar p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setActiveTab('assessment')}
                className={`flex-1 min-w-[120px] py-1.5 px-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'assessment' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <BookOpen size={14} /> Assessment
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`flex-1 min-w-[120px] py-1.5 px-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'analysis' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ScrollText size={14} /> Analysis
              </button>
              <button
                onClick={() => setActiveTab('top_students')}
                className={`flex-1 min-w-[120px] py-1.5 px-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'top_students' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Award size={14} /> Top Students
              </button>
            </div>
          </div>

          {activeTab === 'assessment' && (
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Class</label>
              <select
                className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500 text-right"
                dir="rtl"
                value={activeClassId}
                onChange={(e) => setActiveClassId(e.target.value)}
              >
                <option value="">-- اختر الصف --</option>
                {theologyClasses.map(t => (
                  <option key={t.id} value={t.id}>{t.class_name_arabic} ({t.class_name_english})</option>
                ))}
              </select>
            </div>
          )}

          {(activeTab === 'analysis' || activeTab === 'top_students') && (
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Level</label>
              <select
                className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500 text-right"
                dir="rtl"
                value={activeLevel}
                onChange={(e) => setActiveLevel(e.target.value)}
              >
                <option value="raudha">الروضة (Nursery)</option>
                <option value="ibtidaai_lower">الابتدائية السفلى (Lower Primary)</option>
                <option value="ibtidaai_upper">الابتدائية العليا (Upper Primary)</option>
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
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
            <p className="text-slate-500 font-medium">Loading theology data...</p>
          </div>
        ) : !data || (!activeClassId && activeTab === 'assessment') || (!activeLevel && (activeTab === 'analysis' || activeTab === 'top_students')) ? (
          <TheologyHubEmptyState />
        ) : (
          <div className="w-full max-w-7xl mx-auto print:max-w-[210mm] print:m-0 min-h-[297mm]">
            
            {/* Assessment Tab */}
            {activeTab === 'assessment' && activeClassId && (
              <div className="font-arabic text-right print:p-10" dir="rtl">
                
                {/* Header (Print-optimized) */}
                <div className="text-center mb-8">
                  <h2 className="text-lg font-bold mb-1 text-slate-800 print:text-black">بسم الله الرحمن الرحيم</h2>
                  <h1 className="text-2xl font-extrabold text-emerald-800 mb-2 print:text-black">مدرسة جدة الإسلامية للروضة والابتدائية _ انساغو واكيسو</h1>
                  <h3 className="text-xl font-bold mb-4 underline underline-offset-4 text-slate-700 print:text-black">كشف الدرجات لمنتصف الفترة</h3>
                </div>

                <div className="flex justify-between items-center mb-6 font-semibold text-slate-700 print:text-black bg-white/50 print:bg-transparent px-4 py-3 rounded-xl border border-slate-200/50 print:border-none shadow-sm print:shadow-none">
                  <div>
                    <span>الفترة: </span>
                    <span className="text-emerald-800 print:text-black font-bold px-4">
                      {terms.find(t => t.id === activeTermId)?.label === 'Term 1' ? 'الأولى' : terms.find(t => t.id === activeTermId)?.label === 'Term 2' ? 'الثانية' : 'الثالثة'}
                    </span>
                  </div>
                  <div>
                    <span>الصف: </span>
                    <span className="text-emerald-800 print:text-black font-bold px-4">
                      {theologyClasses.find(c => c.id === activeClassId)?.class_name_arabic}
                    </span>
                  </div>
                  <div>
                    <span>السنة: </span>
                    <span className="text-emerald-800 print:text-black font-bold px-4">
                      {toArabicNumerals(terms.find(t => t.id === activeTermId)?.academic_year || '')}م
                    </span>
                  </div>
                </div>

                {/* Modern Glassmorphic Table Container */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 dark:border-slate-800/60 overflow-hidden print:bg-transparent print:border-none print:shadow-none print:rounded-none">
                  <div className="overflow-x-auto shadow-inner print:shadow-none print:overflow-visible">
                    <table className="w-full text-right border-collapse print:border-2 print:border-black">
                      <thead className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md sticky top-0 z-10 print:bg-slate-100 print:static">
                        <tr>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-sm w-12 text-center print:border print:border-black print:text-black">م</th>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-sm w-64 print:border print:border-black print:text-black">اسم التلميذ/ة</th>
                          {assessmentData.orderedSubjects?.map(s => (
                            <th key={s.id} className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-sm text-center print:border print:border-black print:text-black">{s.subject_name_arabic}</th>
                          ))}
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-sm text-center w-24 print:border print:border-black print:text-black">المجموع</th>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-sm text-center w-24 print:border print:border-black print:text-black">الترتيب</th>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-sm text-center w-32 print:border print:border-black print:text-black">الملاحظات</th>
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
                            <td className="px-4 py-3 text-center text-slate-400 font-medium print:border print:border-black print:text-black">{toArabicNumerals(idx + 1)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap print:border print:border-black print:text-black">{student.arabic_name || student.name}</td>
                            
                            {assessmentData.orderedSubjects?.map(s => (
                              <td key={s.id} className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-300 print:border print:border-black print:text-black">
                                {student.subjectScores[s.id] !== undefined ? toArabicNumerals(student.subjectScores[s.id]!) : '-'}
                              </td>
                            ))}
                            
                            <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-white print:border print:border-black print:text-black">
                              {student.total > 0 ? toArabicNumerals(student.total) : '-'}
                            </td>
                            
                            <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400 print:border print:border-black print:text-black">
                              {student.total > 0 ? toArabicNumerals(student.position) : '-'}
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
                          <tr key={`empty-${i}`} className="border-b border-slate-100 last:border-0 print:border print:border-black print:h-10">
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
                <div className="flex justify-between items-center mt-12 px-8 text-slate-700 print:text-black">
                  <div className="text-center">
                    <p className="font-bold mb-6 text-sm">توقيع مربي الفصل:</p>
                    <div className="border-b-2 border-dotted border-slate-400 print:border-black w-48"></div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold mb-6 text-sm">توقيع مشرف التعليم:</p>
                    <div className="border-b-2 border-dotted border-slate-400 print:border-black w-48"></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Analysis Tab */}
            {activeTab === 'analysis' && activeLevel && (
              <div className="font-arabic text-right print:p-10" dir="rtl">
                <div className="text-center mb-8">
                  <h2 className="text-lg font-bold mb-1 text-slate-800 print:text-black">بسم الله الرحمن الرحيم</h2>
                  <h1 className="text-2xl font-extrabold text-emerald-800 mb-2 print:text-black">مدرسة جدة الإسلامية للروضة والابتدائية</h1>
                  <h3 className="text-xl font-bold mb-4 underline underline-offset-4 text-slate-700 print:text-black">النظرة الأولى الدقيقة لنتائج منتصف الفترة</h3>
                </div>

                <div className="flex justify-between items-center mb-6 font-semibold text-slate-700 print:text-black bg-white/50 print:bg-transparent px-4 py-3 rounded-xl border border-slate-200/50 print:border-none shadow-sm print:shadow-none">
                  <div>
                    <span>المرحلة: </span>
                    <span className="text-emerald-800 print:text-black font-bold px-4">
                      {activeLevel === 'raudha' ? 'الروضة' : activeLevel === 'ibtidaai_lower' ? 'الابتدائية السفلى' : 'الابتدائية العليا'}
                    </span>
                  </div>
                  <div>
                    <span>الفترة: </span>
                    <span className="text-emerald-800 print:text-black font-bold px-4">
                      {terms.find(t => t.id === activeTermId)?.label === 'Term 1' ? 'الأولى' : terms.find(t => t.id === activeTermId)?.label === 'Term 2' ? 'الثانية' : 'الثالثة'}
                    </span>
                  </div>
                  <div>
                    <span>السنة: </span>
                    <span className="text-emerald-800 print:text-black font-bold px-4">
                      {toArabicNumerals(terms.find(t => t.id === activeTermId)?.academic_year || '')}م
                    </span>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 dark:border-slate-800/60 overflow-hidden print:bg-transparent print:border-none print:shadow-none print:rounded-none">
                  <div className="overflow-x-auto shadow-inner print:shadow-none print:overflow-visible">
                    <table className="w-full text-right border-collapse print:border-2 print:border-black">
                      <thead className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md sticky top-0 z-10 print:bg-slate-100 print:static">
                        <tr>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-sm text-center w-32 print:border print:border-black print:text-black">الصف</th>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold text-sm text-center print:border print:border-black print:text-black">عدد الطلاب</th>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-emerald-600 font-semibold text-sm text-center print:border print:border-black print:text-black">ممتاز</th>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-teal-600 font-semibold text-sm text-center print:border print:border-black print:text-black">جيد جداً</th>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-amber-600 font-semibold text-sm text-center print:border print:border-black print:text-black">جيد</th>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-orange-600 font-semibold text-sm text-center print:border print:border-black print:text-black">مقبول</th>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-rose-600 font-semibold text-sm text-center print:border print:border-black print:text-black">ضعيف</th>
                          <th className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-slate-700 font-semibold text-sm text-center print:border print:border-black print:text-black">نسبة النجاح</th>
                        </tr>
                      </thead>
                      <motion.tbody 
                        initial="hidden" 
                        animate="visible" 
                        variants={tableVariants}
                        className="print:!opacity-100 print:!transform-none"
                      >
                        {analysisData.map((cls) => {
                          return (
                            <motion.tr 
                              variants={rowVariants}
                              key={cls.id}
                              className="hover:bg-slate-50/80 transition-colors duration-200 border-b border-slate-100 last:border-0 print:border print:border-black print:hover:bg-transparent print:!opacity-100 print:!transform-none"
                            >
                              <td className="px-4 py-3 text-center font-bold text-slate-800 bg-slate-50/30 print:border print:border-black print:text-black">{cls.className}</td>
                              <td className="px-4 py-3 text-center font-medium text-slate-600 print:border print:border-black print:text-black">{toArabicNumerals(cls.numStudents)}</td>
                              <td className="px-4 py-3 text-center font-semibold text-emerald-700 print:border print:border-black print:text-black">{toArabicNumerals(cls.excellent)}</td>
                              <td className="px-4 py-3 text-center font-semibold text-teal-700 print:border print:border-black print:text-black">{toArabicNumerals(cls.vGood)}</td>
                              <td className="px-4 py-3 text-center font-semibold text-amber-700 print:border print:border-black print:text-black">{toArabicNumerals(cls.good)}</td>
                              <td className="px-4 py-3 text-center font-semibold text-orange-700 print:border print:border-black print:text-black">{toArabicNumerals(cls.fair)}</td>
                              <td className="px-4 py-3 text-center font-semibold text-rose-700 print:border print:border-black print:text-black">{toArabicNumerals(cls.weak)}</td>
                              <td className="px-4 py-3 text-center font-extrabold text-emerald-600 print:border print:border-black print:text-black" dir="rtl">% {toArabicNumerals(cls.passRate)}</td>
                            </motion.tr>
                          )
                        })}
                      </motion.tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Top Students Tab */}
            {activeTab === 'top_students' && activeLevel && (
              <div className="font-arabic text-right print:p-10" dir="rtl">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-extrabold underline underline-offset-8 text-emerald-800 print:text-black mb-10 mt-6">أسماء المتفوقين من كل مرحلة مع ذكر المعدل التراكمي لكل منهم</h3>
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
                        <div className="bg-slate-50/90 backdrop-blur-md p-4 border-b border-slate-200/60 text-center print:border print:border-black print:bg-slate-100">
                          <h4 className="font-extrabold text-slate-800 print:text-black text-lg">{cls.className}</h4>
                        </div>
                        <div className="overflow-x-auto print:overflow-visible">
                          <table className="w-full border-collapse print:border-2 print:border-black">
                            <thead className="bg-slate-50/50 print:bg-slate-100">
                              <tr>
                                <th className="px-4 py-2 text-slate-500 font-semibold text-sm border-b border-slate-200/60 w-12 text-center print:border print:border-black print:text-black">م</th>
                                <th className="px-4 py-2 text-slate-500 font-semibold text-sm border-b border-slate-200/60 text-right print:border print:border-black print:text-black">الاسم</th>
                                <th className="px-4 py-2 text-slate-500 font-semibold text-sm border-b border-slate-200/60 text-center w-28 print:border print:border-black print:text-black">المعدل</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cls.students.map((student, idx) => (
                                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors duration-200 border-b border-slate-100 last:border-0 print:border print:border-black">
                                  <td className="px-4 py-3 text-center font-bold text-slate-400 print:border print:border-black print:text-black">{toArabicNumerals(idx + 1)}</td>
                                  <td className="px-4 py-3 font-bold text-emerald-800 print:border print:border-black print:text-black">{student.studentName}</td>
                                  <td className="px-4 py-3 text-center font-extrabold text-slate-700 print:border print:border-black print:text-black">{toArabicNumerals(Math.round(student.avg))}</td>
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

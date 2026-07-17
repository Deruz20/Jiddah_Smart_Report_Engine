'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Loader2, Printer, Search, Download, BookOpen, ScrollText, Users, Award } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from "@/utils/supabase/client"
import { TheologyHubEmptyState } from './TheologyHubEmptyState'

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

export default function TheologyHubClient({
  terms,
  theologyClasses
}: {
  terms: TermData[]
  theologyClasses: TheologyClassData[]
}) {
  const [activeTermId, setActiveTermId] = useState<string>(terms.find(t => t.is_current)?.id || terms[0]?.id || '')
  const [activeClassId, setActiveClassId] = useState<string>('')
  const [activeLevel, setActiveLevel] = useState<string>('raudha')
  
  const [activeTab, setActiveTab] = useState<'assessment' | 'analysis' | 'top_students'>('assessment')

  const [isLoading, setIsLoading] = useState(false)
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

  // Process data for the Assessment Form
  const assessmentData = useMemo(() => {
    if (!data || !activeClassId) return []
    
    const classEnrollments = data.enrollments.filter(e => e.theology_class_id === activeClassId)
    const classInfo = theologyClasses.find(c => c.id === activeClassId)
    if (!classInfo) return []
    
    const levelSubjects = data.subjects.filter(s => s.level === classInfo.level)
    
    // Primary columns we want: القرآن, اللغة العربية, الفقه, التربية
    const targetSubjects = ['القرآن', 'اللغة العربية', 'الفقه', 'التربية', 'التوحيد', 'السيرة']
    
    // Sort subjects based on target order
    const orderedSubjects = [...levelSubjects].sort((a, b) => {
      let aIdx = targetSubjects.findIndex(t => a.subject_name_arabic.includes(t))
      let bIdx = targetSubjects.findIndex(t => b.subject_name_arabic.includes(t))
      if (aIdx === -1) aIdx = 999
      if (bIdx === -1) bIdx = 999
      return aIdx - bIdx
    }).slice(0, 5) // keep max 5 subjects for the form

    const processed = classEnrollments.map(enrollment => {
      const eMarks = data.marks.filter(m => m.enrollment_id === enrollment.id)
      
      let total = 0
      const subjectScores: Record<string, number | null> = {}
      
      orderedSubjects.forEach(sub => {
        const mark = eMarks.find(m => m.subject_id === sub.id)
        // For the assessment sheet we usually use MOT score, but we could use EOT if requested. Let's use EOT or MOT. 
        // We'll use mot_score if it exists, otherwise eot_score (since this is for Mid-Term results)
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
      }
    })

    // Calculate positions
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
          window.location.reload(); // Refresh to show transliterated names
        }
      } catch (err) {
        console.error("Auto transliteration failed", err);
      }
    };
    translateMissingNames();
  }, [assessmentData.students]);

  // Helper to convert English digits to Eastern Arabic digits
  const toArabicNumerals = (num: string | number) => {
    return num.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])
  }

  // Get remark text in Arabic based on score
  const getArabicRemark = (score: number) => {
    if (score >= 75) return 'ممتاز' // Excellent
    if (score >= 65) return 'جيد جداً' // Very Good
    if (score >= 50) return 'جيد' // Good
    if (score >= 40) return 'مقبول' // Fair
    return 'ضعيف' // Weak
  }

  // Handle printing
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0f172a]">
      {/* Header and Controls - Hidden on print */}
      <div className="print:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] p-6 shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
              <ScrollText size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Theology Hub</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Generate and print theology assessment and analysis forms.</p>
            </div>
          </div>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-sm"
          >
            <Printer size={16} />
            Print Form
          </button>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Term & Year</label>
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
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                onClick={() => setActiveTab('assessment')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'assessment' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <BookOpen size={14} /> Assessment
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'analysis' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ScrollText size={14} /> Analysis
              </button>
              <button
                onClick={() => setActiveTab('top_students')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'top_students' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-8 print:p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full print:hidden">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
            <p className="text-slate-500">Loading theology data...</p>
          </div>
        ) : !data || (!activeClassId && activeTab === 'assessment') || (!activeLevel && (activeTab === 'analysis' || activeTab === 'top_students')) ? (
          <TheologyHubEmptyState />
        ) : (
          <div className="w-full mx-auto bg-white print:max-w-[210mm] print:shadow-none shadow-xl print:m-0 min-h-[297mm] overflow-x-auto">
            
            {/* Assessment Tab */}
            {activeTab === 'assessment' && activeClassId && (
              <div className="p-10 font-arabic text-right" dir="rtl">
                {/* Header */}
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold mb-2">بسم الله الرحمن الرحيم</h2>
                  <h1 className="text-2xl font-bold text-emerald-800 mb-2">مدرسة جدة الإسلامية للروضة والابتدائية _ نساغو واكيسو</h1>
                  <h3 className="text-xl font-bold mb-4 underline">كشف الدرجات لمنتصف الفترة</h3>
                </div>

                <div className="flex justify-between items-center mb-4 font-bold">
                  <div>
                    <span>الفترة: </span>
                    <span className="text-emerald-800 underline underline-offset-4 decoration-dotted px-4">
                      {terms.find(t => t.id === activeTermId)?.label === 'Term 1' ? 'الأولى' : terms.find(t => t.id === activeTermId)?.label === 'Term 2' ? 'الثانية' : 'الثالثة'}
                    </span>
                  </div>
                  <div>
                    <span>الصف: </span>
                    <span className="text-emerald-800 underline underline-offset-4 decoration-dotted px-4">
                      {theologyClasses.find(c => c.id === activeClassId)?.class_name_arabic}
                    </span>
                  </div>
                  <div>
                    <span>السنة: </span>
                    <span className="text-emerald-800 underline underline-offset-4 decoration-dotted px-4">
                      {toArabicNumerals(terms.find(t => t.id === activeTermId)?.academic_year || '')}م
                    </span>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full border-collapse border-2 border-slate-800 mb-8 mt-6">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-800 p-2 w-12 text-center">م</th>
                      <th className="border border-slate-800 p-2 w-64">اسم التلميذ/ة</th>
                      {assessmentData.orderedSubjects?.map(s => (
                        <th key={s.id} className="border border-slate-800 p-2 text-center">{s.subject_name_arabic}</th>
                      ))}
                      <th className="border border-slate-800 p-2 text-center w-24">المجموع</th>
                      <th className="border border-slate-800 p-2 text-center w-24">الموقف / الدرجة</th>
                      <th className="border border-slate-800 p-2 text-center w-40">الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessmentData.students?.map((student, idx) => (
                      <tr key={student.id}>
                        <td className="border border-slate-800 p-2 text-center font-bold">{toArabicNumerals(idx + 1)}</td>
                        <td className="border border-slate-800 p-2 font-bold">{student.arabic_name}</td>
                        {assessmentData.orderedSubjects?.map(s => (
                          <td key={s.id} className="border border-slate-800 p-2 text-center font-semibold text-emerald-800">
                            {student.subjectScores[s.id] !== undefined ? toArabicNumerals(student.subjectScores[s.id]!) : ''}
                          </td>
                        ))}
                        <td className="border border-slate-800 p-2 text-center font-bold text-emerald-800">{student.total > 0 ? toArabicNumerals(student.total) : ''}</td>
                        <td className="border border-slate-800 p-2 text-center font-bold text-emerald-800">{student.total > 0 ? toArabicNumerals(student.position) : ''}</td>
                        <td className="border border-slate-800 p-2 text-center font-medium">
                          {student.total > 0 ? getArabicRemark(student.total / (assessmentData.orderedSubjects.length || 1)) : ''}
                        </td>
                      </tr>
                    ))}
                    {/* Empty rows to fill space if needed */}
                    {Array.from({ length: Math.max(0, 15 - (assessmentData.students?.length || 0)) }).map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <td className="border border-slate-800 p-2 text-center">&nbsp;</td>
                        <td className="border border-slate-800 p-2">&nbsp;</td>
                        {assessmentData.orderedSubjects?.map(s => (
                          <td key={`empty-${s.id}`} className="border border-slate-800 p-2">&nbsp;</td>
                        ))}
                        <td className="border border-slate-800 p-2">&nbsp;</td>
                        <td className="border border-slate-800 p-2">&nbsp;</td>
                        <td className="border border-slate-800 p-2">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer Signatures */}
                <div className="flex justify-between items-center mt-12 px-8">
                  <div className="text-center">
                    <p className="font-bold mb-4">توقيع مربي الفصل:</p>
                    <div className="border-b-2 border-dotted border-slate-400 w-48"></div>
                  </div>
                  <div className="text-center">
                    <p className="font-bold mb-4">توقيع مشرف التعليم:</p>
                    <div className="border-b-2 border-dotted border-slate-400 w-48"></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Analysis Tab */}
            {activeTab === 'analysis' && activeLevel && (
              <div className="p-10 font-arabic text-right" dir="rtl">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-bold mb-2">بسم الله الرحمن الرحيم</h2>
                  <h1 className="text-2xl font-bold text-emerald-800 mb-2">مدرسة جدة الإسلامية للروضة والابتدائية</h1>
                  <h3 className="text-xl font-bold mb-4 underline">
                    النظرة الأولى الدقيقة لنتائج منتصف الفترة 
                  </h3>
                </div>

                <div className="flex justify-between items-center mb-6 font-bold">
                  <div>
                    <span>المرحلة: </span>
                    <span className="text-emerald-800 underline underline-offset-4 decoration-dotted px-4">
                      {activeLevel === 'raudha' ? 'الروضة' : activeLevel === 'ibtidaai_lower' ? 'الابتدائية السفلى' : 'الابتدائية العليا'}
                    </span>
                  </div>
                  <div>
                    <span>الفترة: </span>
                    <span className="text-emerald-800 underline underline-offset-4 decoration-dotted px-4">
                      {terms.find(t => t.id === activeTermId)?.label === 'Term 1' ? 'الأولى' : terms.find(t => t.id === activeTermId)?.label === 'Term 2' ? 'الثانية' : 'الثالثة'}
                    </span>
                  </div>
                  <div>
                    <span>السنة: </span>
                    <span className="text-emerald-800 underline underline-offset-4 decoration-dotted px-4">
                      {toArabicNumerals(terms.find(t => t.id === activeTermId)?.academic_year || '')}م
                    </span>
                  </div>
                </div>

                <table className="w-full border-collapse border-2 border-slate-800 mb-8 mt-6">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-800 p-2 text-center w-32">الصف</th>
                      <th className="border border-slate-800 p-2 text-center">عدد الطلاب</th>
                      <th className="border border-slate-800 p-2 text-center">ممتاز</th>
                      <th className="border border-slate-800 p-2 text-center">جيد جداً</th>
                      <th className="border border-slate-800 p-2 text-center">جيد</th>
                      <th className="border border-slate-800 p-2 text-center">مقبول</th>
                      <th className="border border-slate-800 p-2 text-center">ضعيف</th>
                      <th className="border border-slate-800 p-2 text-center">نسبة النجاح</th>
                    </tr>
                  </thead>
                  <tbody>
                    {theologyClasses.filter(c => c.level === activeLevel).map((cls) => {
                      // Calculate stats for this class
                      const classEnrollments = data.enrollments.filter(e => e.theology_class_id === cls.id)
                      const targetSubjects = ['القرآن', 'اللغة العربية', 'الفقه', 'التربية', 'التوحيد', 'السيرة']
                      const levelSubjects = data.subjects.filter(s => s.level === activeLevel)
                      const orderedSubjects = [...levelSubjects].sort((a, b) => {
                        let aIdx = targetSubjects.findIndex(t => a.subject_name_arabic.includes(t))
                        let bIdx = targetSubjects.findIndex(t => b.subject_name_arabic.includes(t))
                        if (aIdx === -1) aIdx = 999
                        if (bIdx === -1) bIdx = 999
                        return aIdx - bIdx
                      }).slice(0, 5)

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

                      return (
                        <tr key={cls.id}>
                          <td className="border border-slate-800 p-2 text-center font-bold bg-slate-50">{cls.class_name_arabic}</td>
                          <td className="border border-slate-800 p-2 text-center">{toArabicNumerals(numStudents)}</td>
                          <td className="border border-slate-800 p-2 text-center">{toArabicNumerals(excellent)}</td>
                          <td className="border border-slate-800 p-2 text-center">{toArabicNumerals(vGood)}</td>
                          <td className="border border-slate-800 p-2 text-center">{toArabicNumerals(good)}</td>
                          <td className="border border-slate-800 p-2 text-center">{toArabicNumerals(fair)}</td>
                          <td className="border border-slate-800 p-2 text-center">{toArabicNumerals(weak)}</td>
                          <td className="border border-slate-800 p-2 text-center font-bold text-emerald-700" dir="rtl">% {toArabicNumerals(passRate)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Top Students Tab */}
            {activeTab === 'top_students' && activeLevel && (
              <div className="p-10 font-arabic text-right" dir="rtl">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold underline mb-8 mt-12">أسماء المتفوقين من كل مرحلة مع ذكر المعدل التراكمي لكل منهم</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {theologyClasses.filter(c => c.level === activeLevel).map((cls) => {
                    const classEnrollments = data.enrollments.filter(e => e.theology_class_id === cls.id)
                    const targetSubjects = ['القرآن', 'اللغة العربية', 'الفقه', 'التربية', 'التوحيد', 'السيرة']
                    const levelSubjects = data.subjects.filter(s => s.level === activeLevel)
                    const orderedSubjects = [...levelSubjects].sort((a, b) => {
                      let aIdx = targetSubjects.findIndex(t => a.subject_name_arabic.includes(t))
                      let bIdx = targetSubjects.findIndex(t => b.subject_name_arabic.includes(t))
                      if (aIdx === -1) aIdx = 999
                      if (bIdx === -1) bIdx = 999
                      return aIdx - bIdx
                    }).slice(0, 5)

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
                        name: e.students.arabic_name,
                        total,
                        avg: total / (orderedSubjects.length || 1)
                      }
                    }).filter(s => s.total > 0).sort((a, b) => b.total - a.total).slice(0, 5) // top 5

                    if (students.length === 0) return null

                    return (
                      <div key={cls.id} className="border-2 border-slate-800 rounded-lg overflow-hidden">
                        <div className="bg-slate-100 p-3 border-b-2 border-slate-800 font-bold text-center">
                          {cls.class_name_arabic}
                        </div>
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-800">
                              <th className="p-2 border-l border-slate-800 w-12 text-center">م</th>
                              <th className="p-2 border-l border-slate-800 text-right">الاسم</th>
                              <th className="p-2 text-center w-24">المعدل</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map((student, idx) => (
                              <tr key={student.id} className="border-b border-slate-800 last:border-0">
                                <td className="p-2 border-l border-slate-800 text-center font-bold">{toArabicNumerals(idx + 1)}</td>
                                <td className="p-2 border-l border-slate-800 font-bold text-emerald-800">{student.name}</td>
                                <td className="p-2 text-center font-bold">{toArabicNumerals(Math.round(student.avg))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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

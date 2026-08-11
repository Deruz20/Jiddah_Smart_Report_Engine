'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import { usePowerSync } from '@powersync/react'
import { transliterateEnglishToArabic } from '@/lib/transliterate'

type TermData = {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current: boolean
}

export type EnrollmentData = {
  id: string
  name: string
  admission_number: string
  circular_class: string
  section: string | null
  theology_class_arabic: string | null
  theology_class_level: string | null
  theology_status: string | null
}

type CircularMarkRow = {
  subject_id: string
  subject_name: string
  is_core: boolean
  bot_score: number | null
  mot_score: number | null
  eot_score: number | null
}

type TheologyMarkRow = {
  subject_id: string
  subject_name_arabic: string
  mot_score: number | null
  eot_score: number | null
}

interface MarksEntryClientProps {
  terms: TermData[]
}

type ExamType = 'bot' | 'mot' | 'eot' | 'all'

export function MarksEntryClient({ terms }: MarksEntryClientProps) {
  const powerSync = usePowerSync()
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([])
  const [selectedTermId, setSelectedTermId] = useState('')
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('')
  const [examType, setExamType] = useState<ExamType>('mot')
  const [circularMarks, setCircularMarks] = useState<CircularMarkRow[]>([])
  const [theologyMarks, setTheologyMarks] = useState<TheologyMarkRow[]>([])
  const [isFetching, setIsFetching] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const selectedEnrollment = enrollments.find((e) => e.id === selectedEnrollmentId) || null

  // Load enrollments on mount
  useEffect(() => {
    const loadEnrollments = async () => {
      setIsFetching(true)
      setError(null)

      try {
        const data = await powerSync.getAll(`
          SELECT 
            e.student_id as enrollment_id,
            e.theology_status,
            s.name, s.admission_number,
            cc.class_name as circular_class, cc.section,
            tc.class_name_arabic as theology_class_arabic,
            tc.class_name_english as theology_class_level
          FROM enrollments e
          JOIN students s ON e.student_id = s.id
          LEFT JOIN circular_classes cc ON e.circular_class_id = cc.id
          LEFT JOIN theology_classes tc ON e.theology_class_id = tc.id
        `)
        
        const mappedEnrollments: EnrollmentData[] = data.map((e: any) => ({
          id: e.enrollment_id,
          name: e.name || 'Unknown Student',
          admission_number: e.admission_number || '',
          circular_class: e.circular_class || '',
          section: e.section || null,
          theology_class_arabic: e.theology_class_arabic || null,
          theology_class_level: e.theology_class_level || null,
          theology_status: e.theology_status || 'active',
        }))
        setEnrollments(mappedEnrollments)
      } catch (err: any) {
        if (err.message && err.message.includes('no such column')) {
          setError('System update required. Please log out and clear your browser cache/site data to sync the latest version.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load enrollments')
        }
      } finally {
        setIsFetching(false)
      }
    }

    loadEnrollments()
  }, [])

  // Load marks when enrollment or term changes
  useEffect(() => {
    if (!selectedEnrollmentId || !selectedTermId) {
      setCircularMarks([])
      setTheologyMarks([])
      return
    }

    const loadMarks = async () => {
      setIsLoading(true)
      setError(null)
      setSuccess(false)

      try {
        const circular = await powerSync.getAll(`
          SELECT 
            s.id as subject_id, s.subject_name, 'true' as is_core,
            cm.bot_mark as bot_score, cm.mot_mark as mot_score, cm.eot_mark as eot_score
          FROM subjects s
          LEFT JOIN circular_marks cm ON cm.subject_id = s.id AND cm.enrollment_id = ?
          WHERE s.curriculum = 'circular'
        `, [selectedEnrollmentId]);

        const theology = await powerSync.getAll(`
          SELECT 
            s.id as subject_id, s.subject_name as subject_name_arabic,
            tm.mot_mark as mot_score, tm.eot_mark as eot_score
          FROM subjects s
          LEFT JOIN theology_marks tm ON tm.subject_id = s.id AND tm.enrollment_id = ?
          WHERE s.curriculum = 'theology'
        `, [selectedEnrollmentId]);

        setCircularMarks(circular as any)
        setTheologyMarks(theology as any)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load marks')
      } finally {
        setIsLoading(false)
      }
    }

    loadMarks()
  }, [selectedEnrollmentId, selectedTermId])

  const handleCircularScoreChange = (subject_id: string, type: ExamType, value: string) => {
    if (value !== '' && isNaN(Number(value))) return
    if (value !== '') {
      const num = Number(value)
      if (num < 0 || num > 100) return
    }

    setCircularMarks((prev) =>
      prev.map((mark) => {
        if (mark.subject_id === subject_id) {
          const score = value === '' ? null : Number(value)
          return { 
            ...mark, 
            ...(type === 'bot' ? { bot_score: score } : type === 'mot' ? { mot_score: score } : { eot_score: score })
          }
        }
        return mark
      })
    )
  }

  const handleTheologyScoreChange = (subject_id: string, type: ExamType, value: string) => {
    if (value !== '' && isNaN(Number(value))) return
    if (value !== '') {
      const num = Number(value)
      if (num < 0 || num > 100) return
    }

    setTheologyMarks((prev) =>
      prev.map((mark) => {
        if (mark.subject_id === subject_id) {
          const score = value === '' ? null : Number(value)
          return { ...mark, [type === 'mot' ? 'mot_score' : 'eot_score']: score }
        }
        return mark
      })
    )
  }

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault()
    setError(null)
    setSuccess(false)

    if (!selectedTermId || !selectedEnrollmentId) {
      setError('Please select a term and a student before saving marks.')
      return
    }

    // Validate circular marks
    for (const mark of circularMarks) {
      if (['bot', 'all'].includes(examType) && mark.bot_score !== null && (mark.bot_score < 0 || mark.bot_score > 100)) {
        setError('All circular scores must be between 0 and 100.')
        return
      }
      if (['mot', 'all'].includes(examType) && mark.mot_score !== null && (mark.mot_score < 0 || mark.mot_score > 100)) {
        setError('All circular scores must be between 0 and 100.')
        return
      }
      if (['eot', 'all'].includes(examType) && mark.eot_score !== null && (mark.eot_score < 0 || mark.eot_score > 100)) {
        setError('All circular scores must be between 0 and 100.')
        return
      }
    }

    // Validate theology marks
    for (const mark of theologyMarks) {
      if (['mot', 'all'].includes(examType) && mark.mot_score !== null && (mark.mot_score < 0 || mark.mot_score > 100)) {
        setError('All theology scores must be between 0 and 100.')
        return
      }
      if (['eot', 'all'].includes(examType) && mark.eot_score !== null && (mark.eot_score < 0 || mark.eot_score > 100)) {
        setError('All theology scores must be between 0 and 100.')
        return
      }
    }

    setIsSaving(true)

    startTransition(async () => {
      try {
        await powerSync.writeTransaction(async (tx) => {
          for (const mark of circularMarks) {
            let bot = mark.bot_score;
            let mot = mark.mot_score;
            let eot = mark.eot_score;
            
            // Upsert for circular marks
            await tx.execute(`
              INSERT INTO circular_marks (id, enrollment_id, subject_id, bot_mark, mot_mark, eot_mark, updated_by)
              VALUES (uuid(), ?, ?, ?, ?, ?, 'local_user')
              ON CONFLICT(enrollment_id, subject_id) DO UPDATE SET
                bot_mark = EXCLUDED.bot_mark,
                mot_mark = EXCLUDED.mot_mark,
                eot_mark = EXCLUDED.eot_mark,
                updated_by = EXCLUDED.updated_by
            `, [selectedEnrollmentId, mark.subject_id, bot ?? null, mot ?? null, eot ?? null]);
          }

          for (const mark of theologyMarks) {
            let mot = mark.mot_score;
            let eot = mark.eot_score;
            
            // Upsert for theology marks
            await tx.execute(`
              INSERT INTO theology_marks (id, enrollment_id, subject_id, bot_mark, mot_mark, eot_mark, updated_by)
              VALUES (uuid(), ?, ?, NULL, ?, ?, 'local_user')
              ON CONFLICT(enrollment_id, subject_id) DO UPDATE SET
                mot_mark = EXCLUDED.mot_mark,
                eot_mark = EXCLUDED.eot_mark,
                updated_by = EXCLUDED.updated_by
            `, [selectedEnrollmentId, mark.subject_id, mot ?? null, eot ?? null]);
          }
        });

        setSuccess(true)
        setTimeout(() => setSuccess(false), 3500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      } finally {
        setIsSaving(false)
      }
    })
  }

  const renderScoreInput = (value: number | null, onChange: (val: string) => void, placeholder: string, disabled: boolean = false) => {
    const val = value === null ? '' : String(value)
    const numVal = parseFloat(val)
    const hasScore = val !== ''
    const isHigh = hasScore && numVal >= 75
    const isLow  = hasScore && numVal < 50

    return (
      <input
        className="score-input"
        type="number"
        min="0"
        max="100"
        placeholder={placeholder}
        value={val}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={isHigh
          ? { borderColor: '#86efac', background: '#f0fdf4', color: '#15803d' }
          : isLow
            ? { borderColor: '#fca5a5', background: '#fff5f5', color: '#dc2626' }
            : {}
        }
      />
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div 
        className="max-w-5xl mx-auto bg-white/70 backdrop-blur-xl border border-white/50 p-6 sm:p-8"
        style={{ borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1)' }}
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm border border-emerald-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/></svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800" style={{ letterSpacing: '-0.02em' }}>Marks Entry</h2>
            <p className="text-sm text-slate-500 font-medium">Record academic performance securely</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1 & 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1 rounded-3xl bg-slate-50/50 border border-slate-100">
            <div className="bg-white p-5 rounded-[20px] shadow-sm border border-slate-100/60">
              <label htmlFor="term" className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs">1</span>
                Select Term
              </label>
              <select
                id="term"
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all bg-slate-50/50 hover:bg-white text-slate-700 appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em' }}
              >
                <option value="">Choose a term...</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {`${term.label} ${term.academic_year}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white p-5 rounded-[20px] shadow-sm border border-slate-100/60">
              <label htmlFor="student" className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs">2</span>
                Select Student
              </label>
              <StudentCombobox 
                enrollments={enrollments} 
                selectedId={selectedEnrollmentId} 
                onChange={(id) => {
                  setSelectedEnrollmentId(id)
                  setSuccess(false)
                }} 
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 text-rose-600 bg-rose-50 rounded-2xl border border-rose-100 animate-in slide-in-from-top-2">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {!error && (
            !selectedEnrollmentId ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-[24px] border border-slate-200 border-dashed bg-slate-50/50">
                <div className="w-16 h-16 mb-4 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-300">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <h3 className="text-slate-700 font-semibold mb-1">No Student Selected</h3>
                <p className="text-sm text-slate-500 max-w-sm">Select a term and student from the dropdowns above to begin entering marks.</p>
              </div>
          ) : isFetching || isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-[24px] border border-slate-100 bg-slate-50/30">
              <svg className="animate-spin text-emerald-500 mb-4" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <p className="text-slate-600 font-medium">Loading marks data...</p>
            </div>
          ) : selectedEnrollment ? (
            <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
              {/* Student Details Box */}
              <div 
                className="relative overflow-hidden rounded-[24px] p-6 sm:p-8"
                style={{ 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                  boxShadow: '0 10px 30px rgba(16,185,129,0.2)',
                }}
              >
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-emerald-300 opacity-20 rounded-full blur-xl pointer-events-none" />
                
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 z-10">
                  <div className="flex items-center gap-5">
                    <div className="hidden sm:flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 text-white font-bold text-xl backdrop-blur-md border border-white/20 shadow-inner">
                      {selectedEnrollment.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">Secular Profile</p>
                      <p className="text-2xl text-white font-bold capitalize">{selectedEnrollment.name.toLowerCase()}</p>
                      <div className="flex items-center gap-3 mt-2 text-emerald-50 text-sm font-medium">
                        <span className="flex items-center gap-1.5 bg-black/10 px-2.5 py-1 rounded-lg backdrop-blur-md">ID: {selectedEnrollment.admission_number}</span>
                        <span className="flex items-center gap-1.5 bg-black/10 px-2.5 py-1 rounded-lg backdrop-blur-md">Class: {selectedEnrollment.circular_class} {selectedEnrollment.section ? `• ${selectedEnrollment.section}` : ''}</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedEnrollment.theology_class_arabic && (
                    <div className="sm:text-right pt-4 sm:pt-0 border-t border-white/10 sm:border-t-0 sm:border-l sm:pl-6">
                      <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1" dir="rtl" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>الملف الشخصي</p>
                      <p className="text-2xl text-white font-bold" dir="rtl" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>
                        {transliterateEnglishToArabic(selectedEnrollment.name.toLowerCase())}
                      </p>
                      <div className="flex sm:justify-end items-center gap-3 mt-2 text-emerald-50 text-sm font-medium" dir="rtl">
                        <span className="flex items-center gap-1.5 bg-black/10 px-2.5 py-1 rounded-lg backdrop-blur-md" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>ID: {selectedEnrollment.admission_number}</span>
                        <span className="flex items-center gap-1.5 bg-black/10 px-2.5 py-1 rounded-lg backdrop-blur-md" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>
                          الدرجة اللاهوتية: {selectedEnrollment.theology_class_arabic}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-white p-5 rounded-[20px] shadow-sm border border-slate-100/60 flex items-center justify-between gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 whitespace-nowrap">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs">3</span>
                  Select Exam Type
                </label>
                <div className="flex gap-2 p-1 bg-slate-100/80 rounded-xl flex-1 max-w-md overflow-x-auto">
                  {(['bot', 'mot', 'eot', 'all'] as ExamType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setExamType(type); setSuccess(false) }}
                      className={`flex-1 min-w-[60px] px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${examType === type ? 'bg-white text-emerald-600 shadow-sm border border-emerald-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secular Marks Table */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  <h3 className="text-lg font-bold text-slate-800">Secular Subjects</h3>
                </div>
                <div className="bg-white border border-slate-200/60 rounded-[24px] shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Subject</th>
                          <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Core</th>
                          {['bot', 'all'].includes(examType) && <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">BOT Score</th>}
                          {['mot', 'all'].includes(examType) && <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">MOT Score</th>}
                          {['eot', 'all'].includes(examType) && <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">EOT Score</th>}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-50">
                        {circularMarks.map((mark) => (
                          <tr key={mark.subject_id} className="transition-colors hover:bg-slate-50/50 group">
                            <td className="px-6 py-4 text-sm font-semibold text-slate-700 whitespace-nowrap">{mark.subject_name}</td>
                            <td className="px-6 py-4 text-sm text-center">
                              {mark.is_core ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-500 text-xs font-bold ring-1 ring-blue-500/10">✓</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            {['bot', 'all'].includes(examType) && (
                              <td className="px-6 py-3">
                                {renderScoreInput(mark.bot_score, (val) => handleCircularScoreChange(mark.subject_id, 'bot', val), 'BOT')}
                              </td>
                            )}
                            {['mot', 'all'].includes(examType) && (
                              <td className="px-6 py-3">
                                {renderScoreInput(mark.mot_score, (val) => handleCircularScoreChange(mark.subject_id, 'mot', val), 'MOT')}
                              </td>
                            )}
                            {['eot', 'all'].includes(examType) && (
                              <td className="px-6 py-3">
                                {renderScoreInput(mark.eot_score, (val) => handleCircularScoreChange(mark.subject_id, 'eot', val), 'EOT')}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Theology Marks Table */}
              {theologyMarks.length > 0 && examType !== 'bot' && selectedEnrollment?.theology_status !== 'not_applicable' && (
                <div className="space-y-4 pt-6">
                  <div className="flex items-center justify-end gap-2 px-1" dir="rtl">
                    <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                    <h3 className="text-lg font-bold text-slate-800" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>
                      المواد اللاهوتية
                    </h3>
                  </div>
                  <div className="bg-white border border-slate-200/60 rounded-[24px] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/50">
                          <tr>
                            <th className="px-6 py-4 text-right text-[12px] font-bold text-slate-400 uppercase tracking-wider" dir="rtl" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>
                              المادة
                            </th>
                            {['mot', 'all'].includes(examType) && <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">MOT Score</th>}
                            {['eot', 'all'].includes(examType) && <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">EOT Score</th>}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50">
                          {theologyMarks.map((mark) => (
                            <tr key={mark.subject_id} className="transition-colors hover:bg-slate-50/50 group">
                              <td className="px-6 py-4 text-[15px] font-bold text-slate-700 text-right whitespace-nowrap" dir="rtl" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>
                                {mark.subject_name_arabic}
                              </td>
                              {['mot', 'all'].includes(examType) && (
                                <td className="px-6 py-3">
                                  {renderScoreInput(mark.mot_score, (val) => handleTheologyScoreChange(mark.subject_id, 'mot', val), 'MOT')}
                                </td>
                              )}
                              {['eot', 'all'].includes(examType) && (
                                <td className="px-6 py-3">
                                  {renderScoreInput(mark.eot_score, (val) => handleTheologyScoreChange(mark.subject_id, 'eot', val), 'EOT')}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-3 p-4 text-emerald-700 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm animate-in zoom-in-95">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p className="font-semibold">Marks saved successfully!</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full relative overflow-hidden group flex items-center justify-center gap-2 py-4 px-8 rounded-2xl text-white font-bold text-lg transition-all duration-300 shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_12px_24px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none disabled:opacity-70 disabled:pointer-events-none"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                disabled={isSaving || isPending}
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center gap-2">
                  {isSaving || isPending ? (
                    <>
                      <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      Save {examType.toUpperCase()} Marks
                    </>
                  )}
                </span>
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  )
}

function StudentCombobox({ enrollments, selectedId, onChange }: { enrollments: EnrollmentData[], selectedId: string, onChange: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const selected = React.useMemo(() => enrollments.find(e => e.id === selectedId), [enrollments, selectedId])
  
  const displayValue = open ? query : (selected ? selected.name : '')

  const filtered = React.useMemo(() => {
    if (!query) return enrollments
    const lower = query.toLowerCase()
    return enrollments.filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.admission_number.toLowerCase().includes(lower) ||
      s.circular_class.toLowerCase().includes(lower) ||
      (s.section && s.section.toLowerCase().includes(lower))
    )
  }, [enrollments, query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all bg-slate-50/50 hover:bg-white text-slate-700"
        placeholder="Type to filter by name, class, adm no..."
        value={displayValue}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
          if (selectedId) onChange('')
        }}
        onFocus={() => {
          setOpen(true)
          if (selected) {
            setQuery(selected.name)
            onChange('')
          }
        }}
        style={{ paddingRight: 32 }}
      />
      <svg
        style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: '#94a3b8'
        }}
        xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
      
      {open && (
        <div
          ref={dropRef}
          className="absolute left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] z-[100] max-h-[300px] overflow-y-auto animate-in slide-in-from-top-2 fade-in"
        >
          {filtered.length === 0 ? (
            <div className="p-4 text-slate-400 text-sm text-center font-medium">
              No students found
            </div>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(s.id)
                  setQuery('')
                  setOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-transparent border-b border-slate-100 last:border-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0 ring-1 ring-emerald-100">
                  {s.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-slate-800 text-sm font-semibold truncate">
                    {s.name}
                  </div>
                  <div className="text-slate-400 text-xs font-medium mt-0.5 truncate">
                    {s.admission_number} • Class {s.circular_class} {s.section ? `• ${s.section}` : ''}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}


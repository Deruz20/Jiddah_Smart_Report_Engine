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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load enrollments')
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
    <div className="space-y-6">
      <div 
        className="max-w-4xl mx-auto bg-white border border-[#e4e9f0] p-6 sm:p-8"
        style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-6" style={{ letterSpacing: '-0.02em' }}>Marks Entry</h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1 & 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="term" className="block text-sm font-bold text-gray-700 mb-2">
                Step 1: Select Term
              </label>
              <select
                id="term"
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="brand-select"
              >
                <option value="">Choose a term...</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {`${term.label} ${term.academic_year}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="student" className="block text-sm font-bold text-gray-700 mb-2">
                Step 2: Select Student
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

          {/* Instead of a raw red error box, we use sonner for critical errors, and a clean empty state here if data failed to load */}
          {error && (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
              <AlertCircle className="w-8 h-8 text-rose-400 mb-3 opacity-50" />
              <p className="text-sm font-medium">Unable to load class data</p>
              <p className="text-xs text-slate-400 mt-1">Please try refreshing or check your connection.</p>
            </div>
          )}

          {!error && !selectedEnrollment && (
            !selectedEnrollmentId ? (
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 text-sm text-gray-500 transition-all">
              Select a term and student to view the marks entry form.
            </div>
          ) : isFetching || isLoading ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 text-sm text-gray-500 flex items-center justify-center gap-3 transition-all">
              <svg className="spin text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Loading marks...
            </div>
          ) : selectedEnrollment ? (
            <div className="animate-up space-y-8">
              {/* Student Details Box */}
              <div 
                className="rounded-xl p-5 shadow-sm"
                style={{ 
                  background: '#f0fdf4', 
                  border: '1px solid #bbf7d0',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="text-[13px] text-[#0f5132]/70 font-bold uppercase tracking-wider mb-1" style={{ fontFamily: 'Cairo, sans-serif' }}>Secular Profile</p>
                    <p className="text-lg text-[#0f5132] font-bold capitalize" style={{ fontFamily: 'Cairo, sans-serif' }}>{selectedEnrollment.name.toLowerCase()}</p>
                    <p className="text-[#0f5132]/80 text-sm mt-0.5" style={{ fontFamily: 'Cairo, sans-serif' }}>ID: {selectedEnrollment.admission_number}</p>
                    <p className="text-[#0f5132]/80 text-sm mt-0.5" style={{ fontFamily: 'Cairo, sans-serif' }}>Class: {selectedEnrollment.circular_class} {selectedEnrollment.section ? `• ${selectedEnrollment.section}` : ''}</p>
                  </div>
                  
                  {selectedEnrollment.theology_class_arabic && (
                    <div className="sm:text-right mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-r border-[#bbf7d0] sm:pr-4">
                      <p className="text-[13px] text-[#0f5132]/70 font-bold uppercase tracking-wider mb-1" dir="rtl" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>الملف الشخصي</p>
                      <p className="text-lg text-[#0f5132] font-bold" dir="rtl" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>
                        {transliterateEnglishToArabic(selectedEnrollment.name.toLowerCase())}
                      </p>
                      <p className="text-[#0f5132]/80 text-sm mt-0.5" dir="rtl" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>ID: {selectedEnrollment.admission_number}</p>
                      <p className="text-[#0f5132]/80 text-sm mt-0.5" dir="rtl" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>
                        الدرجة اللاهوتية: {selectedEnrollment.theology_class_arabic}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3 */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Step 3: Select Exam Type</label>
                <select
                  value={examType}
                  onChange={(e) => {
                    setExamType(e.target.value as ExamType)
                    setSuccess(false)
                  }}
                  className="brand-select"
                >
                  <option value="bot">BOT (Beginning of Term)</option>
                  <option value="mot">MOT (Mid Term)</option>
                  <option value="eot">EOT (End of Term)</option>
                  <option value="all">ALL (Combined Entry)</option>
                </select>
              </div>

              {/* Secular Marks Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-800">Secular Marks</h3>
                <div style={{
                  background: '#fff',
                  border: '1.5px solid #e4e9f0',
                  borderRadius: 12,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                  overflow: 'hidden',
                }}>
                  <table className="min-w-full divide-y divide-[#f3f4f6]" style={{ borderSpacing: 0 }}>
                    <thead style={{ background: '#fafafa' }}>
                      <tr>
                        <th className="px-5 py-3 text-left text-[11px] font-bold text-[#92400e] uppercase tracking-wider">Subject</th>
                        <th className="px-5 py-3 text-left text-[11px] font-bold text-[#92400e] uppercase tracking-wider">Core</th>
                        {['bot', 'all'].includes(examType) && <th className="px-5 py-3 text-left text-[11px] font-bold text-[#92400e] uppercase tracking-wider">BOT Score</th>}
                        {['mot', 'all'].includes(examType) && <th className="px-5 py-3 text-left text-[11px] font-bold text-[#92400e] uppercase tracking-wider">MOT Score</th>}
                        {['eot', 'all'].includes(examType) && <th className="px-5 py-3 text-left text-[11px] font-bold text-[#92400e] uppercase tracking-wider">EOT Score</th>}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-[#f3f4f6]">
                      {circularMarks.map((mark) => (
                        <tr key={mark.subject_id} className="transition-colors hover:bg-gray-50/50">
                          <td className="px-5 py-3.5 text-sm font-bold text-[#1e3a8a]">{mark.subject_name}</td>
                          <td className="px-5 py-3.5 text-sm text-gray-500">
                            {mark.is_core ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 20, height: 20, borderRadius: '50%',
                                background: '#ffedd5', color: '#ea580c',
                                fontSize: 11, fontWeight: 800,
                              }}>✓</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          {['bot', 'all'].includes(examType) && (
                            <td className="px-5 py-2.5">
                              {renderScoreInput(mark.bot_score, (val) => handleCircularScoreChange(mark.subject_id, 'bot', val), 'BOT')}
                            </td>
                          )}
                          {['mot', 'all'].includes(examType) && (
                            <td className="px-5 py-2.5">
                              {renderScoreInput(mark.mot_score, (val) => handleCircularScoreChange(mark.subject_id, 'mot', val), 'MOT')}
                            </td>
                          )}
                          {['eot', 'all'].includes(examType) && (
                            <td className="px-5 py-2.5">
                              {renderScoreInput(mark.eot_score, (val) => handleCircularScoreChange(mark.subject_id, 'eot', val), 'EOT')}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Theology Marks Table */}
              {theologyMarks.length > 0 && examType !== 'bot' && selectedEnrollment?.theology_status !== 'not_applicable' && (
                <div className="space-y-3 pt-4">
                  <h3 className="text-sm font-bold text-gray-800" dir="rtl">
                    درجات اللاهوت
                  </h3>
                  <div style={{
                    background: '#fff',
                    border: '1.5px solid #e4e9f0',
                    borderRadius: 12,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    overflow: 'hidden',
                  }}>
                    <table className="min-w-full divide-y divide-[#f3f4f6]" style={{ borderSpacing: 0 }}>
                      <thead style={{ background: '#fafafa' }}>
                        <tr>
                          <th className="px-5 py-3 text-right text-[12px] font-bold text-[#1e3a8a] uppercase tracking-wider" dir="rtl" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>
                            المادة
                          </th>
                          {['mot', 'all'].includes(examType) && <th className="px-5 py-3 text-left text-[11px] font-bold text-[#92400e] uppercase tracking-wider">MOT Score</th>}
                          {['eot', 'all'].includes(examType) && <th className="px-5 py-3 text-left text-[11px] font-bold text-[#92400e] uppercase tracking-wider">EOT Score</th>}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#f3f4f6]">
                        {theologyMarks.map((mark) => (
                          <tr key={mark.subject_id} className="transition-colors hover:bg-gray-50/50">
                            <td className="px-5 py-3.5 text-[15px] font-bold text-[#92400e] text-right" dir="rtl" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>
                              {mark.subject_name_arabic}
                            </td>
                            {['mot', 'all'].includes(examType) && (
                              <td className="px-5 py-2.5">
                                {renderScoreInput(mark.mot_score, (val) => handleTheologyScoreChange(mark.subject_id, 'mot', val), 'MOT')}
                              </td>
                            )}
                            {['eot', 'all'].includes(examType) && (
                              <td className="px-5 py-2.5">
                                {renderScoreInput(mark.eot_score, (val) => handleTheologyScoreChange(mark.subject_id, 'eot', val), 'EOT')}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 font-medium animate-up flex items-center gap-3">
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#dcfce7', color: '#16a34a',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, flexShrink: 0,
                  }}>✓</span>
                  Marks saved successfully!
                </div>
              )}

              <button
                type="submit"
                className="save-btn w-full shadow-lg"
                disabled={isSaving || isPending}
              >
                {isSaving || isPending ? (
                  <>
                    <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  `Save ${examType.toUpperCase()} Marks`
                )}
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
  
  // Show selected name when not typing
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
        setQuery('') // reset search on close
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        className="w-full px-4 py-3 border-[1.5px] border-[#e4e9f0] rounded-xl text-sm font-medium focus:outline-none focus:border-[#1a9e5c] focus:ring-4 focus:ring-[#1a9e5c]/10 transition-all bg-white"
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
      {/* Down arrow icon to make it look like a select */}
      <svg
        style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: '#9ca3af'
        }}
        xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
      
      {/* Dropdown - dropping down! */}
      {open && (
        <div
          ref={dropRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            border: '1.5px solid #e4e9f0',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            zIndex: 100,
            maxHeight: 300,
            overflowY: 'auto',
          }}
          className="animate-up"
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '14px', color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>
              No students found
            </div>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault() // prevent input blur
                  onChange(s.id)
                  setQuery('')
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: '#dcfce7', color: '#166534',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800,
                }}>
                  {s.name.charAt(0)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#111827', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.name}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
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

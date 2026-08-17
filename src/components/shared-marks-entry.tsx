'use client'

import React, { useRef, useState, useEffect } from 'react'
import { transliterateEnglishToArabic } from '@/lib/transliterate'
import { EnrollmentData, CircularMarkRow, TheologyMarkRow, TermData } from '@/types/models'

export type ExamType = 'bot' | 'mot' | 'eot' | 'all'

export interface SharedMarksEntryProps {
  terms: TermData[];
  enrollments: EnrollmentData[];
  
  selectedTermId: string;
  onSelectTerm: (id: string) => void;
  
  selectedEnrollmentId: string;
  onSelectEnrollment: (id: string) => void;

  circularMarks: CircularMarkRow[];
  setCircularMarks: React.Dispatch<React.SetStateAction<CircularMarkRow[]>>;

  theologyMarks: TheologyMarkRow[];
  setTheologyMarks: React.Dispatch<React.SetStateAction<TheologyMarkRow[]>>;

  examType: ExamType;
  setExamType: (type: ExamType) => void;

  isFetching: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isPending: boolean;
  
  error: string | null;
  success: boolean;
  
  setSuccess: (s: boolean) => void;

  onSave: (event?: React.FormEvent<HTMLFormElement>) => void;
  allowedDepartment?: 'secular' | 'theology' | 'both';
}

export function SharedMarksEntry({
  terms, enrollments, selectedTermId, onSelectTerm, selectedEnrollmentId, onSelectEnrollment,
  circularMarks, setCircularMarks, theologyMarks, setTheologyMarks,
  examType, setExamType, isFetching, isLoading, isSaving, isPending,
  error, success, setSuccess, onSave, allowedDepartment = 'both'
}: SharedMarksEntryProps) {
  
  const [activeView, setActiveView] = useState<'secular' | 'theology' | 'both'>(allowedDepartment)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  useEffect(() => {
    if (success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasUnsavedChanges(false)
    }
  }, [success])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasUnsavedChanges(false)
  }, [selectedEnrollmentId, selectedTermId])
  
  const selectedEnrollment = enrollments.find((e) => e.id === selectedEnrollmentId) || null

  const handleCircularScoreChange = (subject_id: string, type: ExamType, value: string) => {
    if (value !== '' && isNaN(Number(value))) return
    if (value !== '') {
      const num = Number(value)
      if (num < 0 || num > 100) return
    }

    setHasUnsavedChanges(true)

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

    setHasUnsavedChanges(true)

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

  const renderScoreInput = (value: number | null, onChange: (val: string) => void, placeholder: string, disabled: boolean = false, rowIndex?: number, tableName?: string) => {
    const val = value === null ? '' : String(value)
    const numVal = parseFloat(val)
    const hasScore = val !== ''
    const isHigh = hasScore && numVal >= 75
    const isLow  = hasScore && numVal < 50

    return (
      <div className="relative w-full max-w-[80px] mx-auto">
        <input
          className={`score-input w-full px-2 py-1.5 text-center text-sm font-bold rounded-lg border focus:outline-none focus:ring-2 transition-all ${
            isHigh 
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 focus:border-emerald-400 focus:ring-emerald-400/20' 
              : isLow 
                ? 'border-rose-200 bg-rose-50 text-rose-700 focus:border-rose-400 focus:ring-rose-400/20' 
                : 'border-slate-200 bg-slate-50/50 text-slate-700 focus:border-blue-400 focus:ring-blue-400/20 hover:bg-white hover:border-slate-300'
          }`}
          type="number"
          min="0"
          max="100"
          placeholder={placeholder}
          value={val}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          data-col={placeholder}
          data-row={rowIndex}
          data-table={tableName}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') {
              e.preventDefault()
              const currentCol = e.currentTarget.getAttribute('data-col')
              const currentTable = e.currentTarget.getAttribute('data-table')
              const currentRow = parseInt(e.currentTarget.getAttribute('data-row') || '0', 10)
              let targetRow = currentRow
              if (e.key === 'ArrowUp') targetRow--
              if (e.key === 'ArrowDown' || e.key === 'Enter') targetRow++
              
              const target = document.querySelector(`input[data-table="${currentTable}"][data-col="${currentCol}"][data-row="${targetRow}"]`) as HTMLInputElement
              if (target) {
                target.focus()
                target.select()
              }
            }
          }}
        />
        {isLow && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-rose-600"><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
      <div 
        className="max-w-5xl mx-auto bg-white/70 backdrop-blur-xl border border-white/50 p-4 sm:p-8"
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

        <form onSubmit={onSave} className="space-y-8">
          {/* Unified Control Bar */}
          <div className="flex flex-wrap items-center gap-4 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm mb-6">
            <div className="flex-1 min-w-[200px]">
              <select
                aria-label="Term"
                value={selectedTermId}
                onChange={(e) => onSelectTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border-none bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 font-medium cursor-pointer focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
              >
                <option value="">Choose a term...</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>{`${term.label} ${term.academic_year}`}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 min-w-[250px]">
              <StudentCombobox 
                enrollments={enrollments} 
                selectedId={selectedEnrollmentId} 
                onChange={(id) => {
                  onSelectEnrollment(id)
                  setSuccess(false)
                }} 
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg" aria-label="Exam Type">
              {(['bot', 'mot', 'eot', 'all'] as ExamType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setExamType(type); setSuccess(false) }}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${
                    examType === type 
                      ? 'bg-white text-emerald-700 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {allowedDepartment === 'both' && (
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg ml-auto" aria-label="Department View">
                {(['both', 'secular', 'theology'] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setActiveView(view)}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${
                      activeView === view 
                        ? 'bg-white text-blue-700 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            )}
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
              {/* Slim Sticky Context Header */}
              <div className="sticky top-4 z-40 bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 font-bold text-lg border border-emerald-100 shadow-sm shrink-0">
                    {selectedEnrollment.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-800 truncate capitalize leading-tight mb-1">{selectedEnrollment.name.toLowerCase()}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 border border-slate-200/60">{selectedEnrollment.admission_number}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 border border-slate-200/60">{selectedEnrollment.circular_class} {selectedEnrollment.section ? `• ${selectedEnrollment.section}` : ''}</span>
                    </div>
                  </div>
                </div>
                
                {selectedEnrollment.theology_class_arabic && (
                  <div className="text-right shrink-0 pt-3 sm:pt-0 border-t border-slate-100 sm:border-t-0 sm:border-l sm:border-slate-100 sm:pl-4">
                    <h2 className="text-lg font-bold text-slate-800 leading-tight mb-1" dir="rtl" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>
                      {transliterateEnglishToArabic(selectedEnrollment.name.toLowerCase())}
                    </h2>
                    <div className="text-xs font-medium text-slate-500" dir="rtl" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 border border-slate-200/60">{selectedEnrollment.theology_class_arabic}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Secular Marks Table */}
              {(activeView === 'both' || activeView === 'secular') && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                  <h3 className="text-lg font-bold text-slate-800">Secular Subjects</h3>
                </div>
                <div className="bg-white border border-slate-200/60 rounded-[24px] shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 block sm:table">
                      <thead className="bg-slate-50/50 hidden sm:table-header-group">
                        <tr>
                          <th className="px-3 sm:px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Subject</th>
                          <th className="px-3 sm:px-6 py-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Core</th>
                          {['bot', 'all'].includes(examType) && <th className="px-3 sm:px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">BOT Score</th>}
                          {['mot', 'all'].includes(examType) && <th className="px-3 sm:px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">MOT Score</th>}
                          {['eot', 'all'].includes(examType) && <th className="px-3 sm:px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">EOT Score</th>}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-50 block sm:table-row-group">
                        {circularMarks.map((mark, idx) => (
                          <tr key={mark.subject_id} className="transition-colors hover:bg-slate-50/50 group flex flex-wrap sm:table-row p-4 sm:p-0">
                            <td className="w-full sm:w-auto px-0 sm:px-6 pb-3 sm:pb-4 pt-0 sm:pt-4 text-sm font-semibold text-slate-700 whitespace-nowrap flex items-center justify-between sm:table-cell border-b border-slate-100 sm:border-0 mb-3 sm:mb-0">
                              <span>{mark.subject_name}</span>
                              <span className="sm:hidden">
                                {mark.is_core ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-blue-500 text-[10px] font-bold ring-1 ring-blue-500/10">✓</span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </span>
                            </td>
                            <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-sm text-center">
                              {mark.is_core ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-500 text-xs font-bold ring-1 ring-blue-500/10">✓</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            {['bot', 'all'].includes(examType) && (
                              <td className="flex-1 sm:flex-none px-1 sm:px-6 py-1 sm:py-3 flex flex-col items-center sm:table-cell">
                                <span className="sm:hidden text-[10px] font-bold text-slate-400 mb-1">BOT</span>
                                {renderScoreInput(mark.bot_score, (val) => handleCircularScoreChange(mark.subject_id, 'bot', val), 'BOT', false, idx, 'secular')}
                              </td>
                            )}
                            {['mot', 'all'].includes(examType) && (
                              <td className="flex-1 sm:flex-none px-1 sm:px-6 py-1 sm:py-3 flex flex-col items-center sm:table-cell">
                                <span className="sm:hidden text-[10px] font-bold text-slate-400 mb-1">MOT</span>
                                {renderScoreInput(mark.mot_score, (val) => handleCircularScoreChange(mark.subject_id, 'mot', val), 'MOT', false, idx, 'secular')}
                              </td>
                            )}
                            {['eot', 'all'].includes(examType) && (
                              <td className="flex-1 sm:flex-none px-1 sm:px-6 py-1 sm:py-3 flex flex-col items-center sm:table-cell">
                                <span className="sm:hidden text-[10px] font-bold text-slate-400 mb-1">EOT</span>
                                {renderScoreInput(mark.eot_score, (val) => handleCircularScoreChange(mark.subject_id, 'eot', val), 'EOT', false, idx, 'secular')}
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

              {/* Theology Marks Table */}
              {(activeView === 'both' || activeView === 'theology') && theologyMarks.length > 0 && examType !== 'bot' && selectedEnrollment?.theology_status !== 'not_applicable' && (
                <div className="space-y-4 pt-6">
                  <div className="flex items-center justify-end gap-2 px-1" dir="rtl">
                    <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                    <h3 className="text-lg font-bold text-slate-800" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>
                      المواد اللاهوتية
                    </h3>
                  </div>
                  <div className="bg-white border border-slate-200/60 rounded-[24px] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 block sm:table">
                        <thead className="bg-slate-50/50 hidden sm:table-header-group">
                          <tr>
                            <th className="px-3 sm:px-6 py-4 text-right text-[12px] font-bold text-slate-400 uppercase tracking-wider" dir="rtl" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>
                              المادة
                            </th>
                            {['mot', 'all'].includes(examType) && <th className="px-3 sm:px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">MOT Score</th>}
                            {['eot', 'all'].includes(examType) && <th className="px-3 sm:px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">EOT Score</th>}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50 block sm:table-row-group">
                          {theologyMarks.map((mark, idx) => (
                          <tr key={mark.subject_id} className="transition-colors hover:bg-slate-50/50 group flex flex-wrap flex-row-reverse sm:table-row p-4 sm:p-0">
                              <td className="w-full sm:w-auto px-0 sm:px-6 pb-3 sm:pb-4 pt-0 sm:pt-4 text-[15px] font-bold text-slate-700 text-right whitespace-nowrap block sm:table-cell border-b border-slate-100 sm:border-0 mb-3 sm:mb-0" dir="rtl" style={{ fontFamily: '"Noto Naskh Arabic", serif' }}>
                                {mark.subject_name_arabic}
                              </td>
                              {['mot', 'all'].includes(examType) && (
                                <td className="flex-1 sm:flex-none px-1 sm:px-6 py-1 sm:py-3 flex flex-col items-center sm:table-cell">
                                  <span className="sm:hidden text-[10px] font-bold text-slate-400 mb-1">MOT</span>
                                  {renderScoreInput(mark.mot_score, (val) => handleTheologyScoreChange(mark.subject_id, 'mot', val), 'MOT', false, idx, 'theology')}
                                </td>
                              )}
                              {['eot', 'all'].includes(examType) && (
                                <td className="flex-1 sm:flex-none px-1 sm:px-6 py-1 sm:py-3 flex flex-col items-center sm:table-cell">
                                  <span className="sm:hidden text-[10px] font-bold text-slate-400 mb-1">EOT</span>
                                  {renderScoreInput(mark.eot_score, (val) => handleTheologyScoreChange(mark.subject_id, 'eot', val), 'EOT', false, idx, 'theology')}
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

              {success && !hasUnsavedChanges && (
                <div className="flex items-center gap-3 p-4 text-emerald-700 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm animate-in zoom-in-95">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p className="font-semibold">Marks saved successfully!</p>
                </div>
              )}

              {/* Spacer so the sticky footer doesn't hide the last row */}
              <div className="h-28 sm:h-32 w-full" />

              {/* Sticky Save Bar */}
              {hasUnsavedChanges && (
                <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 animate-in slide-in-from-bottom-full duration-300 pointer-events-none">
                  <div className="max-w-3xl mx-auto bg-slate-900/95 backdrop-blur-2xl border border-slate-700 p-3 sm:p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 pointer-events-auto">
                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left w-full sm:w-auto">
                      <span className="text-white font-bold text-sm">Unsaved Changes</span>
                      <span className="text-slate-400 text-xs hidden sm:block">You have modified scores for this student.</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <button 
                        type="button" 
                        onClick={() => {
                          setHasUnsavedChanges(false)
                          onSelectEnrollment('')
                        }}
                        className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                      >
                        Discard
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving || isPending}
                        className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                      >
                        {(isSaving || isPending) && (
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        )}
                        Save {examType.toUpperCase()}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null)}
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

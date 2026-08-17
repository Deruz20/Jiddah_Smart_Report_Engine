'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/utils/supabase/client'
import { SharedMarksEntry, ExamType } from './shared-marks-entry'
import { TermData, EnrollmentData, CircularMarkRow, TheologyMarkRow } from '@/types/models'

interface AdminMarksEntryClientProps {
  terms: TermData[]
}

export function AdminMarksEntryClient({ terms }: AdminMarksEntryClientProps) {
  const supabase = createClient()
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

  useEffect(() => {
    const loadEnrollments = async () => {
      setIsFetching(true)
      setError(null)
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select(`
            id,
            student_id,
            students!inner ( name, admission_number, is_archived ),
            circular_classes ( class_name, section ),
            theology_classes ( class_name_arabic, class_name_english )
          `)
          .eq('is_active', true)
          .eq('students.is_archived', false)
        
        if (error) throw error

        const mappedEnrollments: EnrollmentData[] = data.map((e: any) => ({
          id: e.id,
          student_id: e.student_id ?? null,
          name: e.students?.name || 'Unknown Student',
          admission_number: e.students?.admission_number || '',
          circular_class: e.circular_classes?.class_name || '',
          section: e.circular_classes?.section || null,
          theology_class_arabic: e.theology_classes?.class_name_arabic || null,
          theology_class_level: e.theology_classes?.class_name_english || null,
          theology_status: e.theology_classes?.class_name_arabic ? 'active' : 'inactive',
        }))
        setEnrollments(mappedEnrollments)
      } catch (err: any) {
        setError(err.message || 'Failed to load enrollments')
      } finally {
        setIsFetching(false)
      }
    }

    loadEnrollments()
  }, [supabase])

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
        const [subjectsRes, cMarksRes, tMarksRes] = await Promise.all([
          supabase.from('subjects').select('*'),
          supabase.from('circular_marks').select('*').eq('enrollment_id', selectedEnrollmentId).eq('term_id', selectedTermId),
          supabase.from('theology_marks').select('*').eq('enrollment_id', selectedEnrollmentId).eq('term_id', selectedTermId)
        ])

        if (subjectsRes.error) throw subjectsRes.error
        if (cMarksRes.error) throw cMarksRes.error
        if (tMarksRes.error) throw tMarksRes.error

        const subjects = subjectsRes.data || []
        const cMarks = cMarksRes.data || []
        const tMarks = tMarksRes.data || []

        const selectedEnrollment = enrollments.find(e => e.id === selectedEnrollmentId)
        const section = selectedEnrollment?.section || null
        const className = selectedEnrollment?.circular_class || null

        const circular: CircularMarkRow[] = subjects
          .filter(s => s.curriculum === 'secular' && (s.section === section || s.section === className || s.section === null))
          .map(s => {
            const mark = cMarks.find(m => m.subject_id === s.id)
            return {
              subject_id: s.id,
              subject_name: s.subject_name,
              is_core: true,
              bot_score: mark?.bot_score ?? null,
              mot_score: mark?.mot_score ?? null,
              eot_score: mark?.eot_score ?? null
            }
          })

        const theologyLevel = selectedEnrollment?.theology_class_level || null
        let mappedTheologySection: string | null = null
        if (theologyLevel) {
          const upperLevel = theologyLevel.toUpperCase()
          if (['P.1', 'P.2', 'P.3'].includes(upperLevel)) mappedTheologySection = 'lower_primary'
          else if (['P.4', 'P.5', 'P.6', 'P.7'].includes(upperLevel)) mappedTheologySection = 'upper_primary'
          else if (['BABY', 'MIDDLE', 'TOP', 'NURSERY'].includes(upperLevel)) mappedTheologySection = 'nursery'
        }

        const theology: TheologyMarkRow[] = subjects
          .filter(s => s.curriculum === 'theology' && (s.section === mappedTheologySection || s.section === theologyLevel || s.section === null))
          .map(s => {
            const mark = tMarks.find(m => m.subject_id === s.id)
            return {
              subject_id: s.id,
              subject_name_arabic: s.subject_name,
              mot_score: mark?.mot_score ?? null,
              eot_score: mark?.eot_score ?? null
            }
          })

        setCircularMarks(circular)
        setTheologyMarks(theology)
      } catch (err: any) {
        setError(err.message || 'Failed to load marks')
      } finally {
        setIsLoading(false)
      }
    }

    loadMarks()
  }, [selectedEnrollmentId, selectedTermId, supabase])

  const handleSaveMarks = async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault()
    setError(null)
    setSuccess(false)

    if (!selectedTermId || !selectedEnrollmentId) {
      setError('Please select a term and a student before saving marks.')
      return
    }

    setIsSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const authUserId = user?.id

        let updatedById = undefined;
        if (authUserId) {
          const { data: teacherData } = await supabase.from('teachers').select('id').eq('auth_user_id', authUserId).single();
          if (teacherData?.id) {
            updatedById = teacherData.id;
          }
        }

        if (updatedById) {
          console.log('--- BEFORE WRITE LOGS ---')
          console.log('Value being sent as updated_by:', updatedById)
          console.log('Type of updated_by:', typeof updatedById, '| First 8 chars:', updatedById.substring(0, 8))
        } else {
           console.log('--- BEFORE WRITE LOGS ---')
           console.log('No teacher record found for auth user. Omitting updated_by.')
        }

        // Save circular marks
        const cToSave = circularMarks.filter(m => m.bot_score !== null || m.mot_score !== null || m.eot_score !== null)
        if (cToSave.length > 0) {
          const { data: existingC } = await supabase.from('circular_marks').select('id, subject_id').eq('enrollment_id', selectedEnrollmentId).eq('term_id', selectedTermId)
          for (const m of cToSave) {
            const existing = existingC?.find(e => e.subject_id === m.subject_id)
            if (existing) {
              const payload: any = {
                bot_score: m.bot_score,
                mot_score: m.mot_score,
                eot_score: m.eot_score
              }
              if (updatedById) payload.updated_by = updatedById;
              
              const { error } = await supabase.from('circular_marks').update(payload).eq('id', existing.id)
              if (error) throw error;
            } else {
              const payload: any = {
                enrollment_id: selectedEnrollmentId,
                term_id: selectedTermId,
                subject_id: m.subject_id,
                bot_score: m.bot_score,
                mot_score: m.mot_score,
                eot_score: m.eot_score
              }
              if (updatedById) payload.updated_by = updatedById;

              const { error } = await supabase.from('circular_marks').insert(payload)
              if (error) throw error;
            }
          }
        }

        // Save theology marks
        const tToSave = theologyMarks.filter(m => m.mot_score !== null || m.eot_score !== null)
        if (tToSave.length > 0) {
          const { data: existingT } = await supabase.from('theology_marks').select('id, subject_id').eq('enrollment_id', selectedEnrollmentId).eq('term_id', selectedTermId)
          for (const m of tToSave) {
            const existing = existingT?.find(e => e.subject_id === m.subject_id)
            if (existing) {
              const payload: any = {
                mot_score: m.mot_score,
                eot_score: m.eot_score
              }
              if (updatedById) payload.updated_by = updatedById;

              const { error } = await supabase.from('theology_marks').update(payload).eq('id', existing.id)
              if (error) throw error;
            } else {
              const payload: any = {
                enrollment_id: selectedEnrollmentId,
                term_id: selectedTermId,
                subject_id: m.subject_id,
                mot_score: m.mot_score,
                eot_score: m.eot_score
              }
              if (updatedById) payload.updated_by = updatedById;

              const { error } = await supabase.from('theology_marks').insert(payload)
              if (error) throw error;
            }
          }
        }

        setSuccess(true)
        setTimeout(() => setSuccess(false), 3500)
      } catch (err: any) {
        console.error("WRITE_FAILED_RAW:", err);
        console.error("WRITE_FAILED_MESSAGE:", err?.message);
        console.error("WRITE_FAILED_CODE:", err?.code);
        console.error("WRITE_FAILED_DETAILS:", err?.details);
        
        setError(err?.message || 'Failed to save marks')
      } finally {
        setIsSaving(false)
      }
    }

  return (
    <SharedMarksEntry 
      terms={terms}
      enrollments={enrollments}
      selectedTermId={selectedTermId}
      onSelectTerm={setSelectedTermId}
      selectedEnrollmentId={selectedEnrollmentId}
      onSelectEnrollment={setSelectedEnrollmentId}
      circularMarks={circularMarks}
      setCircularMarks={setCircularMarks}
      theologyMarks={theologyMarks}
      setTheologyMarks={setTheologyMarks}
      examType={examType}
      setExamType={setExamType}
      isFetching={isFetching}
      isLoading={isLoading}
      isSaving={isSaving}
      isPending={isPending}
      error={error}
      success={success}
      setSuccess={setSuccess}
      onSave={handleSaveMarks}
    />
  )
}

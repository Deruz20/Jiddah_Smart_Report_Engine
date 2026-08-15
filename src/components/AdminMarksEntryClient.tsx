'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/utils/supabase/client'
import { SharedMarksEntry, ExamType } from './shared-marks-entry'
import { TermData, EnrollmentData, CircularMarkRow, TheologyMarkRow } from './MarksEntryClient'

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
            students!inner ( name, admission_number ),
            circular_classes ( class_name, section ),
            theology_classes ( class_name_arabic, class_name_english )
          `)
        
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
          supabase.from('circular_marks').select('*').eq('enrollment_id', selectedEnrollmentId),
          supabase.from('theology_marks').select('*').eq('enrollment_id', selectedEnrollmentId)
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

        const theology: TheologyMarkRow[] = subjects
          .filter(s => s.curriculum === 'theology' && (s.section === section || s.section === className || s.section === null))
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

    startTransition(async () => {
      try {
        // Save circular marks
        const cToSave = circularMarks.filter(m => m.bot_score !== null || m.mot_score !== null || m.eot_score !== null)
        if (cToSave.length > 0) {
          const { data: existingC } = await supabase.from('circular_marks').select('id, subject_id').eq('enrollment_id', selectedEnrollmentId)
          for (const m of cToSave) {
            const existing = existingC?.find(e => e.subject_id === m.subject_id)
            if (existing) {
              await supabase.from('circular_marks').update({
                bot_score: m.bot_score,
                mot_score: m.mot_score,
                eot_score: m.eot_score,
                updated_by: 'admin_user'
              }).eq('id', existing.id)
            } else {
              await supabase.from('circular_marks').insert({
                enrollment_id: selectedEnrollmentId,
                subject_id: m.subject_id,
                bot_score: m.bot_score,
                mot_score: m.mot_score,
                eot_score: m.eot_score,
                updated_by: 'admin_user'
              })
            }
          }
        }

        // Save theology marks
        const tToSave = theologyMarks.filter(m => m.mot_score !== null || m.eot_score !== null)
        if (tToSave.length > 0) {
          const { data: existingT } = await supabase.from('theology_marks').select('id, subject_id').eq('enrollment_id', selectedEnrollmentId)
          for (const m of tToSave) {
            const existing = existingT?.find(e => e.subject_id === m.subject_id)
            if (existing) {
              await supabase.from('theology_marks').update({
                mot_score: m.mot_score,
                eot_score: m.eot_score,
                updated_by: 'admin_user'
              }).eq('id', existing.id)
            } else {
              await supabase.from('theology_marks').insert({
                enrollment_id: selectedEnrollmentId,
                subject_id: m.subject_id,
                mot_score: m.mot_score,
                eot_score: m.eot_score,
                updated_by: 'admin_user'
              })
            }
          }
        }

        setSuccess(true)
        setTimeout(() => setSuccess(false), 3500)
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred')
      } finally {
        setIsSaving(false)
      }
    })
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

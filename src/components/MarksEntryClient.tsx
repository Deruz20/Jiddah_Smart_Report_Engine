'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { usePowerSync } from '@powersync/react'
import { SharedMarksEntry, ExamType } from './shared-marks-entry'

export type TermData = {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current: boolean
}

export type EnrollmentData = {
  id: string
  student_id?: string | null
  name: string
  admission_number: string
  circular_class: string
  section: string | null
  theology_class_arabic: string | null
  theology_class_level: string | null
  theology_status: string | null
}

export type CircularMarkRow = {
  subject_id: string
  subject_name: string
  is_core: boolean
  bot_score: number | null
  mot_score: number | null
  eot_score: number | null
}

export type TheologyMarkRow = {
  subject_id: string
  subject_name_arabic: string
  mot_score: number | null
  eot_score: number | null
}

interface MarksEntryClientProps {
  terms: TermData[]
}

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

  // Load enrollments on mount
  useEffect(() => {
    const loadEnrollments = async () => {
      setIsFetching(true)
      setError(null)

      try {
        const data = await powerSync.getAll(`
          SELECT 
            e.id as enrollment_id,
            e.student_id,
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
          student_id: e.student_id ?? null,
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
  }, [powerSync])

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
        const selectedEnrollment = enrollments.find(e => e.id === selectedEnrollmentId)
        const section = selectedEnrollment?.section || null

        const circular = await powerSync.getAll(`
          SELECT 
            s.id as subject_id, s.subject_name, 'true' as is_core,
            cm.bot_mark as bot_score, cm.mot_mark as mot_score, cm.eot_mark as eot_score
          FROM subjects s
          LEFT JOIN circular_marks cm ON cm.subject_id = s.id AND cm.enrollment_id = ?
          WHERE s.curriculum = 'circular' AND (s.section = ? OR s.section IS NULL)
        `, [selectedEnrollmentId, section]);

        const theology = await powerSync.getAll(`
          SELECT 
            s.id as subject_id, s.subject_name as subject_name_arabic,
            tm.mot_mark as mot_score, tm.eot_mark as eot_score
          FROM subjects s
          LEFT JOIN theology_marks tm ON tm.subject_id = s.id AND tm.enrollment_id = ?
          WHERE s.curriculum = 'theology' AND (s.section = ? OR s.section IS NULL)
        `, [selectedEnrollmentId, section]);

        setCircularMarks(circular as any)
        setTheologyMarks(theology as any)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load marks')
      } finally {
        setIsLoading(false)
      }
    }

    loadMarks()
  }, [selectedEnrollmentId, selectedTermId, powerSync])

  const handleSaveMarks = async (event?: React.FormEvent<HTMLFormElement>) => {
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

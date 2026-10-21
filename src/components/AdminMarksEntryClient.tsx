// @ts-nocheck
'use client'

import React, { useState, useEffect, useTransition, useRef } from 'react'
import { toast } from 'sonner'
import { SharedMarksEntry, ExamType } from './shared-marks-entry'
import { TermData, EnrollmentData, CircularMarkRow, TheologyMarkRow } from '@/types/models'

interface AdminMarksEntryClientProps {
  terms: TermData[]
  initialEnrollments?: EnrollmentData[]
  allowedDepartment?: 'secular' | 'theology' | 'both'
}

export function AdminMarksEntryClient({
  terms,
  initialEnrollments,
  allowedDepartment = 'both',
}: AdminMarksEntryClientProps) {
  const hasInitial = Array.isArray(initialEnrollments) && initialEnrollments.length > 0
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>(initialEnrollments || [])
  const [selectedTermId, setSelectedTermId] = useState(() => {
    const active = terms.find((t) => t.is_current) || terms[0]
    return active?.id || ''
  })
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(() => {
    return hasInitial ? initialEnrollments[0].id : ''
  })
  const [examType, setExamType] = useState<ExamType>('bot')
  const [circularMarks, setCircularMarks] = useState<CircularMarkRow[]>([])
  const [theologyMarks, setTheologyMarks] = useState<TheologyMarkRow[]>([])
  const [isFetching, setIsFetching] = useState(!hasInitial)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending] = useTransition()

  const marksCacheRef = useRef<
    Map<string, { circular_marks: CircularMarkRow[]; theology_marks: TheologyMarkRow[] }>
  >(new Map())

  useEffect(() => {
    if (!selectedTermId && terms.length > 0) {
      const active = terms.find((t) => t.is_current) || terms[0]
      if (active?.id) setSelectedTermId(active.id)
    }
  }, [terms, selectedTermId])

  useEffect(() => {
    if (hasInitial) {
      setIsFetching(false)
      return
    }

    const loadEnrollments = async () => {
      setIsFetching(true)
      setError(null)
      try {
        const response = await fetch('/api/enrollments')
        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) {
          throw new Error('Unable to load assigned enrollments')
        }
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load assigned enrollments')

        const mappedEnrollments: EnrollmentData[] = (Array.isArray(data) ? data : []).map((e: any) => ({
          id: e.enrollment_id || e.id,
          student_id: e.id ?? null,
          name: e.name || 'Unknown Student',
          arabic_name: e.arabic_name || null,
          admission_number: e.admission_number || '',
          circular_class: e.circular_class || '',
          section: e.section || null,
          theology_class_arabic: e.theology_class_arabic || null,
          theology_class_level: e.theology_class_english || null,
          theology_status: e.theology_class_arabic ? 'active' : 'inactive',
        }))
        setEnrollments(mappedEnrollments)
        if (mappedEnrollments.length > 0) {
          setSelectedEnrollmentId((prev) => prev || mappedEnrollments[0].id)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load enrollments')
      } finally {
        setIsFetching(false)
      }
    }

    loadEnrollments()
  }, [hasInitial])

  useEffect(() => {
    if (!selectedEnrollmentId || !selectedTermId) {
      setCircularMarks([])
      setTheologyMarks([])
      return
    }

    const cacheKey = `${selectedEnrollmentId}:${selectedTermId}`
    const cached = marksCacheRef.current.get(cacheKey)
    if (cached) {
      setCircularMarks(cached.circular_marks)
      setTheologyMarks(cached.theology_marks)
    }

    let cancelled = false
    const loadMarks = async () => {
      if (!cached) setIsLoading(true)
      setError(null)
      setSuccess(false)

      try {
        const params = new URLSearchParams({
          enrollment_id: selectedEnrollmentId,
          term_id: selectedTermId,
        })
        const response = await fetch(`/api/marks?${params}`)
        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) {
          throw new Error('Unable to load marks for this student')
        }
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load marks for this class')
        if (cancelled) return
        const nextCircular = data.circular_marks ?? []
        const nextTheology = data.theology_marks ?? []
        setCircularMarks(nextCircular)
        setTheologyMarks(nextTheology)
        marksCacheRef.current.set(cacheKey, {
          circular_marks: nextCircular,
          theology_marks: nextTheology,
        })
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load marks')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadMarks()
    return () => {
      cancelled = true
    }
  }, [selectedEnrollmentId, selectedTermId])

  const handleSaveMarks = async (event?: React.FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault()
    setError(null)
    setSuccess(false)

    if (!selectedTermId || !selectedEnrollmentId) {
      const msg = 'Please select a term and a student before saving marks.'
      setError(msg)
      toast.error(msg)
      return
    }

    setIsSaving(true)

    try {
      const circularPayload = circularMarks.map((mark) => ({
        subject_id: mark.subject_id,
        ...(examType === 'bot' || examType === 'all' ? { bot_score: mark.bot_score } : {}),
        ...(examType === 'mot' || examType === 'all' ? { mot_score: mark.mot_score } : {}),
        ...(examType === 'eot' || examType === 'all' ? { eot_score: mark.eot_score } : {}),
      }))
      const theologyPayload = theologyMarks.map((mark) => ({
        subject_id: mark.subject_id,
        ...(examType === 'mot' || examType === 'all' ? { mot_score: mark.mot_score } : {}),
        ...(examType === 'eot' || examType === 'all' ? { eot_score: mark.eot_score } : {}),
      }))
      const response = await fetch('/api/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollment_id: selectedEnrollmentId,
          term_id: selectedTermId,
          score_type: examType,
          circular_marks: circularPayload,
          theology_marks: theologyPayload,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to save marks')

      const cacheKey = `${selectedEnrollmentId}:${selectedTermId}`
      marksCacheRef.current.set(cacheKey, {
        circular_marks: circularMarks,
        theology_marks: theologyMarks,
      })

      setSuccess(true)
      toast.success('Marks saved successfully!')
      setTimeout(() => setSuccess(false), 3500)
    } catch (err: any) {
      const msg = err?.message || 'Failed to save marks'
      setError(msg)
      toast.error(msg)
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
      allowedDepartment={allowedDepartment}
    />
  )
}

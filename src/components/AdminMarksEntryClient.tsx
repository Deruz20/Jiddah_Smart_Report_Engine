// @ts-nocheck
'use client'

import React, { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SharedMarksEntry, ExamType } from './shared-marks-entry'
import { TermData, EnrollmentData, CircularMarkRow, TheologyMarkRow } from '@/types/models'
import {
  broadcastMarksUpdated,
  offlineFetchJson,
  submitMutationWithOfflineFallback,
} from '@/lib/offline-sync'
import { invalidateClientCache } from '@/lib/client-cache'

interface AdminMarksEntryClientProps {
  terms: TermData[]
  initialEnrollments?: EnrollmentData[]
  allowedDepartment?: 'secular' | 'theology' | 'both'
  isUnassigned?: boolean
  assignedSubjects?: string[]
  roleLabel?: string
  gradingConfig?: {
    grading_scale?: any[]
    division_boundaries?: any[]
    theology_grading_scale?: any[]
    theology_division_boundaries?: any[]
  }
}

export function AdminMarksEntryClient({
  terms,
  initialEnrollments,
  allowedDepartment = 'both',
  isUnassigned = false,
  assignedSubjects = [],
  roleLabel = 'Teacher',
  gradingConfig,
}: AdminMarksEntryClientProps) {
  const router = useRouter()
  const hasInitial = Array.isArray(initialEnrollments) && initialEnrollments.length > 0
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>(initialEnrollments || [])
  const [selectedTermId, setSelectedTermId] = useState(() => {
    const active = terms.find((t) => t.is_current || (t as any).is_active) || terms[0]
    return active?.id || ''
  })
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(() => {
    return hasInitial ? initialEnrollments[0].id : ''
  })
  const [examType, setExamType] = useState<ExamType>('mot')
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
  const activeEnrollReqIdRef = useRef(0)
  const activeMarksReqIdRef = useRef(0)

  const isAbortLikeError = (err: any): boolean => {
    if (!err) return false
    const name = String(err?.name || '')
    const msg = String(err?.message || '').toLowerCase()
    return name === 'AbortError' || msg.includes('aborted')
  }

  useEffect(() => {
    if (!selectedTermId && terms.length > 0) {
      const active = terms.find((t) => t.is_current || (t as any).is_active) || terms[0]
      if (active?.id) setSelectedTermId(active.id)
    }
  }, [terms, selectedTermId])

  useEffect(() => {
    if (hasInitial) {
      setIsFetching(false)
      return
    }

    let cancelled = false
    const reqId = ++activeEnrollReqIdRef.current
    const mapEnrollments = (data: any[]): EnrollmentData[] =>
      (Array.isArray(data) ? data : []).map((e: any) => ({
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

    const loadEnrollments = async () => {
      setIsFetching(true)
      setError(null)
      try {
        const { data } = await offlineFetchJson<any[]>('/api/enrollments', {
          cacheKey: 'marks_enrollments_v1',
          timeoutMs: 25000,
          onBackgroundRefresh: (fresh) => {
            if (cancelled || reqId !== activeEnrollReqIdRef.current || !Array.isArray(fresh)) return
            const mapped = mapEnrollments(fresh)
            setEnrollments(mapped)
          },
        })
        if (cancelled || reqId !== activeEnrollReqIdRef.current) return
        const mappedEnrollments = mapEnrollments(data)
        setEnrollments(mappedEnrollments)
        if (mappedEnrollments.length > 0) {
          setSelectedEnrollmentId((prev) => prev || mappedEnrollments[0].id)
        }
      } catch (err: any) {
        if (cancelled || reqId !== activeEnrollReqIdRef.current || isAbortLikeError(err)) return
        setError(err.message || 'Failed to load enrollments')
      } finally {
        if (!cancelled && reqId === activeEnrollReqIdRef.current) {
          setIsFetching(false)
        }
      }
    }

    loadEnrollments()
    return () => {
      cancelled = true
    }
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
    const reqId = ++activeMarksReqIdRef.current
    const loadMarks = async () => {
      if (!cached) setIsLoading(true)
      setError(null)
      setSuccess(false)

      const params = new URLSearchParams({
        enrollment_id: selectedEnrollmentId,
        term_id: selectedTermId,
      })
      const url = `/api/marks?${params}`

      try {
        const { data } = await offlineFetchJson<{
          circular_marks?: CircularMarkRow[]
          theology_marks?: TheologyMarkRow[]
        }>(url, {
          cacheKey: `marks_sheet_${cacheKey}`,
          timeoutMs: 25000,
          onBackgroundRefresh: (fresh: any) => {
            if (cancelled || reqId !== activeMarksReqIdRef.current || !fresh) return
            const nextC = fresh.circular_marks ?? []
            const nextT = fresh.theology_marks ?? []
            setCircularMarks(nextC)
            setTheologyMarks(nextT)
            marksCacheRef.current.set(cacheKey, {
              circular_marks: nextC,
              theology_marks: nextT,
            })
          },
        })
        if (cancelled || reqId !== activeMarksReqIdRef.current) return
        const nextCircular = data?.circular_marks ?? []
        const nextTheology = data?.theology_marks ?? []
        setCircularMarks(nextCircular)
        setTheologyMarks(nextTheology)
        marksCacheRef.current.set(cacheKey, {
          circular_marks: nextCircular,
          theology_marks: nextTOrEmpty(nextTheology),
        })
      } catch (err: any) {
        if (cancelled || reqId !== activeMarksReqIdRef.current) return
        if (isAbortLikeError(err)) {
          // Silent direct retry without AbortController so an aborted fetch never blanks the table
          try {
            const retryRes = await fetch(url, { cache: 'no-store' })
            if (cancelled || reqId !== activeMarksReqIdRef.current) return
            if (retryRes.ok) {
              const retryJson = await retryRes.json()
              const nextCircular = retryJson?.circular_marks ?? []
              const nextTheology = retryJson?.theology_marks ?? []
              setCircularMarks(nextCircular)
              setTheologyMarks(nextTheology)
              marksCacheRef.current.set(cacheKey, {
                circular_marks: nextCircular,
                theology_marks: nextTheology,
              })
              return
            }
          } catch {
            // Ignore secondary abort
          }
          return
        }
        setError(err.message || 'Failed to load marks')
      } finally {
        if (!cancelled && reqId === activeMarksReqIdRef.current) {
          setIsLoading(false)
        }
      }
    }

    function nextTOrEmpty(arr: TheologyMarkRow[]) {
      return Array.isArray(arr) ? arr : []
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

      const res = await submitMutationWithOfflineFallback({
        url: '/api/marks',
        method: 'POST',
        label: `Save ${examType.toUpperCase()} marks`,
        body: {
          enrollment_id: selectedEnrollmentId,
          term_id: selectedTermId,
          score_type: examType,
          circular_marks: circularPayload,
          theology_marks: theologyPayload,
        },
      })

      if (res.error) {
        throw new Error(res.error)
      }

      const cacheKey = `${selectedEnrollmentId}:${selectedTermId}`
      marksCacheRef.current.set(cacheKey, {
        circular_marks: circularMarks,
        theology_marks: theologyMarks,
      })

      invalidateClientCache()
      broadcastMarksUpdated({
        enrollment_id: selectedEnrollmentId,
        term_id: selectedTermId,
        score_type: examType,
        queued: res.queued,
      })

      setSuccess(true)
      if (res.queued) {
        toast.info('Saved locally (Offline Mode). Will auto-sync when connection is restored.')
      } else {
        toast.success('Marks saved successfully!')
        router.refresh()
      }
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
      isUnassigned={isUnassigned}
      assignedSubjects={assignedSubjects}
      roleLabel={roleLabel}
      gradingConfig={gradingConfig}
    />
  )
}

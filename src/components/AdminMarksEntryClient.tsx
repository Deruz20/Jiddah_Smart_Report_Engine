// @ts-nocheck
'use client'

import React, { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { SharedMarksEntry, ExamType } from './shared-marks-entry'
import { TermData, EnrollmentData, CircularMarkRow, TheologyMarkRow } from '@/types/models'
import {
  broadcastMarksUpdated,
  flushOfflineOutbox,
  getPendingOutboxItems,
  OFFLINE_SYNC_EVENT,
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
  const [pendingOutboxCount, setPendingOutboxCount] = useState(0)
  const [isFlushingOutbox, setIsFlushingOutbox] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)
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

  const refreshPendingOutboxAndFlush = async (autoFlushIfOnline = false) => {
    try {
      const items = await getPendingOutboxItems()
      const markItems = items.filter((item) => item.url.includes('/api/marks') || item.url.includes('-marks'))
      setPendingOutboxCount(markItems.length)
      if (autoFlushIfOnline && markItems.length > 0 && (typeof navigator === 'undefined' || navigator.onLine !== false)) {
        const res = await flushOfflineOutbox()
        const after = await getPendingOutboxItems()
        setPendingOutboxCount(after.filter((item) => item.url.includes('/api/marks') || item.url.includes('-marks')).length)
        if (res.synced > 0) {
          marksCacheRef.current.clear()
          invalidateClientCache()
          setReloadNonce((n) => n + 1)
          toast.success(`Auto-synced ${res.synced} queued mark save(s) to Postgres.`)
        }
      }
    } catch {
      // Non-fatal outbox inspection error
    }
  }

  useEffect(() => {
    refreshPendingOutboxAndFlush(true)
    const onSyncChanged = () => {
      refreshPendingOutboxAndFlush(false)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener(OFFLINE_SYNC_EVENT, onSyncChanged)
      return () => window.removeEventListener(OFFLINE_SYNC_EVENT, onSyncChanged)
    }
  }, [])

  const applyPendingOutboxOverlay = async (
    enrollmentId: string,
    termId: string,
    circRows: CircularMarkRow[],
    theoRows: TheologyMarkRow[]
  ): Promise<{ circular: CircularMarkRow[]; theology: TheologyMarkRow[] }> => {
    try {
      const items = await getPendingOutboxItems()
      const markItems = items.filter((item) => item.url.includes('/api/marks') || item.url.includes('-marks'))
      setPendingOutboxCount(markItems.length)
      const matching = markItems.filter((item) => {
        const b = item.body as Record<string, any> | null
        return b && b.enrollment_id === enrollmentId && b.term_id === termId
      })
      if (matching.length === 0) return { circular: circRows, theology: theoRows }

      const nextC = circRows.map((r) => ({ ...r }))
      const nextT = theoRows.map((r) => ({ ...r }))
      for (const item of matching) {
        const b = item.body as Record<string, any>
        if (Array.isArray(b.circular_marks)) {
          for (const pm of b.circular_marks) {
            const target = nextC.find((r) => r.subject_id === pm.subject_id)
            if (target) {
              if (pm.bot_score !== undefined) target.bot_score = pm.bot_score
              if (pm.mot_score !== undefined) target.mot_score = pm.mot_score
              if (pm.eot_score !== undefined) target.eot_score = pm.eot_score
            }
          }
        }
        if (Array.isArray(b.theology_marks)) {
          for (const pm of b.theology_marks) {
            const target = nextT.find((r) => r.subject_id === pm.subject_id)
            if (target) {
              if (pm.mot_score !== undefined) target.mot_score = pm.mot_score
              if (pm.eot_score !== undefined) target.eot_score = pm.eot_score
            }
          }
        }
      }
      return { circular: nextC, theology: nextT }
    } catch {
      return { circular: circRows, theology: theoRows }
    }
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
          onBackgroundRefresh: async (fresh: any) => {
            if (cancelled || reqId !== activeMarksReqIdRef.current || !fresh) return
            const overlaid = await applyPendingOutboxOverlay(
              selectedEnrollmentId,
              selectedTermId,
              fresh.circular_marks ?? [],
              fresh.theology_marks ?? []
            )
            if (cancelled || reqId !== activeMarksReqIdRef.current) return
            setCircularMarks(overlaid.circular)
            setTheologyMarks(overlaid.theology)
            marksCacheRef.current.set(cacheKey, {
              circular_marks: overlaid.circular,
              theology_marks: overlaid.theology,
            })
          },
        })
        if (cancelled || reqId !== activeMarksReqIdRef.current) return
        const overlaid = await applyPendingOutboxOverlay(
          selectedEnrollmentId,
          selectedTermId,
          data?.circular_marks ?? [],
          data?.theology_marks ?? []
        )
        if (cancelled || reqId !== activeMarksReqIdRef.current) return
        setCircularMarks(overlaid.circular)
        setTheologyMarks(overlaid.theology)
        marksCacheRef.current.set(cacheKey, {
          circular_marks: overlaid.circular,
          theology_marks: nextTOrEmpty(overlaid.theology),
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
  }, [selectedEnrollmentId, selectedTermId, reloadNonce])

  const handleFlushOutbox = async () => {
    if (isFlushingOutbox) return
    setIsFlushingOutbox(true)
    try {
      const res = await flushOfflineOutbox()
      await refreshPendingOutboxAndFlush(false)
      if (res.synced > 0) {
        marksCacheRef.current.clear()
        invalidateClientCache()
        setReloadNonce((n) => n + 1)
        router.refresh()
        toast.success(`Synced ${res.synced} queued mark save(s) to Postgres!`)
      } else if (res.failed > 0) {
        toast.error(`Sync attempted but ${res.failed} item(s) still failed. Check network or permissions.`)
      } else {
        toast.info('All local marks are already synced with the server.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to sync local marks')
    } finally {
      setIsFlushingOutbox(false)
    }
  }

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
      await refreshPendingOutboxAndFlush(false)
      if (res.queued) {
        toast.info('Saved locally (Offline Mode). Will auto-sync when connection is restored.')
      } else {
        if (Array.isArray(res.data?.circular_marks) || Array.isArray(res.data?.theology_marks)) {
          invalidateClientCache()
        }
        toast.success('Marks verified & saved to server!')
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
      pendingOutboxCount={pendingOutboxCount}
      isFlushingOutbox={isFlushingOutbox}
      onFlushOutbox={handleFlushOutbox}
    />
  )
}

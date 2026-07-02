import { useCallback, useRef, useState } from 'react'
import { useApi } from './useApi'
import { api } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import type { MarksApiResponse } from '@/services/api/types'

export type ScoreType = 'mot' | 'eot'

export function useMarks(enrollmentId?: string, termId?: string) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const enabled = Boolean(enrollmentId && termId)
  const { data, loading, error, refetch } = useApi<MarksApiResponse>(enabled ? ENDPOINTS.marks : null, {
    params: enabled ? { enrollment_id: enrollmentId!, term_id: termId! } : undefined,
  })

  const saveMarks = useCallback(
    async (payload: {
      enrollment_id: string
      term_id: string
      score_type: ScoreType
      circular_marks?: { subject_id: string; score: number | string }[]
      theology_marks?: { subject_id: string; score: number | string }[]
    }) => {
      setSaving(true)
      setSaveError(null)
      try {
        await api.post(ENDPOINTS.marks, payload)
        setLastSaved(new Date())
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save marks')
        throw err
      } finally {
        setSaving(false)
      }
    },
    []
  )

  const saveMarksDebounced = useCallback(
    (payload: Parameters<typeof saveMarks>[0], delayMs = 700) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        void saveMarks(payload)
      }, delayMs)
    },
    [saveMarks]
  )

  return {
    marks: data,
    loading,
    error,
    saving,
    saveError,
    lastSaved,
    refetch,
    saveMarks,
    saveMarksDebounced,
  }
}

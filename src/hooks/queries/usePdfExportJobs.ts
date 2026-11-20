'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PdfExportJob } from '@/lib/pdf-export-worker'

export interface TriggerBatchExportPayload {
  enrollment_ids?: string[]
  class_id?: string | null
  term_id?: string | null
  score_type?: 'bot' | 'mot' | 'eot'
  curriculum?: 'secular' | 'theology' | 'combined'
  stamp_date?: string
  studioFormatting?: Record<string, any>
}

export interface TriggerBatchExportResponse {
  success: boolean
  job_id: string
  status: 'pending'
  progress_current: number
  progress_total: number
  message: string
}

/**
 * React Query hook to monitor a batch export job's live progress.
 * Dynamically polls while status is 'pending' or 'processing', and automatically
 * stops polling when the job is 'completed' or 'failed'.
 */
export function usePdfExportJob(jobId: string | null) {
  return useQuery<PdfExportJob | null>({
    queryKey: ['pdf_export_job', jobId],
    queryFn: async () => {
      if (!jobId) return null
      const res = await fetch(`/api/jobs/reports/batch-export?job_id=${encodeURIComponent(jobId)}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch job status')
      }
      const data = await res.json()
      return data.job as PdfExportJob
    },
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const data = query.state.data
      if (!data) return 1500
      if (data.status === 'completed' || data.status === 'failed') {
        return false // Stop polling once terminal state reached
      }
      return 1500 // Poll every 1.5s while active
    },
    refetchOnWindowFocus: true,
  })
}

/**
 * Mutation hook to initiate an asynchronous batch report export.
 */
export function useTriggerBatchExport() {
  const queryClient = useQueryClient()

  return useMutation<TriggerBatchExportResponse, Error, TriggerBatchExportPayload>({
    mutationFn: async (payload) => {
      const res = await fetch('/api/jobs/reports/batch-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok && res.status !== 202) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to initialize batch export job')
      }

      const data = await res.json()
      return data as TriggerBatchExportResponse
    },
    onSuccess: (data) => {
      if (data?.job_id) {
        queryClient.invalidateQueries({ queryKey: ['pdf_export_job', data.job_id] })
      }
    },
  })
}

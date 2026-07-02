import { useCallback } from 'react'
import { useApi } from './useApi'
import { api } from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import type { ReportListItem } from '@/services/api/types'

export type ReportScoreType = 'mot' | 'eot'

export interface ReportPreviewOptions {
  enrollmentId: string
  termId: string
  scoreType?: ReportScoreType
  autoGenerate?: boolean
  print?: boolean
}

/** Same-origin base for report preview (Vite proxies /admin → Next.js :3000). */
export function getReportPreviewBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  return base.replace(/\/$/, '')
}

export function buildReportPreviewUrl({
  enrollmentId,
  termId,
  scoreType = 'eot',
  autoGenerate = true,
  print = false,
}: ReportPreviewOptions): string {
  const base = getReportPreviewBaseUrl()
  const params = new URLSearchParams({
    enrollment_id: enrollmentId,
    term_id: termId,
    score_type: scoreType,
  })
  if (!autoGenerate) params.set('autogenerate', '0')
  if (print) params.set('print', '1')
  return `${base}/admin/reports?${params.toString()}`
}

/** Opens the Next.js report generator (legacy alias). */
export function reportAdminPreviewUrl(options?: Partial<ReportPreviewOptions>): string {
  if (options?.enrollmentId && options?.termId) {
    return buildReportPreviewUrl({
      enrollmentId: options.enrollmentId,
      termId: options.termId,
      scoreType: options.scoreType ?? 'eot',
      autoGenerate: options.autoGenerate ?? true,
      print: options.print ?? false,
    })
  }
  return `${getReportPreviewBaseUrl()}/admin/reports`
}

export function useReports() {
  const { data, loading, error, refetch } = useApi<{ data: ReportListItem[] }>(ENDPOINTS.reports)

  const generateReport = useCallback(
    async (enrollmentId: string, termId: string, scoreType: ReportScoreType = 'eot') => {
      return api.get<unknown>(ENDPOINTS.report, {
        params: {
          enrollment_id: enrollmentId,
          term_id: termId,
          score_type: scoreType,
        },
      })
    },
    []
  )

  const openReportPreview = useCallback((options: ReportPreviewOptions) => {
    window.open(buildReportPreviewUrl(options), '_blank', 'noopener,noreferrer')
  }, [])

  return {
    reports: data?.data ?? [],
    loading,
    error,
    refetch,
    generateReport,
    openReportPreview,
    previewUrl: reportAdminPreviewUrl(),
    buildReportPreviewUrl,
  }
}

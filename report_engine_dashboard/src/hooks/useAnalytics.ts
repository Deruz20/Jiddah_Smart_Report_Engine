import { useApi } from './useApi'
import { ENDPOINTS } from '@/services/api/endpoints'
import type { AnalyticsPayload } from '@/services/api/types'

export function useAnalytics() {
  const { data, loading, error, refetch } = useApi<AnalyticsPayload>(
    ENDPOINTS.analytics.dashboard
  )

  return { analytics: data, loading, error, refetch }
}

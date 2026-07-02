import { useMemo } from 'react'
import { useApi } from './useApi'
import { ENDPOINTS } from '@/services/api/endpoints'
import type { ActivityItem } from '@/services/api/types'

interface ActivityResponse {
  data: ActivityItem[]
}

export function useActivity() {
  const { data, loading, error, refetch } = useApi<ActivityResponse>(ENDPOINTS.activity)
  const activities = useMemo(() => data?.data ?? [], [data])
  return { activities, loading, error, refetch }
}

import { useMemo } from 'react'
import { useApi } from './useApi'
import { ENDPOINTS } from '@/services/api/endpoints'
import { mapClassFromApi } from '@/services/api/adapters'
import type { DashboardClass } from '@/services/api/types'

interface ClassesResponse {
  data: { id: string | number; class_name: string; section?: string }[]
}

export function useClasses() {
  const { data, loading, error, refetch } = useApi<ClassesResponse>(ENDPOINTS.classes)

  const classes = useMemo<DashboardClass[]>(
    () => (data?.data ?? []).map((row) => mapClassFromApi(row)),
    [data]
  )

  return { classes, loading, error, refetch }
}

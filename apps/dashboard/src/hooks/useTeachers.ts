import { useMemo } from 'react'
import { useApi } from './useApi'
import { ENDPOINTS } from '@/services/api/endpoints'
import type { DashboardTeacher } from '@/services/api/types'

interface TeachersResponse {
  data: DashboardTeacher[]
  placeholder?: boolean
  message?: string
}

export function useTeachers(role?: string) {
  const params = role ? { role } : undefined
  const { data, loading, error, refetch } = useApi<TeachersResponse>(ENDPOINTS.teachers, {
    params,
  })

  const teachers = useMemo(() => data?.data ?? [], [data])

  return {
    teachers,
    loading,
    error,
    refetch,
    placeholder: data?.placeholder ?? false,
    placeholderMessage: data?.message,
  }
}

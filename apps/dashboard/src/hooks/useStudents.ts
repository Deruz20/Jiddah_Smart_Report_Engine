import { useMemo } from 'react'
import { useApi } from './useApi'
import { ENDPOINTS } from '@/services/api/endpoints'
import { mapStudentFromApi } from '@/services/api/adapters'
import type { ApiStudentRecord, DashboardStudent } from '@/services/api/types'

export function useStudents(search?: string) {
  const { data, loading, error, refetch } = useApi<ApiStudentRecord[]>(ENDPOINTS.students)

  const students = useMemo<DashboardStudent[]>(() => {
    const mapped = (data ?? []).map(mapStudentFromApi)
    if (!search?.trim()) return mapped
    const q = search.toLowerCase()
    return mapped.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    )
  }, [data, search])

  return { students, loading, error, refetch }
}

import { useApi } from './useApi'
import { ENDPOINTS } from '@/services/api/endpoints'

export interface EnrollmentRecord {
  enrollment_id: string
  name: string
  admission_number: string
  circular_class: string
  section?: string | null
  theology_class_arabic?: string | null
}

export function useEnrollments(className?: string) {
  const { data, loading, error, refetch } = useApi<EnrollmentRecord[]>(ENDPOINTS.enrollments)

  const enrollments = (data ?? []).filter((e) => {
    if (!className || className === 'All Classes') return true
    return e.circular_class === className
  })

  return { enrollments, loading, error, refetch }
}

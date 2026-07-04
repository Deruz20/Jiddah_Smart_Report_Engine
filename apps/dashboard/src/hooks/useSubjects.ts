import { useMemo } from 'react'
import { useApi } from './useApi'

interface SubjectResponse {
  id: string | number;
  subject_name: string;
  curriculum: string;
  section?: string;
  created_at?: string;
}

interface SubjectsApiResponse {
  data: SubjectResponse[]
}

export function useSubjects() {
  const { data, loading, error, refetch } = useApi<SubjectsApiResponse>('/api/subjects')

  const subjects = useMemo(() => {
    return data?.data ?? []
  }, [data])

  return { subjects, loading, error, refetch }
}

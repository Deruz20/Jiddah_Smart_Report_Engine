import { useMemo } from 'react'
import { useApi } from './useApi'
import { ENDPOINTS } from '@/services/api/endpoints'

export interface ApiTerm {
  id: string
  academic_year: number
  term_number: number
  label: string
  is_current?: boolean
  start_date?: string | null
  end_date?: string | null
  next_term_start?: string | null
}

interface TermsResponse {
  data: ApiTerm[]
}

export function useTerms() {
  const { data, loading, error, refetch } = useApi<TermsResponse>(ENDPOINTS.terms)

  const terms = useMemo(() => data?.data ?? [], [data])
  const currentTerm = useMemo(() => terms.find((t) => t.is_current) ?? terms[0] ?? null, [terms])

  return { terms, currentTerm, loading, error, refetch }
}

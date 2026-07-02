import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest, ApiClientError, type RequestOptions } from '@/services/api/client'

export interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useApi<T>(
  path: string | null,
  options?: Omit<RequestOptions, 'signal'> & { enabled?: boolean }
): UseApiState<T> {
  const { enabled = true, ...requestOptions } = options ?? {}
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(Boolean(path && enabled))
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const optionsRef = useRef(requestOptions)
  optionsRef.current = requestOptions

  const fetchData = useCallback(async () => {
    if (!path || !enabled) {
      setLoading(false)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const result = await apiRequest<T>(path, {
        ...optionsRef.current,
        signal: controller.signal,
      })
      if (!controller.signal.aborted) {
        setData(result)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const message =
        err instanceof ApiClientError
          ? err.message
          : 'Unable to load data. Please try again.'
      if (!controller.signal.aborted) {
        setError(message)
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [path, enabled])

  useEffect(() => {
    fetchData()
    return () => abortRef.current?.abort()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

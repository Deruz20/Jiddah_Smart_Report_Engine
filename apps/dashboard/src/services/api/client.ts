import { ENDPOINTS } from './endpoints'
import type { ApiErrorBody } from './types'
import { sanitizeInput } from '@/lib/sanitize'
import { logger } from '@/lib/logger'
import { getCsrfToken } from '@/lib/csrf'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 400

const RATE_LIMIT_MS = 300
let lastRequestAt = 0

export class ApiClientError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

function normalizeApiPath(path: string): string {
  if (!path) return path
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  if (path.startsWith('/api')) return path
  return `/api${path.startsWith('/') ? path : `/${path}`}`
}

function getBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  return base.replace(/\/$/, '')
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const base = getBaseUrl()
  const normalizedPath = normalizeApiPath(path)
  const url = new URL(`${base}${normalizedPath}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }
  return url.toString()
}

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestAt
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed))
  }
  lastRequestAt = Date.now()
}

function friendlyMessage(status: number, body?: ApiErrorBody): string {
  if (body?.error) return body.error
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 403) return 'You do not have permission to perform this action.'
  if (status === 404) return 'The requested resource was not found.'
  if (status >= 500) return 'Something went wrong on our end. Please try again.'
  return 'Unable to complete the request. Please try again.'
}

let refreshPromise: Promise<void> | null = null

async function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = fetch(buildUrl(ENDPOINTS.auth.refresh), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) throw new ApiClientError('Session expired', 401)
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions<TBody = unknown> {
  method?: HttpMethod
  body?: TBody
  params?: Record<string, string | number | boolean | undefined>
  signal?: AbortSignal
  skipAuth?: boolean
  retries?: number
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) return {} as T
  try {
    return JSON.parse(text) as T
  } catch {
    const hint =
      response.status >= 500
        ? 'Server error. Ensure the backend is running on port 3000 and Supabase keys in .env.local are correct.'
        : 'The server returned an unexpected response. Is the API running?'
    logger.error('Invalid JSON response', { status: response.status, bodySnippet: text.slice(0, 200) })
    throw new ApiClientError(hint, response.status)
  }
}

export async function apiRequest<TResponse, TBody = unknown>(
  path: string,
  options: RequestOptions<TBody> = {}
): Promise<TResponse> {
  const {
    method = 'GET',
    body,
    params,
    signal,
    skipAuth = false,
    retries = skipAuth ? 1 : MAX_RETRIES,
  } = options

  await waitForRateLimit()
  if (!path?.trim()) {
    throw new ApiClientError('Invalid API path', 0)
  }
  const cleanPath = sanitizeInput(path)
  const apiPath = normalizeApiPath(cleanPath)
  if (!apiPath.startsWith('/api') && !apiPath.startsWith('http')) {
    throw new ApiClientError('Invalid API path', 0)
  }
  const url = buildUrl(apiPath, params)
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  // Add CSRF token for state-changing requests if available
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !options.skipAuth) {
    try {
      const token = await getCsrfToken()
      if (token) headers['X-CSRF-Token'] = token
    } catch (err) {
      logger.warn('Failed to obtain CSRF token', err)
    }
  }

  let attempt = 0
  let lastError: unknown

  while (attempt < retries) {
    attempt += 1
    try {
      // Setup timeout controller (30s default)
      const controller = new AbortController()
      const timeoutMs = 30000
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      if (signal) {
        // Link external abort signal
        if (signal.aborted) controller.abort()
        else signal.addEventListener('abort', () => controller.abort(), { once: true })
      }

      let response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        credentials: 'include',
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (response.status === 401 && !skipAuth && !path.includes('/auth/')) {
        try {
          await refreshSession()
          response = await fetch(url, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            credentials: 'include',
            signal,
          })
        } catch {
          throw new ApiClientError('Your session has expired. Please sign in again.', 401)
        }
      }

      const data = await parseJson<TResponse & ApiErrorBody>(response)

      if (!response.ok) {
        const message = friendlyMessage(response.status, data)
        throw new ApiClientError(message, response.status)
      }

      return data as TResponse
    } catch (err) {
      lastError = err
      logger.warn('API request error', { path, attempt, err: (err as Error)?.message ?? String(err) })
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      if (err instanceof ApiClientError && err.status < 500) throw err
      if (err instanceof ApiClientError && (err.status === 503 || err.status === 502)) throw err
      if (attempt >= retries) break
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
    }
  }

  if (lastError instanceof ApiClientError) throw lastError
  logger.error('API request exhausted retries', { path, lastError })
  throw new ApiClientError('Network error. Check your connection and try again.', 0)
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T, B = unknown>(path: string, body?: B, options?: Omit<RequestOptions<B>, 'method' | 'body'>) =>
    apiRequest<T, B>(path, { ...options, method: 'POST', body }),
  put: <T, B = unknown>(path: string, body?: B, options?: Omit<RequestOptions<B>, 'method' | 'body'>) =>
    apiRequest<T, B>(path, { ...options, method: 'PUT', body }),
  patch: <T, B = unknown>(path: string, body?: B, options?: Omit<RequestOptions<B>, 'method' | 'body'>) =>
    apiRequest<T, B>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
}

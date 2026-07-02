const CSRF_KEY = 'csrf_token'

export async function getCsrfToken(): Promise<string> {
  try {
    const cached = sessionStorage.getItem(CSRF_KEY)
    if (cached) return cached
    const res = await fetch('/api/csrf-token', { credentials: 'include' })
    if (!res.ok) throw new Error('Failed to fetch CSRF token')
    const json = await res.json()
    if (json?.token) {
      sessionStorage.setItem(CSRF_KEY, json.token)
      return json.token
    }
    throw new Error('Malformed CSRF response')
  } catch (err) {
    // fall back to empty string — caller should handle absence
    return ''
  }
}

export function clearCsrfToken(): void {
  sessionStorage.removeItem(CSRF_KEY)
}

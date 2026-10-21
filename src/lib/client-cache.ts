'use client'

export type ThemeMode = 'hybrid' | 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'jiddah_theme_mode_v1'
const SETTINGS_CACHE_KEY = 'jiddah_school_settings_cache_v1'
const TERM_CACHE_KEY = 'jiddah_active_term_cache_v1'

let memorySettings: any = null
let inFlightSettingsPromise: Promise<any> | null = null

let memoryTerm: string | null = null
let inFlightTermPromise: Promise<string> | null = null

let memoryUnreadCount: { count: number; ts: number } | null = null
let inFlightUnreadPromise: Promise<number> | null = null

export async function safeJsonFetch<T = any>(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const res = await fetch(url, init)
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `Server returned status ${res.status}`,
      }
    }
    const json = await res.json()
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data: json,
        error: json?.error || json?.message || `Request failed (${res.status})`,
      }
    }
    return { ok: true, status: res.status, data: json }
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message || 'Network request failed',
    }
  }
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'hybrid'
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === 'hybrid' || raw === 'light' || raw === 'dark' || raw === 'system') {
      return raw
    }
  } catch {}
  return 'hybrid'
}

export function resolveEffectiveTheme(mode: ThemeMode): {
  mode: ThemeMode
  sidebarDark: boolean
  workspaceDark: boolean
} {
  if (mode === 'hybrid') {
    return { mode, sidebarDark: true, workspaceDark: false }
  }
  if (mode === 'light') {
    return { mode, sidebarDark: false, workspaceDark: false }
  }
  if (mode === 'dark') {
    return { mode, sidebarDark: true, workspaceDark: true }
  }
  // system / device default
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  return {
    mode: 'system',
    sidebarDark: prefersDark,
    workspaceDark: prefersDark,
  }
}

export function applyThemeModeToDom(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const resolved = resolveEffectiveTheme(mode)
  document.documentElement.dataset.themeMode = mode
  document.documentElement.dataset.sidebarTheme = resolved.sidebarDark ? 'dark' : 'light'
  document.documentElement.classList.toggle('dark', resolved.workspaceDark)
}

export function setStoredThemeMode(mode: ThemeMode) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {}
  applyThemeModeToDom(mode)
  window.dispatchEvent(new CustomEvent('jiddah:theme-changed', { detail: { mode } }))
}

export function getCachedSchoolSettingsSync(): any | null {
  if (memorySettings) return memorySettings
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY)
    if (raw) {
      memorySettings = JSON.parse(raw)
      return memorySettings
    }
  } catch {}
  return null
}

export function setCachedSchoolSettingsSync(data: any) {
  if (!data) return
  memorySettings = data
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data))
      localStorage.setItem(
        'jiddah_school_branding',
        JSON.stringify({
          theme_color: data.theme_color || '#0F4D25',
          school_name: data.school_name || data.name || 'Jiddah Islamic Schools',
        })
      )
    } catch {}
    window.dispatchEvent(new CustomEvent('jiddah:settings-updated', { detail: data }))
  }
}

export async function fetchSchoolSettingsCached(forceRefresh = false): Promise<any | null> {
  if (!forceRefresh && memorySettings) {
    return memorySettings
  }
  if (!forceRefresh && inFlightSettingsPromise) {
    return inFlightSettingsPromise
  }

  inFlightSettingsPromise = (async () => {
    const res = await safeJsonFetch('/api/settings/school')
    if (res.ok && res.data) {
      const payload = res.data.data || res.data.settings || res.data
      setCachedSchoolSettingsSync(payload)
      if (payload?.theme_mode && ['hybrid', 'light', 'dark', 'system'].includes(payload.theme_mode)) {
        // Only apply backend default if user hasn't explicitly set a local device preference
        if (typeof window !== 'undefined' && !localStorage.getItem(THEME_STORAGE_KEY)) {
          setStoredThemeMode(payload.theme_mode as ThemeMode)
        }
      }
      return payload
    }
    return getCachedSchoolSettingsSync()
  })().finally(() => {
    inFlightSettingsPromise = null
  })

  return inFlightSettingsPromise
}

export async function fetchActiveTermCached(): Promise<string> {
  if (memoryTerm) return memoryTerm
  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(TERM_CACHE_KEY)
      if (cached) {
        memoryTerm = cached
        return cached
      }
    } catch {}
  }
  if (inFlightTermPromise) return inFlightTermPromise

  inFlightTermPromise = (async () => {
    const res = await safeJsonFetch('/api/settings/terms/active')
    if (res.ok && res.data?.data) {
      const d = res.data.data
      const label = d.label || 'Active Term'
      const yearStr = String(d.academic_year || '')
      const formatted =
        yearStr && label.includes(yearStr)
          ? label
          : yearStr
          ? `${label}, ${yearStr}`
          : label
      memoryTerm = formatted
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(TERM_CACHE_KEY, formatted)
        } catch {}
      }
      return formatted
    }
    return 'Active Term'
  })().finally(() => {
    inFlightTermPromise = null
  })

  return inFlightTermPromise
}

export async function fetchUnreadCountCached(forceRefresh = false): Promise<number> {
  const now = Date.now()
  if (!forceRefresh && memoryUnreadCount && now - memoryUnreadCount.ts < 5000) {
    return memoryUnreadCount.count
  }
  if (!forceRefresh && inFlightUnreadPromise) {
    return inFlightUnreadPromise
  }

  inFlightUnreadPromise = (async () => {
    const res = await safeJsonFetch('/api/notifications/unread-count')
    if (res.ok && res.data) {
      const count = Number(res.data.count) || 0
      memoryUnreadCount = { count, ts: Date.now() }
      return count
    }
    return memoryUnreadCount?.count ?? 0
  })().finally(() => {
    inFlightUnreadPromise = null
  })

  return inFlightUnreadPromise
}

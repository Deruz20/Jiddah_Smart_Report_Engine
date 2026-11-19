const STALE_HARDCODED_STAMP_DATES = new Set([
  '29 NOV 2026',
  '29/11/2026',
  '2026-11-29',
  '26 OCT 2026',
  '26/10/2026',
  '2026-10-26',
  '24 APR 2026',
  '24/04/2026',
  '2026-04-24',
])

export function getLiveStampDateString(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const year = date.getFullYear()
  return `${day} ${month} ${year}`
}

export function getLiveHeaderDateString(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export function getLiveIsoDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isStaleHardcodedStampDate(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return true
  const trimmed = val.trim().toUpperCase()
  if (!trimmed) return true
  return STALE_HARDCODED_STAMP_DATES.has(trimmed)
}

export function formatStampDisplayDate(rawDate?: string | null): string {
  const trimmed = typeof rawDate === 'string' ? rawDate.trim() : ''
  if (!trimmed || isStaleHardcodedStampDate(trimmed)) {
    return getLiveStampDateString()
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = new Date(`${trimmed.slice(0, 10)}T12:00:00`)
    if (!Number.isNaN(d.getTime())) {
      return getLiveStampDateString(d)
    }
  }

  return trimmed.toUpperCase()
}

export function resolveEffectiveStampDate(override?: string | null, fallback?: string | null): string {
  if (override && !isStaleHardcodedStampDate(override)) {
    return formatStampDisplayDate(override)
  }
  if (fallback && !isStaleHardcodedStampDate(fallback)) {
    return formatStampDisplayDate(fallback)
  }
  return getLiveStampDateString()
}

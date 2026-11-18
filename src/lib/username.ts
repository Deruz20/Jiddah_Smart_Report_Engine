import type { SupabaseClient } from '@supabase/supabase-js'

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{2,64}$/

export function normalizeUsername(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
}

export function validateUsernameFormat(username: string): { valid: boolean; error?: string } {
  const trimmed = normalizeUsername(username)
  if (!trimmed) {
    return { valid: false, error: 'Username is required.' }
  }
  if (trimmed.includes('@')) {
    return { valid: false, error: 'Username cannot contain the @ symbol.' }
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'Username must be 2–64 characters using letters, numbers, dots, underscores, or hyphens.',
    }
  }
  return { valid: true }
}

export function deriveBaseUsernameFromEmail(email: string, fallbackSuffix = 'staff'): string {
  const prefix = String(email || '')
    .trim()
    .toLowerCase()
    .split('@')[0]
    .replace(/[^a-z0-9._-]+/g, '')
    .slice(0, 52)
  if (prefix.length >= 2) return prefix
  return `${prefix || 'u'}_${fallbackSuffix.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'staff'}`
}

/**
 * Escapes PostgREST ILIKE pattern wildcards (% and _) so exact case-insensitive lookup never matches patterns.
 */
export function escapeIlikePattern(val: string): string {
  return val.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

export async function findTeacherByUsername(
  supabaseAdmin: SupabaseClient,
  rawUsername: string
): Promise<{
  id: string
  email: string
  username: string | null
  status: string | null
  role: string | null
  auth_user_id: string | null
} | null> {
  const candidate = normalizeUsername(rawUsername)
  if (!validateUsernameFormat(candidate).valid) return null

  const { data, error } = await supabaseAdmin
    .from('teachers')
    .select('id, email, username, status, role, auth_user_id')
    .ilike('username', escapeIlikePattern(candidate))
    .limit(5)

  if (error || !Array.isArray(data)) return null

  const exact = data.find(
    (row: any) => typeof row?.username === 'string' && row.username.trim().toLowerCase() === candidate
  )
  return (exact as any) || null
}

export async function isUsernameTaken(
  supabaseAdmin: SupabaseClient,
  rawUsername: string,
  excludeTeacherId?: string
): Promise<boolean> {
  const candidate = normalizeUsername(rawUsername)
  const { data, error } = await supabaseAdmin
    .from('teachers')
    .select('id, username')
    .ilike('username', escapeIlikePattern(candidate))
    .limit(5)

  if (error || !Array.isArray(data)) return false

  return data.some(
    (row: any) =>
      row.id !== excludeTeacherId &&
      typeof row?.username === 'string' &&
      row.username.trim().toLowerCase() === candidate
  )
}

export async function resolveUniqueUsernameFromEmail(
  supabaseAdmin: SupabaseClient,
  email: string,
  excludeTeacherId?: string
): Promise<string> {
  const base = deriveBaseUsernameFromEmail(email)
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}_${i + 1}`
    const taken = await isUsernameTaken(supabaseAdmin, candidate, excludeTeacherId)
    if (!taken) return candidate
  }
  return `${base}_${Date.now().toString(36).slice(-4)}`
}

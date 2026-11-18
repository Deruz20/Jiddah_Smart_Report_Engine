import type { SupabaseClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{2,64}$/
const USERNAME_CACHE_FILE = path.join(os.tmpdir(), 'jiddah_teacher_username_directory_v1.json')

export interface CachedTeacherUsernameEntry {
  id: string
  email: string
  username: string
  status: string
  role?: string | null
  auth_user_id?: string | null
  updatedAt: number
}

const memoryUsernameDirectory = new Map<string, CachedTeacherUsernameEntry>()

function loadDiskUsernameDirectory(): Map<string, CachedTeacherUsernameEntry> {
  try {
    if (fs.existsSync(USERNAME_CACHE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(USERNAME_CACHE_FILE, 'utf8'))
      if (raw && typeof raw === 'object') {
        for (const [k, v] of Object.entries(raw)) {
          if (v && typeof v === 'object' && typeof (v as any).email === 'string') {
            memoryUsernameDirectory.set(k.toLowerCase(), v as CachedTeacherUsernameEntry)
          }
        }
      }
    }
  } catch {
    // Ignore disk cache read errors
  }
  return memoryUsernameDirectory
}

function saveDiskUsernameDirectory(): void {
  try {
    const obj: Record<string, CachedTeacherUsernameEntry> = {}
    for (const [k, v] of memoryUsernameDirectory.entries()) {
      obj[k] = v
    }
    fs.writeFileSync(USERNAME_CACHE_FILE, JSON.stringify(obj), 'utf8')
  } catch {
    // Ignore disk cache write errors in read-only serverless environments
  }
}

export function rememberTeacherUsernameMapping(row: {
  id?: string | null
  email?: string | null
  username?: string | null
  status?: string | null
  role?: string | null
  auth_user_id?: string | null
} | null | undefined): void {
  if (!row || !row.email) return
  const email = String(row.email).trim().toLowerCase()
  if (!email.includes('@')) return
  loadDiskUsernameDirectory()

  const id = String(row.id || '')
  const status = String(row.status || 'active').trim().toLowerCase()
  const username = normalizeUsername(row.username || email.split('@')[0])
  if (!username) return

  // Remove any previous username entry for the same teacher id or email if they renamed their username
  for (const [existingKey, existingVal] of memoryUsernameDirectory.entries()) {
    if ((id && existingVal.id === id) || existingVal.email === email) {
      if (existingKey !== username) {
        memoryUsernameDirectory.delete(existingKey)
      }
    }
  }

  memoryUsernameDirectory.set(username, {
    id,
    email,
    username,
    status,
    role: row.role ?? null,
    auth_user_id: row.auth_user_id ?? null,
    updatedAt: Date.now(),
  })
  saveDiskUsernameDirectory()
}

export function rememberTeacherUsernameMappings(rows: Array<any> | null | undefined): void {
  if (!Array.isArray(rows)) return
  for (const r of rows) {
    rememberTeacherUsernameMapping(r)
  }
}

export function lookupCachedTeacherByUsername(rawUsername: string): CachedTeacherUsernameEntry | null {
  const candidate = normalizeUsername(rawUsername)
  if (!candidate) return null
  loadDiskUsernameDirectory()
  return memoryUsernameDirectory.get(candidate) || null
}

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

  // 1. Direct query against public.teachers (works with service_role or authenticated session)
  const { data, error } = await supabaseAdmin
    .from('teachers')
    .select('id, email, username, status, role, auth_user_id')
    .ilike('username', escapeIlikePattern(candidate))
    .limit(5)

  if (!error && Array.isArray(data) && data.length > 0) {
    const exact = data.find(
      (row: any) => typeof row?.username === 'string' && row.username.trim().toLowerCase() === candidate
    )
    if (exact) {
      rememberTeacherUsernameMapping(exact as any)
      return exact as any
    }
  }

  // 2. Try SECURITY DEFINER RPC `resolve_login_email` (works for anon even when RLS blocks direct table select)
  try {
    const { data: rpcEmail, error: rpcErr } = await supabaseAdmin.rpc('resolve_login_email', {
      p_identifier: candidate,
    })
    if (!rpcErr && typeof rpcEmail === 'string' && rpcEmail.trim().includes('@')) {
      const resolved = {
        id: '',
        email: rpcEmail.trim().toLowerCase(),
        username: candidate,
        status: 'active',
        role: null,
        auth_user_id: null,
      }
      rememberTeacherUsernameMapping(resolved)
      return resolved
    }
  } catch {
    // RPC may not exist yet on unmigrated DB; continue to fallback
  }

  // 3. Fallback: check verified server-side username directory cache
  const cached = lookupCachedTeacherByUsername(candidate)
  if (cached && cached.email) {
    return {
      id: cached.id,
      email: cached.email,
      username: cached.username,
      status: cached.status,
      role: cached.role ?? null,
      auth_user_id: cached.auth_user_id ?? null,
    }
  }

  // 4. Fallback: match email local-part prefix if direct table select is permitted
  const { data: prefixRows, error: prefixErr } = await supabaseAdmin
    .from('teachers')
    .select('id, email, username, status, role, auth_user_id')
    .ilike('email', `${escapeIlikePattern(candidate)}@%`)
    .limit(5)

  if (!prefixErr && Array.isArray(prefixRows) && prefixRows.length > 0) {
    const prefixMatch = prefixRows.find(
      (row: any) =>
        typeof row?.email === 'string' &&
        row.email.trim().toLowerCase().split('@')[0] === candidate &&
        (!row.username || row.username.trim().toLowerCase() === candidate)
    )
    if (prefixMatch) {
      rememberTeacherUsernameMapping(prefixMatch as any)
      return prefixMatch as any
    }
  }

  return null
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

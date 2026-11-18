import { mapAuthError } from '@/lib/auth-errors'
import {
  findTeacherByUsername,
  escapeIlikePattern,
  rememberTeacherUsernameMapping,
  normalizeUsername,
} from '@/lib/username'
import { createAdminClient, createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { corsPreflight, withCors } from '@/lib/api-cors'

const INVALID_CREDENTIALS_MSG = 'Invalid login credentials'
const BLOCKED_STATUSES = new Set(['inactive', 'suspended', 'deactivated', 'banned'])

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request) ?? new NextResponse(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const body = await request.json()
    const rawIdentifier = String(body?.identifier ?? body?.email ?? '').trim()
    const password = String(body?.password ?? '')

    if (!rawIdentifier || !password) {
      return withCors(
        request,
        NextResponse.json({ error: 'Email or username and password are required' }, { status: 400 })
      )
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const supabaseAdmin = createAdminClient(cookieStore)

    let resolvedEmail = ''
    let resolvedUsername: string | null = null

    if (rawIdentifier.includes('@')) {
      resolvedEmail = rawIdentifier.toLowerCase()
      const { data: teacherByEmail } = await supabaseAdmin
        .from('teachers')
        .select('id, email, username, status')
        .ilike('email', escapeIlikePattern(resolvedEmail))
        .maybeSingle()

      if (teacherByEmail) {
        const st = String(teacherByEmail.status || 'active').toLowerCase()
        if (BLOCKED_STATUSES.has(st)) {
          return withCors(
            request,
            NextResponse.json({ error: INVALID_CREDENTIALS_MSG }, { status: 401 })
          )
        }
        resolvedUsername = teacherByEmail.username || null
        rememberTeacherUsernameMapping(teacherByEmail)
      }
    } else {
      // 1. Primary: call SECURITY DEFINER RPC `resolve_login_email` so anon login resolves username even under RLS
      let rpcResolvedEmail: string | null = null
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('resolve_login_email', {
          p_identifier: rawIdentifier,
        })
        if (!rpcError && typeof rpcData === 'string' && rpcData.trim().includes('@')) {
          rpcResolvedEmail = rpcData.trim().toLowerCase()
        }
      } catch {
        // Fallback to findTeacherByUsername below
      }

      if (rpcResolvedEmail) {
        resolvedEmail = rpcResolvedEmail
        resolvedUsername = normalizeUsername(rawIdentifier)
      } else {
        // 2. Fallback: findTeacherByUsername (uses service_role/admin client + verified server username directory cache)
        const teacher = await findTeacherByUsername(supabaseAdmin, rawIdentifier)
        const st = String(teacher?.status || 'active').toLowerCase()
        if (!teacher || !teacher.email || BLOCKED_STATUSES.has(st)) {
          // Generic error prevents username enumeration and keeps inactive accounts dark
          return withCors(
            request,
            NextResponse.json({ error: INVALID_CREDENTIALS_MSG }, { status: 401 })
          )
        }
        resolvedEmail = teacher.email.trim().toLowerCase()
        resolvedUsername = teacher.username || normalizeUsername(rawIdentifier)
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    })

    if (error) {
      const mapped = mapAuthError(error)
      const safeError = mapped.status === 401 ? INVALID_CREDENTIALS_MSG : mapped.message
      return withCors(
        request,
        NextResponse.json({ error: safeError }, { status: mapped.status })
      )
    }

    const user = data.user

    // Now that `supabase` is authenticated as `user`, check status and sync username mapping
    try {
      const { data: authedTeacher } = await supabase
        .from('teachers')
        .select('id, email, username, status, role, auth_user_id')
        .or(`auth_user_id.eq.${user.id},id.eq.${user.id}${user.email ? `,email.ilike.${escapeIlikePattern(user.email)}` : ''}`)
        .maybeSingle()

      if (authedTeacher) {
        const st = String(authedTeacher.status || 'active').toLowerCase()
        if (BLOCKED_STATUSES.has(st)) {
          await supabase.auth.signOut().catch(() => {})
          return withCors(
            request,
            NextResponse.json({ error: INVALID_CREDENTIALS_MSG }, { status: 401 })
          )
        }
        if (authedTeacher.username) {
          resolvedUsername = authedTeacher.username
        }
        rememberTeacherUsernameMapping(authedTeacher)
      }
    } catch {
      // Non-fatal post-login sync
    }

    return withCors(
      request,
      NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          username: resolvedUsername,
          name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Admin',
          role: user.user_metadata?.role ?? 'admin',
          onboarding_completed: Boolean(user.user_metadata?.onboarding_completed),
        },
      })
    )
  } catch (err) {
    const mapped = mapAuthError(err)
    const safeError = mapped.status === 401 ? INVALID_CREDENTIALS_MSG : mapped.message
    return withCors(
      request,
      NextResponse.json({ error: safeError }, { status: mapped.status })
    )
  }
}

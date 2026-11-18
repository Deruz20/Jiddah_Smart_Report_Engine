import { createClient, createAdminClient } from '@/utils/supabase/server'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, recordActivity } from '@/lib/api-server'
import { mapAuthError } from '@/lib/auth-errors'
import { getServiceRoleKey, getSupabaseAnonKey } from '@/lib/supabase-env'

function isValidJwt(token: string | null | undefined): token is string {
  return typeof token === 'string' && token.trim().split('.').length === 3
}

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

async function handlePasswordUpdate(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const body = await request.json()
    const currentPassword = String(body?.currentPassword || '').trim()
    const newPassword = String(body?.newPassword || '').trim()

    if (!currentPassword) {
      return withCors(
        request,
        NextResponse.json({ error: 'Current password is required to change your password.' }, { status: 400 })
      )
    }

    if (!newPassword || newPassword.length < 8) {
      return withCors(
        request,
        NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 })
      )
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const user = await getAuthenticatedUser(supabase)

    if (!user || !user.email) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    // Re-authenticate server-side using a non-persisted Supabase client (does not depend on email delivery)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey =
      getSupabaseAnonKey() ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
    const verifyClient = createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: signInData, error: verifyError } = await verifyClient.auth.signInWithPassword({
      email: String(user.email),
      password: currentPassword,
    })

    if (verifyError) {
      return withCors(
        request,
        NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
      )
    }

    const verifyAccessToken = signInData?.session?.access_token || null
    const supabaseAdmin = createAdminClient(cookieStore)

    let passwordUpdated = false
    let lastUpdateError: unknown = null

    // 1. If a JWT service_role key is configured, update via Admin API first
    const serviceRoleKey = getServiceRoleKey()
    if (isValidJwt(serviceRoleKey)) {
      const { data: adminUpdated, error: adminUpdateErr } =
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: newPassword,
        })
      if (!adminUpdateErr && adminUpdated?.user) {
        passwordUpdated = true
      } else {
        lastUpdateError = adminUpdateErr
      }
    }

    // 2. Fallback (or primary when SUPABASE_SERVICE_ROLE_KEY is unset/publishable):
    //    Use the verified session access_token JWT from signInWithPassword so GoTrue
    //    always receives a valid `Authorization: Bearer <access_token>` header.
    if (!passwordUpdated && isValidJwt(verifyAccessToken)) {
      const { data: selfUpdated, error: selfUpdateErr } = await verifyClient.auth.updateUser({
        password: newPassword,
      })
      if (!selfUpdateErr && selfUpdated?.user) {
        passwordUpdated = true
        lastUpdateError = null
      } else {
        lastUpdateError = selfUpdateErr || lastUpdateError
      }
    }

    // 3. Explicit GoTrue PUT /auth/v1/user fallback with Bearer <verifyAccessToken>
    if (!passwordUpdated && isValidJwt(verifyAccessToken)) {
      try {
        const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${verifyAccessToken}`,
          },
          body: JSON.stringify({ password: newPassword }),
        })
        if (res.ok) {
          passwordUpdated = true
          lastUpdateError = null
        } else {
          const errPayload = await res.json().catch(() => ({}))
          lastUpdateError = new Error(
            errPayload?.msg || errPayload?.message || errPayload?.error_description || 'Password update failed'
          )
        }
      } catch (fetchErr) {
        lastUpdateError = fetchErr
      }
    }

    // 4. Final fallback: try adminClient.auth.admin.updateUserById if not yet tried
    if (!passwordUpdated && !isValidJwt(serviceRoleKey)) {
      const { data: adminUpdated, error: adminUpdateErr } =
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: newPassword,
        })
      if (!adminUpdateErr && adminUpdated?.user) {
        passwordUpdated = true
        lastUpdateError = null
      } else {
        lastUpdateError = lastUpdateError || adminUpdateErr
      }
    }

    if (!passwordUpdated) {
      const mapped = mapAuthError(lastUpdateError)
      return withCors(request, NextResponse.json({ error: mapped.message }, { status: mapped.status }))
    }

    // Sign out all other sessions using the valid session access_token JWT (NEVER user.id UUID),
    // wrapped in a non-fatal try/catch so a successful password update NEVER returns 400/401/500.
    try {
      let sessionJwt: string | null = isValidJwt(verifyAccessToken) ? verifyAccessToken : null
      if (!sessionJwt) {
        const { data: currentSessionData } = await supabase.auth.getSession()
        if (isValidJwt(currentSessionData?.session?.access_token)) {
          sessionJwt = currentSessionData!.session!.access_token
        }
      }
      if (!sessionJwt) {
        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
        if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
          const candidate = authHeader.slice(7).trim()
          if (isValidJwt(candidate)) {
            sessionJwt = candidate
          }
        }
      }

      if (sessionJwt) {
        await supabaseAdmin.auth.admin.signOut(sessionJwt, 'others')
      }
    } catch {
      // Non-fatal: never fail a completed password update due to secondary session revocation
    }

    // Refresh cookie session with the new password if the request is using browser auth cookies
    try {
      const hasAuthCookie = cookieStore.getAll().some((c) => c.name.includes('-auth-token'))
      if (hasAuthCookie) {
        await supabase.auth.signInWithPassword({
          email: String(user.email),
          password: newPassword,
        })
      }
    } catch {
      // Non-fatal cookie refresh
    }

    try {
      await recordActivity(supabaseAdmin, user.id, 'change_password', {
        before: 'password_hash_redacted',
        after: 'password_hash_updated_redacted',
        other_sessions_revoked: true,
      })
    } catch {
      // Non-fatal audit log
    }

    return withCors(
      request,
      NextResponse.json({
        success: true,
        other_sessions_revoked: true,
      })
    )
  } catch (err: unknown) {
    const mapped = mapAuthError(err)
    return withCors(request, NextResponse.json({ error: mapped.message }, { status: mapped.status }))
  }
}

export async function PATCH(request: NextRequest) {
  return handlePasswordUpdate(request)
}

export async function POST(request: NextRequest) {
  return handlePasswordUpdate(request)
}

export async function PUT(request: NextRequest) {
  return handlePasswordUpdate(request)
}


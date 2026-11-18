import { createClient, createAdminClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, recordActivity } from '@/lib/api-server'
import { getSupabaseAnonKey } from '@/lib/supabase-env'

function isValidJwt(token: string | null | undefined): token is string {
  return typeof token === 'string' && token.trim().split('.').length === 3
}

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

async function handleRevokeOtherSessions(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const user = await getAuthenticatedUser(supabase)

    if (!user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    // Extract active session access_token via getSession() or Authorization Bearer header
    let accessToken: string | null = null
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (isValidJwt(sessionData?.session?.access_token)) {
        accessToken = sessionData!.session!.access_token
      }
    } catch {
      // Continue to header fallback
    }

    if (!accessToken) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const candidate = authHeader.slice(7).trim()
        if (isValidJwt(candidate)) {
          accessToken = candidate
        }
      }
    }

    const supabaseAdmin = createAdminClient(cookieStore)

    if (isValidJwt(accessToken)) {
      try {
        const { error: adminSignOutErr } = await supabaseAdmin.auth.admin.signOut(accessToken, 'others')
        if (adminSignOutErr) {
          // Explicit GoTrue /logout?scope=others fallback with Bearer <accessToken>
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseAnonKey =
            getSupabaseAnonKey() || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
          if (supabaseUrl && supabaseAnonKey) {
            await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/logout?scope=others`, {
              method: 'POST',
              headers: {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${accessToken}`,
              },
            }).catch(() => {})
          }
        }
      } catch {
        // Non-fatal if GoTrue reports no other active sessions
      }
    } else {
      try {
        await supabase.auth.signOut({ scope: 'others' })
      } catch {
        // Non-fatal fallback
      }
    }

    try {
      await recordActivity(supabaseAdmin, user.id, 'sign_out_other_sessions', {
        scope: 'others',
        revoked_at: new Date().toISOString(),
      })
    } catch {
      // Non-fatal audit log
    }

    return withCors(request, NextResponse.json({ success: true, scope: 'others' }))
  } catch (err: any) {
    console.error('settings/user/sessions exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}

export async function POST(request: NextRequest) {
  return handleRevokeOtherSessions(request)
}

export async function DELETE(request: NextRequest) {
  return handleRevokeOtherSessions(request)
}


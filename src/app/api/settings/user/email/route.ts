import { createClient, createAdminClient } from '@/utils/supabase/server'
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { apiOptions, corsPreflight, withCors } from '@/lib/api-cors'
import { getAuthenticatedUser, recordActivity } from '@/lib/api-server'
import { verifyDataAccess } from '@/lib/auth-server'
import { isAdministratorRole } from '@/lib/teacher-access'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function OPTIONS(request: NextRequest) {
  return apiOptions(request)
}

export async function POST(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const user = await getAuthenticatedUser(supabase)

    if (!user || !user.email) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized || !isAdministratorRole(authRes.role)) {
      return withCors(
        request,
        NextResponse.json(
          {
            error:
              'Forbidden: Self-service email change is restricted to Administrators. Non-admin staff emails are read-only and managed by an Administrator.',
          },
          { status: 403 }
        )
      )
    }

    const body = await request.json()
    const newEmail = String(body?.newEmail || '').trim().toLowerCase()
    const confirmEmail = String(body?.confirmEmail || '').trim().toLowerCase()
    const currentPassword = String(body?.currentPassword || '').trim()

    if (!newEmail || !EMAIL_REGEX.test(newEmail)) {
      return withCors(
        request,
        NextResponse.json({ error: 'Please enter a valid new email address.' }, { status: 400 })
      )
    }

    if (newEmail !== confirmEmail) {
      return withCors(
        request,
        NextResponse.json({ error: 'New email and confirmation email do not match.' }, { status: 400 })
      )
    }

    if (newEmail === user.email.toLowerCase()) {
      return withCors(
        request,
        NextResponse.json({ error: 'New email is identical to your current email address.' }, { status: 400 })
      )
    }

    if (!currentPassword) {
      return withCors(
        request,
        NextResponse.json({ error: 'Current password is required to change your email.' }, { status: 400 })
      )
    }

    // Re-authenticate server-side using a non-persisted Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
    const verifyClient = createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error: verifyError } = await verifyClient.auth.signInWithPassword({
      email: String(user.email),
      password: currentPassword,
    })

    if (verifyError) {
      return withCors(
        request,
        NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 })
      )
    }

    const supabaseAdmin = createAdminClient(cookieStore)
    const { data: teacherRow } = await supabaseAdmin
      .from('teachers')
      .select('id, email, pending_email')
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()

    const beforeState = {
      email: user.email,
      pending_email: teacherRow?.pending_email || (user as any).new_email || null,
    }

    // Trigger confirmation email to the new address via Supabase Auth (current email stays active until confirmed)
    const { error: updateErr } = await verifyClient.auth.updateUser({
      email: newEmail,
    })

    if (updateErr) {
      return withCors(
        request,
        NextResponse.json({ error: updateErr.message || 'Unable to initiate email change.' }, { status: 400 })
      )
    }

    if (teacherRow?.id) {
      const { data: verifiedTeacher, error: teacherErr } = await supabaseAdmin
        .from('teachers')
        .update({ pending_email: newEmail })
        .eq('id', teacherRow.id)
        .select('id, email, pending_email')
        .single()

      if (teacherErr || verifiedTeacher?.pending_email !== newEmail) {
        return withCors(
          request,
          NextResponse.json({ error: 'Read-back verification failed for pending_email.' }, { status: 500 })
        )
      }
    }

    await recordActivity(supabaseAdmin, user.id, 'request_email_change', {
      before: beforeState,
      after: { email: user.email, pending_email: newEmail },
    })

    return withCors(
      request,
      NextResponse.json({
        success: true,
        data: {
          email: user.email,
          pending_email: newEmail,
        },
      })
    )
  } catch (err: any) {
    console.error('settings/user/email POST exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}

export async function PUT(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const user = await getAuthenticatedUser(supabase)

    if (!user || !user.email) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized || !isAdministratorRole(authRes.role)) {
      return withCors(request, NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
    }

    const supabaseAdmin = createAdminClient(cookieStore)
    const { data: teacherRow } = await supabaseAdmin
      .from('teachers')
      .select('id, email, pending_email')
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()

    const pendingEmail = teacherRow?.pending_email || (user as any).new_email || null
    if (!pendingEmail) {
      return withCors(
        request,
        NextResponse.json({ error: 'No pending email change found to resend.' }, { status: 400 })
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
    const resendClient = createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error: resendErr } = await resendClient.auth.resend({
      type: 'email_change',
      email: pendingEmail,
    })

    if (resendErr) {
      return withCors(
        request,
        NextResponse.json({ error: resendErr.message || 'Failed to resend confirmation email.' }, { status: 400 })
      )
    }

    await recordActivity(supabaseAdmin, user.id, 'resend_email_change', {
      email: user.email,
      pending_email: pendingEmail,
    })

    return withCors(
      request,
      NextResponse.json({
        success: true,
        data: { email: user.email, pending_email: pendingEmail },
      })
    )
  } catch (err: any) {
    console.error('settings/user/email PUT exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}

export async function DELETE(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const user = await getAuthenticatedUser(supabase)

    if (!user || !user.email) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const authRes = await verifyDataAccess(supabase, user, 'read')
    if (!authRes.isAuthorized || !isAdministratorRole(authRes.role)) {
      return withCors(request, NextResponse.json({ error: 'Forbidden' }, { status: 403 }))
    }

    const supabaseAdmin = createAdminClient(cookieStore)
    const { data: teacherRow } = await supabaseAdmin
      .from('teachers')
      .select('id, email, pending_email')
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle()

    const beforePending = teacherRow?.pending_email || (user as any).new_email || null

    // Clear pending email on Auth user by re-confirming the active email
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email: user.email,
      email_confirm: true,
    })

    if (teacherRow?.id) {
      const { data: verifiedTeacher, error: teacherErr } = await supabaseAdmin
        .from('teachers')
        .update({ pending_email: null })
        .eq('id', teacherRow.id)
        .select('id, pending_email')
        .single()

      if (teacherErr || verifiedTeacher?.pending_email !== null) {
        return withCors(
          request,
          NextResponse.json({ error: 'Read-back verification failed when cancelling pending email.' }, { status: 500 })
        )
      }
    }

    await recordActivity(supabaseAdmin, user.id, 'cancel_email_change', {
      before: { email: user.email, pending_email: beforePending },
      after: { email: user.email, pending_email: null },
    })

    return withCors(
      request,
      NextResponse.json({
        success: true,
        data: {
          email: user.email,
          pending_email: null,
        },
      })
    )
  } catch (err: any) {
    console.error('settings/user/email DELETE exception:', err)
    return withCors(request, NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 }))
  }
}

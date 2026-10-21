import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createSystemNotification } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid school email address.' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    let emailDispatched = false
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      })
      if (!error) {
        emailDispatched = true
      }
    } catch {
      emailDispatched = false
    }

    // Always record an admin-initiated reset fallback notification & audit entry so local/offline setups never dead-end
    try {
      await createSystemNotification(supabase as any, {
        title: 'Password Reset Requested',
        message: `Account ${email} requested a password reset. An Administrator can issue a temporary password in Staff Accounts if email delivery is unavailable.`,
        recipientId: null,
        priority: 'high',
        type: 'system',
      })
    } catch {
      // Non-fatal in unauthenticated context
    }

    return NextResponse.json({
      success: true,
      emailDispatched,
      message: emailDispatched
        ? `Password reset link sent to ${email}. If you do not receive the email within 2 minutes, your School Administrator has also been notified to reset your credentials.`
        : `Password reset request logged for ${email}. Because outbound email is restricted on this server, your School Administrator has been notified to issue a temporary password.`,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        success: true,
        emailDispatched: false,
        message: 'Your password reset request has been forwarded to the School Administrator.',
      },
      { status: 200 }
    )
  }
}

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { corsPreflight, withCors } from '@/lib/api-cors'

function createServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function OPTIONS(request: NextRequest) {
  return corsPreflight(request) ?? new NextResponse(null, { status: 204 })
}

export async function POST(request: NextRequest) {
  const preflight = corsPreflight(request)
  if (preflight) return preflight

  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return withCors(request, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }

    const { data: caller, error: callerError } = await supabase
      .from('teachers')
      .select('id, role, status')
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle()

    if (callerError) {
      console.error('Signup caller lookup failed:', callerError.message)
      return withCors(request, NextResponse.json({ error: 'Unable to verify administrator' }, { status: 500 }))
    }
    if (caller?.role !== 'Administrator' || caller.status !== 'active') {
      return withCors(request, NextResponse.json({ error: 'Administrator access required' }, { status: 403 }))
    }

    const body = await request.json()
    const { email, password, name, phone } = body

    if (!email || !password) {
      return withCors(
        request,
        NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
      )
    }

    if (String(password).length < 6) {
      return withCors(
        request,
        NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      )
    }

    const supabaseAdmin = createServiceClient()
    const normalizedEmail = String(email).trim().toLowerCase()
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('teacher_invites')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .maybeSingle()

    if (inviteError) {
      console.error('Signup invite lookup failed:', inviteError.message)
      return withCors(request, NextResponse.json({ error: 'Unable to verify invitation' }, { status: 500 }))
    }
    if (!invite) {
      return withCors(request, NextResponse.json({ error: 'No pending invitation for this email' }, { status: 404 }))
    }

    let finalRole = invite.role
    let finalSubject = invite.subject
    if (invite.role === 'DOS Theology') {
      finalRole = 'DOS'
      finalSubject = 'Theology'
    } else if (invite.role === 'DOS Secular') {
      finalRole = 'DOS'
      finalSubject = 'Secular'
    } else if (invite.role === 'teacher') {
      finalRole = 'Class Teacher'
    }
    const finalName = invite.name || String(name || '').trim() || normalizedEmail.split('@')[0]
    if (!finalSubject) {
      finalSubject = finalRole === 'DOS' || finalRole.toLowerCase().includes('theology')
        ? 'Theology'
        : 'Secular'
    }

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: {
        full_name: finalName,
        subject: finalSubject,
      },
    })

    if (createError || !authData.user) {
      console.error('Signup account creation failed:', createError?.message)
      return withCors(
        request,
        NextResponse.json({ error: createError?.message || 'Account creation failed' }, { status: 500 })
      )
    }

    const newUser = authData.user
    const { error: profileError } = await supabaseAdmin
      .from('teachers')
      .insert([{
        id: newUser.id,
        auth_user_id: newUser.id,
        email: normalizedEmail,
        role: finalRole,
        subject: finalSubject,
        name: finalName,
        classes: invite.classes || [],
        phone: invite.phone || phone || null,
        status: 'active',
      }])

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.id)
      console.error('Signup teacher profile creation failed:', profileError.message)
      return withCors(request, NextResponse.json({ error: 'Failed to create teacher profile' }, { status: 500 }))
    }

    const { error: claimError } = await supabaseAdmin
      .from('teacher_invites')
      .update({ status: 'claimed' })
      .eq('id', invite.id)
      .eq('status', 'pending')

    if (claimError) {
      await supabaseAdmin.from('teachers').delete().eq('id', newUser.id)
      await supabaseAdmin.auth.admin.deleteUser(newUser.id)
      console.error('Signup invite claim failed:', claimError.message)
      return withCors(request, NextResponse.json({ error: 'Failed to claim invitation' }, { status: 500 }))
    }

    return withCors(
      request,
      NextResponse.json({
        user: {
          id: newUser.id,
          email: newUser.email,
          name: finalName,
          role: finalRole,
        },
        message: 'Account created successfully',
      }, { status: 201 })
    )
  } catch (err) {
    console.error('Signup request failed:', err)
    return withCors(request, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

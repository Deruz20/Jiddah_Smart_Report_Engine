import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, phone } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // Use Service Role to bypass RLS and create user
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Look up teacher_invites where email matches and status='pending'
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('teacher_invites')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      // Generic error so we don't reveal email existence
      return NextResponse.json({ error: 'No pending invitation for this email' }, { status: 404 });
    }

    let finalRole = invite.role;
    let finalSubject = invite.subject;
    if (invite.role === 'DOS Theology') {
      finalRole = 'DOS';
      finalSubject = 'Theology';
    } else if (invite.role === 'DOS Secular') {
      finalRole = 'DOS';
      finalSubject = 'Secular';
    }

    // 2. Create the auth.users account
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: finalRole,
        subject: finalSubject,
        name: invite.name
      }
    });

    if (authError || !authData.user) {
      console.error('Auth Creation Error:', authError);
      return NextResponse.json({ error: authError?.message || 'Failed to create account' }, { status: 500 });
    }

    const userId = authData.user.id;

    // 3. Create the teachers profile row using the invite details
    // Ignore any frontend-submitted profile details except phone if not provided in invite
    const { error: profileError } = await supabaseAdmin
      .from('teachers')
      .insert([
        {
          id: userId,
          email: invite.email,
          role: finalRole,
          subject: finalSubject,
          name: invite.name,
          classes: invite.classes || [],
          phone: invite.phone || phone || null,
          status: 'active'
        }
      ]);

    if (profileError) {
      console.error('Profile Creation Error:', profileError);
      // Cleanup auth account to prevent partial registration
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    // 4. Mark invite as claimed
    await supabaseAdmin
      .from('teacher_invites')
      .update({ status: 'claimed' })
      .eq('id', invite.id);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Registration Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

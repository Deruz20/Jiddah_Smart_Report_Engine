import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    // Get current session user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Look up caller's role freshly from the teachers table
    const { data: callerProfile, error: callerError } = await supabase
      .from('teachers')
      .select('id, role, subject')
      .eq('email', user.email)
      .single();

    // If caller is not in teachers table, check if they are the bootstrap Admin
    // Typically the bootstrap admin has 'admin' in user_metadata and isn't in teachers
    let callerRole = callerProfile?.role;
    let callerSubject = callerProfile?.subject;
    const callerId = callerProfile?.id || user.id; // Use auth user.id as fallback if no teacher row

    if (!callerProfile && user.user_metadata?.role === 'admin') {
      callerRole = 'admin';
    }

    if (!callerRole) {
      return NextResponse.json({ error: 'Caller role not found' }, { status: 403 });
    }

    const body = await req.json();
    const { email, name, phone, classes, role: requestedRole, subject: requestedSubject } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    let finalRole = requestedRole;
    let finalSubject = requestedSubject;

    if (callerRole === 'admin' || callerRole === 'Administrator') {
      // Admin: freely selectable role and subject, but must be provided
      if (!finalRole || !finalSubject) {
        return NextResponse.json({ error: 'Role and Department/Track are required for Admin invites' }, { status: 400 });
      }
    } else if (callerRole.startsWith('DOS') || callerRole === 'Head Teacher') {
      // DOS Caller
      if (requestedRole && requestedRole.toUpperCase().includes('DOS')) {
        return NextResponse.json({ error: 'A DOS cannot invite another DOS' }, { status: 403 });
      }
      if (requestedRole === 'Head Teacher' || requestedRole === 'Administrator' || requestedRole === 'Deputy Head Teacher') {
        return NextResponse.json({ error: 'A DOS cannot invite administrative roles' }, { status: 403 });
      }
      if (requestedSubject && requestedSubject !== callerSubject) {
        return NextResponse.json({ error: 'A DOS can only invite into their own Department/Track' }, { status: 403 });
      }

      if (!requestedRole) {
        return NextResponse.json({ error: 'Role is required' }, { status: 400 });
      }
      finalRole = requestedRole;
      finalSubject = callerSubject;
    } else {
      // Regular teachers cannot invite
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Use Service Role to bypass RLS and insert invite
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if email already has an active account or pending invite
    const { data: existingTeacher } = await supabaseAdmin.from('teachers').select('id').eq('email', email).single();
    if (existingTeacher) {
      return NextResponse.json({ error: 'An active account already exists for this email' }, { status: 400 });
    }

    const { data: existingInvite } = await supabaseAdmin.from('teacher_invites').select('id').eq('email', email).eq('status', 'pending').single();
    if (existingInvite) {
      return NextResponse.json({ error: 'A pending invite already exists for this email' }, { status: 400 });
    }

    // Insert invite
    const { data: newInvite, error: insertError } = await supabaseAdmin
      .from('teacher_invites')
      .insert([
        {
          email,
          invited_by: callerId,
          role: finalRole,
          subject: finalSubject,
          name: name || null,
          phone: phone || null,
          classes: classes || [],
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Invite insertion error:', insertError);
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    return NextResponse.json({ success: true, invite: newInvite });
  } catch (err: any) {
    console.error('Invite error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

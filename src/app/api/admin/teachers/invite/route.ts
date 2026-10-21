import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyDataAccess } from '@/lib/auth-server'
import { isAdministratorRole } from '@/lib/teacher-access'

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    // Get current session user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authRes = await verifyDataAccess(supabase, user, 'write');
    if (!authRes.isAuthorized || !isAdministratorRole(authRes.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { email, name, phone, classes, role: requestedRole, subject: requestedSubject } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!requestedRole || !requestedSubject) {
      return NextResponse.json({ error: 'Role and Department/Track are required for Admin invites' }, { status: 400 });
    }
    const finalRole = requestedRole;
    const finalSubject = requestedSubject;

    // Use Service Role to bypass RLS and insert invite
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if email already has an active account or pending invite
    const { data: existingTeacher, error: teacherLookupError } = await supabaseAdmin
      .from('teachers')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (teacherLookupError) {
      console.error('Invite teacher lookup failed:', teacherLookupError.message);
      return NextResponse.json({ error: 'Unable to verify whether this account already exists.' }, { status: 500 });
    }
    if (existingTeacher) {
      return NextResponse.json({ error: 'An active account already exists for this email' }, { status: 400 });
    }

    const { data: existingInvite, error: inviteLookupError } = await supabaseAdmin
      .from('teacher_invites')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();
    if (inviteLookupError) {
      console.error('Pending invite lookup failed:', inviteLookupError.message);
      return NextResponse.json({ error: 'Unable to verify whether a pending invitation exists.' }, { status: 500 });
    }
    if (existingInvite) {
      return NextResponse.json({ error: 'A pending invite already exists for this email' }, { status: 400 });
    }

    // Insert invite
    const { data: newInvite, error: insertError } = await supabaseAdmin
      .from('teacher_invites')
      .insert([
        {
          email,
          invited_by: authRes.teacherId,
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

    // Dispatch event-driven system notification
    const { createSystemNotification } = await import('@/lib/notifications');
    await createSystemNotification(supabaseAdmin, {
      title: 'Staff Invitation Sent',
      message: `Invitation issued for ${name || email} (${finalRole} - ${finalSubject || 'General'}).`,
      priority: 'normal',
      type: 'invitation',
    });

    return NextResponse.json({ success: true, invite: newInvite });
  } catch (err: any) {
    console.error('Invite error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

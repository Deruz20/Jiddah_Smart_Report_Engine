import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { recordActivity } from '@/lib/api-server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from('teachers')
      .select('id, role, subject')
      .eq('email', user.email)
      .single();

    let callerRole = callerProfile?.role;
    if (!callerProfile && (user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'Administrator')) {
      callerRole = 'admin';
    }

    if (!callerRole) {
      return NextResponse.json({ error: 'Caller role not found' }, { status: 403 });
    }

    const body = await req.json();
    const { name, role, email, phone, subject, classes, status } = body;

    // Only Admin can freely update. DOS can only update teachers in their department.
    if (callerRole !== 'admin' && callerRole !== 'Administrator') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: updateError } = await supabaseAdmin
      .from('teachers')
      .update({ name, role, email, phone, subject, classes, status })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If status is being set to active, unban the auth user
    if (status === 'active') {
      const { data: currentTeacher } = await supabaseAdmin.from('teachers').select('auth_user_id').eq('id', id).single();
      const authUserId = currentTeacher?.auth_user_id || id;
      try {
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          ban_duration: 'none'
        });
      } catch (err: any) {
        console.warn('Could not unban auth user:', err.message);
      }
    }

    // Also update auth user metadata if email or name changed
    await supabaseAdmin.auth.admin.updateUserById(id, {
      email: email || undefined,
      user_metadata: { name, role, subject }
    });

    return NextResponse.json({ success: true, message: 'Teacher updated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from('teachers')
      .select('id, role')
      .eq('email', user.email)
      .single();

    let callerRole = callerProfile?.role;
    if (!callerProfile && (user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'Administrator')) {
      callerRole = 'admin';
    }

    if (callerRole !== 'admin' && callerRole !== 'Administrator') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch target teacher to inspect role, auth_user_id, and existence
    const { data: targetTeacher, error: findError } = await supabaseAdmin
      .from('teachers')
      .select('id, name, email, role, auth_user_id, status')
      .eq('id', id)
      .single();

    if (findError || !targetTeacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Guard: Block self-deactivation (400 Bad Request)
    if (
      targetTeacher.id === callerProfile?.id ||
      (targetTeacher.auth_user_id && targetTeacher.auth_user_id === user.id) ||
      targetTeacher.email === user.email
    ) {
      return NextResponse.json({ error: 'Cannot deactivate own account' }, { status: 400 });
    }

    // Guard: Block deactivating the last active Administrator (409 Conflict)
    if (targetTeacher.role === 'Administrator' || targetTeacher.role === 'admin') {
      const { count, error: countError } = await supabaseAdmin
        .from('teachers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .in('role', ['Administrator', 'admin']);

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 500 });
      }

      if (count !== null && count <= 1) {
        return NextResponse.json({ error: 'Cannot deactivate the last active administrator' }, { status: 409 });
      }
    }

    // Soft delete (deactivate) teacher record to preserve historical referential integrity (marks, remarks, assignments)
    const { error: updateError } = await supabaseAdmin
      .from('teachers')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Revoke Auth login access by banning auth user via authoritative teachers.auth_user_id
    if (targetTeacher.auth_user_id) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(targetTeacher.auth_user_id, {
          ban_duration: '876600h' // 100 years
        });
      } catch (authBanErr: any) {
        console.error('Warning: Failed to ban auth user:', authBanErr.message);
      }
    }

    // Record audit activity
    await recordActivity(supabaseAdmin, user.id, 'deactivate_teacher', {
      target_teacher_id: id,
      target_teacher_name: targetTeacher.name,
      target_teacher_email: targetTeacher.email,
      target_teacher_role: targetTeacher.role,
      deactivated_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true, message: 'Teacher deactivated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { executeTeacherDeactivation } from '@/lib/teacher-deactivation';
import { isAdministratorRole } from '@/lib/teacher-access';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerProfile, error: callerError } = await supabase
      .from('teachers')
      .select('id, role')
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    if (callerError) {
      console.error('Admin teacher caller lookup failed:', callerError.message);
      return NextResponse.json({ error: 'Unable to verify administrator' }, { status: 500 });
    }

    if (!isAdministratorRole(callerProfile?.role)) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, role, email, phone, subject, classes, status } = body;

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
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const result = await executeTeacherDeactivation(supabaseAdmin, user, id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, message: result.message, data: result.data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

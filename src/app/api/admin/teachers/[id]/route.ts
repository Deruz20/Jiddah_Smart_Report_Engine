import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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
    if (!callerProfile && user.user_metadata?.role === 'admin') {
      callerRole = 'admin';
    }

    if (!callerRole) {
      return NextResponse.json({ error: 'Caller role not found' }, { status: 403 });
    }

    const body = await req.json();
    const { name, role, email, phone, subject, classes, status } = body;

    // Only Admin can freely update. DOS can only update teachers in their department.
    if (callerRole !== 'admin') {
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

    // Also update auth user metadata if email or name changed
    await supabaseAdmin.auth.admin.updateUserById(id, {
      email: email || undefined,
      user_metadata: { name, role, subject }
    });

    return NextResponse.json({ success: true });
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
    if (!callerProfile && user.user_metadata?.role === 'admin') {
      callerRole = 'admin';
    }

    if (callerRole !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Delete user from auth.users (will cascade if configured, but let's delete from teachers too just in case)
    await supabaseAdmin.from('teachers').delete().eq('id', id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

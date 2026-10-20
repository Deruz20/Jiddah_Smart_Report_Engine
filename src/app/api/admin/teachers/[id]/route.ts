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

    if (callerProfile?.role !== 'Administrator') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, role, email, phone, subject, classes, status } = body;

    // Only Admin can freely update. DOS can only update teachers in their department.
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

    if (callerProfile?.role !== 'Administrator') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get teacher's email before deleting
    const { data: teacherData } = await supabaseAdmin.from('teachers').select('email').eq('id', id).single();

    // Delete user from auth.users (will cascade if configured, but let's delete from teachers too just in case)
    await supabaseAdmin.from('teachers').delete().eq('id', id);
    
    if (teacherData?.email) {
       const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
       const userToDelete = usersData.users.find((u: any) => u.email === teacherData.email);
       if (userToDelete) {
         await supabaseAdmin.auth.admin.deleteUser(userToDelete.id);
       }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

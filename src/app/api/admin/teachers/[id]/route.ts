import { createAdminClient, createClient as createServerClient } from '@/utils/supabase/server';
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

    const supabaseAdmin = createAdminClient(cookieStore);

    const { data: currentTeacher } = await supabaseAdmin
      .from('teachers')
      .select('id, auth_user_id')
      .eq('id', id)
      .maybeSingle();

    const { error: updateError } = await supabaseAdmin
      .from('teachers')
      .update({ name, role, email, phone, subject, classes, status })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Sync teacher_class_assignments table when classes array is provided
    if (Array.isArray(classes)) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validClassIds = Array.from(new Set(classes.filter((c: unknown) => typeof c === 'string' && uuidRegex.test(c))));

      const [{ data: cClasses }, { data: tClasses }] = await Promise.all([
        supabaseAdmin.from('circular_classes').select('id'),
        supabaseAdmin.from('theology_classes').select('id'),
      ]);
      const circularSet = new Set((cClasses || []).map((c: any) => c.id));
      const theologySet = new Set((tClasses || []).map((t: any) => t.id));

      await supabaseAdmin.from('teacher_class_assignments').delete().eq('teacher_id', id);

      const assignmentRows = validClassIds
        .map((classId) => {
          if (circularSet.has(classId)) return { teacher_id: id, class_id: classId, class_type: 'circular' };
          if (theologySet.has(classId)) return { teacher_id: id, class_id: classId, class_type: 'theology' };
          return null;
        })
        .filter(Boolean);

      if (assignmentRows.length > 0) {
        const { error: assignErr } = await supabaseAdmin
          .from('teacher_class_assignments')
          .insert(assignmentRows);
        if (assignErr) {
          console.warn('Could not sync teacher_class_assignments:', assignErr.message);
        }
      }
    }

    const authUserId = currentTeacher?.auth_user_id || id;

    // If status is being set to active, unban the auth user
    if (status === 'active') {
      try {
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          ban_duration: 'none'
        });
      } catch (err: any) {
        console.warn('Could not unban auth user:', err.message);
      }
    }

    // Also update auth user metadata if email or name changed
    try {
      await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        email: email || undefined,
        user_metadata: { name, role, subject }
      });
    } catch (err: any) {
      console.warn('Could not update auth user metadata:', err.message);
    }

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

    const supabaseAdmin = createAdminClient(cookieStore);

    const result = await executeTeacherDeactivation(supabaseAdmin, user, id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, message: result.message, data: result.data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

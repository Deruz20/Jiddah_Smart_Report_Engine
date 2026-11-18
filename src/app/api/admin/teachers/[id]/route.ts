import { createAdminClient, createClient as createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { executeTeacherDeactivation } from '@/lib/teacher-deactivation';
import { isAdministratorRole, PERMISSION_KEYS } from '@/lib/teacher-access';
import { isUsernameTaken, normalizeUsername, rememberTeacherUsernameMapping, validateUsernameFormat } from '@/lib/username';
import { recordActivity } from '@/lib/api-server';

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
      .select('id, role, status, email')
      .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
      .maybeSingle();

    if (callerError) {
      console.error('Admin teacher caller lookup failed:', callerError.message);
      return NextResponse.json({ error: 'Unable to verify administrator' }, { status: 500 });
    }

    const callerStatus = (callerProfile?.status || 'active').toLowerCase();
    if (
      !callerProfile ||
      !isAdministratorRole(callerProfile.role) ||
      ['inactive', 'suspended', 'deactivated', 'banned'].includes(callerStatus)
    ) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, role, email, username, phone, subject, classes, status, permissions } = body;

    const supabaseAdmin = createAdminClient(cookieStore);

    let { data: currentTeacher, error: findErr } = await supabaseAdmin
      .from('teachers')
      .select('id, auth_user_id, name, email, username, phone, role, subject, classes, status, permissions')
      .eq('id', id)
      .maybeSingle();

    if (findErr && (findErr.message?.includes('permissions') || findErr.message?.includes('username'))) {
      const retryFind = await supabaseAdmin
        .from('teachers')
        .select('id, auth_user_id, name, email, phone, role, subject, classes, status')
        .eq('id', id)
        .maybeSingle();
      currentTeacher = retryFind.data as any;
      findErr = retryFind.error;
    }

    if (findErr || !currentTeacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const { data: beforeAssignments } = await supabaseAdmin
      .from('teacher_class_assignments')
      .select('class_id, class_type')
      .eq('teacher_id', id);

    const nextRole = role !== undefined ? String(role).trim() : currentTeacher.role;
    const nextStatus = status !== undefined ? String(status).trim().toLowerCase() : (currentTeacher.status || 'active');
    const isSelf =
      currentTeacher.id === callerProfile.id ||
      currentTeacher.auth_user_id === user.id ||
      (user.email && currentTeacher.email && currentTeacher.email.toLowerCase() === user.email.toLowerCase());

    // Safeguard 1 (P4 / 1E): Cannot remove own Administrator role or disable own account
    if (isSelf) {
      if (!isAdministratorRole(nextRole)) {
        return NextResponse.json(
          { error: 'Cannot remove your own Administrator role' },
          { status: 400 }
        );
      }
      if (nextStatus !== 'active') {
        return NextResponse.json(
          { error: 'Cannot deactivate your own account' },
          { status: 400 }
        );
      }
    }

    // Safeguard 2 (P4 / 1E): Cannot demote or disable the last active Administrator
    if (
      isAdministratorRole(currentTeacher.role) &&
      (!isAdministratorRole(nextRole) || nextStatus !== 'active')
    ) {
      const { count } = await supabaseAdmin
        .from('teachers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .in('role', ['Administrator', 'admin']);
      if (count !== null && count <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote or deactivate the last active administrator' },
          { status: 409 }
        );
      }
    }

    let nextSubject = subject !== undefined ? subject : currentTeacher.subject;
    if (nextRole === 'DOS Theology' && !nextSubject) nextSubject = 'Theology';
    if (nextRole === 'DOS Secular' && !nextSubject) nextSubject = 'Secular';

    const updatePayload: Record<string, any> = {};
    if (name !== undefined) updatePayload.name = String(name).trim();
    if (role !== undefined) updatePayload.role = nextRole;
    if (email !== undefined) updatePayload.email = email ? String(email).trim().toLowerCase() : null;
    if (username !== undefined && String(username).trim() !== '') {
      const normalizedUname = normalizeUsername(username);
      const checkUname = validateUsernameFormat(normalizedUname);
      if (!checkUname.valid) {
        return NextResponse.json({ error: checkUname.error || 'Invalid username format' }, { status: 400 });
      }
      if (await isUsernameTaken(supabaseAdmin, normalizedUname, id)) {
        return NextResponse.json({ error: 'Username is already taken by another staff member' }, { status: 409 });
      }
      updatePayload.username = normalizedUname;
    }
    if (phone !== undefined) updatePayload.phone = phone ? String(phone).trim() : null;
    if (subject !== undefined || nextSubject !== currentTeacher.subject) updatePayload.subject = nextSubject;
    if (classes !== undefined) updatePayload.classes = Array.isArray(classes) ? classes : [];
    if (status !== undefined) updatePayload.status = nextStatus;

    if (permissions !== undefined) {
      if (permissions === null) {
        updatePayload.permissions = null;
      } else if (Array.isArray(permissions)) {
        const validSet = new Set<string>(PERMISSION_KEYS);
        updatePayload.permissions = permissions.filter(
          (k: unknown) => typeof k === 'string' && (validSet.has(k) || (k.startsWith('-') && validSet.has(k.slice(1))))
        );
      }
    }

    let { data: updatedRow, error: updateError } = await supabaseAdmin
      .from('teachers')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    // Compatibility fallback if DB role check only allows 'DOS' or lacks 'permissions' column
    if (updateError) {
      const fallbackPayload = { ...updatePayload };
      if (updateError.message?.includes('permissions')) {
        delete fallbackPayload.permissions;
      }
      if (
        updateError.message?.includes('teachers_role_check') &&
        (nextRole === 'DOS Secular' || nextRole === 'DOS Theology')
      ) {
        fallbackPayload.role = 'DOS';
        fallbackPayload.subject = nextRole === 'DOS Theology' ? 'Theology' : 'Secular';
      }
      const retryUpdate = await supabaseAdmin
        .from('teachers')
        .update(fallbackPayload)
        .eq('id', id)
        .select()
        .maybeSingle();
      updatedRow = retryUpdate.data;
      updateError = retryUpdate.error;
    }

    if (updateError || !updatedRow) {
      return NextResponse.json(
        { error: updateError?.message || 'Failed to update teacher record' },
        { status: 500 }
      );
    }

    rememberTeacherUsernameMapping(updatedRow);

    // Sync teacher_class_assignments AND circular_classes.class_teacher_id when classes array is provided
    let afterAssignments = beforeAssignments || [];
    if (Array.isArray(classes)) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validClassIds = Array.from(
        new Set(classes.filter((c: unknown) => typeof c === 'string' && uuidRegex.test(c)))
      );

      const [{ data: cClasses }, { data: tClasses }] = await Promise.all([
        supabaseAdmin.from('circular_classes').select('id, class_teacher_id'),
        supabaseAdmin.from('theology_classes').select('id'),
      ]);
      const circularSet = new Set((cClasses || []).map((c: any) => c.id));
      const theologySet = new Set((tClasses || []).map((t: any) => t.id));

      await supabaseAdmin.from('teacher_class_assignments').delete().eq('teacher_id', id);

      // Clear any circular_classes.class_teacher_id previously pointing to this teacher that is no longer assigned
      const unassignedCircularIds = (cClasses || [])
        .filter((c: any) => c.class_teacher_id === id && !validClassIds.includes(c.id))
        .map((c: any) => c.id);
      if (unassignedCircularIds.length > 0) {
        await supabaseAdmin
          .from('circular_classes')
          .update({ class_teacher_id: null })
          .in('id', unassignedCircularIds);
      }

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

      const { data: verifyAssign } = await supabaseAdmin
        .from('teacher_class_assignments')
        .select('class_id, class_type')
        .eq('teacher_id', id);
      afterAssignments = verifyAssign || [];
    }

    const authUserId = currentTeacher.auth_user_id || id;

    // Sync Auth user status (ban / unban), email (direct admin update without confirmation email per A3), and metadata.
    // Never pass authUserId (UUID) into auth.admin.signOut(); use updateUserById ban/unban wrapped non-fatally.
    try {
      const authUpdate: Record<string, any> = {
        user_metadata: {
          name: updatedRow.name,
          full_name: updatedRow.name,
          role: updatedRow.role,
          subject: updatedRow.subject,
        },
      };
      if (status !== undefined) {
        authUpdate.ban_duration = nextStatus === 'active' ? 'none' : '876600h';
      }
      if (
        email &&
        String(email).trim().toLowerCase() !== String(currentTeacher.email || '').trim().toLowerCase()
      ) {
        authUpdate.email = String(email).trim().toLowerCase();
        authUpdate.email_confirm = true;
      }
      const { error: authSyncErr } = await supabaseAdmin.auth.admin.updateUserById(authUserId, authUpdate);
      if (authSyncErr) {
        console.warn('Non-fatal auth user metadata/ban sync warning:', authSyncErr.message);
      }
    } catch (err: any) {
      console.warn('Could not update auth user metadata:', err.message);
    }

    // Log before -> after in activity_logs (P4 / A3 / A7)
    await recordActivity(supabaseAdmin, user.id, 'update_teacher', {
      actor_id: user.id,
      target_teacher_id: id,
      before: {
        name: currentTeacher.name,
        email: currentTeacher.email,
        username: (currentTeacher as any).username ?? null,
        phone: currentTeacher.phone,
        role: currentTeacher.role,
        subject: currentTeacher.subject,
        status: currentTeacher.status,
        classes: currentTeacher.classes,
        permissions: (currentTeacher as any).permissions ?? null,
        assignments: beforeAssignments || [],
      },
      after: {
        name: updatedRow.name,
        email: updatedRow.email,
        username: (updatedRow as any).username ?? null,
        phone: updatedRow.phone,
        role: updatedRow.role,
        subject: updatedRow.subject,
        status: updatedRow.status,
        classes: updatedRow.classes,
        permissions: (updatedRow as any).permissions ?? null,
        assignments: afterAssignments,
      },
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Teacher updated successfully',
      data: {
        ...updatedRow,
        assignments: afterAssignments,
      },
    });
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

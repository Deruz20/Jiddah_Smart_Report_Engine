import { createAdminClient, createClient as createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyDataAccess } from '@/lib/auth-server';
import { isAdministratorRole, PERMISSION_KEYS } from '@/lib/teacher-access';
import { isUsernameTaken, normalizeUsername, resolveUniqueUsernameFromEmail, validateUsernameFormat } from '@/lib/username';
import { recordActivity } from '@/lib/api-server';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authRes = await verifyDataAccess(supabase, user, 'write');
    if (!authRes.isAuthorized || !isAdministratorRole(authRes.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const {
      email,
      username: requestedUsername,
      name,
      phone,
      classes,
      role: requestedRole,
      subject: requestedSubject,
      permissions,
    } = body;
    const initialPassword = body.password ?? body.initialPassword;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!requestedRole || !requestedSubject) {
      return NextResponse.json(
        { error: 'Role and Department/Track are required for Admin invites' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const finalRole = String(requestedRole).trim();
    const finalSubject = String(requestedSubject).trim();
    const finalName = String(name || normalizedEmail.split('@')[0]).trim();
    const classList = Array.isArray(classes) ? classes : [];

    const supabaseAdmin = createAdminClient(cookieStore);

    const { data: existingTeacher, error: teacherLookupError } = await supabaseAdmin
      .from('teachers')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (teacherLookupError) {
      console.error('Invite teacher lookup failed:', teacherLookupError.message);
      return NextResponse.json(
        { error: 'Unable to verify whether this account already exists.' },
        { status: 500 }
      );
    }
    if (existingTeacher) {
      return NextResponse.json(
        { error: 'An active account already exists for this email' },
        { status: 400 }
      );
    }

    // Mode A: Direct Account Provisioning with Initial Password (works with public sign-ups OFF)
    if (initialPassword !== undefined && String(initialPassword).trim() !== '') {
      const pwd = String(initialPassword).trim();
      if (pwd.length < 8) {
        return NextResponse.json(
          { error: 'Initial password must be at least 8 characters long.' },
          { status: 400 }
        );
      }

      const finalUsername =
        requestedUsername && String(requestedUsername).trim()
          ? normalizeUsername(requestedUsername)
          : await resolveUniqueUsernameFromEmail(supabaseAdmin, normalizedEmail);

      if (requestedUsername && String(requestedUsername).trim()) {
        const check = validateUsernameFormat(finalUsername);
        if (!check.valid) {
          return NextResponse.json({ error: check.error || 'Invalid username format' }, { status: 400 });
        }
        if (await isUsernameTaken(supabaseAdmin, finalUsername)) {
          return NextResponse.json({ error: 'Username is already in use' }, { status: 409 });
        }
      }

      const { data: authCreated, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: pwd,
        email_confirm: true,
        user_metadata: {
          name: finalName,
          full_name: finalName,
          role: finalRole,
          subject: finalSubject,
          onboarding_completed: true,
        },
      });

      if (createAuthErr || !authCreated?.user) {
        return NextResponse.json(
          { error: createAuthErr?.message || 'Failed to create Auth user account' },
          { status: 500 }
        );
      }

      const newUserId = authCreated.user.id;
      const validPermSet = new Set<string>(PERMISSION_KEYS);
      const validPerms = Array.isArray(permissions)
        ? permissions.filter(
          (k: unknown) =>
            typeof k === 'string' &&
            (validPermSet.has(k) || (k.startsWith('-') && validPermSet.has(k.slice(1))))
        )
        : null;

      const insertPayload: Record<string, any> = {
        id: newUserId,
        auth_user_id: newUserId,
        email: normalizedEmail,
        username: finalUsername,
        name: finalName,
        phone: phone ? String(phone).trim() : null,
        role: finalRole,
        subject: finalSubject,
        classes: classList,
        status: 'active',
        ...(validPerms && validPerms.length > 0 ? { permissions: validPerms } : {}),
      };

      let { data: createdTeacher, error: profileErr } = await supabaseAdmin
        .from('teachers')
        .insert([insertPayload])
        .select()
        .single();

      if (profileErr) {
        const fallbackPayload = { ...insertPayload };
        delete fallbackPayload.permissions;
        if (
          profileErr.message?.includes('teachers_role_check') &&
          (finalRole === 'DOS Secular' || finalRole === 'DOS Theology')
        ) {
          fallbackPayload.role = 'DOS';
          fallbackPayload.subject = finalRole === 'DOS Theology' ? 'Theology' : 'Secular';
        }
        const retryProfile = await supabaseAdmin
          .from('teachers')
          .insert([fallbackPayload])
          .select()
          .single();
        createdTeacher = retryProfile.data;
        profileErr = retryProfile.error;
      }

      if (profileErr || !createdTeacher) {
        await supabaseAdmin.auth.admin.deleteUser(newUserId);
        return NextResponse.json(
          { error: profileErr?.message || 'Failed to create staff profile' },
          { status: 500 }
        );
      }

      // Sync teacher_class_assignments
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validClassIds = Array.from(
        new Set(classList.filter((c: unknown) => typeof c === 'string' && uuidRegex.test(c)))
      );
      if (validClassIds.length > 0) {
        const [{ data: cClasses }, { data: tClasses }] = await Promise.all([
          supabaseAdmin.from('circular_classes').select('id'),
          supabaseAdmin.from('theology_classes').select('id'),
        ]);
        const circularSet = new Set((cClasses || []).map((c: any) => c.id));
        const theologySet = new Set((tClasses || []).map((t: any) => t.id));
        const assignmentRows = validClassIds
          .map((classId) => {
            if (circularSet.has(classId)) return { teacher_id: newUserId, class_id: classId, class_type: 'circular' };
            if (theologySet.has(classId)) return { teacher_id: newUserId, class_id: classId, class_type: 'theology' };
            return null;
          })
          .filter(Boolean);
        if (assignmentRows.length > 0) {
          await supabaseAdmin.from('teacher_class_assignments').insert(assignmentRows);
        }
      }

      await recordActivity(supabaseAdmin, user.id, 'create_teacher', {
        actor_id: user.id,
        target_teacher_id: newUserId,
        before: null,
        after: {
          id: createdTeacher.id,
          name: createdTeacher.name,
          email: createdTeacher.email,
          role: createdTeacher.role,
          subject: createdTeacher.subject,
          classes: createdTeacher.classes,
          status: createdTeacher.status,
        },
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        createdAccount: true,
        teacher: createdTeacher,
      });
    }

    // Mode B: Invitation Flow (teacher_invites)
    const { data: existingInvite, error: inviteLookupError } = await supabaseAdmin
      .from('teacher_invites')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();
    if (inviteLookupError) {
      console.error('Pending invite lookup failed:', inviteLookupError.message);
      return NextResponse.json(
        { error: 'Unable to verify whether a pending invitation exists.' },
        { status: 500 }
      );
    }
    if (existingInvite) {
      return NextResponse.json(
        { error: 'A pending invite already exists for this email' },
        { status: 400 }
      );
    }

    let { data: newInvite, error: insertError } = await supabaseAdmin
      .from('teacher_invites')
      .insert([
        {
          email: normalizedEmail,
          invited_by: authRes.teacherId,
          role: finalRole,
          subject: finalSubject,
          name: finalName || null,
          phone: phone || null,
          classes: classList,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (insertError) {
      const retryInvite = await supabaseAdmin
        .from('teacher_invites')
        .insert([
          {
            email: normalizedEmail,
            invited_by: authRes.teacherId,
            role: finalRole,
            classes: classList,
            status: 'pending',
          },
        ])
        .select()
        .single();
      newInvite = retryInvite.data;
      insertError = retryInvite.error;
    }

    if (insertError || !newInvite) {
      console.error('Invite insertion error:', insertError);
      return NextResponse.json(
        { error: insertError?.message || 'Failed to create invite' },
        { status: 500 }
      );
    }

    await recordActivity(supabaseAdmin, user.id, 'invite_teacher', {
      actor_id: user.id,
      invite_id: newInvite.id,
      before: null,
      after: {
        email: normalizedEmail,
        role: finalRole,
        subject: finalSubject,
        classes: classList,
      },
      created_at: new Date().toISOString(),
    });

    const { createSystemNotification } = await import('@/lib/notifications');
    await createSystemNotification(supabaseAdmin, {
      title: 'Staff Invitation Sent',
      message: `Invitation issued for ${finalName || normalizedEmail} (${finalRole} - ${finalSubject || 'General'}).`,
      priority: 'normal',
      type: 'invitation',
    });

    return NextResponse.json({ success: true, invite: newInvite });
  } catch (err: any) {
    console.error('Invite error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

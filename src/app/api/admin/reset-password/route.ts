import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { verifyDataAccess } from '@/lib/auth-server';
import { isAdministratorRole } from '@/lib/teacher-access';
import { recordActivity } from '@/lib/api-server';
import { getSupabaseAnonKey } from '@/lib/supabase-env';

function isValidJwt(token: string | null | undefined): token is string {
  return typeof token === 'string' && token.trim().split('.').length === 3;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authRes = await verifyDataAccess(supabase, user, 'write');
    if (!authRes.isAuthorized || !isAdministratorRole(authRes.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only Administrators can perform this action.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, email, newPassword } = body || {};

    if ((!userId && !email) || !newPassword) {
      return NextResponse.json(
        { error: 'Missing target userId/email or newPassword' },
        { status: 400 }
      );
    }

    const trimmedPassword = String(newPassword).trim();
    if (trimmedPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient(cookieStore);

    let targetTeacher: any = null;
    if (userId) {
      const { data } = await adminSupabase
        .from('teachers')
        .select('id, auth_user_id, email, name, role')
        .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
        .maybeSingle();
      targetTeacher = data;
    } else if (email) {
      const { data } = await adminSupabase
        .from('teachers')
        .select('id, auth_user_id, email, name, role')
        .eq('email', String(email).trim().toLowerCase())
        .maybeSingle();
      targetTeacher = data;
    }

    const targetAuthUid = targetTeacher?.auth_user_id || targetTeacher?.id || userId;
    if (!targetAuthUid) {
      return NextResponse.json({ error: 'Target staff account not found' }, { status: 404 });
    }

    // Never pass targetAuthUid (UUID) into auth.admin.signOut() — only use updateUserById
    let { data: updatedAuth, error } = await adminSupabase.auth.admin.updateUserById(
      targetAuthUid,
      { password: trimmedPassword }
    );

    // If resetting own password when SUPABASE_SERVICE_ROLE_KEY is unset, fallback to active session JWT
    if ((error || !updatedAuth?.user) && targetAuthUid === user.id) {
      const { data: selfUpdated, error: selfErr } = await supabase.auth.updateUser({
        password: trimmedPassword,
      });
      if (!selfErr && selfUpdated?.user) {
        updatedAuth = selfUpdated;
        error = null;
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        let jwt = sessionData?.session?.access_token || null;
        if (!isValidJwt(jwt)) {
          const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
          if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
            const candidate = authHeader.slice(7).trim();
            if (isValidJwt(candidate)) jwt = candidate;
          }
        }
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey =
          getSupabaseAnonKey() || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
        if (isValidJwt(jwt) && supabaseUrl && supabaseAnonKey) {
          const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({ password: trimmedPassword }),
          });
          if (res.ok) {
            const payload = await res.json().catch(() => ({}));
            updatedAuth = { user: payload?.user || user } as any;
            error = null;
          }
        }
      }
    }

    if (error || !updatedAuth?.user) {
      console.error('Error updating password:', error?.message);
      return NextResponse.json(
        { error: error?.message || 'Failed to update user password' },
        { status: 500 }
      );
    }

    await recordActivity(adminSupabase, user.id, 'admin_reset_password', {
      actor_id: user.id,
      target_teacher_id: targetTeacher?.id || targetAuthUid,
      target_teacher_name: targetTeacher?.name || null,
      target_teacher_role: targetTeacher?.role || null,
      before: { password_reset: false },
      after: { password_reset: true, auth_updated_at: updatedAuth.user.updated_at },
      reset_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      data: { id: targetTeacher?.id || targetAuthUid },
    });
  } catch (error: any) {
    console.error('Password reset endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}


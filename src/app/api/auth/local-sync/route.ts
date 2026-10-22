import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const isLocal = supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost');

  // Hard safety guard: Never allow local sync in non-local environments
  if (!isLocal) {
    return NextResponse.json({ error: 'Forbidden in non-local environment' }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userList, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    }

    let existing = userList?.users?.find(u => u.email?.toLowerCase() === email);

    if (existing) {
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: {
          ...existing.user_metadata,
          role:
            existing.user_metadata?.role ||
            (email.includes('admin') || email === 'hassanhatima20@gmail.com'
              ? 'Administrator'
              : 'Class Teacher'),
          onboarding_completed: true,
        },
      });
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    } else {
      const role =
        email.includes('admin') || email === 'hassanhatima20@gmail.com'
          ? 'Administrator'
          : 'Class Teacher';
      const name = email === 'hassanhatima20@gmail.com' ? 'Hassan Hatima' : email.split('@')[0];
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role, name, onboarding_completed: true },
        app_metadata: { role },
      });
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 });
      }
      existing = created.user;
    }

    // Ensure matching record in public.teachers
    const teacherId = existing.id;
    const role = existing.user_metadata?.role || 'Administrator';
    const name = existing.user_metadata?.name || (email === 'hassanhatima20@gmail.com' ? 'Hassan Hatima' : email.split('@')[0]);

    await supabaseAdmin.from('teachers').upsert({
      id: teacherId,
      auth_user_id: teacherId,
      email,
      role,
      name,
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      message: 'Local rehearsal credentials synchronized successfully',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

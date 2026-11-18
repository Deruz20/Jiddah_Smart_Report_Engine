import { createAdminClient, createClient as createServerClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  verifyDataAccess,
  ALL_STAFF_ROLES,
  PERMISSION_KEYS,
  PERMISSION_METADATA,
  DEFAULT_ROLE_PERMISSIONS,
  type StaffRoleName,
  type PermissionKey,
} from '@/lib/auth-server';
import { isAdministratorRole } from '@/lib/teacher-access';
import { recordActivity } from '@/lib/api-server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authRes = await verifyDataAccess(supabase, user, 'read');
    if (!authRes.isAuthorized || !isAdministratorRole(authRes.role)) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient(cookieStore);
    const rolePermissions: Record<string, PermissionKey[]> = { ...DEFAULT_ROLE_PERMISSIONS };

    try {
      const { data: rows, error } = await supabaseAdmin
        .from('role_permissions')
        .select('role, permissions, updated_at, updated_by');
      if (!error && Array.isArray(rows)) {
        const validSet = new Set<string>(PERMISSION_KEYS);
        for (const r of rows) {
          if (r?.role && Array.isArray(r.permissions)) {
            rolePermissions[r.role] = r.permissions.filter((k: string): k is PermissionKey =>
              validSet.has(k)
            );
          }
        }
      }
    } catch {
      // Fallback to seeded DEFAULT_ROLE_PERMISSIONS if table not yet migrated
    }

    rolePermissions.Administrator = [...PERMISSION_KEYS];

    return NextResponse.json({
      data: {
        roles: ALL_STAFF_ROLES,
        permissionKeys: PERMISSION_KEYS,
        permissionMetadata: PERMISSION_METADATA,
        rolePermissions,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authRes = await verifyDataAccess(supabase, user, 'write');
    if (!authRes.isAuthorized || !isAdministratorRole(authRes.role)) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }

    const body = await req.json();
    const role = String(body?.role || '').trim() as StaffRoleName;
    const requestedPermissions = body?.permissions;

    if (!ALL_STAFF_ROLES.includes(role)) {
      return NextResponse.json({ error: `Invalid role '${role}'` }, { status: 400 });
    }

    if (!Array.isArray(requestedPermissions)) {
      return NextResponse.json({ error: 'permissions must be an array of permission keys' }, { status: 400 });
    }

    const validKeySet = new Set<string>(PERMISSION_KEYS);
    for (const k of requestedPermissions) {
      if (typeof k !== 'string' || !validKeySet.has(k)) {
        return NextResponse.json({ error: `Unrecognized permission key '${String(k)}'` }, { status: 400 });
      }
    }

    const deduplicated = Array.from(new Set(requestedPermissions as PermissionKey[]));

    // Safeguard (1E / P4): Cannot remove own access or strip Administrator capabilities
    if (role === 'Administrator') {
      const missingAdminKeys = PERMISSION_KEYS.filter((k) => !deduplicated.includes(k));
      if (missingAdminKeys.length > 0) {
        return NextResponse.json(
          { error: 'Cannot remove core permissions from the Administrator role.' },
          { status: 400 }
        );
      }
    }

    const supabaseAdmin = createAdminClient(cookieStore);

    const { data: beforeRow } = await supabaseAdmin
      .from('role_permissions')
      .select('role, permissions')
      .eq('role', role)
      .maybeSingle();

    const beforePermissions = beforeRow?.permissions ?? DEFAULT_ROLE_PERMISSIONS[role] ?? [];

    const { data: savedRow, error: upsertError } = await supabaseAdmin
      .from('role_permissions')
      .upsert(
        [
          {
            role,
            permissions: deduplicated,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'role' }
      )
      .select('role, permissions, updated_at')
      .single();

    if (upsertError || !savedRow) {
      return NextResponse.json(
        { error: upsertError?.message || 'Failed to persist role permissions' },
        { status: 500 }
      );
    }

    await recordActivity(supabaseAdmin, user.id, 'update_role_permissions', {
      actor_id: user.id,
      role,
      before: beforePermissions,
      after: savedRow.permissions,
      updated_at: savedRow.updated_at,
    });

    return NextResponse.json({
      success: true,
      data: savedRow,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

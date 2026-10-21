import { SupabaseClient } from '@supabase/supabase-js';
import { recordActivity } from '@/lib/api-server';

export interface DeactivationResult {
  success: boolean;
  status: number;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Shared, authoritative teacher deactivation service.
 * Enforces:
 * 1. Admin/Administrator authorization guard (via auth_user_id/id or email, never user_metadata)
 * 2. Self-deactivation prevention guard (HTTP 400)
 * 3. Last active Administrator prevention guard (HTTP 409)
 * 4. Referential-integrity-preserving soft delete (status = 'inactive')
 * 5. Immediate session revocation / auth ban (ban_duration: '876600h')
 * 6. Audit logging into public.activity_logs
 */
export async function executeTeacherDeactivation(
  supabaseAdmin: SupabaseClient,
  callerUser: { id: string; email?: string | null },
  targetTeacherId: string
): Promise<DeactivationResult> {
  // 1. Verify caller profile and administrative permissions
  let callerProfile: { id: string; role: string; email: string } | null = null;
  let callerError: any = null;

  const byIdRes = await supabaseAdmin
    .from('teachers')
    .select('id, role, email')
    .or(`auth_user_id.eq.${callerUser.id},id.eq.${callerUser.id}`)
    .maybeSingle();

  if (byIdRes.error) {
    callerError = byIdRes.error;
  } else if (byIdRes.data) {
    callerProfile = byIdRes.data;
  } else if (callerUser.email) {
    const byEmailRes = await supabaseAdmin
      .from('teachers')
      .select('id, role, email')
      .eq('email', callerUser.email)
      .maybeSingle();
    callerError = byEmailRes.error;
    callerProfile = byEmailRes.data;
  }

  const callerRole = callerProfile?.role;
  if (callerError || !callerProfile || !callerRole) {
    return { success: false, status: 403, error: 'Caller role not found' };
  }

  if (callerRole !== 'admin' && callerRole !== 'Administrator') {
    return { success: false, status: 403, error: 'Insufficient permissions' };
  }

  // 2. Fetch target teacher to inspect role, auth_user_id, and existence
  const { data: targetTeacher, error: findError } = await supabaseAdmin
    .from('teachers')
    .select('id, name, email, role, auth_user_id, status')
    .eq('id', targetTeacherId)
    .single();

  if (findError || !targetTeacher) {
    return { success: false, status: 404, error: 'Teacher not found' };
  }

  // 3. Guard: Block self-deactivation (400 Bad Request)
  if (
    targetTeacher.id === callerProfile.id ||
    (targetTeacher.auth_user_id && targetTeacher.auth_user_id === callerUser.id) ||
    targetTeacher.email === callerUser.email
  ) {
    return { success: false, status: 400, error: 'Cannot deactivate own account' };
  }

  // 4. Guard: Block deactivating the last active Administrator (409 Conflict)
  if (targetTeacher.role === 'Administrator' || targetTeacher.role === 'admin') {
    const { count, error: countError } = await supabaseAdmin
      .from('teachers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .in('role', ['Administrator', 'admin']);

    if (countError) {
      return { success: false, status: 500, error: countError.message };
    }

    if (count !== null && count <= 1) {
      return { success: false, status: 409, error: 'Cannot deactivate the last active administrator' };
    }
  }

  // 5. Soft delete (deactivate) teacher record to preserve historical referential integrity
  const { error: updateError } = await supabaseAdmin
    .from('teachers')
    .update({ status: 'inactive' })
    .eq('id', targetTeacherId);

  if (updateError) {
    return { success: false, status: 500, error: updateError.message };
  }

  // 6. Revoke Auth login access by banning auth user via authoritative teachers.auth_user_id
  const authUserIdToBan = targetTeacher.auth_user_id || (targetTeacher.id.length === 36 ? targetTeacher.id : null);
  if (authUserIdToBan) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(authUserIdToBan, {
        ban_duration: '876600h' // 100 years
      });
    } catch (authBanErr: any) {
      console.warn('Warning: Failed to ban auth user:', authBanErr.message);
    }
  }

  // 7. Record audit activity in public.activity_logs
  await recordActivity(supabaseAdmin, callerUser.id, 'deactivate_teacher', {
    target_teacher_id: targetTeacherId,
    target_teacher_name: targetTeacher.name,
    target_teacher_email: targetTeacher.email,
    target_teacher_role: targetTeacher.role,
    deactivated_at: new Date().toISOString()
  });

  return {
    success: true,
    status: 200,
    message: 'Teacher deactivated successfully',
    data: { id: targetTeacherId, status: 'inactive' }
  };
}

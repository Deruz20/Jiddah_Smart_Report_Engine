import { createClient as createSupabaseJsClient, type SupabaseClient } from '@supabase/supabase-js'
import { getServiceRoleKey, getSupabaseAnonKey } from './supabase-env.ts'

/**
 * Staff auth account management that works with OR without a service_role key.
 *
 * Strategy (in order):
 *   1. `admin_api` — GoTrue Admin API (`auth.admin.*`) when a real service_role / sb_secret key is configured.
 *   2. `rpc`       — `public.admin_manage_staff_auth` SECURITY DEFINER function, executed with the
 *                    calling Administrator's own session (enforced inside Postgres).
 *   3. `signup`    — (create only) isolated, cookie-free public `signUp` when the RPC is not yet deployed.
 */

export type StaffAuthMode = 'admin_api' | 'rpc' | 'signup'

export interface StaffAuthResult {
  ok: boolean
  mode?: StaffAuthMode
  userId?: string
  error?: string
  status?: number
  requiresEmailConfirmation?: boolean
}

export function hasServiceRoleAccess(): boolean {
  return Boolean(getServiceRoleKey())
}

function isBearerOrPermissionError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '').toLowerCase()
  const status = Number((err as any)?.status || 0)
  return (
    status === 401 ||
    status === 403 ||
    msg.includes('bearer token') ||
    msg.includes('not allowed') ||
    msg.includes('invalid jwt') ||
    msg.includes('invalid api key') ||
    msg.includes('service_role')
  )
}

function isMissingRpcError(err: any): boolean {
  const code = String(err?.code || '')
  const msg = String(err?.message || '').toLowerCase()
  return (
    code === 'PGRST202' ||
    code === '42883' ||
    msg.includes('could not find the function') ||
    (msg.includes('function') && msg.includes('does not exist'))
  )
}

function rpcErrorStatus(err: any): number {
  const code = String(err?.code || '')
  if (code === '42501') return 403
  if (code === '23505') return 409
  if (code === '22023') return 400
  if (code === 'P0002') return 404
  return 500
}

async function callStaffAuthRpc(
  client: SupabaseClient,
  params: {
    p_action: string
    p_email?: string | null
    p_password?: string | null
    p_name?: string | null
    p_role?: string | null
    p_user_id?: string | null
  }
): Promise<{ data: any; error: any }> {
  return client.rpc('admin_manage_staff_auth', {
    p_action: params.p_action,
    p_email: params.p_email ?? null,
    p_password: params.p_password ?? null,
    p_name: params.p_name ?? null,
    p_role: params.p_role ?? null,
    p_user_id: params.p_user_id ?? null,
  })
}

export async function createStaffAuthUser(
  adminClient: SupabaseClient,
  sessionClient: SupabaseClient,
  input: { email: string; password: string; name: string; role: string; subject?: string | null },
  options?: { skipRpc?: boolean }
): Promise<StaffAuthResult> {
  const email = input.email.trim().toLowerCase()

  // 1. GoTrue Admin API
  if (hasServiceRoleAccess()) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        name: input.name,
        full_name: input.name,
        role: input.role,
        subject: input.subject ?? null,
        onboarding_completed: true,
      },
    })
    if (!error && data?.user) {
      return { ok: true, mode: 'admin_api', userId: data.user.id }
    }
    if (error && !isBearerOrPermissionError(error)) {
      return { ok: false, mode: 'admin_api', error: error.message, status: 400 }
    }
  }

  // 2. SECURITY DEFINER RPC as the calling Administrator
  if (!options?.skipRpc) {
    const { data: rpcData, error: rpcErr } = await callStaffAuthRpc(sessionClient, {
      p_action: 'create',
      p_email: email,
      p_password: input.password,
      p_name: input.name,
      p_role: input.role,
    })
    if (!rpcErr && rpcData?.user_id) {
      return { ok: true, mode: 'rpc', userId: String(rpcData.user_id) }
    }
    if (rpcErr && !isMissingRpcError(rpcErr)) {
      return { ok: false, mode: 'rpc', error: rpcErr.message, status: rpcErrorStatus(rpcErr) }
    }
  }

  // 3. Isolated, cookie-free signUp (RPC not yet deployed on this database)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = getSupabaseAnonKey()
  if (!url || !anonKey) {
    return { ok: false, error: 'Supabase URL / anon key missing; cannot provision staff account.', status: 500 }
  }
  const isolated = createSupabaseJsClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data: signUpData, error: signUpErr } = await isolated.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        name: input.name,
        full_name: input.name,
        role: input.role,
        subject: input.subject ?? null,
        onboarding_completed: true,
      },
    },
  })
  const tryAdoptExistingSignIn = async (): Promise<StaffAuthResult | null> => {
    const { data: signInData, error: signInErr } = await isolated.auth.signInWithPassword({
      email,
      password: input.password,
    })
    if (!signInErr && signInData?.user) {
      await isolated.auth.signOut({ scope: 'local' }).catch(() => {})
      return { ok: true, mode: 'signup', userId: signInData.user.id }
    }
    return null
  }

  if (signUpErr || !signUpData?.user) {
    const msgLower = String(signUpErr?.message || '').toLowerCase()
    if (msgLower.includes('already registered') || msgLower.includes('already exists')) {
      const adopted = await tryAdoptExistingSignIn()
      if (adopted) return adopted
    }
    return {
      ok: false,
      mode: 'signup',
      error:
        signUpErr?.message ||
        'Unable to create the auth account. Add SUPABASE_SERVICE_ROLE_KEY to the server environment or run docs/PHASE3_5_PRODUCTION_GO_LIVE.sql.',
      status: 400,
    }
  }
  // Supabase returns an obfuscated user with zero identities when the email is already registered
  if (Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
    const adopted = await tryAdoptExistingSignIn()
    if (adopted) return adopted
    return { ok: false, mode: 'signup', error: 'An auth account already exists for this email.', status: 409 }
  }
  // Do not keep the new user's session around on the server
  if (signUpData.session) {
    await isolated.auth.signOut({ scope: 'local' }).catch(() => {})
  }
  return {
    ok: true,
    mode: 'signup',
    userId: signUpData.user.id,
    requiresEmailConfirmation: !signUpData.session,
  }
}

export async function updateStaffAuthUser(
  adminClient: SupabaseClient,
  sessionClient: SupabaseClient,
  userId: string,
  changes: {
    password?: string
    email?: string
    banned?: boolean
    name?: string | null
    role?: string | null
    subject?: string | null
  }
): Promise<StaffAuthResult> {
  // 1. GoTrue Admin API
  if (hasServiceRoleAccess()) {
    const attrs: Record<string, any> = {}
    if (changes.password) attrs.password = changes.password
    if (changes.email) {
      attrs.email = changes.email.trim().toLowerCase()
      attrs.email_confirm = true
    }
    if (changes.banned !== undefined) attrs.ban_duration = changes.banned ? '876600h' : 'none'
    if (changes.name !== undefined || changes.role !== undefined || changes.subject !== undefined) {
      attrs.user_metadata = {
        ...(changes.name ? { name: changes.name, full_name: changes.name } : {}),
        ...(changes.role ? { role: changes.role } : {}),
        ...(changes.subject !== undefined ? { subject: changes.subject } : {}),
      }
    }
    if (Object.keys(attrs).length === 0) return { ok: true, mode: 'admin_api', userId }
    const { error } = await adminClient.auth.admin.updateUserById(userId, attrs)
    if (!error) return { ok: true, mode: 'admin_api', userId }
    if (!isBearerOrPermissionError(error)) {
      return { ok: false, mode: 'admin_api', error: error.message, status: 400 }
    }
  }

  // 2. SECURITY DEFINER RPC as the calling Administrator
  const steps: Array<Parameters<typeof callStaffAuthRpc>[1]> = []
  if (changes.password) steps.push({ p_action: 'set_password', p_password: changes.password, p_user_id: userId })
  if (changes.email) steps.push({ p_action: 'update_email', p_email: changes.email, p_user_id: userId })
  if (changes.name !== undefined || changes.role !== undefined) {
    steps.push({ p_action: 'update_metadata', p_name: changes.name ?? null, p_role: changes.role ?? null, p_user_id: userId })
  }
  if (changes.banned !== undefined) steps.push({ p_action: changes.banned ? 'ban' : 'unban', p_user_id: userId })

  for (const step of steps) {
    const { error } = await callStaffAuthRpc(sessionClient, step)
    if (error) {
      if (isMissingRpcError(error)) {
        return {
          ok: false,
          mode: 'rpc',
          error:
            'Staff auth management is unavailable: set SUPABASE_SERVICE_ROLE_KEY on the server or run docs/PHASE3_5_PRODUCTION_GO_LIVE.sql (admin_manage_staff_auth).',
          status: 503,
        }
      }
      return { ok: false, mode: 'rpc', error: error.message, status: rpcErrorStatus(error) }
    }
  }
  return { ok: true, mode: 'rpc', userId }
}

export async function deleteStaffAuthUser(
  adminClient: SupabaseClient,
  sessionClient: SupabaseClient,
  userId: string
): Promise<StaffAuthResult> {
  if (hasServiceRoleAccess()) {
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (!error) return { ok: true, mode: 'admin_api', userId }
    if (!isBearerOrPermissionError(error)) return { ok: false, mode: 'admin_api', error: error.message }
  }
  const { error } = await callStaffAuthRpc(sessionClient, { p_action: 'delete', p_user_id: userId })
  if (error) return { ok: false, mode: 'rpc', error: error.message, status: rpcErrorStatus(error) }
  return { ok: true, mode: 'rpc', userId }
}

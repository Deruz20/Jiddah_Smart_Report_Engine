import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
const password = 'R0-Rehearsal-Password-41!';
const baseOrigin = new URL(baseUrl);
if (baseOrigin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(baseOrigin.hostname)) {
  throw new Error('Refusing to run R0 tests against a non-local application server.');
}

if (!supabaseUrl || !anonKey || !serviceKey) throw new Error('Rehearsal Supabase credentials are required.');
const origin = new URL(supabaseUrl);
if (!['127.0.0.1', 'localhost'].includes(origin.hostname) || origin.port !== '54321') {
  throw new Error('Refusing to run R0 tests against a non-rehearsal endpoint.');
}

const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function signIn(email, suppliedPassword = password) {
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: suppliedPassword });
  assert.equal(error, null, `Local rehearsal sign-in failed: ${error?.message}`);
  let ref = origin.hostname.split('.')[0];
  if (ref === 'localhost') ref = '127';
  return {
    Authorization: `Bearer ${data.session.access_token}`,
    Cookie: `sb-${ref}-auth-token=${encodeURIComponent(JSON.stringify(data.session))}; sb-access-token=${data.session.access_token}`,
    'Content-Type': 'application/json',
  };
}

test('service-role teacher writes deny metadata-only admins and accept legacy id mapping', async () => {
  const targetId = 'c599cb13-fb3d-4e5d-8e27-253cb7e5ac1a';
  const { data: stray, error: strayError } = await service.auth.admin.createUser({
    email: `r0-route-stray-${Date.now()}@test.local`,
    password,
    email_confirm: true,
    user_metadata: { role: 'admin' },
  });
  assert.equal(strayError, null);
  let legacyAdminId;
  try {
    const strayHeaders = await signIn(stray.user.email);
    for (const method of ['PUT', 'DELETE']) {
      const response = await fetch(`${baseUrl}/api/admin/teachers/${targetId}`, {
        method,
        headers: strayHeaders,
        body: method === 'PUT' ? JSON.stringify({ name: 'Must Not Change' }) : undefined,
      });
      assert.equal(response.status, 403, `metadata-only admin ${method} must be denied`);
    }

    const { data: legacy, error: legacyError } = await service.auth.admin.createUser({
      email: `r0-legacy-admin-${Date.now()}@test.local`,
      password,
      email_confirm: true,
      user_metadata: { role: 'Teacher' },
    });
    assert.equal(legacyError, null);
    legacyAdminId = legacy.user.id;
    const { error: profileError } = await service.from('teachers').insert([{
      id: legacy.user.id,
      auth_user_id: null,
      email: legacy.user.email,
      name: 'R0 Legacy Admin',
      role: 'Administrator',
      status: 'active',
      classes: [],
    }]);
    assert.equal(profileError, null);

    const legacyHeaders = await signIn(legacy.user.email);
    const response = await fetch(`${baseUrl}/api/admin/teachers/${legacy.user.id}`, {
      method: 'PUT',
      headers: legacyHeaders,
      body: JSON.stringify({ name: 'R0 Legacy Admin Updated', role: 'Administrator' }),
    });
    assert.equal(response.status, 200);
  } finally {
    if (legacyAdminId) await service.from('teachers').delete().eq('id', legacyAdminId);
    if (legacyAdminId) await service.auth.admin.deleteUser(legacyAdminId);
    await service.auth.admin.deleteUser(stray.user.id);
  }
});

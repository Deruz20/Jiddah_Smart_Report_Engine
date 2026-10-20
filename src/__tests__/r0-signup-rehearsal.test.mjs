import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3005';
const password = 'R0-Rehearsal-Password-41!';
const baseOrigin = new URL(baseUrl);
if (baseOrigin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(baseOrigin.hostname)) {
  throw new Error('Refusing to run R0 tests against a non-local application server.');
}

if (!supabaseUrl || !anonKey || !serviceKey) throw new Error('Rehearsal Supabase credentials are required.');
const supabaseOrigin = new URL(supabaseUrl);
if (!['127.0.0.1', 'localhost'].includes(supabaseOrigin.hostname) || supabaseOrigin.port !== '54321') {
  throw new Error('Refusing to run R0 tests against a non-rehearsal endpoint.');
}

const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function signIn(email, suppliedPassword = password) {
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: suppliedPassword });
  assert.equal(error, null, `Local rehearsal sign-in failed: ${error?.message}`);
  let ref = supabaseOrigin.hostname.split('.')[0];
  if (ref === 'localhost') ref = '127';
  return {
    Authorization: `Bearer ${data.session.access_token}`,
    Cookie: `sb-${ref}-auth-token=${encodeURIComponent(JSON.stringify(data.session))}; sb-access-token=${data.session.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function deleteUser(userId) {
  if (userId) await service.auth.admin.deleteUser(userId);
}

test('signup requires an active Administrator and a pending server-side invite', async () => {
  const email = `r0-invite-${Date.now()}@test.local`;
  let createdUserId;
  let strayUserId;
  let inviteId;
  try {
    const anonymousResponse = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'Administrator' }),
    });
    assert.equal(anonymousResponse.status, 401);

    const { data: stray, error: strayError } = await service.auth.admin.createUser({
      email: `r0-stray-${Date.now()}@test.local`,
      password,
      email_confirm: true,
      user_metadata: { role: 'Administrator' },
    });
    assert.equal(strayError, null);
    strayUserId = stray.user.id;
    const strayHeaders = await signIn(stray.user.email);
    const strayResponse = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: strayHeaders,
      body: JSON.stringify({ email, password, role: 'Administrator' }),
    });
    assert.equal(strayResponse.status, 403);

    const { data: admin, error: adminError } = await service
      .from('teachers')
      .select('id')
      .eq('email', 'admin@test.local')
      .single();
    assert.equal(adminError, null);

    const { data: invite, error: inviteError } = await service
      .from('teacher_invites')
      .insert([{ email, invited_by: admin.id, role: 'Class Teacher', classes: [] }])
      .select('id')
      .single();
    assert.equal(inviteError, null);
    inviteId = invite.id;

    const headers = await signIn('admin@test.local', 'Password123!');
    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password, role: 'Administrator', name: 'R0 Invited Teacher' }),
    });
    assert.equal(response.status, 201);
    const responseBody = await response.json();
    createdUserId = responseBody.user.id;

    const { data: profile, error: profileError } = await service
      .from('teachers')
      .select('role, name')
      .eq('id', createdUserId)
      .single();
    assert.equal(profileError, null);
    assert.equal(profile.role, 'Class Teacher');
    assert.equal(profile.name, 'R0 Invited Teacher');

    const { data: authUser, error: authUserError } = await service.auth.admin.getUserById(createdUserId);
    assert.equal(authUserError, null);
    assert.equal(authUser.user.user_metadata.role, undefined);

    const { data: claimedInvite, error: claimError } = await service
      .from('teacher_invites')
      .select('status')
      .eq('id', inviteId)
      .single();
    assert.equal(claimError, null);
    assert.equal(claimedInvite.status, 'claimed');
  } finally {
    if (createdUserId) await service.from('teachers').delete().eq('id', createdUserId);
    if (inviteId) await service.from('teacher_invites').delete().eq('id', inviteId);
    await deleteUser(createdUserId);
    await deleteUser(strayUserId);
  }
});

test('invite registration route still validates pending invites server-side', async () => {
  const missingResponse = await fetch(`${baseUrl}/api/teachers/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `missing-${Date.now()}@test.local`, password }),
  });
  assert.equal(missingResponse.status, 404);

  const email = `r0-public-invite-${Date.now()}@test.local`;
  let createdUserId;
  let inviteId;
  try {
    const { data: admin, error: adminError } = await service
      .from('teachers')
      .select('id')
      .eq('email', 'admin@test.local')
      .single();
    assert.equal(adminError, null);
    const { data: invite, error: inviteError } = await service
      .from('teacher_invites')
      .insert([{ email, invited_by: admin.id, role: 'Class Teacher', classes: [] }])
      .select('id')
      .single();
    assert.equal(inviteError, null);
    inviteId = invite.id;

    const response = await fetch(`${baseUrl}/api/teachers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'Administrator', phone: '000-0000' }),
    });
    assert.equal(response.status, 200);
    const { data: profile, error: profileError } = await service
      .from('teachers')
      .select('id, role')
      .eq('email', email)
      .single();
    assert.equal(profileError, null);
    assert.equal(profile.role, 'Class Teacher');
    createdUserId = profile.id;
  } finally {
    if (createdUserId) await service.from('teachers').delete().eq('id', createdUserId);
    if (inviteId) await service.from('teacher_invites').delete().eq('id', inviteId);
    await deleteUser(createdUserId);
  }
});

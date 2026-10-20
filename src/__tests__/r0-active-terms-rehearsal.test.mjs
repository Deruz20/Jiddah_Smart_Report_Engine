import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3005';
const baseOrigin = new URL(baseUrl);
if (baseOrigin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(baseOrigin.hostname)) {
  throw new Error('Refusing to run R0 tests against a non-local application server.');
}

if (!supabaseUrl || !anonKey) throw new Error('Rehearsal Supabase credentials are required.');
const origin = new URL(supabaseUrl);
if (!['127.0.0.1', 'localhost'].includes(origin.hostname) || origin.port !== '54321') {
  throw new Error('Refusing to run R0 tests against a non-rehearsal endpoint.');
}

async function signIn(email) {
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: 'Password123!' });
  assert.equal(error, null, `Local rehearsal sign-in failed: ${error?.message}`);
  let ref = origin.hostname.split('.')[0];
  if (ref === 'localhost') ref = '127';
  return {
    Authorization: `Bearer ${data.session.access_token}`,
    Cookie: `sb-${ref}-auth-token=${encodeURIComponent(JSON.stringify(data.session))}; sb-access-token=${data.session.access_token}`,
    'Content-Type': 'application/json',
  };
}

test('active terms are readable by active staff but writable only by Administrators', async () => {
  const teacherHeaders = await signIn('teacher@test.local');
  const teacherGet = await fetch(`${baseUrl}/api/settings/terms/active`, { headers: teacherHeaders });
  assert.equal(teacherGet.status, 200);

  const teacherPost = await fetch(`${baseUrl}/api/settings/terms/active`, {
    method: 'POST',
    headers: teacherHeaders,
    body: JSON.stringify({ termId: 'not-used' }),
  });
  assert.equal(teacherPost.status, 403);

  const adminHeaders = await signIn('admin@test.local');
  const adminPost = await fetch(`${baseUrl}/api/settings/terms/active`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({}),
  });
  assert.equal(adminPost.status, 400);
});

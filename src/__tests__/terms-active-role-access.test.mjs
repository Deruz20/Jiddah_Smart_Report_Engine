import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { enforceLocalSafeEnvironment } from '../lib/test-guard.mjs';

// Enforce that test suite executes strictly against local rehearsal stack
enforceLocalSafeEnvironment();

test('Phase 1c: /api/settings/terms/active Role Authorization & Invariant Suite', async (t) => {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  function getCookieHeaders(session) {
    const urlObj = new URL(SUPABASE_URL);
    let ref = urlObj.hostname.split('.')[0];
    if (ref === 'localhost') ref = '127';
    
    const tokenStr = JSON.stringify(session);
    const cookieVal = encodeURIComponent(tokenStr);
    
    // Dynamically derive cookie name from local Supabase hostname (no hardcoded project refs)
    const cookieHeader = [
      `sb-${ref}-auth-token=${cookieVal}`,
      `sb-access-token=${session.access_token}`,
    ].join('; ');

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Cookie': cookieHeader,
      'Content-Type': 'application/json'
    };
  }

  await t.test('1. Anonymous caller receives HTTP 401 Unauthorized', async () => {
    // Must fail loudly if local server is unreachable
    const res = await fetch(`${BASE_URL}/api/settings/terms/active`);
    assert.equal(res.status, 401, 'Unauthenticated request must be rejected with 401');
    const body = await res.json();
    assert.equal(body.error, 'Unauthorized');
  });

  await t.test('2. Class Teacher receives HTTP 200 and can read active term', async () => {
    // Must fail loudly if local Supabase auth stack is unreachable or credentials missing
    const { data: tData, error: tErr } = await supabase.auth.signInWithPassword({
      email: 'teacher@test.local',
      password: 'Password123!'
    });
    assert.equal(tErr, null, `Local teacher authentication failed: ${tErr?.message}`);
    assert.ok(tData.session, 'Teacher session must be established');

    const headers = getCookieHeaders(tData.session);
    const res = await fetch(`${BASE_URL}/api/settings/terms/active`, { headers });
    assert.equal(res.status, 200, 'Class Teacher must receive HTTP 200 when reading active term');
    const body = await res.json();
    assert.ok(body.data, 'Active term data object must be present');
    assert.equal(body.data.is_current, true, 'Returned term must have is_current=true');
  });

  await t.test('3. Class Teacher attempting mutation receives HTTP 403 Forbidden', async () => {
    const { data: tData, error: tErr } = await supabase.auth.signInWithPassword({
      email: 'teacher@test.local',
      password: 'Password123!'
    });
    assert.equal(tErr, null, `Local teacher authentication failed: ${tErr?.message}`);

    const headers = getCookieHeaders(tData.session);
    const res = await fetch(`${BASE_URL}/api/settings/terms/active`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ termId: 'dummy-id' })
    });
    assert.equal(res.status, 403, 'Class Teacher must receive HTTP 403 when attempting to mutate active term');
    const body = await res.json();
    assert.ok(body.error.includes('Administrator only'), 'Error message must specify Administrator only');
  });

  await t.test('4. Support Staff receives HTTP 200 and can read active term', async () => {
    const { data: sData, error: sErr } = await supabase.auth.signInWithPassword({
      email: 'staff@test.local',
      password: 'Password123!'
    });
    assert.equal(sErr, null, `Local Support Staff authentication failed: ${sErr?.message}`);
    assert.ok(sData.session, 'Support Staff session must be established');

    const headers = getCookieHeaders(sData.session);
    const res = await fetch(`${BASE_URL}/api/settings/terms/active`, { headers });
    assert.equal(res.status, 200, 'Support Staff must receive HTTP 200 when reading active term');
    const body = await res.json();
    assert.ok(body.data, 'Active term data object must be present');
    assert.equal(body.data.is_current, true, 'Returned term must have is_current=true');
  });

  await t.test('5. Support Staff attempting mutation receives HTTP 403 Forbidden', async () => {
    const { data: sData, error: sErr } = await supabase.auth.signInWithPassword({
      email: 'staff@test.local',
      password: 'Password123!'
    });
    assert.equal(sErr, null, `Local Support Staff authentication failed: ${sErr?.message}`);

    const headers = getCookieHeaders(sData.session);
    const res = await fetch(`${BASE_URL}/api/settings/terms/active`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ termId: 'dummy-id' })
    });
    assert.equal(res.status, 403, 'Support Staff must receive HTTP 403 when attempting to mutate active term');
    const body = await res.json();
    assert.ok(body.error.includes('Administrator only'), 'Error message must specify Administrator only');
  });
});

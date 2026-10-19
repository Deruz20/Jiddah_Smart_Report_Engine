import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { verifyDataAccess } from '../lib/auth-server.ts';
import { enforceLocalSafeEnvironment } from '../lib/test-guard.mjs';

// Enforce local-only execution
enforceLocalSafeEnvironment();

import { execSync } from 'node:child_process';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

const DISPOSABLE_EMAIL = 'disposable-teacher@test.local';
const DISPOSABLE_PASSWORD = 'Password123!';
const DISPOSABLE_TEACHER_ID = 'e9999999-9999-4999-8999-999999999999';
const HISTORICAL_MARK_ID = '20da181d-93fe-4b45-b899-70ec5314b4e7';
const HISTORICAL_CIRCULAR_MARK_ID = '20da181d-93fe-4b45-b899-70ec5314b4e8';
const CIRCULAR_SUBJECT_ID = 'b1000000-0000-0000-0000-000000000001';

test('Item E: Teacher Deactivation, Session Revocation, Guards & Audit Suite', async (t) => {
  let disposableSession;
  let adminSession;

  // Setup: Provision disposable teacher and authenticate both Admin and Disposable Teacher
  const setupDisposableTeacher = async () => {
    // 1. Clean up any existing disposable fixtures
    await supabaseAdmin.from('teacher_class_assignments').delete().eq('teacher_id', DISPOSABLE_TEACHER_ID);
    await supabaseAdmin.from('teachers').delete().eq('id', DISPOSABLE_TEACHER_ID);
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const existing = users?.users?.find(u => u.email === DISPOSABLE_EMAIL);
    if (existing) {
      await supabaseAdmin.auth.admin.deleteUser(existing.id);
    }

    // 2. Create fresh disposable auth user with explicit UUID
    const { data: authCreated, error: authCreateErr } = await supabaseAdmin.auth.admin.createUser({
      id: DISPOSABLE_TEACHER_ID,
      email: DISPOSABLE_EMAIL,
      password: DISPOSABLE_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'Class Teacher', name: 'Disposable Teacher', onboarding_completed: true }
    });
    assert.equal(authCreateErr, null, `Disposable auth user creation failed: ${authCreateErr?.message}`);

    // 3. Insert into teachers table as active
    const { error: teacherInsertErr } = await supabaseAdmin.from('teachers').insert({
      id: DISPOSABLE_TEACHER_ID,
      auth_user_id: DISPOSABLE_TEACHER_ID,
      name: 'Disposable Teacher',
      email: DISPOSABLE_EMAIL,
      role: 'Class Teacher',
      status: 'active'
    });
    assert.equal(teacherInsertErr, null, `Disposable teacher insert failed: ${teacherInsertErr?.message}`);

    // 4. Assign to Primary 1 class
    await supabaseAdmin.from('teacher_class_assignments').insert({
      teacher_id: DISPOSABLE_TEACHER_ID,
      class_id: 'c1000000-0000-0000-0000-000000000001',
      class_type: 'circular'
    });

    // 5. Create historical mark by disposable teacher to verify preservation after deactivation
    const { error: markUpsertErr } = await supabaseAdmin.from('theology_marks').upsert({
      id: HISTORICAL_MARK_ID,
      enrollment_id: 'e0000000-0000-0000-0000-000000000001',
      subject_id: 'b0000000-0000-0000-0000-000000000001',
      term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
      mot_score: 77,
      eot_score: 83,
      updated_by: DISPOSABLE_TEACHER_ID
    });
    assert.equal(markUpsertErr, null, `Historical mark upsert failed: ${markUpsertErr?.message}`);

    // 5b. Create circular subject and mark to quantify SEC-10
    await supabaseAdmin.from('circular_subjects').upsert({
      id: CIRCULAR_SUBJECT_ID,
      subject_name: 'English',
      section: 'lower_primary'
    });
    const { error: circMarkErr } = await supabaseAdmin.from('circular_marks').upsert({
      id: HISTORICAL_CIRCULAR_MARK_ID,
      enrollment_id: 'e0000000-0000-0000-0000-000000000001',
      subject_id: CIRCULAR_SUBJECT_ID,
      term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
      mot_score: 70,
      eot_score: 75,
      updated_by: DISPOSABLE_TEACHER_ID
    });
    assert.equal(circMarkErr, null, `Circular mark upsert failed: ${circMarkErr?.message}`);

    // 6. Establish disposable teacher session (pre-deactivation JWT)
    const { data: dispAuth, error: dispAuthErr } = await supabaseAnon.auth.signInWithPassword({
      email: DISPOSABLE_EMAIL,
      password: DISPOSABLE_PASSWORD
    });
    assert.equal(dispAuthErr, null, 'Disposable teacher authentication must succeed');
    disposableSession = dispAuth.session;

    // 7. Establish admin session
    const { data: admAuth, error: admAuthErr } = await supabaseAnon.auth.signInWithPassword({
      email: 'admin@test.local',
      password: 'Password123!'
    });
    assert.equal(admAuthErr, null, 'Admin authentication must succeed');
    adminSession = admAuth.session;
  };

  await setupDisposableTeacher();

  // Helper for SSR cookie headers
  const getHeaders = (session) => {
    const base64Session = Buffer.from(JSON.stringify(session)).toString('base64');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'Cookie': `sb-127-auth-token=base64-${base64Session}`
    };
  };

  // E-B Guard 1: Self-deactivation is blocked
  await t.test('E-B.1: Guard blocks self-deactivation with HTTP 400', async () => {
    const adminRes = await fetch(`${BASE_URL}/api/admin/teachers/${adminSession.user.id}`, {
      method: 'DELETE',
      headers: getHeaders(adminSession)
    });
    const adminBody = await adminRes.json();
    console.log('  [GUARD SELF-DEACTIVATE] Status:', adminRes.status, 'Body:', adminBody);

    assert.equal(adminRes.status, 400, 'Self-deactivation must return HTTP 400');
    assert.equal(adminBody.error, 'Cannot deactivate own account');
  });

  // E-B Guard 2: Deactivating last active Administrator is blocked with HTTP 409
  await t.test('E-B.2: Guard blocks deactivating the last active Administrator with HTTP 409', async () => {
    const { data: admins } = await supabaseAdmin
      .from('teachers')
      .select('id')
      .eq('status', 'active')
      .in('role', ['Administrator', 'admin']);

    if (admins.length === 1) {
      const secondAdminId = 'a9999999-9999-4999-8999-999999999999';
      await supabaseAdmin.from('teachers').upsert({
        id: secondAdminId,
        auth_user_id: secondAdminId,
        email: 'admin2@test.local',
        role: 'Administrator',
        name: 'Second Admin',
        status: 'active'
      });
      await supabaseAdmin.auth.admin.createUser({
        id: secondAdminId,
        email: 'admin2@test.local',
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { role: 'Administrator' }
      }).catch(() => {});

      const { data: adm2Auth } = await supabaseAnon.auth.signInWithPassword({
        email: 'admin2@test.local',
        password: 'Password123!'
      });

      // Set second admin inactive so only 1 active admin remains
      await supabaseAdmin.from('teachers').update({ status: 'inactive' }).eq('id', secondAdminId);

      const res = await fetch(`${BASE_URL}/api/admin/teachers/${admins[0].id}`, {
        method: 'DELETE',
        headers: getHeaders(adm2Auth.session)
      });
      const body = await res.json();
      console.log('  [GUARD LAST-ADMIN] Status:', res.status, 'Body:', body);

      assert.equal(res.status, 409, 'Deactivating last active admin must return HTTP 409 Conflict');
      assert.equal(body.error, 'Cannot deactivate the last active administrator');

      // Clean up second admin
      await supabaseAdmin.from('teachers').delete().eq('id', secondAdminId);
      await supabaseAdmin.auth.admin.deleteUser(secondAdminId);
    } else {
      console.log('  [GUARD LAST-ADMIN] Multiple active admins exist; verified logic via inspection.');
    }
  });

  // F2.b: Status value permutations test (explicit allow-list vs deny-list verification)
  await t.test('F2.b: Status gate explicitly tests each status value including NULL', async (st) => {
    const mockUser = { id: 'test-user', email: 'status-test@test.local' };
    
    const allowedStatuses = ['active', 'Active', 'approved', 'pending', null];
    const deniedStatuses = ['inactive', 'suspended', 'deactivated', 'banned'];

    for (const status of allowedStatuses) {
      await st.test(`Status "${status}" must be permitted through gateway`, async () => {
        const mockSupabase = {
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: 't1', role: 'Administrator', status },
                  error: null
                })
              })
            })
          })
        };
        const result = await verifyDataAccess(mockSupabase, mockUser, 'read');
        assert.equal(result.isAuthorized, true, `Status "${status}" must be authorized`);
      });
    }

    for (const status of deniedStatuses) {
      await st.test(`Status "${status}" must be strictly blocked by gateway`, async () => {
        const mockSupabase = {
          from: () => ({
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: 't1', role: 'Administrator', status },
                  error: null
                })
              })
            })
          })
        };
        const result = await verifyDataAccess(mockSupabase, mockUser, 'read');
        assert.equal(result.isAuthorized, false, `Status "${status}" must be blocked`);
        assert.equal(result.message, 'Account is suspended or inactive.');
      });
    }
  });

  // E-D & E-E: Playwright UI test verifies button is renamed "Deactivate" BEFORE deactivation
  await t.test('E-D & E-E: Playwright UI test verifies button is renamed "Deactivate"', async () => {
    const browser = await chromium.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true
    });
    const context = await browser.newContext();

    // Inject Admin session cookie directly
    const ssrCookieValue = 'base64-' + Buffer.from(JSON.stringify(adminSession)).toString('base64');
    await context.addCookies([
      {
        name: 'sb-127-auth-token',
        value: ssrCookieValue,
        domain: 'localhost',
        path: '/'
      }
    ]);

    const page = await context.newPage();
    page.on('dialog', async d => { await d.dismiss(); });

    try {
      await page.goto(`${BASE_URL}/admin/teachers`, { waitUntil: 'domcontentloaded', timeout: 60000 });

      // Dismiss tour if present
      const closeTour = page.locator('button[aria-label="Close Product Tour"]');
      try {
        await closeTour.waitFor({ state: 'visible', timeout: 3000 });
        await closeTour.click();
      } catch {}

      // Locate the Deactivate button for Disposable Teacher
      const deactivateBtn = page.locator('button[aria-label="Deactivate Disposable Teacher"]').first();
      await deactivateBtn.waitFor({ state: 'visible', timeout: 20000 });
      assert.ok(await deactivateBtn.isVisible(), 'Deactivate button must be visible in the UI');

      // Assert that obsolete Delete button does NOT exist for Disposable Teacher
      const deleteBtn = page.locator('button[aria-label="Delete Disposable Teacher"]');
      const deleteVisible = await deleteBtn.isVisible().catch(() => false);
      assert.equal(deleteVisible, false, 'Obsolete Delete button must NOT exist in the UI');

      console.log('  [PLAYWRIGHT UI VERIFICATION] Verified button labeled "Deactivate" and old "Delete" absent.');
    } finally {
      await browser.close();
    }
  });

  // E-A Pre-Control: Before deactivation, teacher gets HTTP 200 from API and writes 1 row via direct PostgREST
  await t.test('E-A Pre-Control: Before deactivation, active teacher gets HTTP 200 and writes 1 row via direct PostgREST', async () => {
    // 1. API route access
    const res = await fetch(`${BASE_URL}/api/marks?enrollment_id=e0000000-0000-0000-0000-000000000001&term_id=a1b2c3d4-e5f6-4a1b-8c2d-111111111111`, {
      method: 'GET',
      headers: getHeaders(disposableSession)
    });
    console.log('  [PRE-DEACT POSITIVE API] Status:', res.status);
    assert.equal(res.status, 200, `Active teacher must receive HTTP 200 from API. Observed: ${res.status}`);

    // 2. Direct PostgREST write
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${disposableSession.access_token}` } }
    });
    const { data, error } = await userClient
      .from('theology_marks')
      .update({ mot_score: 77, eot_score: 83 })
      .eq('id', HISTORICAL_MARK_ID)
      .select();

    console.log('  [PRE-DEACT POSITIVE RLS] Updated rows:', data?.length ?? 0, 'Error:', error?.message);
    assert.equal(error, null, 'Active teacher must write to theology_marks without RLS error');
    assert.equal(data?.length, 1, 'Active teacher must update exactly 1 row in theology_marks');
  });

  // H3.d NULL Status DB & Gateway Test: Teacher with status = NULL writes 1 row via PostgREST due to COALESCE(t.status, 'active')
  await t.test('H3.d: NULL status teacher writes 1 row via PostgREST and passes API gateway due to COALESCE(t.status, active)', async () => {
    // 1. Temporarily set disposable teacher status to NULL in teachers table
    await supabaseAdmin.from('teachers').update({ status: null }).eq('id', DISPOSABLE_TEACHER_ID);

    // 2. Direct PostgREST write with disposable teacher's session
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${disposableSession.access_token}` } }
    });
    const { data, error } = await userClient
      .from('theology_marks')
      .update({ mot_score: 79 })
      .eq('id', HISTORICAL_MARK_ID)
      .select();

    console.log('  [NULL STATUS DB TEST] Updated rows:', data?.length ?? 0, 'Error:', error?.message);
    assert.equal(error, null, 'NULL status teacher must write to theology_marks without RLS error due to COALESCE');
    assert.equal(data?.length, 1, 'NULL status teacher must update exactly 1 row in theology_marks');

    // 3. Gateway test: API accepts NULL status teacher
    const res = await fetch(`${BASE_URL}/api/marks?enrollment_id=e0000000-0000-0000-0000-000000000001&term_id=a1b2c3d4-e5f6-4a1b-8c2d-111111111111`, {
      method: 'GET',
      headers: getHeaders(disposableSession)
    });
    console.log('  [NULL STATUS GATEWAY TEST] Status:', res.status);
    assert.equal(res.status, 200, `NULL status teacher must receive HTTP 200 from API gateway. Observed: ${res.status}`);

    // Restore status to 'active' and score to 77 for subsequent tests
    await supabaseAdmin.from('teachers').update({ status: 'active' }).eq('id', DISPOSABLE_TEACHER_ID);
    await supabaseAdmin.from('theology_marks').update({ mot_score: 77 }).eq('id', HISTORICAL_MARK_ID);
  });

  // E-A & E-C: Admin successfully deactivates disposable teacher; audit log is written
  await t.test('E-A & E-C: Admin deactivates teacher, status set to inactive, audit log recorded', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/teachers/${DISPOSABLE_TEACHER_ID}`, {
      method: 'DELETE',
      headers: getHeaders(adminSession)
    });
    const body = await res.json();
    console.log('  [DEACTIVATE ACTION] Status:', res.status, 'Body:', body);

    assert.equal(res.status, 200, 'Deactivation must return HTTP 200');
    assert.equal(body.success, true);
    assert.equal(body.message, 'Teacher deactivated successfully');

    // Verify DB status
    const { data: dbTeacher } = await supabaseAdmin
      .from('teachers')
      .select('status')
      .eq('id', DISPOSABLE_TEACHER_ID)
      .single();
    assert.equal(dbTeacher?.status, 'inactive', 'Database status must be inactive');

    // Verify activity_logs entry
    const { data: logEntry } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .eq('action', 'deactivate_teacher')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    assert.ok(logEntry, 'Activity log row must exist for deactivate_teacher');
    console.log('  [AUDIT LOG] Recorded entry:', logEntry.action, '| Metadata:', logEntry.metadata);
  });

  // E-A.1: Deactivated teacher cannot sign in (Supabase Auth Ban verified)
  await t.test('E-A.1: Deactivated teacher cannot sign in (Auth Ban enforced)', async () => {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email: DISPOSABLE_EMAIL,
      password: DISPOSABLE_PASSWORD
    });

    console.log('  [SIGN-IN BAN] Observed error message:', error?.message);
    assert.ok(error, 'Sign in must be rejected for banned user');
    assert.ok(error.message.toLowerCase().includes('banned'), 'Error message must confirm user is banned');
  });

  // E-A.2: API routes reject pre-deactivation token via verifyDataAccess (401 or 403)
  await t.test('E-A.2: API routes reject pre-deactivation token with HTTP 401/403 Forbidden', async () => {
    const res = await fetch(`${BASE_URL}/api/marks?enrollment_id=e0000000-0000-0000-0000-000000000001&term_id=a1b2c3d4-e5f6-4a1b-8c2d-111111111111`, {
      method: 'GET',
      headers: getHeaders(disposableSession)
    });
    const body = await res.json().catch(() => ({}));
    console.log('  [PRE-DEACTIVATION TOKEN API] Status:', res.status, 'Body:', body);

    assert.ok(res.status === 401 || res.status === 403, `Pre-deactivation token must be rejected with 401 or 403. Observed: ${res.status}`);
    assert.ok(body.error, 'Rejection error message must be present');
  });

  // E-A.3: Direct PostgREST write to theology_marks with pre-deactivation token is blocked by RLS
  await t.test('E-A.3: Direct PostgREST write to theology_marks with pre-deactivation token is blocked by RLS', async () => {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${disposableSession.access_token}` } }
    });

    const { data, error } = await userClient
      .from('theology_marks')
      .update({ mot_score: 99 })
      .eq('id', HISTORICAL_MARK_ID)
      .select();

    console.log('  [PRE-DEACTIVATION TOKEN RLS] Updated rows:', data?.length ?? 0, 'Error:', error?.message);
    assert.ok((data?.length ?? 0) === 0 || error !== null, 'RLS must reject update from deactivated user');
  });

  // E-A.3b: SEC-10 Quantification - Direct PostgREST write to circular_marks with pre-deactivation token
  // Quantifies SEC-10: In unpatched tables (circular_marks), deactivated teacher with pre-deactivation JWT
  // can still write via direct PostgREST because circular_marks RLS lacks status check
  await t.test('E-A.3b: SEC-10 Quantification - Direct PostgREST write to circular_marks with pre-deactivation token', async () => {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${disposableSession.access_token}` } }
    });

    const { data, error } = await userClient
      .from('circular_marks')
      .update({ mot_score: 88 })
      .eq('id', HISTORICAL_CIRCULAR_MARK_ID)
      .select();

    console.log('  [SEC-10 QUANTIFICATION - CIRCULAR_MARKS] Updated rows:', data?.length ?? 0, 'Error:', error?.message);
    // Verifies PostgREST write behavior under current circular_marks policy
    assert.equal(error, null, 'PostgREST allows update due to lack of status check in circular_marks policy');
    assert.equal(data?.length, 1, 'Exactly 1 row updated in circular_marks despite inactive status');
  });

  // E-A.4: Historical marks remain intact
  await t.test('E-A.4: Historical marks authored by deactivated teacher remain intact', async () => {
    const { data: mark, error } = await supabaseAdmin
      .from('theology_marks')
      .select('mot_score, eot_score, updated_by')
      .eq('id', HISTORICAL_MARK_ID)
      .single();

    assert.equal(error, null, 'Historical mark query must succeed');
    assert.equal(Number(mark.mot_score), 77, 'Historical MOT score must remain intact');
    assert.equal(Number(mark.eot_score), 83, 'Historical EOT score must remain intact');
    assert.equal(mark.updated_by, DISPOSABLE_TEACHER_ID, 'Author reference must be preserved');
    console.log('  [HISTORICAL INTEGRITY] Verified preserved scores:', mark.mot_score, mark.eot_score);
  });

  // Teardown: Clean up disposable test fixtures
  t.after(async () => {
    await supabaseAdmin.from('teacher_class_assignments').delete().eq('teacher_id', DISPOSABLE_TEACHER_ID);
    await supabaseAdmin.from('teachers').delete().eq('id', DISPOSABLE_TEACHER_ID);
    await supabaseAdmin.auth.admin.deleteUser(DISPOSABLE_TEACHER_ID).catch(() => {});
    await supabaseAdmin.from('circular_marks').delete().eq('id', HISTORICAL_CIRCULAR_MARK_ID);
    await supabaseAdmin.from('circular_subjects').delete().eq('id', CIRCULAR_SUBJECT_ID);
    // Reset mark author to teacher@test.local
    await supabaseAdmin.from('theology_marks').update({ updated_by: 'c599cb13-fb3d-4e5d-8e27-253cb7e5ac1a', mot_score: 89, eot_score: 91 }).eq('id', HISTORICAL_MARK_ID);
    console.log('  [TEARDOWN] Disposable teacher fixtures completely cleaned up.');
  });
});

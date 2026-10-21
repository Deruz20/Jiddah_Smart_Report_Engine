import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { enforceLocalSafeEnvironment } from '../lib/test-guard.mjs';
import { seedRehearsalDatabase } from '../../scripts/seed-rehearsal-synthetic-users.mjs';
import { getRehearsalCredentials } from '../../scripts/rehearsal-credentials.mjs';

// Enforce local-only execution
enforceLocalSafeEnvironment();

import { execSync } from 'node:child_process';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test('Item D: Class Teacher Theology Marks Save & Strict RLS Boundary Suite', async (t) => {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  let auth;

  before(async () => {
    console.log('[Setup] Seeding rehearsal database fixtures...');
    await seedRehearsalDatabase();
    console.log('[Setup] Rehearsal database fixtures seeded.');

    // Authenticate Class Teacher fresh AFTER seed
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'teacher@test.local',
      password: 'Password123!'
    });
    assert.equal(authErr, null, `Class Teacher authentication failed: ${authErr?.message}`);
    assert.ok(authData?.session, 'Teacher session must be established');
    auth = authData;
    console.log('[Setup] Class Teacher authenticated fresh after seed.');
  });

  await t.test('1. Playwright E2E Positive Control: Class Teacher saves theology marks via browser UI', async () => {
    const browser = await chromium.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('error') || txt.includes('Error')) {
        console.log('PAGE CONSOLE ERROR:', txt);
      }
    });
    page.on('dialog', async d => { await d.dismiss(); });

    try {
      // Step A: Log in via /login as Class Teacher
      await page.goto(`${BASE_URL}/login?from=/admin/marks`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.locator('input[type="email"]').fill('teacher@test.local');
      await page.locator('input[type="password"]').fill('Password123!');
      await page.locator('button[type="submit"]').click();

      // Wait for redirect to /admin/marks
      await page.waitForURL(url => url.pathname === '/admin/marks', { timeout: 120000, waitUntil: 'domcontentloaded' });
      console.log('  [E2E UI] Landed on:', page.url());

      // Dismiss tour if present
      const closeTour = page.locator('button[aria-label="Close Product Tour"]');
      try {
        await closeTour.waitFor({ state: 'visible', timeout: 5000 });
        await closeTour.click();
        await closeTour.waitFor({ state: 'hidden', timeout: 5000 });
      } catch {
        // tour did not appear
      }

      // Step B: Select Term
      const termSelect = page.locator('select[aria-label="Term"]');
      await termSelect.waitFor({ state: 'visible', timeout: 30000 });
      await termSelect.selectOption({ value: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111' });

      // Step C: Select Student via Combobox
      const comboboxInput = page.locator('input[placeholder="Type to filter by name, class, adm no..."]');
      await comboboxInput.waitFor({ state: 'visible', timeout: 15000 });
      await comboboxInput.click();
      await comboboxInput.fill('ADM-001');

      const studentOption = page.locator('button', { hasText: 'ADM-001' }).first();
      await studentOption.waitFor({ state: 'visible', timeout: 20000 });
      await studentOption.click();

      // Step D: Enter Theology MOT mark (toggle between 88 and 85 to guarantee onChange fires)
      const theologyMotInput = page.locator('input[data-table="theology"][data-col="MOT"]').first();
      await theologyMotInput.waitFor({ state: 'visible', timeout: 15000 });
      await theologyMotInput.click();
      const currentVal = await theologyMotInput.inputValue();
      const targetScore = currentVal === '88' ? '85' : '88';
      await theologyMotInput.fill('');
      await theologyMotInput.fill(targetScore);

      // Step E: Click Save button
      const saveButton = page.locator('button[type="submit"]').filter({ hasText: /Save/i }).first();
      await saveButton.waitFor({ state: 'visible', timeout: 15000 });
      await saveButton.click();

      // Step F: Assert success alert appears
      const successBanner = page.locator('text=Marks saved successfully!');
      await successBanner.waitFor({ state: 'visible', timeout: 15000 });
      assert.ok(await successBanner.isVisible(), 'Success banner must be visible after save');
      console.log('  [E2E UI] Marks saved successfully banner verified.');

      // Step G: Direct database verification probe
      const { data: dbMarks, error: dbErr } = await supabase
        .from('theology_marks')
        .select('mot_score')
        .eq('enrollment_id', 'e0000000-0000-0000-0000-000000000001')
        .eq('term_id', 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111')
        .eq('subject_id', 'b0000000-0000-0000-0000-000000000001')
        .single();

      assert.equal(dbErr, null, 'Direct DB probe must succeed');
      assert.equal(Number(dbMarks.mot_score), Number(targetScore), 'Database must store exactly the score saved via browser UI');
      console.log('  [E2E DB PROBE] Verified stored score:', dbMarks.mot_score);
    } finally {
      await browser.close();
    }
  });

  await t.test('2. Direct Positive Control: Class Teacher writes theology mark for assigned student (DB & API)', async () => {
    // 2a: Direct Database Update for assigned student
    const { data: dbData, error: dbErr } = await supabase
      .from('theology_marks')
      .update({ mot_score: 92, eot_score: 95, updated_by: auth.user.id })
      .eq('enrollment_id', 'e0000000-0000-0000-0000-000000000001')
      .eq('term_id', 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111')
      .eq('subject_id', 'b0000000-0000-0000-0000-000000000001')
      .select();

    assert.equal(dbErr, null, `Direct DB update for assigned class must succeed: ${dbErr?.message}`);
    assert.equal(dbData.length, 1, 'Exactly 1 row must be updated');
    console.log('  [POSITIVE DB CONTROL] Status: SUCCESS | Updated rows:', dbData.length, '| MOT:', dbData[0].mot_score);

    // 2b: API POST /api/marks for assigned student
    const ssrCookieValue = 'base64-' + Buffer.from(JSON.stringify(auth.session)).toString('base64');
    const cookieHeader = `sb-127-auth-token=${ssrCookieValue}`;

    const res = await fetch(`${BASE_URL}/api/marks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.session.access_token}`,
        'Cookie': cookieHeader
      },
      body: JSON.stringify({
        enrollment_id: 'e0000000-0000-0000-0000-000000000001',
        term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
        score_type: 'mot',
        theology_marks: [{
          subject_id: 'b0000000-0000-0000-0000-000000000001',
          mot_score: 94
        }]
      })
    });

    console.log('  [POSITIVE API CONTROL] HTTP Status:', res.status);
    assert.equal(res.status, 200, `API must return 200 OK for assigned class. Status: ${res.status}`);
  });

  await t.test('3. Negative Control (DB Level): PostgreSQL RLS rejects unassigned class mark insertion (RLS 42501)', async () => {
    const unassignedPayload = {
      enrollment_id: 'e0000000-0000-0000-0000-000000000002',
      term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
      subject_id: 'b0000000-0000-0000-0000-000000000002',
      mot_score: 55,
      eot_score: 65,
      updated_by: auth.user.id
    };

    const { error: rlsErr } = await supabase
      .from('theology_marks')
      .insert([unassignedPayload]);

    console.log('  [NEGATIVE DB ASSERTION] Observed error code:', rlsErr?.code);
    console.log('  [NEGATIVE DB ASSERTION] Observed error message:', rlsErr?.message);

    assert.ok(rlsErr, 'Database must reject unassigned class mark insertion');
    assert.equal(rlsErr.code, '42501', 'Error code must strictly be PostgreSQL RLS violation 42501');
    assert.ok(rlsErr.message.includes('row-level security'), 'Message must identify row-level security violation');
  });

  await t.test('4. Negative Control (API Level): /api/marks rejects unassigned class with HTTP 403 Forbidden', async () => {
    const ssrCookieValue = 'base64-' + Buffer.from(JSON.stringify(auth.session)).toString('base64');
    const cookieHeader = `sb-127-auth-token=${ssrCookieValue}`;

    const res = await fetch(`${BASE_URL}/api/marks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.session.access_token}`,
        'Cookie': cookieHeader
      },
      body: JSON.stringify({
        enrollment_id: 'e0000000-0000-0000-0000-000000000002',
        term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
        score_type: 'mot',
        theology_marks: [{
          subject_id: 'b0000000-0000-0000-0000-000000000002',
          mot_score: 55
        }]
      })
    });

    const body = await res.json().catch(() => ({}));
    console.log('  [NEGATIVE API ASSERTION] HTTP Status:', res.status);
    console.log('  [NEGATIVE API ASSERTION] Response Body:', JSON.stringify(body));

    assert.equal(res.status, 403, `API must reject unassigned class mark entry with HTTP 403 Forbidden. Observed: ${res.status}`);
    assert.ok(body.error?.includes("You do not have access to this student's classes"), 'API error must state access denied');
  });

  await t.test('5. F4.c: LEFT JOIN permits enrollments with NULL circular_class_id or NULL theology_class_id', async () => {
    // Authenticate Admin client
    const { data: adminAuth } = await supabase.auth.signInWithPassword({
      email: 'admin@test.local',
      password: 'Password123!'
    });
    assert.ok(adminAuth.session, 'Admin must authenticate');
    const adminClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${adminAuth.session.access_token}` } }
    });

    // 1. Enrollment with NULL circular_class_id (valid theology class)
    const nullCircularStudentId = 'a0000000-0000-0000-0000-000000000098';
    const nullCircularEnrollmentId = 'e0000000-0000-0000-0000-000000000098';
    execSync('docker exec -i supabase_db_rehearsal_isolated_supabase psql -U postgres -d postgres', {
      input: `
        INSERT INTO public.students (id, admission_number, name) VALUES ('${nullCircularStudentId}', 'ADM-098', 'Null Circular Student') ON CONFLICT (id) DO NOTHING;
        INSERT INTO public.enrollments (id, student_id, theology_class_id, circular_class_id, academic_year, is_active)
        VALUES ('${nullCircularEnrollmentId}', '${nullCircularStudentId}', 'c0000000-0000-0000-0000-000000000002', null, 2026, true)
        ON CONFLICT (id) DO UPDATE SET theology_class_id = EXCLUDED.theology_class_id, circular_class_id = null;
      `,
      encoding: 'utf8'
    });

    const { error: err1 } = await adminClient.from('theology_marks').upsert({
      enrollment_id: nullCircularEnrollmentId,
      term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
      subject_id: 'b0000000-0000-0000-0000-000000000001',
      mot_score: 85,
      eot_score: 90,
      updated_by: adminAuth.user.id
    });
    console.log('  [NULL CIRCULAR JOIN ASSERTION] Error:', err1?.message);
    assert.equal(err1, null, 'Administrator must be able to insert mark for enrollment with NULL circular_class_id');

    // 2. Enrollment with NULL theology_class_id (testing RLS query visibility)
    const nullTheologyStudentId = 'a0000000-0000-0000-0000-000000000099';
    const nullTheologyEnrollmentId = 'e0000000-0000-0000-0000-000000000099';
    execSync('docker exec -i supabase_db_rehearsal_isolated_supabase psql -U postgres -d postgres', {
      input: `
        INSERT INTO public.students (id, admission_number, name) VALUES ('${nullTheologyStudentId}', 'ADM-099', 'Null Theology Student') ON CONFLICT (id) DO NOTHING;
        INSERT INTO public.enrollments (id, student_id, theology_class_id, circular_class_id, academic_year, is_active)
        VALUES ('${nullTheologyEnrollmentId}', '${nullTheologyStudentId}', null, 'c1000000-0000-0000-0000-000000000001', 2026, true)
        ON CONFLICT (id) DO UPDATE SET theology_class_id = null, circular_class_id = EXCLUDED.circular_class_id;
        ALTER TABLE public.theology_marks DISABLE TRIGGER trg_enforce_theology_mark_level;
        INSERT INTO public.theology_marks (id, enrollment_id, term_id, subject_id, mot_score, eot_score, updated_by)
        VALUES ('d0000000-0000-0000-0000-000000000099', '${nullTheologyEnrollmentId}', 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111', 'b0000000-0000-0000-0000-000000000001', 88, 92, '${adminAuth.user.id}')
        ON CONFLICT (enrollment_id, subject_id, term_id) DO NOTHING;
        ALTER TABLE public.theology_marks ENABLE TRIGGER trg_enforce_theology_mark_level;
      `,
      encoding: 'utf8'
    });

    const { data: readData, error: err2 } = await adminClient
      .from('theology_marks')
      .select('id, mot_score')
      .eq('enrollment_id', nullTheologyEnrollmentId);

    console.log('  [NULL THEOLOGY JOIN ASSERTION] Read rows:', readData?.length, 'Error:', err2?.message);
    assert.equal(err2, null, 'Administrator must be able to select mark for enrollment with NULL theology_class_id');
    assert.equal(readData?.length, 1, 'LEFT JOIN must include enrollment even when theology_class_id is NULL');

    // Cleanup temporary test fixtures
    execSync('docker exec -i supabase_db_rehearsal_isolated_supabase psql -U postgres -d postgres', {
      input: `
        DELETE FROM public.theology_marks WHERE enrollment_id IN ('${nullCircularEnrollmentId}', '${nullTheologyEnrollmentId}');
        DELETE FROM public.enrollments WHERE id IN ('${nullCircularEnrollmentId}', '${nullTheologyEnrollmentId}');
        DELETE FROM public.students WHERE id IN ('${nullCircularStudentId}', '${nullTheologyStudentId}');
      `,
      encoding: 'utf8'
    });
  });

  await t.test('6. J2 Direct-PostgREST tests: role Teacher vs Class Teacher, unassigned, and identity keys', async () => {
    const { serviceRoleKey } = getRehearsalCredentials();
    const supabaseAdmin = createClient(SUPABASE_URL, serviceRoleKey);

    // Setup 1: Provision a regular Teacher (role: 'Teacher') assigned to circular class
    // Setup 1: Provision a regular Teacher (role: 'Teacher') assigned to circular class
    const REGULAR_TEACHER_EMAIL = 'secular-teacher@test.local';
    const REGULAR_TEACHER_PASS = 'Password123!';

    // Ensure auth user exists
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const existingRegular = userList?.users?.find(u => u.email === REGULAR_TEACHER_EMAIL);
    let regularUserId;
    if (existingRegular) {
      regularUserId = existingRegular.id;
    } else {
      const { data: createdReg } = await supabaseAdmin.auth.admin.createUser({
        email: REGULAR_TEACHER_EMAIL,
        password: REGULAR_TEACHER_PASS,
        email_confirm: true
      });
      regularUserId = createdReg.user.id;
    }

    await supabaseAdmin.from('teachers').upsert({
      id: regularUserId,
      auth_user_id: regularUserId,
      name: 'Secular Teacher',
      email: REGULAR_TEACHER_EMAIL,
      role: 'Teacher', // NOT 'Class Teacher'
      status: 'active'
    });

    // Assign to circular class c1000000-0000-0000-0000-000000000001
    await supabaseAdmin.from('teacher_class_assignments').upsert({
      teacher_id: regularUserId,
      class_id: 'c1000000-0000-0000-0000-000000000001',
      class_type: 'circular',
      subject_id: 'b0000000-0000-0000-0000-000000000001'
    });

    // Authenticate regular Teacher
    const { data: regAuth } = await supabase.auth.signInWithPassword({
      email: REGULAR_TEACHER_EMAIL,
      password: REGULAR_TEACHER_PASS
    });
    assert.ok(regAuth.session, 'Regular teacher must authenticate');

    const regularTeacherClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${regAuth.session.access_token}` } }
    });

    // Test Case A: Role 'Teacher' assigned to circular class gets 0 rows
    const { data: regData, error: regError } = await regularTeacherClient
      .from('theology_marks')
      .update({ mot_score: 95 })
      .eq('enrollment_id', 'e0000000-0000-0000-0000-000000000001')
      .select();

    console.log('  [J2 DIRECT POSTGREST: ROLE TEACHER] Updated rows:', regData?.length ?? 0, 'Error:', regError?.message);
    assert.equal(regData?.length ?? 0, 0, 'Role Teacher assigned to circular class must get 0 rows on theology_marks');

    // Test Case B: Assigned Class Teacher gets 1 row
    const classTeacherClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } }
    });
    const { data: ctData, error: ctError } = await classTeacherClient
      .from('theology_marks')
      .update({ mot_score: 90 })
      .eq('enrollment_id', 'e0000000-0000-0000-0000-000000000001')
      .select();

    console.log('  [J2 DIRECT POSTGREST: ASSIGNED CLASS TEACHER] Updated rows:', ctData?.length ?? 0, 'Error:', ctError?.message);
    assert.equal(ctError, null);
    assert.equal(ctData?.length, 1, 'Assigned Class Teacher must get exactly 1 row updated');

    // Test Case C: Unassigned Class Teacher gets 0 rows
    const { data: unctData, error: unctError } = await classTeacherClient
      .from('theology_marks')
      .update({ mot_score: 90 })
      .eq('enrollment_id', 'e0000000-0000-0000-0000-000000000002') // unassigned student
      .select();

    console.log('  [J2 DIRECT POSTGREST: UNASSIGNED CLASS TEACHER] Updated rows:', unctData?.length ?? 0, 'Error:', unctError?.message);
    assert.equal(unctData?.length ?? 0, 0, 'Unassigned Class Teacher must get 0 rows');

    // Test Case D: Identity key reconciliation (t.id = auth.uid() legacy mapping)
    const LEGACY_ID_EMAIL = 'legacy-id-teacher@test.local';
    const LEGACY_ID_PASS = 'Password123!';

    // Clean up any stale legacy teacher by email
    const { data: staleTeachers } = await supabaseAdmin.from('teachers').select('id').eq('email', LEGACY_ID_EMAIL);
    for (const t of staleTeachers || []) {
      await supabaseAdmin.from('teacher_class_assignments').delete().eq('teacher_id', t.id);
      await supabaseAdmin.from('teachers').delete().eq('id', t.id);
    }
    const { data: currentUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingLegacy = currentUsers?.users?.find(u => u.email === LEGACY_ID_EMAIL);
    if (existingLegacy) {
      await supabaseAdmin.auth.admin.deleteUser(existingLegacy.id).catch(() => {});
    }

    const { data: createdLegacy, error: createLegErr } = await supabaseAdmin.auth.admin.createUser({
      email: LEGACY_ID_EMAIL,
      password: LEGACY_ID_PASS,
      email_confirm: true
    });
    assert.equal(createLegErr, null);
    const legacyTeacherId = createdLegacy.user.id;

    // In legacy seed, t.id = auth.uid() but auth_user_id was NULL
    const { error: insTeacherErr } = await supabaseAdmin.from('teachers').insert({
      id: legacyTeacherId,
      auth_user_id: null, // Explicitly NULL to test t.id = auth.uid() branch
      name: 'Legacy ID Teacher',
      email: LEGACY_ID_EMAIL,
      role: 'Class Teacher',
      status: 'active'
    });
    assert.equal(insTeacherErr, null);

    // Assign legacy teacher to circular class c1000000-0000-0000-0000-000000000001
    const { error: insAssignErr } = await supabaseAdmin.from('teacher_class_assignments').insert({
      teacher_id: legacyTeacherId,
      class_id: 'c1000000-0000-0000-0000-000000000001',
      class_type: 'circular',
      subject_id: 'b0000000-0000-0000-0000-000000000001'
    });
    assert.equal(insAssignErr, null);

    // Also set class_teacher_id on circular_classes (legacy direct class teacher assignment)
    await supabaseAdmin.from('circular_classes').update({
      class_teacher_id: legacyTeacherId
    }).eq('id', 'c1000000-0000-0000-0000-000000000001');

    const { data: legAuth, error: legAuthErr } = await supabase.auth.signInWithPassword({
      email: LEGACY_ID_EMAIL,
      password: LEGACY_ID_PASS
    });
    assert.equal(legAuthErr, null);
    assert.ok(legAuth.session, 'Legacy ID teacher must authenticate');

    const legacyTeacherClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${legAuth.session.access_token}` } }
    });

    const { data: legData, error: legError } = await legacyTeacherClient
      .from('theology_marks')
      .update({ mot_score: 92 })
      .eq('enrollment_id', 'e0000000-0000-0000-0000-000000000001')
      .select();

    console.log('  [J2 IDENTITY KEY: t.id = auth.uid()] Updated rows:', legData?.length ?? 0, 'Error:', legError?.message);
    assert.equal(legError, null);
    assert.equal(legData?.length, 1, 'Teacher with auth_user_id = NULL and t.id = auth.uid() must be authorized');

    // Restore circular_classes class_teacher_id to standard seeded class teacher
    await supabaseAdmin.from('circular_classes').update({
      class_teacher_id: 'c599cb13-fb3d-4e5d-8e27-253cb7e5ac1a'
    }).eq('id', 'c1000000-0000-0000-0000-000000000001');

    // Teardown J2 fixtures
    await supabaseAdmin.from('teacher_class_assignments').delete().in('teacher_id', [regularUserId, legacyTeacherId]);
    await supabaseAdmin.from('teachers').delete().in('id', [regularUserId, legacyTeacherId]);
    await supabaseAdmin.auth.admin.deleteUser(regularUserId).catch(() => {});
    await supabaseAdmin.auth.admin.deleteUser(legacyTeacherId).catch(() => {});
  });
});

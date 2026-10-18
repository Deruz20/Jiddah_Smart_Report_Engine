import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { enforceLocalSafeEnvironment } from '../lib/test-guard.mjs';
import { seedRehearsalDatabase } from '../../scripts/seed-rehearsal-synthetic-users.mjs';

// Enforce local-only execution
enforceLocalSafeEnvironment();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

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
      await page.waitForURL(url => url.pathname === '/admin/marks', { timeout: 60000, waitUntil: 'domcontentloaded' });
      console.log('  [E2E UI] Landed on:', page.url());

      // Dismiss tour if present
      const closeTour = page.locator('button[aria-label="Close Product Tour"]');
      if (await closeTour.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeTour.click();
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

      // Step D: Enter Theology MOT mark
      const theologyMotInput = page.locator('input[data-table="theology"][data-col="MOT"]').first();
      await theologyMotInput.waitFor({ state: 'visible', timeout: 15000 });
      await theologyMotInput.click();
      await theologyMotInput.fill('88');

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
      assert.equal(Number(dbMarks.mot_score), 88, 'Database must store exactly the score saved via browser UI');
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
      subject_id: 'b0000000-0000-0000-0000-000000000001',
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
          subject_id: 'b0000000-0000-0000-0000-000000000001',
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
});

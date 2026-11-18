import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { enforceLocalSafeEnvironment, getRehearsalCredentials } from '../lib/test-guard.mjs';
import { seedRehearsalDatabase } from '../../scripts/seed-rehearsal-synthetic-users.mjs';

enforceLocalSafeEnvironment();
const creds = getRehearsalCredentials();
const SUPABASE_URL = creds.apiUrl;
const SERVICE_KEY = creds.serviceRoleKey;
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const DEFAULT_PASS = 'Password123!';

const baseOrigin = new URL(BASE_URL);
if (baseOrigin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(baseOrigin.hostname)) {
  throw new Error(`Refusing to run username-login tests against non-local server: ${BASE_URL}`);
}
const supabaseOrigin = new URL(SUPABASE_URL);
if (!['127.0.0.1', 'localhost'].includes(supabaseOrigin.hostname) || supabaseOrigin.port !== '54321') {
  throw new Error(`Refusing to run username-login tests against non-rehearsal Supabase: ${SUPABASE_URL}`);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function extractCookieHeader(response) {
  const setCookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];
  if (!setCookies.length) {
    const raw = response.headers.get('set-cookie');
    if (raw) {
      return raw
        .split(/,(?=[^ ;]+=)/)
        .map((c) => c.split(';')[0].trim())
        .join('; ');
    }
    return '';
  }
  return setCookies.map((c) => c.split(';')[0].trim()).join('; ');
}

async function httpLogin(identifier, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const body = await res.json().catch(() => ({}));
  return {
    status: res.status,
    body,
    cookieHeader: extractCookieHeader(res),
  };
}

describe('Add-on — Username or Email + Password Sign-In (E1)', () => {
  before(async () => {
    await seedRehearsalDatabase();
  });

  it('Migration UP & ROLLBACK files define case-insensitive unique username column cleanly', () => {
    const upPath = path.resolve('supabase/migrations/20261117000002_add_teacher_username.sql');
    const rbPath = path.resolve('supabase/migrations/20261117000002_add_teacher_username_rollback.sql');
    assert.equal(fs.existsSync(upPath), true);
    assert.equal(fs.existsSync(rbPath), true);
    const upSql = fs.readFileSync(upPath, 'utf8');
    const rbSql = fs.readFileSync(rbPath, 'utf8');
    assert.match(upSql, /ADD COLUMN IF NOT EXISTS username text/i);
    assert.match(upSql, /CREATE UNIQUE INDEX IF NOT EXISTS teachers_username_lower_unique/i);
    assert.match(rbSql, /DROP INDEX IF EXISTS public\.teachers_username_lower_unique/i);
    assert.match(rbSql, /DROP COLUMN IF EXISTS username/i);
  });

  it('POST /api/auth/login authenticates identically via username or email and returns session cookie', async () => {
    const emailLogin = await httpLogin('teacher@test.local', DEFAULT_PASS);
    assert.equal(emailLogin.status, 200);
    assert.equal(emailLogin.body.user?.email, 'teacher@test.local');
    assert.equal(emailLogin.body.user?.username, 'teacher');
    assert.ok(emailLogin.cookieHeader.includes('auth-token'), 'Email login must set auth-token cookie');

    for (const ident of ['teacher', 'Teacher', '  TEACHER  ']) {
      const unameLogin = await httpLogin(ident, DEFAULT_PASS);
      assert.equal(unameLogin.status, 200, `Login should succeed for username "${ident}"`);
      assert.equal(unameLogin.body.user?.email, 'teacher@test.local');
      assert.equal(unameLogin.body.user?.username, 'teacher');
      assert.ok(unameLogin.cookieHeader.includes('auth-token'), 'Username login must set auth-token cookie');

      const profileRes = await fetch(`${BASE_URL}/api/settings/user`, {
        headers: { Cookie: unameLogin.cookieHeader },
      });
      assert.equal(profileRes.status, 200);
      const profileJson = await profileRes.json();
      assert.equal(profileJson.data?.username, 'teacher');
      assert.equal(profileJson.data?.email, 'teacher@test.local');
    }

    const adminUname = await httpLogin('admin', DEFAULT_PASS);
    assert.equal(adminUname.status, 200);
    assert.equal(adminUname.body.user?.email, 'admin@test.local');
    assert.equal(adminUname.body.user?.username, 'admin');
  });

  it('Rejects unknown username, wildcard ILIKE probes, wrong password, and inactive usernames with uniform 401 (zero enumeration)', async () => {
    const probes = [
      ['teacher', 'WrongPassword999!'],
      ['nonexistent_username_987', DEFAULT_PASS],
      ['teach%', DEFAULT_PASS],
      ['teache_', DEFAULT_PASS],
      ['disposable-teacher', DEFAULT_PASS],
      ['disposable-teacher@test.local', DEFAULT_PASS],
    ];

    for (const [identifier, password] of probes) {
      const res = await httpLogin(identifier, password);
      assert.equal(res.status, 401, `Expected 401 for "${identifier}"`);
      assert.equal(
        res.body.error,
        'Invalid login credentials',
        `Expected generic non-enumerating error for "${identifier}"`
      );
      assert.equal(res.cookieHeader, '', `No auth cookie allowed on failed login for "${identifier}"`);
    }
  });

  it('Admin updates username via PUT /api/admin/teachers/[id], blocks duplicates (409) & invalid chars (400), and blocks self-escalation (403)', async () => {
    const adminLogin = await httpLogin('admin', DEFAULT_PASS);
    assert.equal(adminLogin.status, 200);
    const teacherLogin = await httpLogin('teacher', DEFAULT_PASS);
    assert.equal(teacherLogin.status, 200);

    const { data: staffRow, error: staffErr } = await supabaseAdmin
      .from('teachers')
      .select('id, username, role, name, email')
      .eq('email', 'staff@test.local')
      .single();
    assert.equal(staffErr, null);
    const originalUsername = staffRow.username || 'staff';
    const tempUsername = `staff_e1_${Date.now()}`;

    try {
      // Non-admin must NOT be able to mutate username via /api/settings/user
      const escalateRes = await fetch(`${BASE_URL}/api/settings/user`, {
        method: 'PATCH',
        headers: {
          Cookie: teacherLogin.cookieHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: 'hijack_teacher' }),
      });
      assert.equal(escalateRes.status, 403);

      // Non-admin must NOT call /api/admin/teachers/[id]
      const nonAdminUpdate = await fetch(`${BASE_URL}/api/admin/teachers/${staffRow.id}`, {
        method: 'PUT',
        headers: {
          Cookie: teacherLogin.cookieHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: staffRow.name, username: tempUsername }),
      });
      assert.equal(nonAdminUpdate.status, 403);

      // Admin duplicate username (case-insensitive collision with 'admin') returns 409
      const dupRes = await fetch(`${BASE_URL}/api/admin/teachers/${staffRow.id}`, {
        method: 'PUT',
        headers: {
          Cookie: adminLogin.cookieHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: staffRow.name, role: staffRow.role, username: 'ADMIN' }),
      });
      assert.equal(dupRes.status, 409);

      // Invalid format returns 400
      const badRes = await fetch(`${BASE_URL}/api/admin/teachers/${staffRow.id}`, {
        method: 'PUT',
        headers: {
          Cookie: adminLogin.cookieHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: staffRow.name, role: staffRow.role, username: 'x' }),
      });
      assert.equal(badRes.status, 400);

      // Valid Admin update persists and immediately works for login
      const okRes = await fetch(`${BASE_URL}/api/admin/teachers/${staffRow.id}`, {
        method: 'PUT',
        headers: {
          Cookie: adminLogin.cookieHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: staffRow.name, role: staffRow.role, username: tempUsername }),
      });
      assert.equal(okRes.status, 200);
      const okBody = await okRes.json();
      assert.equal(okBody.data?.username, tempUsername);

      // Old username stops working; new username works immediately
      const oldLogin = await httpLogin(originalUsername, DEFAULT_PASS);
      assert.equal(oldLogin.status, 401);
      const newLogin = await httpLogin(tempUsername, DEFAULT_PASS);
      assert.equal(newLogin.status, 200);
      assert.equal(newLogin.body.user?.email, 'staff@test.local');
      assert.equal(newLogin.body.user?.username, tempUsername);
    } finally {
      await fetch(`${BASE_URL}/api/admin/teachers/${staffRow.id}`, {
        method: 'PUT',
        headers: {
          Cookie: adminLogin.cookieHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: staffRow.name, role: staffRow.role, username: originalUsername }),
      });
    }
  });

  it('Browser UI: /login displays Email or Username, signs in with username, and /admin/account + /admin/teachers display username', async () => {
    const launchOpts = fs.existsSync('/usr/bin/google-chrome')
      ? { headless: true, executablePath: '/usr/bin/google-chrome' }
      : { headless: true };
    const browser = await chromium.launch(launchOpts);
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

      const bodyText = await page.textContent('body');
      assert.match(bodyText || '', /Email or Username/i);

      await page.locator('input[type="text"]').first().fill('teacher');
      await page.locator('input[type="password"]').first().fill(DEFAULT_PASS);
      await Promise.all([
        page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
        page.locator('button[type="submit"]').click(),
      ]);

      await page.goto(`${BASE_URL}/admin/account`, { waitUntil: 'networkidle' });
      const unameInput = page.getByTestId('account-username-input');
      await unameInput.waitFor({ state: 'visible', timeout: 10000 });
      assert.equal(await unameInput.inputValue(), 'teacher');
      assert.equal(await unameInput.isDisabled(), true);

      // Sign in as admin via username and verify /admin/teachers renders teacher usernames & edit input
      const adminCtx = await browser.newContext();
      const adminPage = await adminCtx.newPage();
      await adminPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      await adminPage.locator('input[type="text"]').first().fill('admin');
      await adminPage.locator('input[type="password"]').first().fill(DEFAULT_PASS);
      await Promise.all([
        adminPage.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
        adminPage.locator('button[type="submit"]').click(),
      ]);

      await adminPage.goto(`${BASE_URL}/admin/teachers`, { waitUntil: 'networkidle' });
      const teachersText = await adminPage.textContent('body');
      assert.match(teachersText || '', /Username/i);
      const editBtn = adminPage.locator('button:has-text("Edit")').first();
      await editBtn.waitFor({ state: 'visible', timeout: 10000 });
      await editBtn.click();
      const modalUsernameInput = adminPage.getByTestId('teacher-username-input');
      await modalUsernameInput.waitFor({ state: 'visible', timeout: 10000 });
      assert.ok((await modalUsernameInput.inputValue()).length >= 2);
      await adminCtx.close();
    } finally {
      await browser.close();
    }
  });
});

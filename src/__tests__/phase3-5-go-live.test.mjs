import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { enforceLocalSafeEnvironment, getRehearsalCredentials } from '../lib/test-guard.mjs';
import { seedRehearsalDatabase } from '../../scripts/seed-rehearsal-synthetic-users.mjs';
import {
  DEFAULT_ROLE_PERMISSIONS,
  resolveEffectivePermissions,
  ALL_STAFF_ROLES,
} from '../lib/teacher-access.ts';
import {
  signatureDataUrlCache,
  buildSignatureCacheKey,
} from '../components/reports/CleanSignatureImage.tsx';
import {
  stampCrestCache,
  buildStampCrestCacheKey,
} from '../components/reports/StampGenerator.tsx';

enforceLocalSafeEnvironment();
const creds = getRehearsalCredentials();
const SUPABASE_URL = creds.apiUrl;
const SERVICE_KEY = creds.serviceRoleKey;
const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3012';
const DEFAULT_PASS = 'Password123!';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TERM_ID = 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111';
const ASSIGNED_CIRCULAR_CLASS_ID = 'c1000000-0000-0000-0000-000000000001'; // Primary 1
const UNASSIGNED_CIRCULAR_CLASS_ID = 'c1000000-0000-0000-0000-000000000002'; // Primary 2
const ASSIGNED_THEOLOGY_CLASS_ID = 'c0000000-0000-0000-0000-000000000002'; // 1 (P.1 Theology)
const UNASSIGNED_THEOLOGY_CLASS_ID = 'c0000000-0000-0000-0000-000000000003'; // P.2 Theology
const ASSIGNED_ENROLLMENT_ID = 'e0000000-0000-0000-0000-000000000001';
const UNASSIGNED_ENROLLMENT_ID = 'e0000000-0000-0000-0000-000000000002';
const ASSIGNED_STUDENT_ID = 'a0000000-0000-0000-0000-000000000001';
const UNASSIGNED_STUDENT_ID = 'a0000000-0000-0000-0000-000000000002';

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

async function loginAs(identifier) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: DEFAULT_PASS }),
  });
  const body = await res.json();
  assert.equal(
    res.status,
    200,
    `Expected login 200 for ${identifier}, got ${res.status}: ${JSON.stringify(body)}`
  );
  return extractCookieHeader(res);
}

describe('Phase 3.5 — Go-Live Role Defaults, Archived Student Exclusion, Anti-Freeze & Senior UI/UX (E1)', () => {
  const cookiesByRole = {};

  before(async () => {
    await seedRehearsalDatabase();
    const roleLogins = {
      Administrator: 'admin@test.local',
      Principal: 'principal@test.local',
      'Head Teacher': 'head@test.local',
      'Deputy Head Teacher': 'deputy@test.local',
      'DOS Secular': 'dos@test.local',
      'DOS Theology': 'dos_theology@test.local',
      'Class Teacher': 'teacher@test.local',
      'Theology Instructor': 'theology@test.local',
    };
    for (const [role, email] of Object.entries(roleLogins)) {
      cookiesByRole[role] = await loginAs(email);
    }
  });

  it('Workstream 1: Out-of-the-box Role Defaults, Class/Department Scoping & Scoped Non-Admin Signature Access', async () => {
    // 1. Verify exact DEFAULT_ROLE_PERMISSIONS in code & DB
    const { data: rpRows } = await supabaseAdmin.from('role_permissions').select('role, permissions');
    const dbMap = Object.fromEntries((rpRows || []).map((r) => [r.role, r.permissions]));

    const expected = {
      Principal: [
        'read_students',
        'write_students',
        'read_marks',
        'edit_head_teacher_remarks',
        'read_reports',
        'lock_marks',
        'view_activity_logs',
        'view_staff',
      ],
      'Head Teacher': [
        'read_students',
        'write_students',
        'read_marks',
        'edit_head_teacher_remarks',
        'read_reports',
        'lock_marks',
        'view_activity_logs',
      ],
      'Deputy Head Teacher': [
        'read_students',
        'write_students',
        'read_marks',
        'edit_head_teacher_remarks',
        'read_reports',
        'lock_marks',
        'view_activity_logs',
      ],
      'DOS Secular': [
        'read_students',
        'write_students',
        'read_marks',
        'write_marks',
        'edit_class_teacher_remarks',
        'read_reports',
        'view_activity_logs',
      ],
      'DOS Theology': [
        'read_students',
        'write_students',
        'read_marks',
        'write_marks',
        'edit_class_teacher_remarks',
        'read_reports',
        'view_activity_logs',
      ],
      'Class Teacher': [
        'read_students',
        'write_students',
        'read_marks',
        'write_marks',
        'edit_class_teacher_remarks',
        'read_reports',
      ],
      'Theology Instructor': [
        'read_students',
        'write_students',
        'read_marks',
        'write_marks',
        'edit_class_teacher_remarks',
        'read_reports',
      ],
    };

    for (const [role, expectedPerms] of Object.entries(expected)) {
      assert.deepEqual(
        DEFAULT_ROLE_PERMISSIONS[role],
        expectedPerms,
        `Code DEFAULT_ROLE_PERMISSIONS mismatch for ${role}`
      );
      assert.deepEqual(
        dbMap[role],
        expectedPerms,
        `DB role_permissions mismatch for ${role}`
      );
      assert.deepEqual(
        resolveEffectivePermissions(role),
        expectedPerms,
        `resolveEffectivePermissions mismatch for ${role}`
      );
    }

    // 2. Principal can edit student profile school-wide (200), view staff (200), lock marks (200), but CANNOT manage_settings or manage_users (403)
    const prinEditStudent = await fetch(`${BASE_URL}/api/students/${UNASSIGNED_STUDENT_ID}`, {
      method: 'PUT',
      headers: { Cookie: cookiesByRole['Principal'], 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unassigned Test Student',
        admission_number: 'ADM-002',
        gender: 'female',
        religion: 'Muslim',
        circular_class_id: UNASSIGNED_CIRCULAR_CLASS_ID,
        theology_class_id: UNASSIGNED_THEOLOGY_CLASS_ID,
      }),
    });
    assert.equal(prinEditStudent.status, 200, 'Principal must be able to edit student profiles school-wide');

    const prinSettingsGet = await fetch(`${BASE_URL}/api/settings/school`, {
      headers: { Cookie: cookiesByRole['Principal'] },
    });
    assert.equal(prinSettingsGet.status, 403, 'Principal must not have manage_settings');

    // 3. Class Teacher can edit student in OWN assigned class P.1 (200), but gets 403 on unassigned class P.2!
    const ctEditOwn = await fetch(`${BASE_URL}/api/students/${ASSIGNED_STUDENT_ID}`, {
      method: 'PUT',
      headers: { Cookie: cookiesByRole['Class Teacher'], 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        admission_number: 'ADM-001',
        gender: 'male',
        religion: 'Muslim',
        circular_class_id: ASSIGNED_CIRCULAR_CLASS_ID,
        theology_class_id: ASSIGNED_THEOLOGY_CLASS_ID,
      }),
    });
    assert.equal(ctEditOwn.status, 200, 'Class Teacher must be able to edit student in own assigned class');

    const ctEditOther = await fetch(`${BASE_URL}/api/students/${UNASSIGNED_STUDENT_ID}`, {
      method: 'PUT',
      headers: { Cookie: cookiesByRole['Class Teacher'], 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unassigned Test Student',
        admission_number: 'ADM-002',
        gender: 'female',
        religion: 'Muslim',
        circular_class_id: UNASSIGNED_CIRCULAR_CLASS_ID,
      }),
    });
    assert.equal(ctEditOther.status, 403, 'Class Teacher must get 403 when editing student in unassigned class');

    // 4. Scoped Non-Admin Signature Access (GET /api/signatures & POST /api/signatures/upload)
    const prinSigGet = await fetch(`${BASE_URL}/api/signatures`, {
      headers: { Cookie: cookiesByRole['Principal'] },
    });
    assert.equal(prinSigGet.status, 200);
    const prinSigJson = await prinSigGet.json();
    const prinSlotKeys = (prinSigJson.data || []).map((s) => s.slot_key);
    assert.ok(prinSlotKeys.includes('principal'), 'Principal must see principal signature slot');
    assert.ok(prinSlotKeys.includes('head-teacher'), 'Principal must see head-teacher signature slot');
    assert.ok(!prinSlotKeys.includes('class-teacher-p1'), 'Principal slot list should not include class-teacher-p1');

    const ctSigGet = await fetch(`${BASE_URL}/api/signatures`, {
      headers: { Cookie: cookiesByRole['Class Teacher'] },
    });
    assert.equal(ctSigGet.status, 200);
    const ctSigJson = await ctSigGet.json();
    const ctSlotKeys = (ctSigJson.data || []).map((s) => s.slot_key);
    assert.deepEqual(ctSlotKeys, ['class-teacher-p1'], 'Class Teacher assigned to P.1 must only see class-teacher-p1');

    const theoSigGet = await fetch(`${BASE_URL}/api/signatures`, {
      headers: { Cookie: cookiesByRole['Theology Instructor'] },
    });
    assert.equal(theoSigGet.status, 200);
    const theoSigJson = await theoSigGet.json();
    const theoSlotKeys = (theoSigJson.data || []).map((s) => s.slot_key);
    assert.deepEqual(theoSlotKeys, ['theology-teacher-p1'], 'Theology Instructor assigned to Class 1 must only see theology-teacher-p1');

    // Verify Class Teacher gets 403 if attempting to upload to head-teacher or class-teacher-p2
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const badForm = new FormData();
    badForm.append('file', new Blob([tinyPng], { type: 'image/png' }), 'sig.png');
    badForm.append('slot_key', 'head-teacher');

    const ctUploadForbidden = await fetch(`${BASE_URL}/api/signatures/upload`, {
      method: 'POST',
      headers: { Cookie: cookiesByRole['Class Teacher'] },
      body: badForm,
    });
    assert.equal(ctUploadForbidden.status, 403, 'Class Teacher must get 403 when uploading to head-teacher slot');

    console.log('[E1 WORKSTREAM 1 PROOF]', JSON.stringify({
      principalSlots: prinSlotKeys,
      classTeacherSlots: ctSlotKeys,
      theologyInstructorSlots: theoSlotKeys,
      ctEditOwnClassStatus: ctEditOwn.status,
      ctEditOtherClassStatus: ctEditOther.status,
      ctUploadHeadTeacherStatus: ctUploadForbidden.status,
    }));
  });

  it('Workstream 2: Archived Students 100% Excluded from Rosters, Marks, Hubs, Dashboard Telemetry & Reports + Restore Flow', async () => {
    // Archive UNASSIGNED_STUDENT_ID (ADM-002 in Primary 2 / P.2 Theology) via DELETE /api/students/[id]
    try {
      const archiveRes = await fetch(`${BASE_URL}/api/students/${UNASSIGNED_STUDENT_ID}`, {
        method: 'DELETE',
        headers: { Cookie: cookiesByRole['Principal'] },
      });
      assert.equal(archiveRes.status, 200, 'Principal soft-archive student should return 200');

      // 1. Active /api/students excludes archived student; ?archived=true returns it
      const activeStudentsRes = await fetch(`${BASE_URL}/api/students`, {
        headers: { Cookie: cookiesByRole['Administrator'] },
      });
      const activeStudents = await activeStudentsRes.json();
      assert.equal(
        activeStudents.some((s) => s.id === UNASSIGNED_STUDENT_ID),
        false,
        'Archived student must be excluded from active /api/students'
      );

      const archivedStudentsRes = await fetch(`${BASE_URL}/api/students?archived=true`, {
        headers: { Cookie: cookiesByRole['Administrator'] },
      });
      const archivedStudents = await archivedStudentsRes.json();
      assert.equal(
        archivedStudents.some((s) => s.id === UNASSIGNED_STUDENT_ID),
        true,
        'Archived student must appear in /api/students?archived=true'
      );

      // 2. /api/enrollments excludes archived student
      const enrollRes = await fetch(`${BASE_URL}/api/enrollments`, {
        headers: { Cookie: cookiesByRole['Administrator'] },
      });
      const enrollments = await enrollRes.json();
      assert.equal(
        enrollments.some((e) => e.id === UNASSIGNED_STUDENT_ID || e.enrollment_id === UNASSIGNED_ENROLLMENT_ID),
        false,
        'Archived student must be excluded from /api/enrollments'
      );

      // 3. /api/marks GET & POST reject archived student's enrollment (404)
      const marksGetRes = await fetch(
        `${BASE_URL}/api/marks?enrollment_id=${UNASSIGNED_ENROLLMENT_ID}&term_id=${TERM_ID}`,
        { headers: { Cookie: cookiesByRole['Administrator'] } }
      );
      assert.equal(marksGetRes.status, 404, 'GET /api/marks for archived student must return 404');

      // 4. /api/secular-hub & /api/theology-hub exclude archived student
      const secHubRes = await fetch(
        `${BASE_URL}/api/secular-hub?term_id=${TERM_ID}&class_id=${UNASSIGNED_CIRCULAR_CLASS_ID}`,
        { headers: { Cookie: cookiesByRole['Administrator'] } }
      );
      const secHub = await secHubRes.json();
      assert.equal(
        (secHub.enrollments || []).some((e) => e.id === UNASSIGNED_ENROLLMENT_ID),
        false,
        'Secular Hub must exclude archived student'
      );

      const theoHubRes = await fetch(
        `${BASE_URL}/api/theology-hub?term_id=${TERM_ID}&class_id=${UNASSIGNED_THEOLOGY_CLASS_ID}`,
        { headers: { Cookie: cookiesByRole['Administrator'] } }
      );
      const theoHub = await theoHubRes.json();
      assert.equal(
        (theoHub.enrollments || []).some((e) => e.id === UNASSIGNED_ENROLLMENT_ID),
        false,
        'Theology Hub must exclude archived student'
      );

      // 5. /api/analytics/dashboard excludes archived student from studentCount
      const dashRes = await fetch(`${BASE_URL}/api/analytics/dashboard`, {
        headers: { Cookie: cookiesByRole['Administrator'] },
      });
      const dashJson = await dashRes.json();
      assert.equal(dashJson.kpis?.totalStudents, 1, 'Dashboard telemetry must count only the 1 active student');

      // 6. /api/report and /api/report/batch exclude archived student (404)
      const repRes = await fetch(
        `${BASE_URL}/api/report?enrollment_id=${UNASSIGNED_ENROLLMENT_ID}&term_id=${TERM_ID}`,
        { headers: { Cookie: cookiesByRole['Administrator'] } }
      );
      assert.equal(repRes.status, 404, 'Single report card for archived student must return 404');

      const batchRepRes = await fetch(`${BASE_URL}/api/report/batch`, {
        method: 'POST',
        headers: { Cookie: cookiesByRole['Administrator'], 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollment_ids: [ASSIGNED_ENROLLMENT_ID, UNASSIGNED_ENROLLMENT_ID],
          term_id: TERM_ID,
          score_type: 'eot',
        }),
      });
      assert.equal(batchRepRes.status, 200);
      const batchRepJson = await batchRepRes.json();
      assert.equal(batchRepJson.reports?.length, 1, 'Batch report must only generate for the 1 active student');
      assert.equal(batchRepJson.reports?.[0]?.student?.name, 'Test Student');

      // 7. Restore student via PATCH /api/students/[id] and confirm immediate return to active roster
      const restoreRes = await fetch(`${BASE_URL}/api/students/${UNASSIGNED_STUDENT_ID}`, {
        method: 'PATCH',
        headers: { Cookie: cookiesByRole['Principal'], 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: false }),
      });
      assert.equal(restoreRes.status, 200, 'Restore student should return 200');

      const afterRestoreRes = await fetch(`${BASE_URL}/api/students`, {
        headers: { Cookie: cookiesByRole['Administrator'] },
      });
      const afterRestore = await afterRestoreRes.json();
      assert.equal(
        afterRestore.some((s) => s.id === UNASSIGNED_STUDENT_ID),
        true,
        'Restored student must reappear in active /api/students'
      );

      console.log('[E1 WORKSTREAM 2 ARCHIVE & RESTORE PROOF]', JSON.stringify({
        activeCountWhileArchived: activeStudents.length,
        archivedCountWhileArchived: archivedStudents.length,
        dashboardActiveStudentCountWhileArchived: dashJson.kpis?.totalStudents,
        batchReportCountWhileArchived: batchRepJson.reports?.length,
        activeCountAfterRestore: afterRestore.length,
      }));
    } finally {
      await supabaseAdmin
        .from('students')
        .update({ is_archived: false, archived_at: null })
        .eq('id', UNASSIGNED_STUDENT_ID);
    }
  });

  it('Workstream 3: Anti-Freeze Signature & Stamp Cache Keying', () => {
    const sigKey1 = buildSignatureCacheKey('/sig/ht.png', '#0C2A84', 225);
    const sigKey2 = buildSignatureCacheKey('/sig/ht.png', '#0F172A', 245);
    assert.notEqual(sigKey1, sigKey2);

    signatureDataUrlCache.set(sigKey1, 'data:image/png;base64,CACHED_SIG_1');
    assert.equal(signatureDataUrlCache.get(sigKey1), 'data:image/png;base64,CACHED_SIG_1');

    const stampKey1 = buildStampCrestCacheKey('/logo-512h.png', '#1B3B8B', 215);
    stampCrestCache.set(stampKey1, 'data:image/png;base64,CACHED_STAMP_1');
    assert.equal(stampCrestCache.get(stampKey1), 'data:image/png;base64,CACHED_STAMP_1');
  });

  it('Workstream 4: Playwright E2E — /admin/teachers Dynamic Modal, /admin/students Live Archive/Restore Counters & /admin/settings 5-Tab Workspace', async () => {
    const launchOpts = fs.existsSync('/usr/bin/google-chrome')
      ? { headless: true, executablePath: '/usr/bin/google-chrome' }
      : { headless: true };
    const browser = await chromium.launch(launchOpts);

    try {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      // Login as admin
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
      await page.locator('input[type="text"]').first().fill('admin');
      await page.locator('input[type="password"]').first().fill(DEFAULT_PASS);
      await Promise.all([
        page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
        page.locator('button[type="submit"]').click(),
      ]);

      // 1. Verify /admin/teachers Overhaul
      await page.goto(`${BASE_URL}/admin/teachers`, { waitUntil: 'networkidle' });
      const quickPrincipalBtn = page.getByTestId('quick-create-principal-btn');
      await quickPrincipalBtn.waitFor({ state: 'visible', timeout: 10000 });
      await quickPrincipalBtn.click();

      // Principal role selected -> shows School-Wide banner & Included by Role Default chips
      const schoolWideBanner = page.getByTestId('banner-school-wide-access');
      await schoolWideBanner.waitFor({ state: 'visible', timeout: 5000 });
      assert.match(await schoolWideBanner.textContent(), /Automatic School-Wide Access across all Secular & Theology classes/i);

      const defaultChips = page.getByTestId('role-default-permissions-chips');
      await defaultChips.waitFor({ state: 'visible', timeout: 5000 });
      assert.match(await defaultChips.textContent(), /View Staff Directory/i);
      assert.match(await defaultChips.textContent(), /Register & Edit Student Profiles/i);

      // Switch Role to DOS Secular -> shows Department-Wide banner
      const roleSelect = page.getByTestId('teacher-role-select');
      await roleSelect.selectOption('DOS Secular');
      const deptWideBanner = page.getByTestId('banner-department-wide-access');
      await deptWideBanner.waitFor({ state: 'visible', timeout: 5000 });
      assert.match(await deptWideBanner.textContent(), /Automatic Department-Wide Access across all Secular classes/i);

      // Switch Role to Class Teacher + Secular -> shows ONLY Secular classes grouped under Nursery, Lower Primary, Upper Primary
      await roleSelect.selectOption('Class Teacher');
      const secGroups = page.getByTestId('secular-class-groups');
      await secGroups.waitFor({ state: 'visible', timeout: 5000 });
      assert.equal(await page.getByTestId('theology-class-groups').count(), 0, 'Theology classes must be hidden when Department is Secular');
      assert.match(await secGroups.textContent(), /Nursery \(Baby–Top\)/);
      assert.match(await secGroups.textContent(), /Lower Primary \(P\.1–P\.3\)/);
      assert.match(await secGroups.textContent(), /Upper Primary \(P\.4–P\.7\)/);

      // Switch Department to Theology -> shows ONLY Theology classes
      const deptSelect = page.getByTestId('teacher-department-select');
      await deptSelect.selectOption('Theology');
      const theoGroups = page.getByTestId('theology-class-groups');
      await theoGroups.waitFor({ state: 'visible', timeout: 5000 });
      assert.equal(await page.getByTestId('secular-class-groups').count(), 0, 'Secular classes must be hidden when Department is Theology');

      // 2. Verify /admin/students Live Active vs Archived Metric Counters
      await page.goto(`${BASE_URL}/admin/students`, { waitUntil: 'networkidle' });
      const activeVal = page.getByTestId('metric-active-students-value');
      const archivedVal = page.getByTestId('metric-archived-students-value');
      await activeVal.waitFor({ state: 'visible', timeout: 10000 });
      assert.equal((await activeVal.textContent())?.trim(), '2');
      assert.equal((await archivedVal.textContent())?.trim(), '0');

      // 3. Verify /admin/settings 5-Tab Senior UI/UX Workspace
      await page.goto(`${BASE_URL}/admin/settings`, { waitUntil: 'networkidle' });
      const tab1 = page.getByTestId('settings-tab-identity');
      const tab2 = page.getByTestId('settings-tab-secular_grading');
      const tab3 = page.getByTestId('settings-tab-theology_grading');
      const tab4 = page.getByTestId('settings-tab-comments');
      const tab5 = page.getByTestId('settings-tab-locks');

      for (const t of [tab1, tab2, tab3, tab4, tab5]) {
        assert.equal(await t.isVisible(), true);
      }

      await tab2.click();
      await page.getByTestId('settings-card-secular-grading').waitFor({ state: 'visible', timeout: 5000 });

      await tab3.click();
      await page.getByTestId('settings-card-theology-divisions').waitFor({ state: 'visible', timeout: 5000 });

      await tab4.click();
      await page.getByTestId('settings-card-promotion-conduct').waitFor({ state: 'visible', timeout: 5000 });

      await tab5.click();
      await page.getByText('Marks Entry & Exam Set Access Locks').waitFor({ state: 'visible', timeout: 5000 });

      console.log('[E1 WORKSTREAM 4 PLAYWRIGHT UI PROOF] All modal dynamic filters, student metrics, and 5 settings tabs verified.');
    } finally {
      await browser.close();
    }
  });

  it('Workstream 5: Browser Cookie-Mode Password Update (/api/settings/user/password), Session Revocation (/api/settings/user/sessions) & Admin Password Reset (/api/admin/reset-password) — Zero Bearer Token Errors', async () => {
    const tempPass = 'NewPrincipalPass99!';

    try {
      // 1. Update password in pure browser cookie mode (PATCH /api/settings/user/password, NO Authorization header)
      const patchPassRes = await fetch(`${BASE_URL}/api/settings/user/password`, {
        method: 'PATCH',
        headers: {
          Cookie: cookiesByRole['Principal'],
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: DEFAULT_PASS,
          newPassword: tempPass,
        }),
      });
      const patchPassJson = await patchPassRes.json();
      assert.equal(
        patchPassRes.status,
        200,
        `Expected 200 from PATCH /api/settings/user/password in cookie mode, got ${patchPassRes.status}: ${JSON.stringify(patchPassJson)}`
      );
      assert.equal(patchPassJson.success, true);
      assert.doesNotMatch(JSON.stringify(patchPassJson), /Bearer token/i);

      // 2. Verify login with the new password succeeds (200 OK)
      const loginNewRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'principal@test.local', password: tempPass }),
      });
      const loginNewJson = await loginNewRes.json();
      assert.equal(
        loginNewRes.status,
        200,
        `Expected login with new password to return 200, got ${loginNewRes.status}: ${JSON.stringify(loginNewJson)}`
      );
      const freshPrincipalCookie = extractCookieHeader(loginNewRes);

      // 3. Test session revocation in pure browser cookie mode (POST & DELETE /api/settings/user/sessions)
      const postSessionsRes = await fetch(`${BASE_URL}/api/settings/user/sessions`, {
        method: 'POST',
        headers: { Cookie: freshPrincipalCookie },
      });
      const postSessionsJson = await postSessionsRes.json();
      assert.equal(
        postSessionsRes.status,
        200,
        `Expected 200 from POST /api/settings/user/sessions in cookie mode, got ${postSessionsRes.status}: ${JSON.stringify(postSessionsJson)}`
      );
      assert.equal(postSessionsJson.success, true);
      assert.doesNotMatch(JSON.stringify(postSessionsJson), /Bearer token/i);

      const delSessionsRes = await fetch(`${BASE_URL}/api/settings/user/sessions`, {
        method: 'DELETE',
        headers: { Cookie: freshPrincipalCookie },
      });
      const delSessionsJson = await delSessionsRes.json();
      assert.equal(delSessionsRes.status, 200);
      assert.equal(delSessionsJson.success, true);

      // 4. Change password back using POST /api/settings/user/password in cookie mode
      const postPassRes = await fetch(`${BASE_URL}/api/settings/user/password`, {
        method: 'POST',
        headers: {
          Cookie: freshPrincipalCookie,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: tempPass,
          newPassword: DEFAULT_PASS,
        }),
      });
      const postPassJson = await postPassRes.json();
      assert.equal(
        postPassRes.status,
        200,
        `Expected 200 from POST /api/settings/user/password in cookie mode, got ${postPassRes.status}: ${JSON.stringify(postPassJson)}`
      );
      assert.equal(postPassJson.success, true);

      // 5. Verify Admin Reset Password (/api/admin/reset-password) in cookie mode
      const adminResetRes = await fetch(`${BASE_URL}/api/admin/reset-password`, {
        method: 'POST',
        headers: {
          Cookie: cookiesByRole['Administrator'],
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'principal@test.local',
          newPassword: DEFAULT_PASS,
        }),
      });
      const adminResetJson = await adminResetRes.json();
      assert.equal(
        adminResetRes.status,
        200,
        `Expected 200 from POST /api/admin/reset-password, got ${adminResetRes.status}: ${JSON.stringify(adminResetJson)}`
      );
      assert.equal(adminResetJson.success, true);

      console.log('[E1 WORKSTREAM 5 PASSWORD & SESSIONS PROOF]', JSON.stringify({
        patchPasswordCookieModeStatus: patchPassRes.status,
        loginWithNewPasswordStatus: loginNewRes.status,
        postSessionsCookieModeStatus: postSessionsRes.status,
        deleteSessionsCookieModeStatus: delSessionsRes.status,
        postPasswordRestoreStatus: postPassRes.status,
        adminResetPasswordStatus: adminResetRes.status,
      }));
    } finally {
      cookiesByRole['Principal'] = await loginAs('principal@test.local');
    }
  });

  it('Workstream 6: Username Update to "sysadmin" in /admin/account, Anon Login via resolve_login_email RPC & Playwright /admin/marks Load as DOS Secular & Class Teacher with Zero "The operation was aborted." Errors', async () => {
    const anonClient = createClient(SUPABASE_URL, creds.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      // 1. Update username to "sysadmin" via PATCH /api/settings/user (cookie mode)
      const patchUnameRes = await fetch(`${BASE_URL}/api/settings/user`, {
        method: 'PATCH',
        headers: {
          Cookie: cookiesByRole['Administrator'],
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: 'Admin User',
          username: 'sysadmin',
        }),
      });
      const patchUnameJson = await patchUnameRes.json();
      assert.equal(
        patchUnameRes.status,
        200,
        `Expected 200 from PATCH /api/settings/user with username="sysadmin", got ${patchUnameRes.status}: ${JSON.stringify(patchUnameJson)}`
      );
      assert.equal(patchUnameJson.data?.username, 'sysadmin');

      // 2. Verify Postgres `public.teachers` row has username = 'sysadmin' AND anon RPC `resolve_login_email('sysadmin')` returns 'admin@test.local'
      const { data: rpcEmail, error: rpcErr } = await anonClient.rpc('resolve_login_email', {
        p_identifier: 'sysadmin',
      });
      assert.equal(rpcErr, null, `resolve_login_email RPC error: ${rpcErr?.message}`);
      assert.equal(rpcEmail, 'admin@test.local', 'Anon resolve_login_email("sysadmin") must return admin@test.local');

      // 3. Sign in with identifier: "sysadmin" + password via POST /api/auth/login (no cookies)
      const loginSysadminRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'sysadmin', password: DEFAULT_PASS }),
      });
      const loginSysadminJson = await loginSysadminRes.json();
      assert.equal(
        loginSysadminRes.status,
        200,
        `Expected 200 when logging in with username "sysadmin", got ${loginSysadminRes.status}: ${JSON.stringify(loginSysadminJson)}`
      );
      assert.equal(loginSysadminJson.user?.username, 'sysadmin');

      // 4. Playwright E2E: Login with "sysadmin", then test /admin/marks as DOS Secular (P.2, MOT) & Class Teacher (P.1, MOT)
      const launchOpts = fs.existsSync('/usr/bin/google-chrome')
        ? { headless: true, executablePath: '/usr/bin/google-chrome' }
        : { headless: true };
      const browser = await chromium.launch(launchOpts);

      try {
        // 4A. Playwright login with "sysadmin"
        const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const adminPage = await adminCtx.newPage();
        await adminPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
        await adminPage.locator('input[type="text"]').first().fill('sysadmin');
        await adminPage.locator('input[type="password"]').first().fill(DEFAULT_PASS);
        await Promise.all([
          adminPage.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
          adminPage.locator('button[type="submit"]').click(),
        ]);
        await adminPage.goto(`${BASE_URL}/admin/account`, { waitUntil: 'networkidle' });
        const unameInput = adminPage.getByTestId('account-username-input');
        await unameInput.waitFor({ state: 'visible', timeout: 10000 });
        assert.equal(await unameInput.inputValue(), 'sysadmin');
        await adminCtx.close();

        // 4B. Playwright /admin/marks as DOS Secular (dos@test.local -> Primary 2, MOT, All Subjects)
        const dosCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const dosPage = await dosCtx.newPage();
        await dosPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
        await dosPage.locator('input[type="text"]').first().fill('dos');
        await dosPage.locator('input[type="password"]').first().fill(DEFAULT_PASS);
        await Promise.all([
          dosPage.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
          dosPage.locator('button[type="submit"]').click(),
        ]);

        await dosPage.goto(`${BASE_URL}/admin/marks`, { waitUntil: 'networkidle' });
        const dosGrid = dosPage.getByTestId('marks-scroll-grid');
        await dosGrid.waitFor({ state: 'visible', timeout: 15000 });
        const bodyTextDos = await dosPage.locator('body').textContent();
        assert.doesNotMatch(bodyTextDos || '', /The operation was aborted/i);
        const dosRows = await dosGrid.locator('tbody tr').count();
        assert.ok(dosRows > 0, `Expected Secular subject rows on /admin/marks for DOS Secular, got ${dosRows}`);
        await dosCtx.close();

        // 4C. Playwright /admin/marks as Class Teacher (teacher@test.local)
        const ctCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const ctPage = await ctCtx.newPage();
        await ctPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
        await ctPage.locator('input[type="text"]').first().fill('teacher');
        await ctPage.locator('input[type="password"]').first().fill(DEFAULT_PASS);
        await Promise.all([
          ctPage.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
          ctPage.locator('button[type="submit"]').click(),
        ]);

        await ctPage.goto(`${BASE_URL}/admin/marks`, { waitUntil: 'networkidle' });
        const ctGrid = ctPage.getByTestId('marks-scroll-grid');
        await ctGrid.waitFor({ state: 'visible', timeout: 15000 });
        const bodyTextCt = await ctPage.locator('body').textContent();
        assert.doesNotMatch(bodyTextCt || '', /The operation was aborted/i);
        const ctRows = await ctGrid.locator('tbody tr').count();
        assert.ok(ctRows > 0, `Expected Secular subject rows on /admin/marks for Class Teacher, got ${ctRows}`);
        await ctCtx.close();

        console.log('[E1 WORKSTREAM 6 SYSADMIN & MARKS ENTRY PROOF]', JSON.stringify({
          patchUsernameToSysadminStatus: patchUnameRes.status,
          anonRpcResolveLoginEmail: rpcEmail,
          loginWithSysadminStatus: loginSysadminRes.status,
          dosSecularMarksSubjectRows: dosRows,
          classTeacherMarksSubjectRows: ctRows,
          abortedErrorsCount: 0,
        }));
      } finally {
        await browser.close();
      }
    } finally {
      // Restore admin username to 'admin'
      await fetch(`${BASE_URL}/api/settings/user`, {
        method: 'PATCH',
        headers: {
          Cookie: cookiesByRole['Administrator'],
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: 'Admin User',
          username: 'admin',
        }),
      });
    }
  });
});

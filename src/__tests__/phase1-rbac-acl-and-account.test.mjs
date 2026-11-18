import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { getRehearsalCredentials } from '../../scripts/rehearsal-credentials.mjs';
import { seedRehearsalDatabase } from '../../scripts/seed-rehearsal-synthetic-users.mjs';
import {
  ALL_STAFF_ROLES,
  PERMISSION_KEYS,
  PERMISSION_METADATA,
  DEFAULT_ROLE_PERMISSIONS,
  resolveEffectivePermissions,
} from '../lib/teacher-access.ts';

const creds = getRehearsalCredentials();
const SUPABASE_URL = creds.apiUrl;
const ANON_KEY = creds.anonKey;
const SERVICE_KEY = creds.serviceRoleKey;
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const MAILPIT_URL = 'http://127.0.0.1:54324';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEST_ACCOUNTS = {
  Administrator: 'admin@test.local',
  Principal: 'principal@test.local',
  'Head Teacher': 'head@test.local',
  'Deputy Head Teacher': 'deputy@test.local',
  'DOS Secular': 'dos@test.local',
  'DOS Theology': 'dos_theology@test.local',
  'Class Teacher': 'teacher@test.local',
  'Theology Instructor': 'theology@test.local',
  'Support Staff': 'staff@test.local',
};
const DEFAULT_PASS = 'Password123!';

const TERM_ID = 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111';
const ASSIGNED_CIRCULAR_CLASS_ID = 'c1000000-0000-0000-0000-000000000001'; // Primary 1
const UNASSIGNED_CIRCULAR_CLASS_ID = 'c1000000-0000-0000-0000-000000000002'; // Primary 2
const ASSIGNED_THEOLOGY_CLASS_ID = 'c0000000-0000-0000-0000-000000000002'; // 1 (Theology)
const UNASSIGNED_THEOLOGY_CLASS_ID = 'c0000000-0000-0000-0000-000000000003'; // P.2 Theology
const ASSIGNED_ENROLLMENT_ID = 'e0000000-0000-0000-0000-000000000001';
const UNASSIGNED_ENROLLMENT_ID = 'e0000000-0000-0000-0000-000000000002';
const CIRCULAR_SUBJECT_ID = 'c2000000-0000-0000-0000-000000000001';
const THEOLOGY_SUBJECT_ID = 'b0000000-0000-0000-0000-000000000001';

async function signInRole(roleName, password = DEFAULT_PASS) {
  const email = TEST_ACCOUNTS[roleName];
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert.equal(error, null, `Sign-in failed for ${roleName}: ${error?.message}`);
  return data.session;
}

function authHeaders(session) {
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

describe('Phase 1 — RBAC / ACL, Users & Permissions Editor, and My Account & Security (E1)', () => {
  const sessions = {};

  before(async () => {
    await seedRehearsalDatabase();
    for (const roleName of Object.keys(TEST_ACCOUNTS)) {
      sessions[roleName] = await signInRole(roleName);
    }
  });

  it('1D & Amendment 1: Seeded default test — Principal ⊇ each lower role for every read, review, and approve capability', async () => {
    const { data: dbRows, error } = await supabaseAdmin
      .from('role_permissions')
      .select('role, permissions')
      .order('role', { ascending: true });
    assert.equal(error, null);
    assert.equal(dbRows.length, 9, 'All 9 canonical staff roles must be seeded in public.role_permissions');

    const dbMap = Object.fromEntries(dbRows.map((r) => [r.role, r.permissions]));
    const readReviewApproveKeys = PERMISSION_KEYS.filter((k) => {
      const cat = PERMISSION_METADATA[k]?.category;
      return cat === 'Read' || cat === 'Review & Approve';
    });

    const principalPerms = new Set(dbMap['Principal']);
    const lowerRoles = [
      'Head Teacher',
      'Deputy Head Teacher',
      'DOS Secular',
      'DOS Theology',
      'Class Teacher',
      'Theology Instructor',
      'Support Staff',
    ];

    const comparisons = [];
    for (const lower of lowerRoles) {
      const lowerPerms = (dbMap[lower] || []).filter((k) => readReviewApproveKeys.includes(k));
      const missingInPrincipal = lowerPerms.filter((k) => !principalPerms.has(k));
      comparisons.push({
        lowerRole: lower,
        lowerReadReviewApprove: lowerPerms,
        principalIsSuperset: missingInPrincipal.length === 0,
      });
      assert.deepEqual(
        missingInPrincipal,
        [],
        `Principal must be a superset of ${lower} for read/review/approve capabilities`
      );
    }

    // Principal also has view_staff above Head Teacher
    assert.equal(principalPerms.has('view_staff'), true);
    assert.equal(new Set(dbMap['Head Teacher']).has('view_staff'), false);
    console.log('[E1 1D SUPERSET PROOF]', JSON.stringify({
      readReviewApproveKeys,
      principalPermissions: Array.from(principalPerms),
      supersetChecks: comparisons,
    }));
  });

  it('P2: Permission map has 12 active keys with zero dead or orphan keys', () => {
    assert.equal(PERMISSION_KEYS.length, 12);
    for (const key of PERMISSION_KEYS) {
      assert.ok(PERMISSION_METADATA[key]?.label, `Missing label for ${key}`);
      assert.ok(PERMISSION_METADATA[key]?.enforcedAt, `Missing enforcedAt for ${key}`);
    }
    for (const role of ALL_STAFF_ROLES) {
      const resolved = resolveEffectivePermissions(role);
      for (const k of resolved) {
        assert.ok(PERMISSION_KEYS.includes(k), `Orphan key ${k} in ${role}`);
      }
    }
  });

  it('1B & 1F: Role × Capability Matrix via Direct API Calls (including cross-class & cross-dept IDOR)', async () => {
    const matrixResults = [];

    for (const roleName of ALL_STAFF_ROLES) {
      const headers = authHeaders(sessions[roleName]);

      // 1. Active term GET (all authenticated roles -> 200)
      const rTermGet = await fetch(`${BASE_URL}/api/settings/terms/active`, { headers });
      // 2. Active term POST (Admin -> 200, others -> 403)
      const rTermPost = await fetch(`${BASE_URL}/api/settings/terms/active`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ term_id: TERM_ID }),
      });
      // 3. Read own/scoped students (Support Staff -> 403, others -> 200)
      const rStudentsGet = await fetch(`${BASE_URL}/api/students`, { headers });
      const studentsBody = rStudentsGet.status === 200 ? await rStudentsGet.json() : [];
      // 4. Write student POST (Admin, Principal, HT, Deputy, DOS -> allowed != 403; Class Teacher, Theology Instructor, Support Staff -> 403)
      const rStudentsPost = await fetch(`${BASE_URL}/api/students`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}), // validation runs after 403 permission check
      });
      // 5. Save Secular Marks on Assigned Class P.1
      const rSecMarksAssigned = await fetch(`${BASE_URL}/api/circular-marks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          enrollment_id: ASSIGNED_ENROLLMENT_ID,
          subject_id: CIRCULAR_SUBJECT_ID,
          term_id: TERM_ID,
          bot_score: 80,
          mot_score: 82,
          eot_score: 85,
        }),
      });
      // 6. Save Secular Marks on Unassigned Class P.2 (IDOR check for Class Teacher)
      const rSecMarksUnassigned = await fetch(`${BASE_URL}/api/circular-marks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          enrollment_id: UNASSIGNED_ENROLLMENT_ID,
          subject_id: CIRCULAR_SUBJECT_ID,
          term_id: TERM_ID,
          bot_score: 80,
        }),
      });
      // 7. Save Theology Marks on Assigned Class P.1
      const rTheoMarksAssigned = await fetch(`${BASE_URL}/api/theology-marks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          enrollment_id: ASSIGNED_ENROLLMENT_ID,
          subject_id: THEOLOGY_SUBJECT_ID,
          term_id: TERM_ID,
          bot_score: 88,
          mot_score: 90,
          eot_score: 91,
        }),
      });
      // 8. Save Theology Marks on Unassigned Class P.2
      const rTheoMarksUnassigned = await fetch(`${BASE_URL}/api/theology-marks`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          enrollment_id: UNASSIGNED_ENROLLMENT_ID,
          subject_id: THEOLOGY_SUBJECT_ID,
          term_id: TERM_ID,
          bot_score: 88,
        }),
      });
      // 9. Secular Hub GET (Assigned Class P.1)
      const rSecHub = await fetch(
        `${BASE_URL}/api/secular-hub?term_id=${TERM_ID}&class_id=${ASSIGNED_CIRCULAR_CLASS_ID}`,
        { headers }
      );
      // 10. Theology Hub GET (Assigned Class P.1 Theology)
      const rTheoHub = await fetch(
        `${BASE_URL}/api/theology-hub?term_id=${TERM_ID}&class_id=${ASSIGNED_THEOLOGY_CLASS_ID}`,
        { headers }
      );
      // 11. Report Card GET (Assigned Enrollment)
      const rReportAssigned = await fetch(
        `${BASE_URL}/api/report?enrollment_id=${ASSIGNED_ENROLLMENT_ID}&term_id=${TERM_ID}`,
        { headers }
      );
      // 12. Report Card GET (Unassigned Enrollment)
      const rReportUnassigned = await fetch(
        `${BASE_URL}/api/report?enrollment_id=${UNASSIGNED_ENROLLMENT_ID}&term_id=${TERM_ID}`,
        { headers }
      );
      // 13. Activity Logs GET
      const rActivity = await fetch(`${BASE_URL}/api/activity`, { headers });
      // 14. Staff Directory GET (/api/teachers)
      const rStaffList = await fetch(`${BASE_URL}/api/teachers`, { headers });
      // 15. School Settings GET (/api/settings/school)
      const rSchoolSettings = await fetch(`${BASE_URL}/api/settings/school`, { headers });
      // 16. Lock Marks PATCH (/api/settings/school with marks_locks only)
      const rLockMarks = await fetch(`${BASE_URL}/api/settings/school`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ marks_locks: { [`${TERM_ID}:BOT`]: false } }),
      });
      // 17. Admin Permissions Matrix GET (/api/admin/permissions)
      const rAdminPerms = await fetch(`${BASE_URL}/api/admin/permissions`, { headers });

      const row = {
        role: roleName,
        termGet: rTermGet.status,
        termPost: rTermPost.status,
        studentsGet: `${rStudentsGet.status}(n=${Array.isArray(studentsBody) ? studentsBody.length : 0})`,
        studentsWriteAllowed: rStudentsPost.status !== 403 && rStudentsPost.status !== 401,
        studentsWriteStatus: rStudentsPost.status,
        secMarksAssigned: rSecMarksAssigned.status,
        secMarksUnassigned: rSecMarksUnassigned.status,
        theoMarksAssigned: rTheoMarksAssigned.status,
        theoMarksUnassigned: rTheoMarksUnassigned.status,
        secHub: rSecHub.status,
        theoHub: rTheoHub.status,
        reportAssigned: rReportAssigned.status,
        reportUnassigned: rReportUnassigned.status,
        activityGet: rActivity.status,
        staffListGet: rStaffList.status,
        schoolSettingsGet: rSchoolSettings.status,
        lockMarksPatch: rLockMarks.status,
        adminPermsGet: rAdminPerms.status,
      };
      matrixResults.push(row);
    }

    console.log('[E1 1F API MATRIX]', JSON.stringify(matrixResults, null, 2));

    const byRole = Object.fromEntries(matrixResults.map((r) => [r.role, r]));

    // Key assertions per PERMISSIONS_MATRIX.md
    assert.equal(byRole['Administrator'].adminPermsGet, 200);
    assert.equal(byRole['Principal'].adminPermsGet, 403);
    assert.equal(byRole['Head Teacher'].adminPermsGet, 403);

    // Principal vs Head Teacher: Principal has view_staff (200 on /api/teachers), Head Teacher gets 403
    assert.equal(byRole['Principal'].staffListGet, 200);
    assert.equal(byRole['Head Teacher'].staffListGet, 403);

    // Principal, Head Teacher, Deputy have lock_marks (200) and view_activity_logs (200) and read_reports (200), but write_marks is 403
    for (const execRole of ['Principal', 'Head Teacher', 'Deputy Head Teacher']) {
      assert.equal(byRole[execRole].lockMarksPatch, 200, `${execRole} lock_marks`);
      assert.equal(byRole[execRole].activityGet, 200, `${execRole} activityGet`);
      assert.equal(byRole[execRole].reportAssigned, 200, `${execRole} reportAssigned`);
      assert.equal(byRole[execRole].reportUnassigned, 200, `${execRole} reportUnassigned`);
      assert.equal(byRole[execRole].secMarksAssigned, 403, `${execRole} secMarksAssigned should be 403 read-only`);
      assert.equal(byRole[execRole].theoMarksAssigned, 403, `${execRole} theoMarksAssigned should be 403 read-only`);
      assert.equal(byRole[execRole].schoolSettingsGet, 403, `${execRole} schoolSettingsGet should be 403`);
    }

    // DOS Secular vs DOS Theology department isolation
    assert.equal(byRole['DOS Secular'].secMarksAssigned, 200);
    assert.equal(byRole['DOS Secular'].theoMarksAssigned, 403);
    assert.equal(byRole['DOS Secular'].secHub, 200);
    assert.equal(byRole['DOS Secular'].theoHub, 403);

    assert.equal(byRole['DOS Theology'].theoMarksAssigned, 200);
    assert.equal(byRole['DOS Theology'].secMarksAssigned, 403);
    assert.equal(byRole['DOS Theology'].theoHub, 200);
    assert.equal(byRole['DOS Theology'].secHub, 403);

    // Class Teacher: assigned P.1 allowed (200), unassigned P.2 blocked (403), own-class student write allowed (400 on empty validation payload, not 403)
    assert.equal(byRole['Class Teacher'].secMarksAssigned, 200);
    assert.equal(byRole['Class Teacher'].secMarksUnassigned, 403);
    assert.equal(byRole['Class Teacher'].theoMarksAssigned, 200);
    assert.equal(byRole['Class Teacher'].theoMarksUnassigned, 403);
    assert.equal(byRole['Class Teacher'].reportAssigned, 200);
    assert.equal(byRole['Class Teacher'].reportUnassigned, 403);
    assert.equal(byRole['Class Teacher'].studentsWriteAllowed, true);
    assert.equal(byRole['Class Teacher'].activityGet, 403);

    // Theology Instructor: assigned theology marks allowed (200), secular marks blocked (403), unassigned theology blocked (403), own-class student write allowed
    assert.equal(byRole['Theology Instructor'].theoMarksAssigned, 200);
    assert.equal(byRole['Theology Instructor'].theoMarksUnassigned, 403);
    assert.equal(byRole['Theology Instructor'].secMarksAssigned, 403);
    assert.equal(byRole['Theology Instructor'].studentsWriteAllowed, true);

    // Support Staff: active term GET allowed (200), everything academic blocked (403)
    assert.equal(byRole['Support Staff'].termGet, 200);
    assert.equal(byRole['Support Staff'].studentsGet, '403(n=0)');
    assert.equal(byRole['Support Staff'].secMarksAssigned, 403);
    assert.equal(byRole['Support Staff'].theoMarksAssigned, 403);
  });

  it('1E & Amendment 2 (P1, P3, P4, P5): Users, Permissions & Access API end-to-end (direct user creation, live class assignment/revocation, live role permission toggle, safeguards, audit logs)', async () => {
    const adminHeaders = authHeaders(sessions['Administrator']);

    // 1. Safeguard: Admin cannot demote own role or deactivate own account
    const { data: adminTeacher } = await supabaseAdmin
      .from('teachers')
      .select('id')
      .eq('email', 'admin@test.local')
      .single();

    const selfDemoteRes = await fetch(`${BASE_URL}/api/admin/teachers/${adminTeacher.id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ role: 'Class Teacher' }),
    });
    assert.equal(selfDemoteRes.status, 400, 'Self-demotion must return 400');

    const selfDeactivateRes = await fetch(`${BASE_URL}/api/admin/teachers/${adminTeacher.id}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert.equal(selfDeactivateRes.status, 400, 'Self-deactivation must return 400');

    // 2. Direct account creation with initial password (works with public signups OFF)
    const tempEmail = `phase1_direct_${Date.now()}@test.local`;
    const createRes = await fetch(`${BASE_URL}/api/admin/teachers/invite`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        mode: 'create',
        email: tempEmail,
        name: 'Phase1 Direct Teacher',
        role: 'Class Teacher',
        subject: 'Secular',
        initialPassword: 'DirectPass123!',
        classes: [ASSIGNED_CIRCULAR_CLASS_ID],
      }),
    });
    const createBody = await createRes.json();
    assert.equal(createRes.status, 200, `Direct user creation failed: ${JSON.stringify(createBody)}`);
    const createdTeacherId = createBody.teacher.id;

    // Sign in as the newly created teacher immediately
    const tempClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: tempSignIn, error: tempSignInErr } = await tempClient.auth.signInWithPassword({
      email: tempEmail,
      password: 'DirectPass123!',
    });
    assert.equal(tempSignInErr, null, 'Newly created user must sign in immediately without email confirmation');
    const tempHeaders = authHeaders(tempSignIn.session);

    // 3. Verify assigned class P.1 works (200) and unassigned class P.2 is denied (403)
    const p1ResBefore = await fetch(
      `${BASE_URL}/api/secular-hub?term_id=${TERM_ID}&class_id=${ASSIGNED_CIRCULAR_CLASS_ID}`,
      { headers: tempHeaders }
    );
    const p2ResBefore = await fetch(
      `${BASE_URL}/api/secular-hub?term_id=${TERM_ID}&class_id=${UNASSIGNED_CIRCULAR_CLASS_ID}`,
      { headers: tempHeaders }
    );
    assert.equal(p1ResBefore.status, 200);
    assert.equal(p2ResBefore.status, 403);

    // 4. Live class assignment swap: unassign P.1 and assign P.2 -> enforced on very next request!
    const swapClassRes = await fetch(`${BASE_URL}/api/admin/teachers/${createdTeacherId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        classes: [UNASSIGNED_CIRCULAR_CLASS_ID],
      }),
    });
    assert.equal(swapClassRes.status, 200);

    const p1ResAfter = await fetch(
      `${BASE_URL}/api/secular-hub?term_id=${TERM_ID}&class_id=${ASSIGNED_CIRCULAR_CLASS_ID}`,
      { headers: tempHeaders }
    );
    const p2ResAfter = await fetch(
      `${BASE_URL}/api/secular-hub?term_id=${TERM_ID}&class_id=${UNASSIGNED_CIRCULAR_CLASS_ID}`,
      { headers: tempHeaders }
    );
    assert.equal(p1ResAfter.status, 403, 'Removed class P.1 must be revoked immediately on next request');
    assert.equal(p2ResAfter.status, 200, 'Newly assigned class P.2 must be granted immediately on next request');

    // 5. Live Role Permission Editor test: grant view_activity_logs to Class Teacher -> enforced on next request -> restore
    const actBefore = await fetch(`${BASE_URL}/api/activity`, { headers: tempHeaders });
    assert.equal(actBefore.status, 403);

    const grantRolePermRes = await fetch(`${BASE_URL}/api/admin/permissions`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        role: 'Class Teacher',
        permissions: [...DEFAULT_ROLE_PERMISSIONS['Class Teacher'], 'view_activity_logs'],
      }),
    });
    assert.equal(grantRolePermRes.status, 200);

    const actDuring = await fetch(`${BASE_URL}/api/activity`, { headers: tempHeaders });
    assert.equal(actDuring.status, 200, 'Open session must pick up role_permissions grant on the very next request');

    // Restore Class Teacher default permissions
    const restoreRolePermRes = await fetch(`${BASE_URL}/api/admin/permissions`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        role: 'Class Teacher',
        permissions: DEFAULT_ROLE_PERMISSIONS['Class Teacher'],
      }),
    });
    assert.equal(restoreRolePermRes.status, 200);

    const actAfterRestore = await fetch(`${BASE_URL}/api/activity`, { headers: tempHeaders });
    assert.equal(actAfterRestore.status, 403, 'Open session must enforce revoked permission on the very next request');

    // 6. Admin changes user's email directly from Users API (no confirmation needed, before -> after logged)
    const updatedTempEmail = `phase1_renamed_${Date.now()}@test.local`;
    const emailUpdateRes = await fetch(`${BASE_URL}/api/admin/teachers/${createdTeacherId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ email: updatedTempEmail }),
    });
    assert.equal(emailUpdateRes.status, 200);

    // 7. Admin resets user's password (min length 8 enforced)
    const shortResetRes = await fetch(`${BASE_URL}/api/admin/reset-password`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: createdTeacherId, newPassword: 'short' }),
    });
    assert.equal(shortResetRes.status, 400);

    const validResetRes = await fetch(`${BASE_URL}/api/admin/reset-password`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: createdTeacherId, newPassword: 'ResetPass456!' }),
    });
    assert.equal(validResetRes.status, 200);

    // 8. Soft-deactivate user -> verify 401/403 on next request -> reactivate -> clean up
    const deactRes = await fetch(`${BASE_URL}/api/admin/teachers/${createdTeacherId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert.equal(deactRes.status, 200);

    const p2AfterDeact = await fetch(
      `${BASE_URL}/api/secular-hub?term_id=${TERM_ID}&class_id=${UNASSIGNED_CIRCULAR_CLASS_ID}`,
      { headers: tempHeaders }
    );
    assert.ok(
      [401, 403].includes(p2AfterDeact.status),
      `Deactivated teacher must be blocked immediately with 401 or 403, got ${p2AfterDeact.status}`
    );

    const reactivateRes = await fetch(`${BASE_URL}/api/admin/teachers/${createdTeacherId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'active', classes: [UNASSIGNED_CIRCULAR_CLASS_ID] }),
    });
    assert.equal(reactivateRes.status, 200);

    // Cleanup temporary test user
    await supabaseAdmin.from('teacher_class_assignments').delete().eq('teacher_id', createdTeacherId);
    await supabaseAdmin.from('teachers').delete().eq('id', createdTeacherId);
    await supabaseAdmin.auth.admin.deleteUser(createdTeacherId);

    console.log('[E1 1E/P3 LIFECYCLE PROOF] Direct create -> class swap -> live permission toggle -> admin email change -> password reset -> deactivate/reactivate PASSED');
  });

  it('Amendment 3 (A1–A6): My Account & Security API verification (Assigned Classes UUID resolution, Anti-Escalation, Phone validation, Avatar sniffing, Password re-auth, Admin Email Change + Mailpit, Sign out other devices)', async () => {
    const adminHeaders = authHeaders(sessions['Administrator']);
    const teacherHeaders = authHeaders(sessions['Class Teacher']);

    // A5: Verify Assigned Classes resolves UUIDs and returns "All classes" for Administrator
    const adminUserGet = await fetch(`${BASE_URL}/api/settings/user`, { headers: adminHeaders });
    const adminUserBody = await adminUserGet.json();
    assert.equal(adminUserGet.status, 200);
    assert.deepEqual(adminUserBody.data.assigned_classes, ['All classes']);

    const teacherUserGet = await fetch(`${BASE_URL}/api/settings/user`, { headers: teacherHeaders });
    const teacherUserBody = await teacherUserGet.json();
    assert.equal(teacherUserGet.status, 200);
    assert.ok(
      teacherUserBody.data.assigned_classes.includes('Primary 1'),
      `Class Teacher assigned_classes should resolve UUID to Primary 1, got: ${JSON.stringify(teacherUserBody.data.assigned_classes)}`
    );
    assert.ok(
      !teacherUserBody.data.assigned_classes.some((c) => /^[0-9a-f-]{36}$/i.test(c)),
      'assigned_classes must never contain a raw UUID'
    );
    console.log('[E1 A5 UUID RESOLUTION]', JSON.stringify({
      admin_assigned_classes: adminUserBody.data.assigned_classes,
      teacher_assigned_classes: teacherUserBody.data.assigned_classes,
      teacher_raw_tokens_resolved: teacherUserBody.data.raw_class_tokens_resolved,
    }));

    // A4: Anti-escalation — non-admin and admin sending role, department, classes, permissions, or email to PATCH /api/settings/user -> 403
    const escalationPayloads = [
      { role: 'Administrator' },
      { department: 'All Departments' },
      { assigned_classes: ['All classes'] },
      { permissions: ['manage_users'] },
      { email: 'hacked@test.local' },
    ];
    for (const badPayload of escalationPayloads) {
      const escRes = await fetch(`${BASE_URL}/api/settings/user`, {
        method: 'PATCH',
        headers: teacherHeaders,
        body: JSON.stringify({ full_name: 'Escalation Test', ...badPayload }),
      });
      assert.equal(escRes.status, 403, `Expected 403 for escalation payload ${JSON.stringify(badPayload)}`);
    }

    // A5: Phone validation — invalid format rejected with 400, valid format saved and read back
    const badPhoneRes = await fetch(`${BASE_URL}/api/settings/user`, {
      method: 'PATCH',
      headers: teacherHeaders,
      body: JSON.stringify({ full_name: 'Test Class Teacher', phone: 'not-a-phone!!' }),
    });
    assert.equal(badPhoneRes.status, 400);

    const goodProfileRes = await fetch(`${BASE_URL}/api/settings/user`, {
      method: 'PATCH',
      headers: teacherHeaders,
      body: JSON.stringify({ full_name: 'Teacher Verified Name', phone: '+256 701 234567' }),
    });
    const goodProfileBody = await goodProfileRes.json();
    assert.equal(goodProfileRes.status, 200);
    assert.equal(goodProfileBody.data.full_name, 'Teacher Verified Name');
    assert.equal(goodProfileBody.data.phone, '+256701234567');

    // Restore teacher name
    await fetch(`${BASE_URL}/api/settings/user`, {
      method: 'PATCH',
      headers: teacherHeaders,
      body: JSON.stringify({ full_name: 'Test Class Teacher', phone: '+256 701 234567' }),
    });

    // A5: Photo upload — reject SVG (400), accept valid 1x1 PNG (200)
    const svgForm = new FormData();
    svgForm.append('avatar', new Blob(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], { type: 'image/svg+xml' }), 'xss.svg');
    const svgRes = await fetch(`${BASE_URL}/api/settings/user/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessions['Class Teacher'].access_token}` },
      body: svgForm,
    });
    assert.equal(svgRes.status, 400, 'SVG upload must be rejected with 400');

    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const pngBuffer = Buffer.from(pngBase64, 'base64');
    const pngForm = new FormData();
    pngForm.append('avatar', new Blob([pngBuffer], { type: 'image/png' }), 'avatar.png');
    const pngRes = await fetch(`${BASE_URL}/api/settings/user/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessions['Class Teacher'].access_token}` },
      body: pngForm,
    });
    const pngBody = await pngRes.json();
    assert.equal(pngRes.status, 200, `PNG avatar upload failed: ${JSON.stringify(pngBody)}`);
    assert.ok(pngBody.data.avatar_url.includes('avatars/'));

    // A2: Password — currentPassword required (400), min length 8 (400), wrong currentPassword rejected (400), valid change works & old password fails
    const noCurrPassRes = await fetch(`${BASE_URL}/api/settings/user/password`, {
      method: 'PATCH',
      headers: teacherHeaders,
      body: JSON.stringify({ currentPassword: '', newPassword: 'NewPassword123!' }),
    });
    assert.equal(noCurrPassRes.status, 400);

    const shortPassRes = await fetch(`${BASE_URL}/api/settings/user/password`, {
      method: 'PATCH',
      headers: teacherHeaders,
      body: JSON.stringify({ currentPassword: DEFAULT_PASS, newPassword: 'short6' }),
    });
    assert.equal(shortPassRes.status, 400);

    const wrongCurrPassRes = await fetch(`${BASE_URL}/api/settings/user/password`, {
      method: 'PATCH',
      headers: teacherHeaders,
      body: JSON.stringify({ currentPassword: 'WrongPassword999!', newPassword: 'NewPassword123!' }),
    });
    assert.equal(wrongCurrPassRes.status, 400);

    const validPassRes = await fetch(`${BASE_URL}/api/settings/user/password`, {
      method: 'PATCH',
      headers: teacherHeaders,
      body: JSON.stringify({ currentPassword: DEFAULT_PASS, newPassword: 'NewPassword123!' }),
    });
    assert.equal(validPassRes.status, 200);

    // Prove old password fails and new password works
    const checkClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: oldPassErr } = await checkClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS['Class Teacher'],
      password: DEFAULT_PASS,
    });
    assert.notEqual(oldPassErr, null, 'Old password must fail after password update');

    const { data: newPassData, error: newPassErr } = await checkClient.auth.signInWithPassword({
      email: TEST_ACCOUNTS['Class Teacher'],
      password: 'NewPassword123!',
    });
    assert.equal(newPassErr, null, 'New password must succeed after password update');

    // Restore DEFAULT_PASS for Class Teacher
    const restorePassRes = await fetch(`${BASE_URL}/api/settings/user/password`, {
      method: 'PATCH',
      headers: authHeaders(newPassData.session),
      body: JSON.stringify({ currentPassword: 'NewPassword123!', newPassword: DEFAULT_PASS }),
    });
    assert.equal(restorePassRes.status, 200);
    // A2 proof: prior session token issued before password change is revoked and returns 401
    const revokedTokenRes = await fetch(`${BASE_URL}/api/settings/initials`, {
      method: 'POST',
      headers: teacherHeaders,
      body: JSON.stringify({ level: 'lower_primary', subject_id: CIRCULAR_SUBJECT_ID, initials: 'TT' }),
    });
    assert.equal(revokedTokenRes.status, 401, 'Pre-password-change JWT must be revoked (401)');
    sessions['Class Teacher'] = await signInRole('Class Teacher');
    const refreshedTeacherHeaders = authHeaders(sessions['Class Teacher']);

    // A3: Email change — non-admin blocked with 403; Admin self-service triggers confirmation email in Mailpit + sets pending_email; Cancel clears it
    const nonAdminEmailRes = await fetch(`${BASE_URL}/api/settings/user/email`, {
      method: 'POST',
      headers: authHeaders(sessions['Principal']),
      body: JSON.stringify({
        newEmail: 'principal_new@test.local',
        confirmEmail: 'principal_new@test.local',
        currentPassword: DEFAULT_PASS,
      }),
    });
    assert.equal(nonAdminEmailRes.status, 403, 'Non-admin self-service email change must be 403');

    const targetPendingEmail = `admin_pending_${Date.now()}@test.local`;
    const adminEmailChangeRes = await fetch(`${BASE_URL}/api/settings/user/email`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        newEmail: targetPendingEmail,
        confirmEmail: targetPendingEmail,
        currentPassword: DEFAULT_PASS,
      }),
    });
    const adminEmailChangeBody = await adminEmailChangeRes.json();
    assert.equal(adminEmailChangeRes.status, 200, `Admin email change failed: ${JSON.stringify(adminEmailChangeBody)}`);
    assert.equal(adminEmailChangeBody.data.pending_email, targetPendingEmail);
    assert.equal(adminEmailChangeBody.data.email, 'admin@test.local');

    // Verify Mailpit received the confirmation email
    const mailpitRes = await fetch(`${MAILPIT_URL}/api/v1/messages`);
    const mailpitJson = await mailpitRes.json();
    const matchedMsg = (mailpitJson.messages || []).find((m) =>
      (m.To || []).some((to) => to.Address === targetPendingEmail)
    );
    assert.ok(matchedMsg, `Expected confirmation email to ${targetPendingEmail} in Mailpit`);
    console.log('[E1 A3 MAILPIT PROOF]', JSON.stringify({
      mailpit_message_id: matchedMsg.ID,
      to: matchedMsg.To.map((t) => t.Address),
      subject: matchedMsg.Subject,
    }));

    // Cancel pending email change and verify pending_email is cleared
    const cancelEmailRes = await fetch(`${BASE_URL}/api/settings/user/email`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    const cancelEmailBody = await cancelEmailRes.json();
    assert.equal(cancelEmailRes.status, 200);
    assert.equal(cancelEmailBody.data.pending_email, null);

    // A6: Sign out other devices
    const signOutOthersRes = await fetch(`${BASE_URL}/api/settings/user/sessions`, {
      method: 'POST',
      headers: adminHeaders,
    });
    assert.equal(signOutOthersRes.status, 200);

    // Anti-bypass checks on hardened routes (initials, transliterate/batch, documents, report/batch, spoofed user_metadata.role)
    const initDenyRes = await fetch(`${BASE_URL}/api/settings/initials`, {
      method: 'POST',
      headers: refreshedTeacherHeaders,
      body: JSON.stringify({ level: 'lower_primary', subject_id: CIRCULAR_SUBJECT_ID, initials: 'TT' }),
    });
    assert.equal(initDenyRes.status, 403, 'Class Teacher cannot modify teacher_initials');

    const translitDenyRes = await fetch(`${BASE_URL}/api/settings/transliterate/batch`, {
      method: 'POST',
      headers: refreshedTeacherHeaders,
    });
    assert.equal(translitDenyRes.status, 403, 'Class Teacher cannot invoke batch transliteration');

    const docsDenyRes = await fetch(`${BASE_URL}/api/documents`, {
      headers: refreshedTeacherHeaders,
    });
    assert.equal(docsDenyRes.status, 403, 'Class Teacher cannot list Upload Center documents');

    const batchReportDenyRes = await fetch(`${BASE_URL}/api/report/batch`, {
      method: 'POST',
      headers: authHeaders(sessions['Support Staff']),
      body: JSON.stringify({
        enrollment_ids: [ASSIGNED_ENROLLMENT_ID],
        term_id: TERM_ID,
        score_type: 'eot',
        curriculum: 'secular',
      }),
    });
    assert.equal(batchReportDenyRes.status, 403, 'Support Staff cannot generate batch reports');

    // Spoof user_metadata.role = 'Administrator' on Support Staff user -> verify server STILL rejects with 403
    const spoofEmail = `spoof_${Date.now()}@test.local`;
    const { data: spoofCreated } = await supabaseAdmin.auth.admin.createUser({
      email: spoofEmail,
      password: DEFAULT_PASS,
      email_confirm: true,
      user_metadata: { role: 'Administrator' },
    });
    await supabaseAdmin.from('teachers').insert({
      id: spoofCreated.user.id,
      auth_user_id: spoofCreated.user.id,
      email: spoofEmail,
      name: 'Spoof Attempt User',
      role: 'Support Staff',
      subject: 'Administration',
      status: 'active',
    });
    const spoofClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: spoofSignIn } = await spoofClient.auth.signInWithPassword({
      email: spoofEmail,
      password: DEFAULT_PASS,
    });
    const spoofHeaders = authHeaders(spoofSignIn.session);
    const spoofReportRes = await fetch(
      `${BASE_URL}/api/report?enrollment_id=${ASSIGNED_ENROLLMENT_ID}&term_id=${TERM_ID}`,
      { headers: spoofHeaders }
    );
    const spoofReportsRes = await fetch(
      `${BASE_URL}/api/reports?student_id=a0000000-0000-0000-0000-000000000001&term_id=${TERM_ID}`,
      { headers: spoofHeaders }
    );
    assert.equal(spoofReportRes.status, 403, 'Spoofed user_metadata.role must never bypass /api/report');
    assert.equal(spoofReportsRes.status, 403, 'Spoofed user_metadata.role must never bypass /api/reports');
    await supabaseAdmin.from('teachers').delete().eq('id', spoofCreated.user.id);
    await supabaseAdmin.auth.admin.deleteUser(spoofCreated.user.id);

    // Full confirmation-to-teachers-mirror E1 proof on a temporary Administrator account
    const tempAdminOrig = `temp_admin_orig_${Date.now()}@test.local`;
    const tempAdminNext = `temp_admin_next_${Date.now()}@test.local`;
    const { data: tempAdmAuth } = await supabaseAdmin.auth.admin.createUser({
      email: tempAdminOrig,
      password: DEFAULT_PASS,
      email_confirm: true,
      user_metadata: { role: 'Administrator', name: 'Temp Admin Confirm Check' },
    });
    await supabaseAdmin.from('teachers').insert({
      id: tempAdmAuth.user.id,
      auth_user_id: tempAdmAuth.user.id,
      email: tempAdminOrig,
      name: 'Temp Admin Confirm Check',
      role: 'Administrator',
      subject: 'Administration',
      status: 'active',
    });
    const tempAdmClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: tempAdmLogin } = await tempAdmClient.auth.signInWithPassword({
      email: tempAdminOrig,
      password: DEFAULT_PASS,
    });
    const tempAdmHeaders = authHeaders(tempAdmLogin.session);
    const reqChangeRes = await fetch(`${BASE_URL}/api/settings/user/email`, {
      method: 'POST',
      headers: tempAdmHeaders,
      body: JSON.stringify({
        newEmail: tempAdminNext,
        confirmEmail: tempAdminNext,
        currentPassword: DEFAULT_PASS,
      }),
    });
    assert.equal(reqChangeRes.status, 200);

    // Fetch Mailpit message for tempAdminNext and confirm email if double_confirm_changes or single-confirm URL exists
    const mpList = await (await fetch(`${MAILPIT_URL}/api/v1/messages`)).json();
    const mpMsg = (mpList.messages || []).find((m) =>
      (m.To || []).some((t) => t.Address === tempAdminNext)
    );
    assert.ok(mpMsg, 'Confirmation email must arrive at new address in Mailpit');
    const mpDetail = await (await fetch(`${MAILPIT_URL}/api/v1/message/${mpMsg.ID}`)).json();
    const mpBodyText = `${mpDetail.Text || ''} ${mpDetail.HTML || ''}`;
    const urlMatch = mpBodyText.match(/https?:\/\/[^\s"'<>]+verify[^\s"'<>]*/i);
    assert.ok(urlMatch, 'Confirmation email must contain verify URL');
    const confirmLink = urlMatch[0].replace(/&amp;/g, '&');
    await fetch(confirmLink, { redirect: 'manual' });

    // Confirm auth update via admin API as fallback if local double_confirm_changes requires old email click too, then check auto-mirror in GET /api/settings/user
    const { data: postVerifyUser } = await supabaseAdmin.auth.admin.getUserById(tempAdmAuth.user.id);
    if (postVerifyUser?.user?.email !== tempAdminNext) {
      // Simulate second-inbox confirmation (double_confirm_changes=true in config.toml) -> verify auto-mirror on GET /api/settings/user
      await supabaseAdmin.auth.admin.updateUserById(tempAdmAuth.user.id, {
        email: tempAdminNext,
        email_confirm: true,
      });
    }
    const { data: tempAdmReLogin } = await tempAdmClient.auth.signInWithPassword({
      email: tempAdminNext,
      password: DEFAULT_PASS,
    });
    const afterConfirmProfile = await (
      await fetch(`${BASE_URL}/api/settings/user`, { headers: authHeaders(tempAdmReLogin.session) })
    ).json();
    assert.equal(afterConfirmProfile.data.email, tempAdminNext);
    assert.equal(afterConfirmProfile.data.pending_email, null);
    const { data: mirroredTeacherRow } = await supabaseAdmin
      .from('teachers')
      .select('email, pending_email')
      .eq('id', tempAdmAuth.user.id)
      .single();
    assert.equal(mirroredTeacherRow.email, tempAdminNext);
    assert.equal(mirroredTeacherRow.pending_email, null);

    // Cleanup tempAdmin
    await supabaseAdmin.from('teachers').delete().eq('id', tempAdmAuth.user.id);
    await supabaseAdmin.auth.admin.deleteUser(tempAdmAuth.user.id);

    // Verify activity_logs before->after audit trail has zero plaintext password leaks
    const { data: auditRows } = await supabaseAdmin
      .from('activity_logs')
      .select('action, metadata')
      .in('action', ['change_password', 'update_user_profile', 'upload_avatar', 'request_email_change', 'cancel_email_change', 'sign_out_other_sessions'])
      .order('created_at', { ascending: false })
      .limit(20);
    assert.ok(auditRows && auditRows.length >= 4, 'Expected audited account security events');
    const serializedAudit = JSON.stringify(auditRows);
    assert.equal(serializedAudit.includes('NewPassword123!'), false, 'Audit log must never store plaintext passwords');
  });

  it('1F, P1 & A1 Playwright Browser E2E: Role navigation & gating, Users/Permissions Matrix UI, and My Account live sidebar sync', async () => {
    const executablePath = fs.existsSync('/usr/bin/google-chrome')
      ? '/usr/bin/google-chrome'
      : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const browser = await chromium.launch({ executablePath, headless: true });
    try {
      const hostname = new URL(BASE_URL).hostname;
      const cookieName = 'sb-127-auth-token';

      async function createRolePage(roleName) {
        const ctx = await browser.newContext({ serviceWorkers: 'block' });
        await ctx.addInitScript(() => {
          try {
            window.localStorage.setItem('jiddah_tour_completed', 'true');
          } catch { }
        });
        const session = await signInRole(roleName);
        sessions[roleName] = session;
        const ssrCookieValue = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
        await ctx.addCookies([
          {
            name: cookieName,
            value: ssrCookieValue,
            domain: hostname,
            path: '/',
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
          },
        ]);
        const page = await ctx.newPage();
        return { ctx, page };
      }

      // 1. Administrator opens /admin/teachers -> verifies Users tab + Roles & Permissions Matrix tab
      {
        const { ctx, page } = await createRolePage('Administrator');
        await page.goto(`${BASE_URL}/admin/teachers`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('[data-testid="tab-users-access"]', { timeout: 30000 });
        const usersTabText = await page.locator('[data-testid="tab-users-access"]').innerText();
        await page.click('[data-testid="tab-roles-permissions"]');
        await page.waitForSelector('[data-testid="perm-toggle-Principal-view_staff"]', { timeout: 15000 });
        const principalViewStaffChecked = await page
          .locator('[data-testid="perm-toggle-Principal-view_staff"]')
          .isChecked();
        assert.equal(principalViewStaffChecked, true);

        // Open /admin/account as Administrator -> verify Assigned Classes shows "All classes", email change card exists, and name update syncs to sidebar without sign-out
        await page.goto(`${BASE_URL}/admin/account`, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('[data-testid="account-assigned-classes"]', { timeout: 30000 });
        const assignedText = await page.locator('[data-testid="account-assigned-classes"]').innerText();
        assert.equal(assignedText.trim(), 'All classes');
        const emailCardVisible = await page.locator('[data-testid="account-email-change-card"]').isVisible();
        assert.equal(emailCardVisible, true);

        await page.fill('[data-testid="account-fullname-input"]', 'Admin Live Sync Check');
        await page.fill('[data-testid="account-phone-input"]', '+256 772 998877');
        await page.click('[data-testid="account-profile-save-btn"]');
        await page.waitForFunction(
          () => document.querySelector('[data-testid="sidebar-user-name"]')?.textContent?.trim() === 'Admin Live Sync Check',
          null,
          { timeout: 15000 }
        );
        const sidebarName = await page.locator('[data-testid="sidebar-user-name"]').innerText();
        assert.equal(sidebarName.trim(), 'Admin Live Sync Check');

        // Upload 1x1 PNG avatar in UI and verify sidebar avatar image updates live without signing out
        const pngBuffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        );
        await page.setInputFiles('[data-testid="account-avatar-file-input"]', {
          name: 'ui-avatar.png',
          mimeType: 'image/png',
          buffer: pngBuffer,
        });
        await page.waitForSelector('[data-testid="account-avatar-save-btn"]', { timeout: 5000 });
        await page.click('[data-testid="account-avatar-save-btn"]');
        await page.waitForSelector('[data-testid="sidebar-user-avatar-img"]', { timeout: 15000 });

        // Reload page -> verify full name, phone, and avatar persist across reload
        await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('[data-testid="account-fullname-input"]', { timeout: 15000 });
        const reloadedName = await page.inputValue('[data-testid="account-fullname-input"]');
        const reloadedPhone = await page.inputValue('[data-testid="account-phone-input"]');
        const reloadedSidebarImg = await page.locator('[data-testid="sidebar-user-avatar-img"]').count();
        assert.equal(reloadedName.trim(), 'Admin Live Sync Check');
        assert.equal(reloadedPhone.trim(), '+256772998877');
        assert.ok(reloadedSidebarImg >= 1, 'Sidebar avatar image must survive page reload');

        // Restore Admin name & phone
        await page.fill('[data-testid="account-fullname-input"]', 'Synthetic Admin');
        await page.fill('[data-testid="account-phone-input"]', '');
        await page.click('[data-testid="account-profile-save-btn"]');
        await page.waitForFunction(
          () => document.querySelector('[data-testid="sidebar-user-name"]')?.textContent?.trim() === 'Synthetic Admin',
          null,
          { timeout: 15000 }
        );
        console.log('[E1 PLAYWRIGHT ADMIN]', JSON.stringify({
          usersTabText,
          principalViewStaffChecked,
          assignedClasses: assignedText.trim(),
          emailCardVisible,
          sidebarLiveNameSynced: sidebarName.trim(),
          reloadedName: reloadedName.trim(),
          reloadedPhone: reloadedPhone.trim(),
          reloadedSidebarAvatarCount: reloadedSidebarImg,
        }));
        await ctx.close();
      }

      // 2. Principal opens /admin/secular-hub (allowed), /admin/theology-hub (allowed), and tries /admin/teachers (redirected/denied)
      {
        const { ctx, page } = await createRolePage('Principal');
        await page.goto(`${BASE_URL}/admin/secular-hub`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const secHubUrl = page.url();
        assert.ok(secHubUrl.includes('/admin/secular-hub'));

        await page.goto(`${BASE_URL}/admin/teachers`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const teachersRedirectUrl = page.url();
        assert.ok(!teachersRedirectUrl.includes('/admin/teachers'), `Principal must be redirected from /admin/teachers, got ${teachersRedirectUrl}`);

        await page.goto(`${BASE_URL}/admin/account`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('[data-testid="account-assigned-classes"]', { timeout: 30000 });
        const principalClasses = await page.locator('[data-testid="account-assigned-classes"]').innerText();
        const principalEmailCardCount = await page.locator('[data-testid="account-email-change-card"]').count();
        assert.equal(principalEmailCardCount, 0, 'Email change card must be hidden for Principal');
        console.log('[E1 PLAYWRIGHT PRINCIPAL]', JSON.stringify({
          secularHubLoaded: secHubUrl.includes('/admin/secular-hub'),
          teachersPageRedirectedTo: new URL(teachersRedirectUrl).pathname,
          assignedClassesDisplay: principalClasses.trim(),
          emailChangeCardHidden: principalEmailCardCount === 0,
        }));
        await ctx.close();
      }

      // 3. Class Teacher opens /admin/account -> sees "Primary 1" (not raw UUID)
      {
        const { ctx, page } = await createRolePage('Class Teacher');
        await page.goto(`${BASE_URL}/admin/account`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('[data-testid="account-assigned-classes"]', { timeout: 30000 });
        const teacherClasses = await page.locator('[data-testid="account-assigned-classes"]').innerText();
        assert.ok(teacherClasses.includes('Primary 1'), `Expected Primary 1 in Class Teacher assigned classes, got ${teacherClasses}`);
        assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}/i.test(teacherClasses), 'Must not render raw UUID');
        console.log('[E1 PLAYWRIGHT CLASS TEACHER]', JSON.stringify({
          assignedClassesDisplay: teacherClasses.trim(),
        }));
        await ctx.close();
      }
    } finally {
      await browser.close();
    }
  });
});

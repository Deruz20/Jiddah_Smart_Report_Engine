// @ts-check
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const BASE_URL = 'http://localhost:3000';

const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY);
const anonSupabase = createClient(SUPABASE_URL, ANON_KEY);

async function getRoleSession(email, password) {
  const { data, error } = await anonSupabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Auth failed for ${email}: ${error?.message}`);
  return {
    token: data.session.access_token,
    cookie: `sb-127-auth-token=${encodeURIComponent(JSON.stringify(data.session))}`,
    user: data.user,
  };
}

async function runRealFlows() {
  console.log('=== REAL FLOWS VERIFICATION UNDER LOCKDOWN ===\n');

  // --------------------------------------------------------------------------
  // FLOW 1: Public Registration & Theology Class Lookup
  // --------------------------------------------------------------------------
  console.log('--- FLOW 1: Public Registration & Theology Classes ---');
  // 1a. Theology classes public API
  const tcRes = await fetch(`${BASE_URL}/api/theology-classes`);
  console.log(`[FLOW 1a] GET /api/theology-classes status: ${tcRes.status}`);
  assert.equal(tcRes.status, 200, 'Public theology classes endpoint must return 200');
  const tcJson = await tcRes.json();
  assert.ok(tcJson.data && tcJson.data.length > 0, 'Must return theology classes catalog');
  console.log(`[PASS] Fetched ${tcJson.data.length} theology classes for public registration.`);

  // 1b. Public registration page
  const regPageRes = await fetch(`${BASE_URL}/register`);
  console.log(`[FLOW 1b] GET /register page status: ${regPageRes.status}`);
  assert.equal(regPageRes.status, 200, 'Public /register page must render 200 OK');
  console.log('[PASS] Public registration page accessible to anonymous users.');

  // --------------------------------------------------------------------------
  // FLOW 2: Student List Access Per Role
  // --------------------------------------------------------------------------
  console.log('\n--- FLOW 2: Student List Query Per Role ---');
  // 2a. Anon denied
  const anonStudentsRes = await fetch(`${BASE_URL}/api/students`);
  console.log(`[FLOW 2a] Anon GET /api/students status: ${anonStudentsRes.status}`);
  assert.equal(anonStudentsRes.status, 401, 'Anon must be 401 Unauthorized');
  console.log('[PASS] Anon access to students list blocked.');

  // 2b. Admin student list
  const adminAuth = await getRoleSession('admin@test.local', 'Password123!');
  const adminStudentsRes = await fetch(`${BASE_URL}/api/students`, {
    headers: { Authorization: `Bearer ${adminAuth.token}`, Cookie: adminAuth.cookie },
  });
  console.log(`[FLOW 2b] Admin GET /api/students status: ${adminStudentsRes.status}`);
  assert.equal(adminStudentsRes.status, 200, 'Admin must receive 200 for students list');
  console.log('[PASS] Admin student list query succeeded.');

  // 2c. Support staff denied from academic records
  const staffAuth = await getRoleSession('staff@test.local', 'Password123!');
  const staffStudentsRes = await fetch(`${BASE_URL}/api/students`, {
    headers: { Authorization: `Bearer ${staffAuth.token}`, Cookie: staffAuth.cookie },
  });
  console.log(`[FLOW 2c] Support Staff GET /api/students status: ${staffStudentsRes.status}`);
  assert.equal(staffStudentsRes.status, 403, 'Support staff must be 403 Forbidden from student records');
  console.log('[PASS] Support Staff restricted from student roster.');

  // --------------------------------------------------------------------------
  // FLOW 3: Marks Save and Re-Read Flow
  // --------------------------------------------------------------------------
  console.log('\n--- FLOW 3: Marks Save & Re-Read Flow ---');
  // Seed a synthetic test cohort, student, enrollment, and subject
  const testClassId = 'c1000000-0000-0000-0000-000000000001';
  const testStudentId = '51000000-0000-0000-0000-000000000001';
  const testEnrollmentId = 'e1000000-0000-0000-0000-000000000001';
  const testSubjectId = '00000000-0000-0000-0000-000000000001';
  const termId = 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111';

  // Cleanup any old test rows
  await adminSupabase.from('circular_marks').delete().eq('enrollment_id', testEnrollmentId);
  await adminSupabase.from('enrollments').delete().eq('id', testEnrollmentId);
  await adminSupabase.from('students').delete().eq('id', testStudentId);
  await adminSupabase.from('circular_classes').delete().eq('id', testClassId);
  await adminSupabase.from('subjects').delete().eq('id', testSubjectId);

  // Insert test records with explicit error checks
  const { error: cErr } = await adminSupabase.from('circular_classes').insert({
    id: testClassId,
    name: 'Primary 1 Test',
    stream: 'Emerald',
    class_name: 'Primary 1 Test',
    section: 'lower_primary',
  });
  assert.ok(!cErr, `Class insert error: ${cErr?.message}`);

  const { error: stErr } = await adminSupabase.from('students').insert({
    id: testStudentId,
    name: 'Synthetic Real Flow Student',
    admission_number: 'ADM-FLOW-01',
    status: 'active',
    is_archived: false,
    religion: 'Muslim',
  });
  assert.ok(!stErr, `Student insert error: ${stErr?.message}`);

  const { error: eErr } = await adminSupabase.from('enrollments').insert({
    id: testEnrollmentId,
    student_id: testStudentId,
    circular_class_id: testClassId,
    term_id: termId,
    academic_year: '2026',
    is_active: true,
  });
  assert.ok(!eErr, `Enrollment insert error: ${eErr?.message}`);

  const { error: subErr } = await adminSupabase.from('subjects').insert({
    id: testSubjectId,
    subject_name: 'Mathematics',
    curriculum: 'secular',
    section: 'lower_primary',
  });
  assert.ok(!subErr, `Subject insert error: ${subErr?.message}`);

  // Assign Class Teacher to testClassId in teacher profile
  const { error: tErr } = await adminSupabase.from('teachers').update({ classes: [testClassId] }).eq('email', 'teacher@test.local');
  assert.ok(!tErr, `Teacher classes update error: ${tErr?.message}`);

  // Teacher session
  const teacherAuth = await getRoleSession('teacher@test.local', 'Password123!');

  // Save mark (POST /api/marks)
  const savePayload = {
    enrollment_id: testEnrollmentId,
    term_id: termId,
    score_type: 'mot',
    circular_marks: [{ subject_id: testSubjectId, mot_score: 92 }],
  };

  const saveRes = await fetch(`${BASE_URL}/api/marks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${teacherAuth.token}`,
      Cookie: teacherAuth.cookie,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(savePayload),
  });
  console.log(`[FLOW 3a] Teacher POST /api/marks status: ${saveRes.status}`);
  const saveJson = await saveRes.json().catch(() => ({}));
  assert.equal(saveRes.status, 200, `Marks save must succeed with 200. Got: ${JSON.stringify(saveJson)}`);
  console.log('[PASS] Marks saved successfully by assigned Class Teacher.');

  // Re-read mark (GET /api/marks)
  const readRes = await fetch(
    `${BASE_URL}/api/marks?enrollment_id=${testEnrollmentId}&term_id=${termId}&score_type=mot`,
    {
      headers: { Authorization: `Bearer ${teacherAuth.token}`, Cookie: teacherAuth.cookie },
    }
  );
  console.log(`[FLOW 3b] Teacher GET /api/marks status: ${readRes.status}`);
  assert.equal(readRes.status, 200, 'Marks re-read must return 200');
  const readJson = await readRes.json();
  const savedSubject = (readJson.circular_marks || []).find((m) => m.subject_id === testSubjectId);
  console.log(`[FLOW 3c] Re-read mark value: ${savedSubject?.mot_score}`);
  assert.equal(savedSubject?.mot_score, 92, 'Re-read mark must match saved score (92)');
  console.log('[PASS] Marks save and re-read flow verified with 100% data integrity.');

  // --------------------------------------------------------------------------
  // FLOW 4: Report Card Generation Flow from Real Synthetic Marks
  // --------------------------------------------------------------------------
  console.log('\n--- FLOW 4: Report Generation Flow ---');
  const reportRes = await fetch(
    `${BASE_URL}/api/report?enrollment_id=${testEnrollmentId}&term_id=${termId}`,
    {
      headers: { Authorization: `Bearer ${adminAuth.token}`, Cookie: adminAuth.cookie },
    }
  );
  console.log(`[FLOW 4a] GET /api/report status: ${reportRes.status}`);
  const reportJson = await reportRes.json().catch(() => ({}));
  assert.equal(reportRes.status, 200, `Report generation must return 200. Got: ${JSON.stringify(reportJson)}`);
  assert.ok(reportJson.student, 'Report must contain student details');
  console.log(`[PASS] Report generated for: ${reportJson.student.name}, Circular subjects: ${reportJson.circular_marks?.length}`);

  // --------------------------------------------------------------------------
  // FLOW 5: Notifications Flow
  // --------------------------------------------------------------------------
  console.log('\n--- FLOW 5: Notifications Flow ---');
  const notifCountRes = await fetch(`${BASE_URL}/api/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${teacherAuth.token}`, Cookie: teacherAuth.cookie },
  });
  console.log(`[FLOW 5a] GET /api/notifications/unread-count status: ${notifCountRes.status}`);
  assert.equal(notifCountRes.status, 200, 'Unread count must return 200');
  const notifJson = await notifCountRes.json();
  console.log(`[PASS] Notification unread count returned: ${notifJson.unreadCount}`);

  const markAllReadRes = await fetch(`${BASE_URL}/api/notifications/mark-all-read`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${teacherAuth.token}`, Cookie: teacherAuth.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  console.log(`[FLOW 5b] POST /api/notifications/mark-all-read status: ${markAllReadRes.status}`);
  assert.equal(markAllReadRes.status, 200, 'Mark all read must return 200');
  console.log('[PASS] Notifications mark-all-read verified.');

  // --------------------------------------------------------------------------
  // CLEANUP
  // --------------------------------------------------------------------------
  await adminSupabase.from('circular_marks').delete().eq('enrollment_id', testEnrollmentId);
  await adminSupabase.from('enrollments').delete().eq('id', testEnrollmentId);
  await adminSupabase.from('students').delete().eq('id', testStudentId);
  await adminSupabase.from('circular_classes').delete().eq('id', testClassId);
  await adminSupabase.from('subjects').delete().eq('id', testSubjectId);
  await adminSupabase.from('teachers').update({ classes: [] }).eq('email', 'teacher@test.local');
  console.log('\n[PASS] Cleaned up synthetic test records.');

  console.log('\n=== ALL 5 REAL FLOWS VERIFIED SUCCESSFULLY UNDER LOCKDOWN ===');
}

runRealFlows().catch((err) => {
  console.error('FATAL REAL FLOWS ERROR:', err);
  process.exit(1);
});

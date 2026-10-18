import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { enforceLocalSafeEnvironment } from '../lib/test-guard.mjs';
import { seedRehearsalDatabase } from '../../scripts/seed-rehearsal-synthetic-users.mjs';
import { execSync } from 'node:child_process';

// Enforce local-only execution
enforceLocalSafeEnvironment();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
let ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!ANON_KEY) {
  try {
    const statusOutput = execSync('npx supabase status --workdir scratch/rehearsal_isolated_supabase -o json', { encoding: 'utf8' });
    const parsed = JSON.parse(statusOutput);
    ANON_KEY = parsed.PUBLISHABLE_KEY || parsed.ANON_KEY;
    SUPABASE_URL = parsed.API_URL || SUPABASE_URL;
  } catch (err) {
    console.warn('Could not read ANON_KEY from supabase status:', err.message);
  }
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function getSessionHeaders(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Auth failed for ${email}: ${error?.message}`);
  }
  const token = data.session.access_token;
  const base64Session = Buffer.from(JSON.stringify(data.session)).toString('base64');
  return {
    'Authorization': `Bearer ${token}`,
    'Cookie': `sb-127-auth-token=base64-${base64Session}`,
    'Content-Type': 'application/json'
  };
}

test('F5 Data Scoping & Row-Count Verification Suite (with unassigned fixture)', async (t) => {
  before(async () => {
    console.log('[F5 Setup] Seeding deterministic rehearsal database...');
    await seedRehearsalDatabase();
    console.log('[F5 Setup] Deterministic rehearsal fixtures seeded.');
  });

  // 1. Support Staff: strictly blocked from data endpoints with HTTP 403
  await t.test('1. Support Staff receives HTTP 403 on /api/students, /api/theology-classes, /api/theology-marks', async () => {
    const headers = await getSessionHeaders('staff@test.local', 'Password123!');

    const resStudents = await fetch(`${BASE_URL}/api/students`, { headers });
    assert.equal(resStudents.status, 403, `Support staff must receive 403 on /api/students. Got: ${resStudents.status}`);

    const resTheologyClasses = await fetch(`${BASE_URL}/api/theology-classes`, { headers });
    assert.equal(resTheologyClasses.status, 403, `Support staff must receive 403 on /api/theology-classes. Got: ${resTheologyClasses.status}`);

    const resTheologyMarks = await fetch(`${BASE_URL}/api/theology-marks`, { headers });
    assert.equal(resTheologyMarks.status, 403, `Support staff must receive 403 on /api/theology-marks. Got: ${resTheologyMarks.status}`);

    console.log('  [PASS] Support Staff 403 verified across all 3 data endpoints.');
  });

  // 2. Class Teacher: sees ONLY assigned rows (unassigned student/class excluded)
  await t.test('2. Class Teacher sees ONLY assigned rows (unassigned student/class excluded)', async () => {
    const headers = await getSessionHeaders('teacher@test.local', 'Password123!');

    // /api/students: Class Teacher should see only assigned Primary 1 student (ADM-001), not unassigned Primary 2 (ADM-002)
    const resStudents = await fetch(`${BASE_URL}/api/students`, { headers });
    assert.equal(resStudents.status, 200);
    const students = await resStudents.json();
    console.log(`  [Class Teacher /api/students] Row count: ${students.length}`);
    assert.equal(students.length, 1, `Class Teacher must see exactly 1 assigned student row. Got: ${students.length}`);
    assert.equal(students[0].admission_number, 'ADM-001', 'Must be assigned student ADM-001');

    // /api/theology-classes: Class Teacher sees only assigned theology class (Primary 1 Theology), not unassigned Primary 2
    const resTheologyClasses = await fetch(`${BASE_URL}/api/theology-classes`, { headers });
    assert.equal(resTheologyClasses.status, 200);
    const classesPayload = await resTheologyClasses.json();
    const classes = classesPayload.data || classesPayload;
    console.log(`  [Class Teacher /api/theology-classes] Row count: ${classes.length}`);
    assert.equal(classes.length, 1, `Class Teacher must see exactly 1 assigned theology class. Got: ${classes.length}`);
    assert.equal(classes[0].id, 'c0000000-0000-0000-0000-000000000002');

    // /api/theology-marks: Class Teacher sees only marks for assigned student
    const resMarks = await fetch(`${BASE_URL}/api/theology-marks`, { headers });
    assert.equal(resMarks.status, 200);
    const marksPayload = await resMarks.json();
    const marks = marksPayload.data || marksPayload;
    console.log(`  [Class Teacher /api/theology-marks] Row count: ${marks.length}`);
    // All returned marks must belong to assigned enrollment e0000000-0000-0000-0000-000000000001
    for (const m of marks) {
      assert.equal(m.enrollment_id, 'e0000000-0000-0000-0000-000000000001', 'Teacher must not see unassigned marks');
    }
  });

  // 3. Head Teacher: sees ALL rows (including unassigned student and classes)
  await t.test('3. Head Teacher sees ALL rows (including unassigned student and classes)', async () => {
    const headers = await getSessionHeaders('head@test.local', 'Password123!');

    const resStudents = await fetch(`${BASE_URL}/api/students`, { headers });
    assert.equal(resStudents.status, 200);
    const students = await resStudents.json();
    console.log(`  [Head Teacher /api/students] Row count: ${students.length}`);
    assert.ok(students.length >= 2, `Head Teacher must see all students (>=2). Got: ${students.length}`);

    const resTheologyClasses = await fetch(`${BASE_URL}/api/theology-classes`, { headers });
    assert.equal(resTheologyClasses.status, 200);
    const classesPayload = await resTheologyClasses.json();
    const classes = classesPayload.data || classesPayload;
    console.log(`  [Head Teacher /api/theology-classes] Row count: ${classes.length}`);
    assert.ok(classes.length >= 2, `Head Teacher must see all theology classes (>=2). Got: ${classes.length}`);

    const resTheologyMarks = await fetch(`${BASE_URL}/api/theology-marks`, { headers });
    assert.equal(resTheologyMarks.status, 200);
    const marksPayload = await resTheologyMarks.json();
    const marks = marksPayload.data || marksPayload;
    console.log(`  [Head Teacher /api/theology-marks] Row count: ${marks.length}`);
    assert.ok(marks.length >= 2, `Head Teacher must see all theology marks (>=2). Got: ${marks.length}`);
  });

  // 4. DOS: sees ALL rows across their department
  await t.test('4. DOS sees ALL rows across department (including unassigned)', async () => {
    const headers = await getSessionHeaders('dos@test.local', 'Password123!');

    const resStudents = await fetch(`${BASE_URL}/api/students`, { headers });
    assert.equal(resStudents.status, 200);
    const students = await resStudents.json();
    console.log(`  [DOS /api/students] Row count: ${students.length}`);
    assert.ok(students.length >= 2, `DOS must see all students (>=2). Got: ${students.length}`);

    const resTheologyClasses = await fetch(`${BASE_URL}/api/theology-classes`, { headers });
    assert.equal(resTheologyClasses.status, 200);
    const classesPayload = await resTheologyClasses.json();
    const classes = classesPayload.data || classesPayload;
    console.log(`  [DOS /api/theology-classes] Row count: ${classes.length}`);
    assert.ok(classes.length >= 2, `DOS must see all theology classes (>=2). Got: ${classes.length}`);

    const resTheologyMarks = await fetch(`${BASE_URL}/api/theology-marks`, { headers });
    assert.equal(resTheologyMarks.status, 200);
    const marksPayload = await resTheologyMarks.json();
    const marks = marksPayload.data || marksPayload;
    console.log(`  [DOS /api/theology-marks] Row count: ${marks.length}`);
    assert.ok(marks.length >= 2, `DOS must see all theology marks (>=2). Got: ${marks.length}`);
  });

  // 5. Administrator: sees ALL rows globally
  await t.test('5. Administrator sees ALL rows globally', async () => {
    const headers = await getSessionHeaders('admin@test.local', 'Password123!');

    const resStudents = await fetch(`${BASE_URL}/api/students`, { headers });
    assert.equal(resStudents.status, 200);
    const students = await resStudents.json();
    console.log(`  [Administrator /api/students] Row count: ${students.length}`);
    assert.ok(students.length >= 2, `Administrator must see all students (>=2). Got: ${students.length}`);

    const resTheologyClasses = await fetch(`${BASE_URL}/api/theology-classes`, { headers });
    assert.equal(resTheologyClasses.status, 200);
    const classesPayload = await resTheologyClasses.json();
    const classes = classesPayload.data || classesPayload;
    console.log(`  [Administrator /api/theology-classes] Row count: ${classes.length}`);
    assert.ok(classes.length >= 2, `Administrator must see all theology classes (>=2). Got: ${classes.length}`);

    const resTheologyMarks = await fetch(`${BASE_URL}/api/theology-marks`, { headers });
    assert.equal(resTheologyMarks.status, 200);
    const marksPayload = await resTheologyMarks.json();
    const marks = marksPayload.data || marksPayload;
    console.log(`  [Administrator /api/theology-marks] Row count: ${marks.length}`);
    assert.ok(marks.length >= 2, `Administrator must see all theology marks (>=2). Got: ${marks.length}`);
  });
});

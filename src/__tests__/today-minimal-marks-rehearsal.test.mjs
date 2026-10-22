import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { getRehearsalCredentials } from '../../scripts/rehearsal-credentials.mjs';

const credentials = getRehearsalCredentials();
const apiOrigin = new URL(credentials.apiUrl);
if (!['127.0.0.1', 'localhost'].includes(apiOrigin.hostname) || apiOrigin.port !== '54321') {
  throw new Error('Refusing to run marks tests outside the local production-shaped rehearsal.');
}

const root = process.cwd();
const container = 'supabase_db_rehearsal_isolated_supabase';
const forwardSql = fs.readFileSync(path.join(root, 'supabase/hardening/20261020_today_minimal.sql'));
const backfillSql = fs.readFileSync(path.join(root, 'supabase/hardening/20261020_today_data_backfill.sql'));
const rollbackSql = fs.readFileSync(path.join(root, 'supabase/hardening/20261020_today_minimal_rollback.sql'));
const probeText = fs.readFileSync(path.join(root, 'scratch/evidence/prod_probe_v3.3.0.txt'), 'utf8').replace(/^\uFEFF/, '');
const probePolicyLine = probeText.split(/\r?\n/).find((line) => /^\|\s*policies\s*\|/.test(line));
if (!probePolicyLine) throw new Error('Production probe policy section is missing.');
const expectedPolicies = JSON.parse(probePolicyLine.split('|')[2].trim());

const service = createClient(credentials.apiUrl, credentials.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(credentials.apiUrl, credentials.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const termId = `today-${suffix}`;
const routeBaseUrl = process.env.TEST_BASE_URL;
if (routeBaseUrl) {
  const routeOrigin = new URL(routeBaseUrl);
  if (routeOrigin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(routeOrigin.hostname) || routeOrigin.port !== '3006') {
    throw new Error('Refusing route tests unless TEST_BASE_URL is local port 3006.');
  }
}
const circularSubjectId = crypto.randomUUID();
const theologySubjectId = crypto.randomUUID();
const users = new Map();
const classRows = new Map();
const enrollments = new Map();
const teacherIds = [];
const userIds = [];
const studentIds = [];
const enrollmentIds = [];
const circularIds = [];
const theologyIds = [];
const assignmentKeys = [];
const circularMarks = [];
const theologyMarks = [];
const teacherSpecs = [
  ...Array.from({ length: 7 }, (_, index) => ({ key: `theology-assignment-${index + 1}`, role: 'Class Teacher', shape: 'theology_assignment' })),
  { key: 'circular-assignment', role: 'Class Teacher', shape: 'circular_assignment' },
  ...Array.from({ length: 3 }, (_, index) => ({ key: `legacy-${index + 1}`, role: 'Class Teacher', shape: 'legacy' })),
  { key: 'dos-theology', role: 'DOS', subject: 'Theology', shape: 'dos' },
  { key: 'dos-secular', role: 'DOS', subject: 'Secular', shape: 'dos' },
  { key: 'dos-inactive', role: 'DOS', subject: 'Theology', shape: 'dos', status: 'inactive' },
  { key: 'administrator', role: 'Administrator', shape: 'admin' },
  { key: 'different-id', role: 'Class Teacher', shape: 'theology_assignment', differentId: true },
  { key: 'null-auth-id', role: 'Class Teacher', shape: 'theology_assignment', nullAuthId: true },
];

function runSql(sql) {
  execFileSync('docker', [
    'exec', '-i', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres',
  ], { input: sql, stdio: ['pipe', 'pipe', 'pipe'] });
}

function policySnapshot() {
  const query = `SELECT COALESCE(json_agg(json_build_object(
    'tablename', tablename, 'policyname', policyname, 'permissive', permissive,
    'roles', roles, 'cmd', cmd, 'qual', qual, 'with_check', with_check
  ) ORDER BY tablename, policyname), '[]'::json)::text FROM pg_policies WHERE schemaname = 'public';`;
  return JSON.parse(execFileSync('docker', [
    'exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-qAt', '-P', 'pager=off', '-c', query,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim());
}

function normalizeExpr(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\\n/g, '\n')
    .replace(/\(\((ARRAY\[.*?\])\)::text\[\]\)/gs, '($1)')
    .replace(/\(('(?:[^']|'')*'::character varying)\)::text/g, '$1');
}

function normalizePolicy(policy) {
  return {
    tablename: policy.tablename,
    policyname: policy.policyname,
    permissive: policy.permissive,
    roles: [...(policy.roles ?? [])].sort(),
    cmd: policy.cmd,
    qual: normalizeExpr(policy.qual),
    with_check: normalizeExpr(policy.with_check),
  };
}

function policyDiff(actual) {
  const relevantTables = new Set(['teacher_class_assignments', 'circular_marks', 'theology_marks', 'teachers']);
  const filteredExpected = expectedPolicies.filter((p) => relevantTables.has(p.tablename));
  const filteredActual = actual.filter((p) => relevantTables.has(p.tablename));
  const expectedMap = new Map(filteredExpected.map((policy) => [policy.policyname, normalizePolicy(policy)]));
  const actualMap = new Map(filteredActual.map((policy) => [policy.policyname, normalizePolicy(policy)]));
  const differences = [];
  for (const [name, expected] of expectedMap) {
    const observed = actualMap.get(name);
    if (!observed) differences.push(`${name}: missing`);
    else if (JSON.stringify(expected) !== JSON.stringify(observed)) differences.push(`${name}: definition differs`);
  }
  for (const name of actualMap.keys()) if (!expectedMap.has(name)) differences.push(`${name}: unexpected`);
  return differences;
}

async function insert(table, rows, label) {
  const { data, error } = await service.from(table).insert(rows).select();
  assert.equal(error, null, `${label}: ${error?.message}`);
  return data;
}

async function createTeacher(spec) {
  const email = `today-${spec.key}-${suffix}@test.local`;
  const password = `Today-${suffix}!Aa1`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: spec.role },
  });
  assert.equal(error, null, `Create ${spec.key} auth user: ${error?.message}`);
  userIds.push(data.user.id);
  const teacherId = spec.differentId ? crypto.randomUUID() : data.user.id;
  const teacher = {
    id: teacherId,
    auth_user_id: spec.nullAuthId ? null : data.user.id,
    email,
    role: spec.role,
    subject: spec.subject ?? null,
    classes: [],
    name: `Today ${spec.key}`,
    status: spec.status ?? 'active',
  };
  const { error: teacherError } = await service.from('teachers').insert(teacher);
  assert.equal(teacherError, null, `Create ${spec.key} teacher: ${teacherError?.message}`);
  teacherIds.push(teacherId);
  users.set(spec.key, { id: data.user.id, teacherId, email, password, spec });
}

async function signIn(key) {
  const user = users.get(key);
  const { data, error } = await anon.auth.signInWithPassword({ email: user.email, password: user.password });
  assert.equal(error, null, `Sign in ${key}: ${error?.message}`);
  const client = createClient(credentials.apiUrl, credentials.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: sessionError } = await client.auth.setSession(data.session);
  assert.equal(sessionError, null, `Set session ${key}: ${sessionError?.message}`);
  client.rehearsalSession = data.session;
  return client;
}

function routeHeaders(session) {
  const ref = apiOrigin.hostname === 'localhost' ? '127' : apiOrigin.hostname.split('.')[0];
  return {
    Authorization: `Bearer ${session.access_token}`,
    Cookie: `sb-${ref}-auth-token=${encodeURIComponent(JSON.stringify(session))}`,
  };
}

async function routeJson(pathname, session) {
  const response = await fetch(new URL(pathname, routeBaseUrl), { headers: routeHeaders(session) });
  const body = await response.json();
  return { status: response.status, body };
}

async function addClass(key, teacherKey) {
  const circularId = crypto.randomUUID();
  const theologyId = crypto.randomUUID();
  const studentId = crypto.randomUUID();
  const enrollmentId = crypto.randomUUID();
  const assignedTeacher = teacherKey ? users.get(teacherKey) : null;
  await insert('circular_classes', [{
    id: circularId,
    class_name: `Today ${key}`,
    section: 'lower_primary',
    class_teacher_id: key === 'direct-class' ? assignedTeacher.teacherId : null,
  }], `Create circular class ${key}`);
  await insert('theology_classes', [{
    id: theologyId,
    class_name_english: `Today ${key}`,
    level: 1,
  }], `Create theology class ${key}`);
  await insert('students', [{
    id: studentId,
    name: `Today ${key}`,
    admission_number: `TODAY-${suffix}-${key}`,
    gender: 'female',
  }], `Create student ${key}`);
  await insert('enrollments', [{
    id: enrollmentId,
    student_id: studentId,
    circular_class_id: circularId,
    theology_class_id: theologyId,
    academic_year: 2040,
    is_active: true,
  }], `Create enrollment ${key}`);
  studentIds.push(studentId);
  enrollmentIds.push(enrollmentId);
  circularIds.push(circularId);
  theologyIds.push(theologyId);
  classRows.set(key, { circularId, theologyId, studentId, enrollmentId });
  enrollments.set(key, enrollmentId);
  if (assignedTeacher && ['theology_assignment', 'circular_assignment'].includes(assignedTeacher.spec.shape)) {
    const classId = assignedTeacher.spec.shape === 'theology_assignment' ? theologyId : circularId;
    const classType = assignedTeacher.spec.shape === 'theology_assignment' ? 'theology' : 'circular';
    await insert('teacher_class_assignments', [{
      teacher_id: assignedTeacher.teacherId,
      class_id: classId,
      class_type: classType,
    }], `Create ${classType} assignment for ${teacherKey}`);
    assignmentKeys.push([assignedTeacher.teacherId, classId, classType]);
  }
}

async function makeMark(client, table, enrollmentId, updatedBy) {
  const subjectId = crypto.randomUUID();
  if (table === 'circular_marks') {
    await insert('circular_subjects', [{
      id: subjectId,
      subject_name: `Today ${subjectId}`,
      section: 'lower_primary',
      is_core: true,
      is_gradable: true,
    }], 'Create circular subject');
  } else {
    await insert('theology_subjects', [{
      id: subjectId,
      subject_name_arabic: `Today ${subjectId}`,
      level: 1,
      sort_order: 0,
    }], 'Create theology subject');
  }
  const { data, error } = await client.from(table).insert({
    enrollment_id: enrollmentId,
    subject_id: subjectId,
    term_id: `${termId}-${crypto.randomUUID()}`,
    updated_by: updatedBy ?? null,
    mot_score: 70,
  }).select('id');
  if (!error && data?.[0]?.id) {
    (table === 'circular_marks' ? circularMarks : theologyMarks).push(data[0].id);
  }
  return { data, error };
}

function allowed(result, label) {
  assert.equal(result.error, null, `${label}: ${result.error?.message}`);
  assert.equal(result.data?.length, 1, `${label}: expected one inserted row`);
}

function denied(result, label) {
  assert.ok(result.error, `${label}: expected rejected write`);
  assert.equal(result.error.code, '42501', `${label}: expected RLS 42501, got ${result.error.code}`);
}

test('today minimal policies and backfill preserve scoped marks on local production-shaped rehearsal', async () => {
  let policiesApplied = false;
  let backfillApplied = false;
  try {
    await insert('circular_subjects', [{
      id: circularSubjectId,
      subject_name: `Today primary ${suffix}`,
      section: 'lower_primary',
      is_core: true,
      is_gradable: true,
    }], 'Create test circular subject');
    await insert('theology_subjects', [{
      id: theologySubjectId,
      subject_name_arabic: `Today theology ${suffix}`,
      level: 1,
      sort_order: 0,
    }], 'Create test theology subject');

    for (const spec of teacherSpecs) await createTeacher(spec);
    for (const spec of teacherSpecs.filter((teacher) => ['theology_assignment', 'circular_assignment', 'legacy'].includes(teacher.shape))) {
      await addClass(spec.key, spec.key);
    }
    await addClass('other-theology', null);
    await addClass('other-circular', null);
    await addClass('dos-target', null);

    for (const spec of teacherSpecs.filter((teacher) => teacher.shape === 'legacy')) {
      const ownClass = classRows.get(spec.key);
      const { error } = await service.from('teachers')
        .update({ classes: [ownClass.circularId, ownClass.theologyId] })
        .eq('id', users.get(spec.key).teacherId);
      assert.equal(error, null, `Set legacy class IDs for ${spec.key}: ${error?.message}`);
    }

    runSql(forwardSql);
    policiesApplied = true;

    for (let index = 1; index <= 7; index++) {
      const key = `theology-assignment-${index}`;
      const client = await signIn(key);
      allowed(await makeMark(client, 'theology_marks', enrollments.get(key), users.get(key).teacherId), `${key} writes own theology class`);
      denied(await makeMark(client, 'theology_marks', enrollments.get('other-theology'), users.get(key).teacherId), `${key} denied in other theology class`);
    }

    const circularTeacher = await signIn('circular-assignment');
    allowed(await makeMark(circularTeacher, 'circular_marks', enrollments.get('circular-assignment'), users.get('circular-assignment').teacherId), 'Circular-assigned teacher writes own class');
    denied(await makeMark(circularTeacher, 'circular_marks', enrollments.get('other-circular'), users.get('circular-assignment').teacherId), 'Circular-assigned teacher denied in other class');

    const legacyOne = await signIn('legacy-1');
    denied(await makeMark(legacyOne, 'circular_marks', enrollments.get('legacy-1'), users.get('legacy-1').teacherId), 'Legacy-only teacher denied before backfill');

    const dosTheology = await signIn('dos-theology');
    allowed(await makeMark(dosTheology, 'theology_marks', enrollments.get('dos-target'), users.get('dos-theology').teacherId), 'DOS Theology writes theology marks');
    denied(await makeMark(dosTheology, 'circular_marks', enrollments.get('dos-target'), users.get('dos-theology').teacherId), 'DOS Theology denied circular marks');
    const dosSecular = await signIn('dos-secular');
    allowed(await makeMark(dosSecular, 'circular_marks', enrollments.get('dos-target'), users.get('dos-secular').teacherId), 'DOS Secular writes circular marks');
    denied(await makeMark(dosSecular, 'theology_marks', enrollments.get('dos-target'), users.get('dos-secular').teacherId), 'DOS Secular denied theology marks');
    const inactiveDos = await signIn('dos-inactive');
    denied(await makeMark(inactiveDos, 'theology_marks', enrollments.get('dos-target'), users.get('dos-inactive').teacherId), 'Inactive DOS denied theology marks');
    const admin = await signIn('administrator');
    allowed(await makeMark(admin, 'theology_marks', enrollments.get('dos-target'), users.get('administrator').teacherId), 'Administrator writes theology marks');
    allowed(await makeMark(admin, 'circular_marks', enrollments.get('dos-target'), users.get('administrator').teacherId), 'Administrator writes circular marks');

    const nullIdentity = await signIn('null-auth-id');
    denied(await makeMark(nullIdentity, 'theology_marks', enrollments.get('null-auth-id'), users.get('null-auth-id').teacherId), 'auth_user_id NULL teacher denied before backfill');
    const differentId = await signIn('different-id');
    const badUpdatedBy = await makeMark(differentId, 'theology_marks', enrollments.get('different-id'), users.get('different-id').id);
    assert.equal(badUpdatedBy.error?.code, '23503', `Auth UID updated_by should fail teacher FK, got ${badUpdatedBy.error?.code}`);
    allowed(await makeMark(differentId, 'theology_marks', enrollments.get('different-id'), users.get('different-id').teacherId), 'Teacher primary key updated_by write succeeds');
    console.log('UPDATED_BY_AUTH_UID=FK_23503;TEACHER_ID=inserted');

    if (routeBaseUrl) {
      const theologyTeacher = await signIn('theology-assignment-1');
      const assigned = classRows.get('theology-assignment-1');
      const unassigned = classRows.get('other-theology');
      const studentsRoute = await routeJson('/api/students', theologyTeacher.rehearsalSession);
      assert.equal(studentsRoute.status, 200, `/api/students status ${studentsRoute.status}: ${JSON.stringify(studentsRoute.body)}`);
      const studentRows = Array.isArray(studentsRoute.body) ? studentsRoute.body : studentsRoute.body.data ?? [];
      const theologyClassesRoute = await routeJson('/api/theology-classes', theologyTeacher.rehearsalSession);
      assert.equal(theologyClassesRoute.status, 200, `/api/theology-classes status ${theologyClassesRoute.status}: ${JSON.stringify(theologyClassesRoute.body)}`);
      const theologyClassRows = theologyClassesRoute.body.data ?? theologyClassesRoute.body;
      const marksRoute = await routeJson(
        `/api/marks?enrollment_id=${encodeURIComponent(assigned.enrollmentId)}&term_id=${encodeURIComponent(termId)}&score_type=both`,
        theologyTeacher.rehearsalSession,
      );
      assert.equal(marksRoute.status, 200, `/api/marks status ${marksRoute.status}: ${JSON.stringify(marksRoute.body)}`);
      const unassignedMarksRoute = await routeJson(
        `/api/marks?enrollment_id=${encodeURIComponent(unassigned.enrollmentId)}&term_id=${encodeURIComponent(termId)}&score_type=both`,
        theologyTeacher.rehearsalSession,
      );
      assert.equal(unassignedMarksRoute.status, 403, `/api/marks unassigned status ${unassignedMarksRoute.status}: ${JSON.stringify(unassignedMarksRoute.body)}`);
      const markRowCount = (marksRoute.body.circular_marks?.length ?? 0) + (marksRoute.body.theology_marks?.length ?? 0);
      const assignedStudentPresent = studentRows.some((row) => row.id === assigned.studentId || row.student_id === assigned.studentId);
      const unassignedStudentPresent = studentRows.some((row) => row.id === unassigned.studentId || row.student_id === unassigned.studentId);
      const assignedTheologyClassPresent = theologyClassRows.some((row) => row.id === assigned.theologyId);
      const unassignedTheologyClassPresent = theologyClassRows.some((row) => row.id === unassigned.theologyId);
      assert.equal(unassignedStudentPresent, false, '/api/students leaked the unassigned fixture student');
      assert.equal(unassignedTheologyClassPresent, false, '/api/theology-classes leaked the unassigned fixture class');
      console.log(`API_ROUTE_COUNTS=/api/students:${studentRows.length}(assigned=${assignedStudentPresent},unassigned=${unassignedStudentPresent});/api/marks:${markRowCount}(assigned=200,unassigned=${unassignedMarksRoute.status});/api/theology-classes:${theologyClassRows.length}(assigned=${assignedTheologyClassPresent},unassigned=${unassignedTheologyClassPresent})`);
    } else {
      console.log('API_ROUTE_TESTS=not run (TEST_BASE_URL not set)');
    }

    runSql(backfillSql);
    backfillApplied = true;
    allowed(await makeMark(legacyOne, 'circular_marks', enrollments.get('legacy-1'), users.get('legacy-1').teacherId), 'Legacy teacher allowed after backfill in listed class');
    denied(await makeMark(legacyOne, 'circular_marks', enrollments.get('other-circular'), users.get('legacy-1').teacherId), 'Legacy teacher denied outside listed class after backfill');
    allowed(await makeMark(nullIdentity, 'theology_marks', enrollments.get('null-auth-id'), users.get('null-auth-id').teacherId), 'auth_user_id NULL teacher allowed after backfill');

    runSql(rollbackSql);
    policiesApplied = false;
    const differences = policyDiff(policySnapshot());
    assert.deepEqual(differences, [], `Rollback policy diff vs production: ${JSON.stringify(differences)}`);
    console.log('ROLLBACK_POLICY_DIFF=empty');
    console.log('PROPORTIONS=theology_assignment_only:7;circular_assignment_only:1;legacy_only:3;DOS:2;Administrator:1;inactive_DOS:1;different_teacher_id:1;null_auth_user_id:1');
  } finally {
    if (policiesApplied) runSql(rollbackSql);
    if (backfillApplied) {
      await service.from('teacher_class_assignments').delete().in('teacher_id', teacherIds);
      await service.from('teachers').update({ auth_user_id: null }).eq('id', users.get('null-auth-id')?.teacherId);
      for (const spec of teacherSpecs.filter((teacher) => teacher.shape === 'legacy')) {
        await service.from('teachers').update({ classes: [] }).eq('id', users.get(spec.key).teacherId);
      }
    }
    if (teacherIds.length) await service.from('teacher_class_assignments').delete().in('teacher_id', teacherIds);
    if (enrollmentIds.length) {
      await service.from('circular_marks').delete().in('enrollment_id', enrollmentIds);
      await service.from('theology_marks').delete().in('enrollment_id', enrollmentIds);
      await service.from('enrollments').delete().in('id', enrollmentIds);
    }
    if (studentIds.length) await service.from('students').delete().in('id', studentIds);
    if (circularIds.length) await service.from('circular_classes').delete().in('id', circularIds);
    if (theologyIds.length) await service.from('theology_classes').delete().in('id', theologyIds);
    await service.from('circular_subjects').delete().eq('id', circularSubjectId);
    await service.from('theology_subjects').delete().eq('id', theologySubjectId);
    if (teacherIds.length) await service.from('teachers').delete().in('id', teacherIds);
    for (const userId of userIds) await service.auth.admin.deleteUser(userId);
  }
});

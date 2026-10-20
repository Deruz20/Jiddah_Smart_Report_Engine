import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getRehearsalCredentials } from '../../scripts/rehearsal-credentials.mjs';

const credentials = getRehearsalCredentials();
const supabaseOrigin = new URL(credentials.apiUrl);
if (!['127.0.0.1', 'localhost'].includes(supabaseOrigin.hostname) || supabaseOrigin.port !== '54321') {
  throw new Error('Refusing to run marks scoping tests against a non-rehearsal endpoint.');
}

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const appOrigin = new URL(baseUrl);
if (appOrigin.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(appOrigin.hostname)) {
  throw new Error('Refusing to run marks scoping tests against a non-local application server.');
}

const service = createClient(credentials.apiUrl, credentials.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(credentials.apiUrl, credentials.anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const termId = `marks-scope-${suffix}`;
const circularSubjectId = crypto.randomUUID();
const theologySubjectId = 'b0000000-0000-0000-0000-000000000001';

const userSpecs = [
  { key: 'admin', role: 'Administrator' },
  { key: 'dosTheology', role: 'DOS', subject: 'Theology' },
  { key: 'dosSecular', role: 'DOS', subject: 'Secular' },
  { key: 'direct', role: 'Class Teacher' },
  { key: 'assignmentCircular', role: 'Class Teacher' },
  { key: 'assignmentTheology', role: 'Class Teacher' },
  { key: 'legacy', role: 'Class Teacher', classes: [] },
  { key: 'inactive', role: 'Class Teacher', status: 'inactive' },
  { key: 'idFallback', role: 'Class Teacher', authUserIdNull: true },
  { key: 'differentTeacherId', role: 'Class Teacher', differentTeacherId: true },
  { key: 'stray', noTeacher: true },
];

const createdUsers = [];
const createdTeacherIds = [];
const createdClassIds = [];
const createdStudentIds = [];
const createdEnrollmentIds = [];
const createdAssignmentKeys = [];
const createdCircularSubjectIds = [circularSubjectId];
const createdTheologySubjectIds = [];
const createdMarkIds = { circular_marks: [], theology_marks: [] };
const users = new Map();
const enrollments = new Map();
const classes = new Map();

async function insertService(table, rows, label) {
  const { data, error } = await service.from(table).insert(rows).select();
  assert.equal(error, null, `${label}: ${error?.message}`);
  return data;
}

async function createUser(spec) {
  const email = `marks-scope-${spec.key}-${suffix}@test.local`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password: `MarksScope-${suffix}!A`,
    email_confirm: true,
    user_metadata: { role: spec.role ?? 'Teacher' },
  });
  assert.equal(error, null, `Create auth user ${spec.key}: ${error?.message}`);
  createdUsers.push(data.user.id);

  if (!spec.noTeacher) {
    const teacherId = spec.differentTeacherId ? crypto.randomUUID() : data.user.id;
    const { error: teacherError } = await service.from('teachers').insert({
      id: teacherId,
      auth_user_id: spec.authUserIdNull ? null : data.user.id,
      email,
      role: spec.role,
      subject: spec.subject ?? null,
      classes: spec.classes ?? [],
      name: `Marks Scope ${spec.key}`,
      status: spec.status ?? 'active',
    });
    assert.equal(teacherError, null, `Create teacher ${spec.key}: ${teacherError?.message}`);
    createdTeacherIds.push(teacherId);
    users.set(spec.key, { ...data.user, teacherId, password: `MarksScope-${suffix}!A`, role: spec.role });
  } else {
    users.set(spec.key, { ...data.user, teacherId: null, password: `MarksScope-${suffix}!A`, role: 'stray' });
  }
}

async function signIn(key) {
  const user = users.get(key);
  const { data, error } = await anon.auth.signInWithPassword({ email: user.email, password: user.password });
  assert.equal(error, null, `Sign in ${key}: ${error?.message}`);
  const client = createClient(credentials.apiUrl, credentials.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: sessionError } = await client.auth.setSession(data.session);
  assert.equal(sessionError, null, `Set user JWT for ${key}: ${sessionError?.message}`);
  return { client, user: data.user, session: data.session };
}

async function makeMark(client, table, enrollmentId, subjectId, updatedBy) {
  const effectiveSubjectId = crypto.randomUUID();
  if (table === 'circular_marks') {
    await insertService('circular_subjects', [{
      id: effectiveSubjectId,
      subject_name: `Marks Scope ${effectiveSubjectId}`,
      section: 'lower_primary',
      is_core: true,
      is_gradable: true,
    }], 'Create circular subject for marks case');
    createdCircularSubjectIds.push(effectiveSubjectId);
  } else {
    await insertService('theology_subjects', [{
      id: effectiveSubjectId,
      subject_name_arabic: `Marks Scope ${effectiveSubjectId}`,
      level: 1,
      sort_order: 0,
    }], 'Create theology subject for marks case');
    createdTheologySubjectIds.push(effectiveSubjectId);
  }
  const payload = {
    enrollment_id: enrollmentId,
    subject_id: effectiveSubjectId,
    term_id: `${termId}-${crypto.randomUUID()}`,
    updated_by: updatedBy ?? null,
  };
  if (table === 'circular_marks') payload.mot_score = 71;
  else payload.mot_score = 72;

  const { data, error } = await client.from(table).insert(payload).select('id, updated_by');
  if (!error && data?.[0]?.id) createdMarkIds[table].push(data[0].id);
  return { data, error };
}

function assertAllowed(result, label) {
  assert.equal(result.error, null, `${label} should be allowed: ${result.error?.message}`);
  assert.equal(result.data?.length, 1, `${label} should write one row`);
}

function assertDenied(result, label) {
  assert.ok(result.error, `${label} should be rejected by RLS`);
  assert.equal(result.error.code, '42501', `${label} must fail with RLS 42501, got ${result.error.code}`);
}

function authHeaders(session) {
  const ref = supabaseOrigin.hostname === 'localhost' ? '127' : supabaseOrigin.hostname.split('.')[0];
  const cookieValue = encodeURIComponent(JSON.stringify(session));
  return {
    Authorization: `Bearer ${session.access_token}`,
    Cookie: `sb-${ref}-auth-token=${cookieValue}`,
    'Content-Type': 'application/json',
  };
}

async function apiJson(path, session) {
  const response = await fetch(`${baseUrl}${path}`, { headers: authHeaders(session) });
  const body = await response.json();
  return { status: response.status, body };
}

test('production-shaped rehearsal enforces teacher mark scope and route filtering', async () => {
  try {
    await insertService('circular_subjects', [{
      id: circularSubjectId,
      subject_name: `Marks Scope Subject ${suffix}`,
      section: 'lower_primary',
      is_core: true,
      is_gradable: true,
    }], 'Create circular subject fixture');
    for (const spec of userSpecs) await createUser(spec);
    const user = (key) => users.get(key);

    const circularRows = [
      { key: 'direct', teacher: 'direct' },
      { key: 'assignment', teacher: 'assignmentCircular' },
      { key: 'legacy', teacher: 'legacy' },
      { key: 'unassigned', teacher: null },
      { key: 'nullTheology', teacher: 'direct', nullTheology: true },
      { key: 'nullCircular', teacher: 'assignmentTheology', nullCircular: true },
    ];

    for (const item of circularRows) {
      const circularId = crypto.randomUUID();
      const theologyId = crypto.randomUUID();
      const studentId = crypto.randomUUID();
      const enrollmentId = crypto.randomUUID();
      createdClassIds.push(circularId, theologyId);
      createdStudentIds.push(studentId);
      createdEnrollmentIds.push(enrollmentId);
      classes.set(item.key, { circularId, theologyId });
      enrollments.set(item.key, enrollmentId);

      await insertService('circular_classes', [{
        id: circularId,
        class_name: `Scope ${item.key}`,
        section: 'lower_primary',
        class_teacher_id: item.teacher === 'direct' && item.key !== 'nullCircular' ? user('direct').teacherId : null,
      }], `Create circular class ${item.key}`);
      await insertService('theology_classes', [{
        id: theologyId,
        class_name_english: `Scope ${item.key}`,
        level: 1,
      }], `Create theology class ${item.key}`);
      await insertService('students', [{
        id: studentId,
        name: `Scope Student ${item.key}`,
        admission_number: `MS-${suffix}-${item.key}`,
        gender: 'female',
      }], `Create student ${item.key}`);
      await insertService('enrollments', [{
        id: enrollmentId,
        student_id: studentId,
        circular_class_id: item.nullCircular ? null : circularId,
        theology_class_id: item.nullTheology ? null : theologyId,
        academic_year: 2040,
        is_active: true,
      }], `Create enrollment ${item.key}`);

      if (item.key === 'assignment') {
        await insertService('teacher_class_assignments', [{
          teacher_id: user('assignmentCircular').teacherId,
          class_id: circularId,
          class_type: 'circular',
        }], 'Create circular assignment-only fixture');
        createdAssignmentKeys.push([user('assignmentCircular').teacherId, circularId]);
      }
      if (item.key === 'nullCircular') {
        await insertService('teacher_class_assignments', [{
          teacher_id: user('assignmentTheology').teacherId,
          class_id: theologyId,
          class_type: 'theology',
        }], 'Create theology assignment-only fixture');
        createdAssignmentKeys.push([user('assignmentTheology').teacherId, theologyId]);
      }
      if (item.key === 'legacy') {
        const { error: legacyUpdateError } = await service.from('teachers')
          .update({ classes: [circularId] })
          .eq('id', user('legacy').teacherId);
        assert.equal(legacyUpdateError, null, `Seed legacy-only teacher classes: ${legacyUpdateError?.message}`);
      }
    }

    const unassignedClass = classes.get('unassigned');
    for (const key of ['idFallback', 'differentTeacherId']) {
      await insertService('teacher_class_assignments', [{
        teacher_id: user(key).teacherId,
        class_id: classes.get('direct').circularId,
        class_type: 'circular',
      }], `Create assignment for ${key}`);
      createdAssignmentKeys.push([user(key).teacherId, classes.get('direct').circularId]);
    }
    await insertService('teacher_class_assignments', [{
      teacher_id: user('inactive').teacherId,
      class_id: classes.get('unassigned').circularId,
      class_type: 'circular',
    }], 'Create inactive teacher assignment');
    createdAssignmentKeys.push([user('inactive').teacherId, unassignedClass.circularId]);

    const direct = await signIn('direct');
    const directCircular = await makeMark(direct.client, 'circular_marks', enrollments.get('direct'), circularSubjectId, user('direct').teacherId);
    assertAllowed(directCircular, 'Class Teacher via circular class_teacher_id writes secular mark');
    const directTheology = await makeMark(direct.client, 'theology_marks', enrollments.get('direct'), theologySubjectId, user('direct').teacherId);
    assertAllowed(directTheology, 'Class Teacher via production circular class_teacher_id policy writes theology mark');

    const assignment = await signIn('assignmentCircular');
    assertAllowed(await makeMark(assignment.client, 'circular_marks', enrollments.get('assignment'), circularSubjectId, user('assignmentCircular').teacherId), 'Circular-assignment-only teacher writes circular mark');
    assertDenied(await makeMark(assignment.client, 'theology_marks', enrollments.get('assignment'), theologySubjectId, user('assignmentCircular').teacherId), 'Circular-assignment-only teacher cannot write theology marks');

    const theologyAssignment = await signIn('assignmentTheology');
    assertAllowed(await makeMark(theologyAssignment.client, 'theology_marks', enrollments.get('nullCircular'), theologySubjectId, user('assignmentTheology').teacherId), 'Theology-assignment-only teacher writes theology mark with NULL circular class');
    assertDenied(await makeMark(theologyAssignment.client, 'circular_marks', enrollments.get('unassigned'), circularSubjectId, user('assignmentTheology').teacherId), 'Theology-only assignment cannot write circular marks');

    const unassigned = await signIn('assignmentTheology');
    assertDenied(await makeMark(unassigned.client, 'circular_marks', enrollments.get('unassigned'), circularSubjectId, user('assignmentTheology').teacherId), 'Teacher cannot write unassigned circular class');
    assertDenied(await makeMark(unassigned.client, 'theology_marks', enrollments.get('unassigned'), theologySubjectId, user('assignmentTheology').teacherId), 'Teacher cannot write unassigned theology class');

    const legacy = await signIn('legacy');
    assertDenied(await makeMark(legacy.client, 'circular_marks', enrollments.get('legacy'), circularSubjectId, user('legacy').teacherId), 'Legacy classes array alone does not grant access');
    await insertService('teacher_class_assignments', [{
      teacher_id: user('legacy').teacherId,
      class_id: classes.get('legacy').circularId,
      class_type: 'circular',
    }], 'Backfill legacy teacher assignment');
    createdAssignmentKeys.push([user('legacy').teacherId, classes.get('legacy').circularId]);
    assertAllowed(await makeMark(legacy.client, 'circular_marks', enrollments.get('legacy'), circularSubjectId, user('legacy').teacherId), 'Legacy teacher allowed after admin assignment row');

    const theologyDos = await signIn('dosTheology');
    assertAllowed(await makeMark(theologyDos.client, 'theology_marks', enrollments.get('unassigned'), theologySubjectId, user('dosTheology').teacherId), 'DOS Theology writes theology marks');
    assertDenied(await makeMark(theologyDos.client, 'circular_marks', enrollments.get('unassigned'), circularSubjectId, user('dosTheology').teacherId), 'DOS Theology cannot write circular marks');
    const secularDos = await signIn('dosSecular');
    assertAllowed(await makeMark(secularDos.client, 'circular_marks', enrollments.get('unassigned'), circularSubjectId, user('dosSecular').teacherId), 'DOS Secular writes circular marks');
    assertDenied(await makeMark(secularDos.client, 'theology_marks', enrollments.get('unassigned'), theologySubjectId, user('dosSecular').teacherId), 'DOS Secular cannot write theology marks');
    const admin = await signIn('admin');
    assertAllowed(await makeMark(admin.client, 'circular_marks', enrollments.get('unassigned'), circularSubjectId, user('admin').teacherId), 'Administrator writes circular marks');
    assertAllowed(await makeMark(admin.client, 'theology_marks', enrollments.get('unassigned'), theologySubjectId, user('admin').teacherId), 'Administrator writes theology marks');

    const inactive = await signIn('inactive');
    assertDenied(await makeMark(inactive.client, 'circular_marks', enrollments.get('unassigned'), circularSubjectId, user('inactive').teacherId), 'Inactive teacher cannot write marks');
    const stray = await signIn('stray');
    assertDenied(await makeMark(stray.client, 'circular_marks', enrollments.get('unassigned'), circularSubjectId, null), 'User without teacher row cannot write marks');

    const idFallback = await signIn('idFallback');
    assertAllowed(await makeMark(idFallback.client, 'circular_marks', enrollments.get('direct'), circularSubjectId, user('idFallback').teacherId), 'Legacy id=auth.uid teacher can write assigned class');

    const differentId = await signIn('differentTeacherId');
    const fkWrite = await makeMark(differentId.client, 'circular_marks', enrollments.get('direct'), circularSubjectId, user('differentTeacherId').teacherId);
    assertAllowed(fkWrite, 'Different teacher.id writes updated_by using profile ID');
    assert.notEqual(user('differentTeacherId').teacherId, differentId.user.id);
    assert.equal(fkWrite.data[0].updated_by, user('differentTeacherId').teacherId, 'updated_by must reference teachers.id, not auth.uid()');

    const nullTheologyAdminWrite = await makeMark(admin.client, 'circular_marks', enrollments.get('nullTheology'), circularSubjectId, user('admin').teacherId);
    assertAllowed(nullTheologyAdminWrite, 'Admin can write circular mark for enrollment with NULL theology class');
    assertAllowed(await makeMark(admin.client, 'theology_marks', enrollments.get('nullCircular'), theologySubjectId, user('admin').teacherId), 'Admin can write theology mark for enrollment with NULL circular class');

    console.log(`FIXTURE_SHAPES=class_teacher_id_only:1;assignment_only:2;legacy_only_before_backfill:1;unassigned_class:1`);
    console.log('DIRECT_POSTGREST_CASES=allowed_and_denied assertions passed');

    if (process.env.RUN_MARKS_ROUTE_TESTS === '1') {
      const assignmentSession = await signIn('assignmentCircular');
      const students = await apiJson('/api/students', assignmentSession.session);
      assert.equal(students.status, 200, `Assignment-only /api/students status: ${students.status}; response=${JSON.stringify(students.body)}`);
      const studentIds = (Array.isArray(students.body) ? students.body : students.body.data ?? [])
        .map((row) => row.student_id ?? row.id);
      const { data: assignedStudent, error: assignedStudentError } = await service.from('enrollments')
        .select('student_id').eq('id', enrollments.get('assignment')).single();
      assert.equal(assignedStudentError, null, `Read assigned fixture student: ${assignedStudentError?.message}`);
      assert.ok(studentIds.includes(assignedStudent.student_id), '/api/students includes the assigned student');
      const { data: unassignedStudent, error: unassignedStudentError } = await service.from('enrollments')
        .select('student_id').eq('id', enrollments.get('unassigned')).single();
      assert.equal(unassignedStudentError, null, `Read unassigned fixture student: ${unassignedStudentError?.message}`);
      assert.ok(!studentIds.includes(unassignedStudent.student_id), '/api/students excludes the unassigned student');

      const theologyClassesResponse = await apiJson('/api/theology-classes', assignmentSession.session);
      assert.equal(theologyClassesResponse.status, 200, `Assignment-only /api/theology-classes status: ${theologyClassesResponse.status}`);
      const theologyClassRows = theologyClassesResponse.body.data ?? theologyClassesResponse.body;
      assert.ok(theologyClassRows.some((row) => row.id === classes.get('assignment').theologyId), '/api/theology-classes includes assigned cohort theology class');
      assert.ok(!theologyClassRows.some((row) => row.id === classes.get('unassigned').theologyId), '/api/theology-classes excludes unassigned theology class');

      const routeMarkResponse = await fetch(`${baseUrl}/api/marks`, {
        method: 'POST',
        headers: authHeaders(assignmentSession.session),
        body: JSON.stringify({
          enrollment_id: enrollments.get('assignment'),
          term_id: termId,
          score_type: 'mot',
          circular_marks: [{ subject_id: circularSubjectId, mot_score: 73 }],
        }),
      });
      assert.equal(routeMarkResponse.status, 200, `Assignment-only /api/marks assigned write status: ${routeMarkResponse.status}`);
      const deniedRouteMarkResponse = await fetch(`${baseUrl}/api/marks`, {
        method: 'POST',
        headers: authHeaders(assignmentSession.session),
        body: JSON.stringify({
          enrollment_id: enrollments.get('unassigned'),
          term_id: termId,
          score_type: 'mot',
          circular_marks: [{ subject_id: circularSubjectId, mot_score: 74 }],
        }),
      });
      assert.equal(deniedRouteMarkResponse.status, 403, `Assignment-only /api/marks unassigned write status: ${deniedRouteMarkResponse.status}`);
      console.log(`ASSIGNMENT_ONLY_ROUTE_COUNTS=/api/students:${studentIds.length};/api/marks:allowed=1,denied=1;/api/theology-classes:${theologyClassRows.length}`);
    } else {
      console.log('ROUTE_TESTS=BLOCKED (no verified rehearsal-only application server)');
    }
  } finally {
    for (const table of ['theology_marks', 'circular_marks']) {
      if (createdEnrollmentIds.length > 0) {
        await service.from(table).delete().in('enrollment_id', createdEnrollmentIds);
      }
    }
    if (createdCircularSubjectIds.length) {
      await service.from('circular_subjects').delete().in('id', createdCircularSubjectIds);
    }
    if (createdTheologySubjectIds.length) {
      await service.from('theology_subjects').delete().in('id', createdTheologySubjectIds);
    }
    for (const [teacherId, classId] of createdAssignmentKeys) {
      await service.from('teacher_class_assignments').delete().eq('teacher_id', teacherId).eq('class_id', classId);
    }
    if (createdEnrollmentIds.length) await service.from('enrollments').delete().in('id', createdEnrollmentIds);
    if (createdStudentIds.length) await service.from('students').delete().in('id', createdStudentIds);
    if (createdClassIds.length) {
      await service.from('circular_classes').delete().in('id', createdClassIds);
      await service.from('theology_classes').delete().in('id', createdClassIds);
    }
    if (createdTeacherIds.length) await service.from('teachers').delete().in('id', createdTeacherIds);
    for (const userId of createdUsers) await service.auth.admin.deleteUser(userId);
  }
});

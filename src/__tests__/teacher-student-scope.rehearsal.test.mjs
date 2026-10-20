import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
const mainRoot = path.resolve(root, '..', 'jiddah_repo_clean_room');
const rehearsalConfigPath = path.join(mainRoot, 'supabase', 'rehearsal', 'rehearsal-config.json');
if (!fs.existsSync(rehearsalConfigPath)) {
  throw new Error('Local rehearsal config is missing; refusing to run this test.');
}

const rehearsalConfig = JSON.parse(fs.readFileSync(rehearsalConfigPath, 'utf8'));
const supabaseUrl = new URL(rehearsalConfig.api_url);
if (!['localhost', '127.0.0.1'].includes(supabaseUrl.hostname) || supabaseUrl.port !== '54321') {
  throw new Error('Refusing to run teacher student scope test against a non-local rehearsal API.');
}

const jwtSecret = rehearsalConfig.jwt_secret;
if (typeof jwtSecret !== 'string' || jwtSecret.length < 32) {
  throw new Error('The local rehearsal JWT configuration is invalid.');
}

function signJwt(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode(payload);
  const signature = crypto.createHmac('sha256', jwtSecret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

const anonKey = signJwt({ iss: 'supabase-demo', role: 'anon', exp: 1983812996 });
const serviceKey = signJwt({ iss: 'supabase-demo', role: 'service_role', exp: 1983812996 });
const service = createClient(rehearsalConfig.api_url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(rehearsalConfig.api_url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const container = 'supabase_db_rehearsal_isolated_supabase';
const testPort = 3006;
const baseUrl = `http://127.0.0.1:${testPort}`;
const suffix = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const createdUsers = [];
const createdTeachers = [];
const createdStudents = [];
const createdEnrollments = [];
const createdCircularClasses = [];
const createdTheologyClasses = [];
const serverLogs = [];
let server;
let assignmentPolicyAdded = false;
let assignmentTeacher;
let noAssignmentTeacher;
let assignedStudentId;
let assignedEnrollmentId;
let unassignedStudentId;

function applySql(sql) {
  execFileSync('docker', [
    'exec', '-i', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres',
  ], { input: sql, stdio: ['pipe', 'pipe', 'pipe'] });
}

async function insert(table, rows, label) {
  const { data, error } = await service.from(table).insert(rows).select();
  assert.equal(error, null, `${label}: ${error?.message}`);
  return data;
}

async function createTeacher(key) {
  const email = `student-scope-${key}-${suffix}@test.local`;
  const password = `Scope-${suffix}!Ab3`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'Class Teacher' },
  });
  assert.equal(error, null, `Create ${key} user: ${error?.message}`);
  createdUsers.push(data.user.id);
  const { error: teacherError } = await service.from('teachers').insert({
    id: data.user.id,
    auth_user_id: data.user.id,
    email,
    role: 'Class Teacher',
    name: `Student Scope ${key}`,
    classes: [],
    status: 'active',
  });
  assert.equal(teacherError, null, `Create ${key} teacher: ${teacherError?.message}`);
  createdTeachers.push(data.user.id);
  return { email, password, id: data.user.id };
}

async function createCohort(key) {
  const circularId = crypto.randomUUID();
  const theologyId = crypto.randomUUID();
  const studentId = crypto.randomUUID();
  const enrollmentId = crypto.randomUUID();
  await insert('circular_classes', [{
    id: circularId,
    class_name: `Scope ${key}`,
    section: 'lower_primary',
  }], `Create ${key} circular class`);
  await insert('theology_classes', [{
    id: theologyId,
    class_name_english: `Scope ${key}`,
    level: 1,
  }], `Create ${key} theology class`);
  await insert('students', [{
    id: studentId,
    name: `Scope Student ${key}`,
    admission_number: `SCOPE-${suffix}-${key}`,
    gender: 'female',
    is_archived: false,
  }], `Create ${key} student`);
  await insert('enrollments', [{
    id: enrollmentId,
    student_id: studentId,
    circular_class_id: circularId,
    theology_class_id: theologyId,
    academic_year: 2040,
    is_active: true,
  }], `Create ${key} enrollment`);
  createdCircularClasses.push(circularId);
  createdTheologyClasses.push(theologyId);
  createdStudents.push(studentId);
  createdEnrollments.push(enrollmentId);
  if (key === 'assigned') {
    assignedStudentId = studentId;
    assignedEnrollmentId = enrollmentId;
    await insert('teacher_class_assignments', [{
      teacher_id: assignmentTeacher.id,
      class_id: theologyId,
      class_type: 'theology',
    }], 'Assign theology class to fixture teacher');
  } else {
    unassignedStudentId = studentId;
  }
}

async function signIn(user) {
  const { data, error } = await anon.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  assert.equal(error, null, `Sign in ${user.email}: ${error?.message}`);
  return data.session;
}

function sessionHeaders(session) {
  const ref = supabaseUrl.hostname === 'localhost' ? '127' : supabaseUrl.hostname.split('.')[0];
  return {
    Authorization: `Bearer ${session.access_token}`,
    Cookie: `sb-${ref}-auth-token=${encodeURIComponent(JSON.stringify(session))}`,
  };
}

async function startServer() {
  const serverEnv = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    NODE_ENV: 'development',
    PORT: String(testPort),
    NEXT_PUBLIC_SUPABASE_URL: rehearsalConfig.api_url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  };
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', String(testPort)], {
    cwd: root,
    env: serverEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  server.stdout.setEncoding('utf8').on('data', (chunk) => serverLogs.push(chunk));
  server.stderr.setEncoding('utf8').on('data', (chunk) => serverLogs.push(chunk));

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Rehearsal Next server exited early: ${serverLogs.join('')}`);
    }
    try {
      await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(2_000) });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error(`Rehearsal Next server did not start: ${serverLogs.join('')}`);
}

before(async () => {
  const existingPolicy = execFileSync('docker', [
    'exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-qAt', '-P', 'pager=off',
    '-c', "SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='teacher_class_assignments' AND policyname='tca_select_own';",
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  assert.equal(existingPolicy, '0', 'Expected baseline without tca_select_own policy before the test.');

  assignmentTeacher = await createTeacher('assigned');
  noAssignmentTeacher = await createTeacher('empty');
  await createCohort('assigned');
  await createCohort('unassigned');

  applySql(`DROP POLICY IF EXISTS tca_select_own ON public.teacher_class_assignments;
CREATE POLICY tca_select_own ON public.teacher_class_assignments
  FOR SELECT TO authenticated
  USING (teacher_id IN (SELECT t.id FROM public.teachers t WHERE t.auth_user_id = auth.uid() OR t.id = auth.uid()));`);
  assignmentPolicyAdded = true;
  await startServer();
});

after(async () => {
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise((resolve) => server.once('exit', resolve));
  }
  if (assignmentPolicyAdded) {
    applySql('DROP POLICY IF EXISTS tca_select_own ON public.teacher_class_assignments;');
  }
  if (createdTeachers.length) {
    await service.from('teacher_class_assignments').delete().in('teacher_id', createdTeachers);
  }
  if (createdEnrollments.length) {
    await service.from('enrollments').delete().in('id', createdEnrollments);
  }
  if (createdStudents.length) {
    await service.from('students').delete().in('id', createdStudents);
  }
  if (createdCircularClasses.length) {
    await service.from('circular_classes').delete().in('id', createdCircularClasses);
  }
  if (createdTheologyClasses.length) {
    await service.from('theology_classes').delete().in('id', createdTheologyClasses);
  }
  if (createdTeachers.length) {
    await service.from('teachers').delete().in('id', createdTeachers);
  }
  for (const id of createdUsers) await service.auth.admin.deleteUser(id);
});

test('Class Teacher sees assigned theology-enrolled students only', async () => {
  const session = await signIn(assignmentTeacher);
  const userClient = createClient(rehearsalConfig.api_url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: sessionError } = await userClient.auth.setSession(session);
  assert.equal(sessionError, null, `Set test user's JWT: ${sessionError?.message}`);
  const { data: visibleAssignments, error: assignmentError } = await userClient
    .from('teacher_class_assignments')
    .select('class_id, class_type')
    .eq('teacher_id', assignmentTeacher.id);
  assert.equal(assignmentError, null, `Read own assignment: ${assignmentError?.message}`);
  assert.equal(visibleAssignments.length, 1, 'User JWT must see its own theology assignment under today minimal policy.');
  const classIds = visibleAssignments.map((row) => row.class_id).join(',');
  const { data: directEnrollments, error: directEnrollmentError } = await userClient
    .from('enrollments')
    .select('id, students!inner(id)')
    .or(`circular_class_id.in.(${classIds}),theology_class_id.in.(${classIds})`)
    .eq('is_active', true)
    .eq('students.is_archived', false);
  assert.equal(directEnrollmentError, null, `Read assigned enrollment: ${directEnrollmentError?.message}`);
  console.log(`DIRECT_ASSIGNED_ENROLLMENT_ROWS=${directEnrollments.length}`);
  const response = await fetch(`${baseUrl}/api/students`, { headers: sessionHeaders(session) });
  const body = await response.json();
  assert.equal(response.status, 200, `/api/students returned ${response.status}: ${JSON.stringify(body)}; server=${serverLogs.join('').slice(-1500)}`);
  const studentIds = body.map((row) => row.id ?? row.student_id);
  assert.ok(studentIds.includes(assignedStudentId), `Assigned theology student must be returned; received ${JSON.stringify(studentIds)}; assignment=${JSON.stringify(visibleAssignments)}.`);
  assert.ok(!studentIds.includes(unassignedStudentId), `Unassigned student ${unassignedStudentId} must not be returned.`);
  console.log(`STUDENT_SCOPE_COUNTS=assigned:${studentIds.includes(assignedStudentId) ? 1 : 0};unassigned:${studentIds.includes(unassignedStudentId) ? 1 : 0};rows:${studentIds.length}`);

  const theologyClassesResponse = await fetch(`${baseUrl}/api/theology-classes`, { headers: sessionHeaders(session) });
  const theologyClassesBody = await theologyClassesResponse.json();
  assert.equal(theologyClassesResponse.status, 200, `/api/theology-classes returned ${theologyClassesResponse.status}: ${JSON.stringify(theologyClassesBody)}`);
  assert.ok(theologyClassesBody.data.some((row) => row.id === visibleAssignments[0].class_id), 'The theology class list must include the assigned class.');
  console.log(`THEOLOGY_CLASS_ROWS=${theologyClassesBody.data.length}`);

  const { data: terms, error: termsError } = await service.from('terms').select('id').limit(1);
  assert.equal(termsError, null, `Read rehearsal term: ${termsError?.message}`);
  assert.ok(terms.length > 0, 'The rehearsal must have a term for the marks route check.');
  const marksResponse = await fetch(
    `${baseUrl}/api/marks?enrollment_id=${assignedEnrollmentId}&term_id=${terms[0].id}`,
    { headers: sessionHeaders(session) }
  );
  const marksBody = await marksResponse.json();
  assert.equal(marksResponse.status, 200, `/api/marks returned ${marksResponse.status}: ${JSON.stringify(marksBody)}`);
  assert.ok(marksBody.theology_marks.length > 0, 'The marks response must include theology subjects for the assigned class.');
  console.log(`MARKS_ROWS=circular:${marksBody.circular_marks.length};theology:${marksBody.theology_marks.length}`);
});

test('Class Teacher with no assignment receives an empty student list', async () => {
  const session = await signIn(noAssignmentTeacher);
  const response = await fetch(`${baseUrl}/api/students`, { headers: sessionHeaders(session) });
  const body = await response.json();
  assert.equal(response.status, 200, `/api/students returned ${response.status}: ${JSON.stringify(body)}`);
  assert.deepEqual(body, [], 'Empty assignment list must return zero students.');
  console.log(`EMPTY_ASSIGNMENT_STUDENT_ROWS=${body.length}`);
});

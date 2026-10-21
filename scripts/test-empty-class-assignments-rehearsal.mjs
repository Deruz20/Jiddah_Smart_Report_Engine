import { createClient } from '@supabase/supabase-js';
import '../src/lib/test-guard.mjs';
import { getRehearsalCredentials } from './rehearsal-credentials.mjs';

const { apiUrl, anonKey, serviceRoleKey } = getRehearsalCredentials();
const userClient = createClient(apiUrl, anonKey);
const adminClient = createClient(apiUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const teacherId = 'c599cb13-fb3d-4e5d-8e27-253cb7e5ac1a';
const assignedClassId = 'c1000000-0000-0000-0000-000000000001';
const enrollmentId = 'e0000000-0000-0000-0000-000000000001';
const termId = 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111';
const teacherEmail = 'teacher@test.local';
const password = 'Password123!';

const { data: sessionData, error: authError } = await userClient.auth.signInWithPassword({
  email: teacherEmail,
  password,
});
if (authError || !sessionData.session) {
  throw new Error(`Local Class Teacher authentication failed: ${authError?.message ?? 'no session'}`);
}

const { data: assignmentRows, error: assignmentError } = await adminClient
  .from('teacher_class_assignments')
  .select('class_id')
  .eq('teacher_id', teacherId);
if (assignmentError) throw new Error(`Could not verify synthetic assignment fixture: ${assignmentError.message}`);
if (!assignmentRows?.some((row) => row.class_id === assignedClassId)) {
  throw new Error('Synthetic Class Teacher is missing the expected assigned-only class fixture.');
}

const { error: clearDirectAssignmentError } = await adminClient
  .from('circular_classes')
  .update({ class_teacher_id: null })
  .eq('id', assignedClassId);
if (clearDirectAssignmentError) {
  throw new Error(`Could not isolate assignment-only fixture: ${clearDirectAssignmentError.message}`);
}

const session = sessionData.session;
const headers = {
  Authorization: `Bearer ${session.access_token}`,
  Cookie: `sb-127-auth-token=base64-${Buffer.from(JSON.stringify(session)).toString('base64')}`,
};

const routes = [
  {
    route: '/api/students',
    url: 'http://127.0.0.1:3000/api/students',
    extractCount: (body) => Array.isArray(body) ? body.length : null,
  },
  {
    route: '/api/marks',
    url: `http://127.0.0.1:3000/api/marks?enrollment_id=${enrollmentId}&term_id=${termId}`,
    extractCount: (body) => body && typeof body === 'object'
      ? (Array.isArray(body.circular_marks) ? body.circular_marks.length : 0)
        + (Array.isArray(body.theology_marks) ? body.theology_marks.length : 0)
      : null,
  },
  {
    route: '/api/theology-classes',
    url: 'http://127.0.0.1:3000/api/theology-classes',
    extractCount: (body) => Array.isArray(body?.data) ? body.data.length : null,
  },
  {
    route: '/api/theology-marks',
    url: 'http://127.0.0.1:3000/api/theology-marks',
    extractCount: (body) => Array.isArray(body?.data) ? body.data.length : null,
  },
  {
    route: '/api/reports',
    url: `http://127.0.0.1:3000/api/reports?student_id=a0000000-0000-0000-0000-000000000001&term_id=${termId}`,
    extractCount: (body) => Array.isArray(body?.marks) ? body.marks.length
      : Array.isArray(body?.assessments) ? body.assessments.length
        : null,
  },
];

try {
  const { data: visibleAssignments, error: visibleAssignmentError } = await userClient
    .from('teacher_class_assignments')
    .select('class_id')
    .eq('teacher_id', teacherId);
  if (visibleAssignmentError) throw new Error(`User-JWT assignment query failed: ${visibleAssignmentError.message}`);
  console.log(JSON.stringify({
    check: 'teacher_class_assignments user-JWT visibility',
    rowCount: visibleAssignments?.length ?? 0,
  }));

  for (const item of routes) {
    const response = await fetch(item.url, { headers });
    const body = await response.json().catch(() => null);
    console.log(JSON.stringify({
      route: item.route,
      status: response.status,
      rowCount: response.ok ? item.extractCount(body) : 0,
      rowsReturned: response.ok,
      response: body,
    }));
  }

  const directMarkUpdate = await userClient
    .from('theology_marks')
    .update({ mot_score: 90 })
    .eq('enrollment_id', enrollmentId)
    .select();
  if (directMarkUpdate.error) throw new Error(`Theology marks policy branch query failed: ${directMarkUpdate.error.message}`);
  console.log(JSON.stringify({
    check: 'theology_marks assignment-policy branch',
    updatedRows: directMarkUpdate.data?.length ?? 0,
  }));
} finally {
  const { error: restoreError } = await adminClient
    .from('circular_classes')
    .update({ class_teacher_id: teacherId })
    .eq('id', assignedClassId);
  if (restoreError) throw new Error(`Could not restore rehearsal class fixture: ${restoreError.message}`);
}

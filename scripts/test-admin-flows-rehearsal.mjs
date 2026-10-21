import { createClient } from '@supabase/supabase-js';
import '../src/lib/test-guard.mjs';
import { getRehearsalCredentials } from './rehearsal-credentials.mjs';

const { apiUrl, anonKey } = getRehearsalCredentials();
const supabase = createClient(apiUrl, anonKey);
const serviceClient = createClient(apiUrl, getRehearsalCredentials().serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'admin@test.local',
  password: 'Password123!',
});

if (error || !data.session) {
  throw new Error(`Local Administrator authentication failed: ${error?.message ?? 'no session'}`);
}

const cookie = `sb-127-auth-token=base64-${Buffer.from(JSON.stringify(data.session)).toString('base64')}`;
const headers = {
  Authorization: `Bearer ${data.session.access_token}`,
  Cookie: cookie,
  'Content-Type': 'application/json',
};

const admissionNumber = `PHASE1-ADMIN-PROBE-${Date.now()}`;
const requests = [
  {
    flow: 'student registration',
    url: 'http://127.0.0.1:3000/api/students',
    init: {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Rehearsal Admin Flow Probe',
        circular_class_id: 'c1000000-0000-0000-0000-000000000001',
        theology_class_id: 'c0000000-0000-0000-0000-000000000002',
        academic_year: '2026',
        admission_number: admissionNumber,
        gender: 'F',
        religion: 'Muslim',
      }),
    },
  },
  {
    flow: 'score entry',
    url: 'http://127.0.0.1:3000/api/marks',
    init: {
      method: 'POST',
      headers,
      body: JSON.stringify({
        enrollment_id: 'e0000000-0000-0000-0000-000000000001',
        term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
        score_type: 'mot',
        circular_marks: [
          { subject_id: 'b0000000-0000-0000-0000-000000000001', mot_score: 88 },
        ],
        theology_marks: [],
      }),
    },
  },
  {
    flow: 'report generation',
    url: 'http://127.0.0.1:3000/api/report?enrollment_id=e0000000-0000-0000-0000-000000000001&term_id=a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
    init: { method: 'GET', headers },
  },
];

try {
  for (const request of requests) {
    const response = await fetch(request.url, request.init);
    const body = await response.json().catch(() => null);
    console.log(JSON.stringify({
      flow: request.flow,
      status: response.status,
      response: body,
    }));
  }
} finally {
  const { data: students, error: studentLookupError } = await serviceClient
    .from('students')
    .select('id')
    .eq('admission_number', admissionNumber);
  if (studentLookupError) throw new Error(`Could not verify local probe cleanup: ${studentLookupError.message}`);

  const studentIds = (students ?? []).map((student) => student.id);
  if (studentIds.length > 0) {
    const { error: enrollmentDeleteError } = await serviceClient
      .from('enrollments')
      .delete()
      .in('student_id', studentIds);
    if (enrollmentDeleteError) throw new Error(`Could not clean local probe enrollments: ${enrollmentDeleteError.message}`);

    const { error: studentDeleteError } = await serviceClient
      .from('students')
      .delete()
      .in('id', studentIds);
    if (studentDeleteError) throw new Error(`Could not clean local probe students: ${studentDeleteError.message}`);
  }
}

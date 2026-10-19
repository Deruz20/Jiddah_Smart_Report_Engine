// @ts-check
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

import { execSync } from 'node:child_process';

import { getRehearsalCredentials } from './rehearsal-credentials.mjs';

const creds = getRehearsalCredentials();
const SUPABASE_URL = creds.apiUrl;
const ANON_KEY = creds.anonKey;
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

const ROLES = [
  { role: 'unauthenticated', email: null, password: null },
  { role: 'Support Staff', email: 'staff@test.local', password: 'Password123!' },
  { role: 'Theology Instructor', email: 'theology@test.local', password: 'Password123!' },
  { role: 'Class Teacher', email: 'teacher@test.local', password: 'Password123!' },
  { role: 'DOS', email: 'dos@test.local', password: 'Password123!' },
  { role: 'Head Teacher', email: 'head@test.local', password: 'Password123!' },
  { role: 'Administrator', email: 'admin@test.local', password: 'Password123!' },
];

// Key API endpoints representing the functional surface of the application
const ENDPOINTS = [
  { path: '/api/health', method: 'GET', desc: 'System health probe', public: true },
  { path: '/api/csrf-token', method: 'GET', desc: 'CSRF token issuance', public: true },
  { path: '/api/theology-classes', method: 'GET', desc: 'Public theology class catalog', public: true },
  { path: '/api/public-stats', method: 'GET', desc: 'Public landing statistics', public: true },
  { path: '/api/settings/school', method: 'GET', desc: 'School settings query', minRole: 'Administrator' },
  { path: '/api/settings/school', method: 'PATCH', desc: 'School settings modification', minRole: 'Administrator', body: { motto: 'Test' } },
  { path: '/api/admin/teachers/invite', method: 'POST', desc: 'Teacher invite dispatch', minRole: 'Administrator', body: { email: 'invite@test.local' } },
  { path: '/api/admin/reset-password', method: 'POST', desc: 'Admin password reset', minRole: 'Administrator', body: { email: 'teacher@test.local' } },
  { path: '/api/students', method: 'GET', desc: 'Student enrollment list', minRole: 'Class Teacher' },
  { path: '/api/marks?enrollment_id=e0000000-0000-0000-0000-000000000001&term_id=a1b2c3d4-e5f6-4a1b-8c2d-111111111111', method: 'GET', desc: 'Marks read', minRole: 'Class Teacher' },
  { path: '/api/marks', method: 'POST', desc: 'Marks save', minRole: 'Class Teacher', body: { enrollment_id: 'e0000000-0000-0000-0000-000000000001', term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111', score_type: 'mot', circular_marks: [] } },
  { path: '/api/report?enrollment_id=e0000000-0000-0000-0000-000000000001&term_id=a1b2c3d4-e5f6-4a1b-8c2d-111111111111', method: 'GET', desc: 'Report card generation', minRole: 'Class Teacher' },
  { path: '/api/report/batch', method: 'POST', desc: 'Batch report generation', minRole: 'Class Teacher', body: { enrollment_ids: [] } },
  { path: '/api/notifications/unread-count', method: 'GET', desc: 'Notifications unread count', authRequired: true },
  { path: '/api/notifications/mark-all-read', method: 'POST', desc: 'Mark all notifications read', authRequired: true, body: {} },
  { path: '/api/classes', method: 'GET', desc: 'Circular classes list', authRequired: true },
  { path: '/api/subjects', method: 'GET', desc: 'Subjects list', authRequired: true },
  { path: '/api/terms', method: 'GET', desc: 'Academic terms list', authRequired: true },
  { path: '/api/teachers', method: 'GET', desc: 'Teachers list', authRequired: true },
  { path: '/api/activity', method: 'GET', desc: 'Activity log query', minRole: 'DOS' },
  { path: '/api/settings/terms/active', method: 'GET', desc: 'Active term query', minRole: 'Support Staff' },
  { path: '/api/settings/terms/active', method: 'POST', desc: 'Active term modification', minRole: 'Administrator', body: { termId: 'dummy' } },
  { path: '/api/theology-marks', method: 'GET', desc: 'Theology marks query', minRole: 'Class Teacher' },
  { path: '/api/circular-marks', method: 'GET', desc: 'Circular marks query', minRole: 'Class Teacher' },
  { path: '/api/dev/seed', method: 'GET', desc: 'Defused seed endpoint', disabled: true },
  { path: '/api/dev/seed', method: 'POST', desc: 'Defused seed mutation', disabled: true, body: {} },
  { path: '/api/test_error', method: 'GET', desc: 'Defused error endpoint', disabled: true },
  { path: '/api/test_error', method: 'POST', desc: 'Defused error endpoint', disabled: true, body: {} },
];

async function getAuthHeaders(userConfig) {
  if (!userConfig.email) return {};
  const { data, error } = await supabase.auth.signInWithPassword({
    email: userConfig.email,
    password: userConfig.password,
  });
  if (error || !data.session) {
    throw new Error(`Auth failed for ${userConfig.email}: ${error?.message}`);
  }
  const token = data.session.access_token;
  const cookie = `sb-127-auth-token=${encodeURIComponent(JSON.stringify(data.session))}`;
  return {
    'Authorization': `Bearer ${token}`,
    'Cookie': cookie,
    'Content-Type': 'application/json',
  };
}

async function runSweep() {
  console.log('=== STARTING COMPLETE API AUTHORIZATION SWEEP ===');
  console.log(`Endpoints to test: ${ENDPOINTS.length}`);
  console.log(`Roles to test: ${ROLES.length}`);
  console.log(`Total probe permutations: ${ENDPOINTS.length * ROLES.length}\n`);

  const results = [];
  let defects = 0;

  for (const roleConfig of ROLES) {
    console.log(`--> Probing as: [${roleConfig.role}]`);
    let headers = {};
    try {
      headers = await getAuthHeaders(roleConfig);
    } catch (err) {
      console.error(`    Failed to acquire session for ${roleConfig.role}:`, err.message);
      continue;
    }

    for (const ep of ENDPOINTS) {
      const url = `${BASE_URL}${ep.path}`;
      const init = {
        method: ep.method,
        headers,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      };

      let status = 0;
      let responseBody = '';
      try {
        const res = await fetch(url, init);
        status = res.status;
        try {
          responseBody = await res.text();
        } catch {}
      } catch (err) {
        status = 599; // network / connection error
        responseBody = err.message;
      }

      // Defect evaluation based on canonical permission matrix
      let isDefect = false;
      let expectation = '';

      if (ep.disabled) {
        expectation = '404 (Permanently disabled)';
        if (status !== 404) isDefect = true;
      } else if (roleConfig.role === 'unauthenticated') {
        if (ep.public) {
          expectation = '2xx/3xx/400 (Public endpoint)';
          if (status === 401 || status === 403) isDefect = true;
        } else {
          expectation = '401/403/404 (Protected against anon)';
          // If anon gets a 2xx on an unauthenticated protected route, it's a defect!
          if (status >= 200 && status < 300) {
            isDefect = true;
          }
        }
      } else {
        // Authenticated role evaluation
        if (ep.minRole === 'Administrator' && roleConfig.role !== 'Administrator') {
          expectation = '401/403 (Admin Only)';
          if (status >= 200 && status < 300) isDefect = true;
        } else if (ep.minRole === 'DOS' && !['DOS', 'Head Teacher', 'Administrator'].includes(roleConfig.role)) {
          expectation = '401/403 (DOS / Head Teacher / Admin Only)';
          if (status >= 200 && status < 300) isDefect = true;
        } else if (roleConfig.role === 'Support Staff' && ep.minRole) {
          expectation = '403 (Support Staff Denied)';
          if (status >= 200 && status < 300) isDefect = true;
        } else {
          expectation = 'Permitted or Controlled (Depends on row scope)';
        }
      }

      if (isDefect) {
        defects++;
        console.error(`    [DEFECT] ${ep.method} ${ep.path} by ${roleConfig.role} returned ${status}. Expected: ${expectation}`);
      }

      results.push({
        role: roleConfig.role,
        endpoint: ep.path,
        method: ep.method,
        desc: ep.desc,
        statusCode: status,
        isDefect,
        expectation,
      });
    }
  }

  console.log('\n=== TEACHER CROSS-CLASS MUTATION ATTEMPT TEST ===');
  // Synthetic Class Teacher assigned ONLY to Primary 1 attempting to mutate marks for Primary 4
  const teacherHeaders = await getAuthHeaders({ email: 'teacher@test.local', password: 'Password123!' });
  const crossClassPayload = {
    enrollment_id: 'e0000000-0000-0000-0000-000000000002', // unassigned Primary 2 student
    term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
    score_type: 'mot',
    circular_marks: [{ subject_id: '00000000-0000-0000-0000-000000000001', mot_score: 90 }],
  };

  const crossClassRes = await fetch(`${BASE_URL}/api/marks`, {
    method: 'POST',
    headers: teacherHeaders,
    body: JSON.stringify(crossClassPayload),
  });
  console.log(`Cross-class mutation attempt status: ${crossClassRes.status}`);
  const crossClassBody = await crossClassRes.json().catch(() => ({}));
  console.log(`Cross-class mutation response:`, crossClassBody);

  const crossClassBlocked = crossClassRes.status === 403 || crossClassRes.status === 404;
  if (!crossClassBlocked) {
    console.error(`[FAIL] Cross-class mutation was NOT blocked! Status: ${crossClassRes.status}`);
    defects++;
  } else {
    console.log(`[PASS] Cross-class mutation blocked: status = ${crossClassRes.status} (Forbidden/Not Found)`);
  }

  // Write full matrix to scratch/api_sweep_matrix.json
  const scratchDir = path.resolve('scratch');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  const outputPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(scratchDir, 'api_sweep_matrix.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ timestamp: new Date().toISOString(), totalTests: results.length, totalDefects: defects, results }, null, 2)
  );

  console.log(`\n=== API SWEEP FINISHED: ${results.length} PROBES, ${defects} DEFECTS RECORDED IN ${outputPath} ===`);
}

runSweep().catch((err) => {
  console.error('FATAL SWEEP ERROR:', err);
  process.exit(1);
});

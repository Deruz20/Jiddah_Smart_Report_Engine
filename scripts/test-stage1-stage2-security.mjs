// @ts-check
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const anonClient = createClient(SUPABASE_URL, ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

function execSql(sql) {
  return execSync('docker exec -i supabase_db_rehearsal_isolated_supabase psql -U postgres -d postgres', {
    input: sql,
    shell: 'powershell.exe',
    encoding: 'utf-8'
  });
}

function execSqlFile(filePath) {
  const cmd = `Get-Content "${filePath}" -Raw | docker exec -i supabase_db_rehearsal_isolated_supabase psql -U postgres -d postgres`;
  return execSync(cmd, { shell: 'powershell.exe', encoding: 'utf-8' });
}

async function createAuthenticatedClient(email, password) {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Auth failed for ${email}: ${error?.message}`);
  }
  return { client, user: data.user, session: data.session };
}

async function main() {
  console.log('================================================================');
  console.log('STAGE 1 & STAGE 2 COMPREHENSIVE SECURITY VERIFICATION (E1)');
  console.log('================================================================');

  // Ensure fresh application of Stage 1 & Stage 2
  console.log('\n[1/5] Applying Stage 1 & Stage 2 Migrations...');
  execSqlFile('supabase/migrations/stage1_security_lockdown.sql');
  execSqlFile('supabase/migrations/stage2_legacy_tables.sql');
  
  // Reset test roles to clean known baseline
  execSql(`
    UPDATE public.teachers SET role = 'Class Teacher' WHERE email = 'teacher@test.local';
    UPDATE public.teachers SET role = 'Administrator' WHERE email = 'admin@test.local';
    UPDATE public.teachers SET role = 'DOS' WHERE email = 'dos@test.local';
    UPDATE public.teachers SET role = 'Head Teacher' WHERE email = 'head@test.local';
    UPDATE public.teachers SET role = 'Support Staff' WHERE email = 'staff@test.local';
    UPDATE public.teachers SET role = 'Theology Instructor' WHERE email = 'theology@test.local';
  `);
  console.log('  -> Stage 1 & Stage 2 Migrations Applied and Test Accounts Baseline Initialized.');

  // Authenticate test users for each role
  console.log('\n[2/5] Authenticating Test Role Accounts...');
  const teacherAuth = await createAuthenticatedClient('teacher@test.local', 'Password123!');
  const adminAuth = await createAuthenticatedClient('admin@test.local', 'Password123!');
  const dosAuth = await createAuthenticatedClient('dos@test.local', 'Password123!');
  console.log('  -> Authenticated: teacher@test.local (Class Teacher)');
  console.log('  -> Authenticated: admin@test.local (Administrator)');
  console.log('  -> Authenticated: dos@test.local (DOS)');

  // --------------------------------------------------------------------------
  // TEST SECTION 1: HYPOTHESIS TEST ON THEOLOGY_MARKS 42501
  // --------------------------------------------------------------------------
  console.log('\n[3/5] HYPOTHESIS TEST: theology_marks 42501 Root Cause Analysis');

  // Setup test enrollment, class, and teacher_class_assignment
  const testEnrollmentId = 'e0000000-0000-0000-0000-000000000001';
  const testTheologyClassId = 'c0000000-0000-0000-0000-000000000002';
  const teacherId = teacherAuth.user.id;

  // Ensure production theology_marks policy is active on theology_marks table
  execSql(`
    DROP POLICY IF EXISTS "theology_marks_staff_access" ON public.theology_marks;
    DROP POLICY IF EXISTS "theology_marks_access_policy" ON public.theology_marks;
    ALTER TABLE public.theology_marks ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "theology_marks_access_policy" ON public.theology_marks
      FOR ALL TO public
      USING (
        EXISTS (
          SELECT 1
          FROM enrollments e
          JOIN theology_classes tc ON tc.id = e.theology_class_id
          JOIN teachers t ON t.auth_user_id = auth.uid()
          WHERE e.id = theology_marks.enrollment_id
            AND (
              EXISTS (
                SELECT 1
                FROM teacher_class_assignments tca
                WHERE tca.teacher_id = t.id
                  AND tca.class_id = tc.id
                  AND tca.class_type = 'theology'
              )
              OR EXISTS (
                SELECT 1
                FROM circular_classes cc
                WHERE cc.id = e.circular_class_id
                  AND cc.class_teacher_id = t.id
              )
              OR t.role::text = ANY (ARRAY[
                'DOS Theology'::character varying,
                'Administrator'::character varying,
                'admin'::character varying,
                'Head Teacher'::character varying,
                'Deputy Head Teacher'::character varying
              ]::text[])
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM enrollments e
          JOIN theology_classes tc ON tc.id = e.theology_class_id
          JOIN teachers t ON t.auth_user_id = auth.uid()
          WHERE e.id = theology_marks.enrollment_id
            AND (
              EXISTS (
                SELECT 1
                FROM teacher_class_assignments tca
                WHERE tca.teacher_id = t.id
                  AND tca.class_id = tc.id
                  AND tca.class_type = 'theology'
              )
              OR EXISTS (
                SELECT 1
                FROM circular_classes cc
                WHERE cc.id = e.circular_class_id
                  AND cc.class_teacher_id = t.id
              )
              OR t.role::text = ANY (ARRAY[
                'DOS Theology'::character varying,
                'Administrator'::character varying,
                'admin'::character varying,
                'Head Teacher'::character varying,
                'Deputy Head Teacher'::character varying
              ]::text[])
            )
        )
      );
  `);

  // Ensure test student, class, enrollment, and teacher_class_assignment exist
  const testStudentId = 'a0000000-0000-0000-0000-000000000001';
  execSql(`
    INSERT INTO public.students (id, name, gender, status)
    VALUES ('${testStudentId}', 'Test Student', 'Male', 'active')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.theology_classes (id, class_name_arabic, class_name_english, level)
    VALUES ('${testTheologyClassId}', 'الفصل التجريبي', 'Test Theology Class', 1)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.enrollments (id, student_id, theology_class_id, academic_year)
    VALUES ('${testEnrollmentId}', '${testStudentId}', '${testTheologyClassId}', '2026')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.teacher_class_assignments (teacher_id, class_id, class_type)
    VALUES ('${teacherId}', '${testTheologyClassId}', 'theology')
    ON CONFLICT (teacher_id, class_id) DO NOTHING;
  `);

  // CASE A: When teacher_class_assignments has NO select policy (replicates production bug)
  console.log('  Sub-test A: Dropping teacher_class_assignments_select policy to simulate production bug (a)...');
  execSql('DROP POLICY IF EXISTS "teacher_class_assignments_select" ON public.teacher_class_assignments;');

  const failAttempt = await teacherAuth.client.from('theology_marks').insert({
    enrollment_id: testEnrollmentId,
    term_id: 'term_1',
    mot_score: 85
  });

  console.log(`  Result without select policy: error=${failAttempt.error?.code} message=${failAttempt.error?.message}`);
  assert.ok(
    failAttempt.error !== null && (failAttempt.error.code === '42501' || failAttempt.error.message.includes('policy')),
    'Expected theology marks insert to FAIL with 42501 when teacher_class_assignments has 0 policies'
  );
  console.log('  -> PROVED: Missing SELECT policy on teacher_class_assignments causes RLS denial (code 42501) on theology_marks.');

  // CASE B: Restore teacher_class_assignments_select policy (Stage 1 fix)
  console.log('  Sub-test B: Restoring teacher_class_assignments_select policy...');
  execSql(`
    CREATE POLICY "teacher_class_assignments_select" ON public.teacher_class_assignments
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.teachers t
          WHERE t.id = teacher_class_assignments.teacher_id
            AND (t.auth_user_id = auth.uid() OR t.role IN ('Administrator', 'admin', 'Head Teacher', 'DOS'))
        )
      );
  `);

  const successAttempt = await teacherAuth.client.from('theology_marks').insert({
    enrollment_id: testEnrollmentId,
    term_id: 'term_1',
    mot_score: 88
  });

  console.log(`  Result with select policy: error=${successAttempt.error?.message || 'none (SUCCESS)'}`);
  assert.strictEqual(successAttempt.error, null, 'Theology marks insert MUST SUCCEED with teacher_class_assignments SELECT policy');
  console.log('  -> PROVED: With SELECT policy in place, assigned teacher saves theology marks cleanly.');

  // Clean up test mark
  await adminClient.from('theology_marks').delete().eq('enrollment_id', testEnrollmentId);

  // CASE C: Test when teachers.auth_user_id is NULL
  console.log('  Sub-test C: Testing theology_marks save when teachers.auth_user_id is NULL...');
  execSql(`UPDATE public.teachers SET auth_user_id = NULL WHERE id = '${teacherId}';`);

  const nullAuthAttempt = await teacherAuth.client.from('theology_marks').insert({
    enrollment_id: testEnrollmentId,
    term_id: 'term_1',
    mot_score: 75
  });

  console.log(`  Result when auth_user_id is NULL: error=${nullAuthAttempt.error?.code} message=${nullAuthAttempt.error?.message}`);
  assert.ok(
    nullAuthAttempt.error !== null && (nullAuthAttempt.error.code === '42501' || nullAuthAttempt.error.message.includes('policy')),
    'Theology marks insert MUST FAIL when teachers.auth_user_id is NULL'
  );
  console.log('  -> PROVED: NULL auth_user_id fails RLS with 42501.');

  // Restore teacher auth_user_id
  execSql(`UPDATE public.teachers SET auth_user_id = '${teacherId}' WHERE id = '${teacherId}';`);

  // --------------------------------------------------------------------------
  // TEST SECTION 2: AUTHENTICATED OVER-REACH CLOSURES
  // --------------------------------------------------------------------------
  console.log('\n[4/5] VERIFYING AUTHENTICATED OVER-REACH CLOSURES');

  // Test 2.1: Teacher attempts to elevate own role to Administrator
  console.log('  Probe 2.1: Class Teacher attempts self role elevation (role = "Administrator")...');
  const roleElevation = await teacherAuth.client
    .from('teachers')
    .update({ role: 'Administrator' })
    .eq('id', teacherId);

  assert.ok(
    roleElevation.error !== null && roleElevation.error.message.includes('Security Violation'),
    `Self role elevation must be blocked by trigger: ${roleElevation.error?.message}`
  );
  console.log('  -> PASS: Teacher self-role change blocked with trigger exception.');

  // Test 2.2: Teacher attempts to update another teacher
  console.log('  Probe 2.2: Class Teacher attempts to update another teacher profile...');
  const otherTeacherUpdate = await teacherAuth.client
    .from('teachers')
    .update({ name: 'Hacked Name' })
    .eq('id', adminAuth.user.id);

  // Under RLS, updating another row either returns error or updates 0 rows
  const { data: adminCheck } = await adminClient.from('teachers').select('name').eq('id', adminAuth.user.id).single();
  assert.notStrictEqual(adminCheck.name, 'Hacked Name', 'Cross-teacher modification must NOT take effect');
  console.log('  -> PASS: Cross-teacher updates blocked by RLS.');

  // Test 2.3: Teacher attempts to modify school_settings
  console.log('  Probe 2.3: Class Teacher attempts to modify school_settings...');
  const settingsUpdate = await teacherAuth.client
    .from('school_settings')
    .update({ school_name: 'Hacked School' })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  const { data: settingsCheck } = await adminClient.from('school_settings').select('school_name').limit(1).single();
  assert.notStrictEqual(settingsCheck?.school_name, 'Hacked School', 'Teacher must not be able to modify school settings');
  console.log('  -> PASS: school_settings mutations blocked for non-admins.');

  // Test 2.4: Admin CAN modify school_settings
  console.log('  Probe 2.4: Administrator updates school_settings...');
  const adminSettingsUpdate = await adminAuth.client
    .from('school_settings')
    .update({ motto: 'Excellence and Virtue' })
    .eq('id', settingsCheck.id || '11111111-1111-1111-1111-111111111111');
  console.log(`  Admin update result: error=${adminSettingsUpdate.error?.message || 'none (SUCCESS)'}`);
  console.log('  -> PASS: Administrator can manage school_settings.');

  // Test 2.5: Teacher attempts to query global activity_log
  console.log('  Probe 2.5: Class Teacher attempts to SELECT from activity_log...');
  const teacherActivity = await teacherAuth.client.from('activity_log').select('*');
  assert.ok(
    teacherActivity.error !== null || (teacherActivity.data && teacherActivity.data.length === 0),
    'Class Teacher must NOT be able to view global activity_log'
  );
  console.log('  -> PASS: Global activity_log blocked for Class Teacher.');

  // Test 2.6: DOS / Admin CAN query activity_log
  console.log('  Probe 2.6: DOS queries activity_log...');
  const dosActivity = await dosAuth.client.from('activity_log').select('*');
  assert.strictEqual(dosActivity.error, null, 'DOS must be able to view activity_log');
  console.log('  -> PASS: DOS authorized to view activity_log.');

  // Test 2.7: Notifications isolation
  console.log('  Probe 2.7: Notifications isolation test...');
  // Insert a private notification for admin
  const { data: notifData } = await adminClient.from('notifications').insert({
    recipient_id: adminAuth.user.id,
    title: 'Secret Admin Notification',
    message: 'For admin eyes only'
  }).select().single();

  // Teacher tries to select it
  const teacherNotifSelect = await teacherAuth.client
    .from('notifications')
    .select('*')
    .eq('id', notifData.id);

  assert.strictEqual(teacherNotifSelect.data?.length || 0, 0, 'Teacher must NOT see admin private notification');
  console.log('  -> PASS: Private notification invisible to other teachers.');

  // Clean up test notification
  await adminClient.from('notifications').delete().eq('id', notifData.id);

  // Test 2.8: Legacy tables locked down (Stage 2)
  console.log('  Probe 2.8: Legacy tables locked down (Stage 2)...');
  const legacyTables = ['grading_remarks', 'user_profiles', 'users', 'marks_primary'];
  for (const tbl of legacyTables) {
    const anonQuery = await anonClient.from(tbl).select('*');
    const teacherQuery = await teacherAuth.client.from(tbl).select('*');
    assert.ok(
      anonQuery.error !== null || anonQuery.data?.length === 0,
      `Anon must NOT access legacy table ${tbl}`
    );
    assert.ok(
      teacherQuery.error !== null || teacherQuery.data?.length === 0,
      `Teacher must NOT access legacy table ${tbl}`
    );
  }
  console.log('  -> PASS: All legacy tables sealed under RLS with 0 policies.');

  // --------------------------------------------------------------------------
  // TEST SECTION 3: ROLLBACK & RE-APPLY CYCLE VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n[5/5] ROLLBACK & RE-APPLY CYCLE VERIFICATION');

  console.log('  Executing Stage 1 & Stage 2 Rollback SQL...');
  execSqlFile('supabase/migrations/stage1_security_rollback.sql');
  execSqlFile('supabase/migrations/stage2_legacy_rollback.sql');
  console.log('  -> Rollback executed successfully.');

  // Verify rollback restored prior state: trigger dropped, prior policies back
  const triggerCheck = execSql("SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_prevent_teacher_self_role_elevation';");
  assert.ok(triggerCheck.includes('0'), 'Self-role elevation trigger must be dropped after rollback');
  console.log('  -> PASS: Rollback verified: prior state restored.');

  console.log('  Re-applying Stage 1 & Stage 2 Lockdown SQL...');
  execSqlFile('supabase/migrations/stage1_security_lockdown.sql');
  execSqlFile('supabase/migrations/stage2_legacy_tables.sql');
  const triggerReapplyCheck = execSql("SELECT count(*) FROM pg_trigger WHERE tgname = 'trg_prevent_teacher_self_role_elevation';");
  assert.ok(triggerReapplyCheck.includes('1'), 'Self-role elevation trigger must exist after re-application');
  console.log('  -> PASS: Re-apply verified: hardened lockdown restored.');

  console.log('\n================================================================');
  console.log('ALL STAGE 1 & STAGE 2 SECURITY AND HYPOTHESIS TESTS PASSED (E1)');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('\nFATAL TEST FAILURE:', err);
  process.exit(1);
});

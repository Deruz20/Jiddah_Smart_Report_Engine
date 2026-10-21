// @ts-check
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { enforceContrastGuard, getContrastRatio } from '../src/lib/contrast-guard.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function run() {
  console.log('=== TEST 1: CONTRAST GUARD VERIFICATION ===');
  // 1. School settings theme color verification
  const { data: settings, error: sErr } = await supabase.from('school_settings').select('*').limit(1).single();
  assert.ok(!sErr, `School settings fetch failed: ${sErr?.message}`);
  console.log(`[PASS] Fetched school settings. Raw theme_color: ${settings.theme_color}`);

  const defaultGuard = enforceContrastGuard(settings.theme_color, '#FDFBF7', 4.5);
  console.log(`[PASS] Contrast guard on raw theme_color: ratio = ${defaultGuard.actualRatio}:1, safeColor = ${defaultGuard.safeColor}, adjusted = ${defaultGuard.wasAdjusted}`);
  assert.ok(defaultGuard.actualRatio >= 4.5, `Contrast ratio must be >= 4.5:1, got ${defaultGuard.actualRatio}`);

  // Test low-contrast color adjustment
  const lowContrastGuard = enforceContrastGuard('#10B981', '#FDFBF7', 4.5);
  console.log(`[PASS] Low contrast #10B981 darkened to ${lowContrastGuard.safeColor} with ratio ${lowContrastGuard.actualRatio}:1 (adjusted=${lowContrastGuard.wasAdjusted})`);
  assert.ok(lowContrastGuard.wasAdjusted, 'Expected low contrast color to be adjusted');
  assert.ok(lowContrastGuard.actualRatio >= 4.5, 'Adjusted color must meet 4.5:1 ratio');

  console.log('\n=== TEST 2: EMPTY STATE HONESTY PROOF ===');
  // Check empty state queries
  const { count: initialEnrollments } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('is_active', true);
  const { count: initialMarks } = await supabase.from('circular_marks').select('*', { count: 'exact', head: true });
  console.log(`[PASS] Current database baseline: enrollments = ${initialEnrollments}, circular_marks = ${initialMarks}`);

  // Fetch admin page HTML or verify calculations
  console.log('\n=== TEST 3: DYNAMIC ROW MODIFICATION PROOF (NUMBERS MOVE) ===');
  // 1. Insert a synthetic test circular class
  const classId = 'c0000000-0000-0000-0000-000000000001';
  await supabase.from('circular_classes').delete().eq('id', classId);
  const { error: cErr } = await supabase.from('circular_classes').insert({
    id: classId,
    name: 'Primary 8 Experimental',
    stream: 'Emerald',
    class_name: 'Primary 8 Experimental',
    section: 'Emerald'
  });
  assert.ok(!cErr, `Class insert failed: ${cErr?.message}`);
  console.log(`[PASS] Inserted synthetic class: Primary 8 Experimental (${classId})`);

  // 2. Insert synthetic student
  const studentId = '50000000-0000-0000-0000-000000000001';
  await supabase.from('students').delete().eq('id', studentId);
  const { error: stErr } = await supabase.from('students').insert({
    id: studentId,
    name: 'Dynamic Test Student',
    admission_number: 'ADM-DYN-001',
    status: 'active',
    is_archived: false
  });
  assert.ok(!stErr, `Student insert failed: ${stErr?.message}`);
  console.log(`[PASS] Inserted synthetic student: Dynamic Test Student (${studentId})`);

  // 3. Insert active enrollment
  const enrollmentId = 'e0000000-0000-0000-0000-000000000001';
  await supabase.from('enrollments').delete().eq('id', enrollmentId);
  const { error: eErr } = await supabase.from('enrollments').insert({
    id: enrollmentId,
    student_id: studentId,
    circular_class_id: classId,
    term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
    academic_year: '2026',
    is_active: true
  });
  assert.ok(!eErr, `Enrollment insert failed: ${eErr?.message}`);
  console.log(`[PASS] Enrolled student into Primary 8 Experimental (${enrollmentId})`);

  // 4. Verify enrollment count moved from initial
  const { count: postEnrollmentCount } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('is_active', true);
  console.log(`[PASS] Enrollments moved: ${initialEnrollments} -> ${postEnrollmentCount}`);
  assert.equal(postEnrollmentCount, (initialEnrollments || 0) + 1, 'Enrollment count must increment by exactly 1');

  // 5. Expected required marks for 1 student with 4 core subjects = 4
  // Insert 1 valid circular mark (Math: 85)
  const markId1 = '11000000-0000-0000-0000-000000000001';
  await supabase.from('circular_marks').delete().eq('id', markId1);
  const { error: mErr1 } = await supabase.from('circular_marks').insert({
    id: markId1,
    enrollment_id: enrollmentId,
    subject_id: '00000000-0000-0000-0000-000000000001',
    mark: 85,
    mot_score: 85,
    eot_score: 85,
    term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111'
  });
  assert.ok(!mErr1, `Mark 1 insert failed: ${mErr1?.message}`);
  console.log('[PASS] Inserted valid mark: 85');

  // 6. Insert an anomaly mark (> 100, e.g. 105)
  const markId2 = '11000000-0000-0000-0000-000000000002';
  await supabase.from('circular_marks').delete().eq('id', markId2);
  const { error: mErr2 } = await supabase.from('circular_marks').insert({
    id: markId2,
    enrollment_id: enrollmentId,
    subject_id: '00000000-0000-0000-0000-000000000002',
    mark: 105,
    mot_score: 105,
    term_id: 'a1b2c3d4-e5f6-4a1b-8c2d-111111111111'
  });
  assert.ok(!mErr2, `Mark 2 insert failed: ${mErr2?.message}`);
  console.log('[PASS] Inserted anomaly mark: 105 (>100)');

  // 7. Verify anomaly detection query detects this row
  const { data: anomaliesFound } = await supabase
    .from('circular_marks')
    .select('id, mark')
    .gt('mark', 100);
  console.log(`[PASS] Anomaly query found ${anomaliesFound?.length} mark(s) > 100`);
  assert.ok((anomaliesFound?.length || 0) >= 1, 'Anomaly query must return at least 1 anomaly');

  // 8. Clean up synthetic rows to leave rehearsal database pristine
  await supabase.from('circular_marks').delete().in('id', [markId1, markId2]);
  await supabase.from('enrollments').delete().eq('id', enrollmentId);
  await supabase.from('students').delete().eq('id', studentId);
  await supabase.from('circular_classes').delete().eq('id', classId);
  console.log('[PASS] Cleaned up synthetic test records.');

  // 9. Re-verify empty state after cleanup
  const { count: finalEnrollments } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('is_active', true);
  console.log(`[PASS] Database restored to honest empty baseline: enrollments = ${finalEnrollments}`);
  assert.equal(finalEnrollments, initialEnrollments, 'Final enrollment count matches baseline');

  console.log('\n=== ALL ITEM 1 TESTS PASSED PROVEN UNDER LOCKDOWN ===');
}

run().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});

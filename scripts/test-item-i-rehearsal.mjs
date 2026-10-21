import { execSync } from 'child_process';

const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

function runPsql(sql) {
  return execSync(`psql "${DB_URL}" -X -v ON_ERROR_STOP=1`, {
    input: sql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

console.log('=== TESTING ITEM i SCRIPT ON REHEARSAL DATABASE ===\n');

// 1. Test Wrong Count (e.g. 5 IDs) -> Must ABORT
console.log('--- TEST 1: Wrong Count (5 IDs) -> MUST ABORT ---');
const wrongCountSql = `
DO $$
DECLARE
  v_target_ids uuid[] := ARRAY[
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    '55555555-5555-4555-8555-555555555555'
  ]::uuid[];
  v_count integer;
BEGIN
  v_count := coalesce(array_length(v_target_ids, 1), 0);
  IF v_count <> 16 THEN
    RAISE EXCEPTION 'SAFETY ABORT: Expected exactly 16 target IDs in explicit list, found %. Transaction rolled back.', v_count;
  END IF;
END $$;
`;

try {
  runPsql(wrongCountSql);
  console.error('FAIL: Script did not abort on wrong count!');
} catch (err) {
  console.log('PASS: Correctly aborted on wrong count:');
  const msg = err.stderr ? err.stderr.toString().trim() : err.message;
  console.log(msg);
}

// 2. Setup 16 synthetic test rows on rehearsal
console.log('\n--- SETUP: Provisioning 16 synthetic rows for Test 2 ---');
const setup16Sql = `
DO $$
DECLARE
  i int;
  uid uuid;
BEGIN
  FOR i IN 1..16 LOOP
    uid := ('a0000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    INSERT INTO auth.users (id, email) VALUES (uid, 'synth' || i || '@jiddah.local') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.teachers (id, auth_user_id, name, email, role, status, created_at)
    VALUES (uid, uid, 'Synthetic Class Teacher ' || i, 'synth' || i || '@jiddah.local', 'Class Teacher', 'active', '2026-09-22 12:00:00+00')
    ON CONFLICT (id) DO UPDATE SET role = 'Class Teacher', status = 'active', created_at = '2026-09-22 12:00:00+00';
  END LOOP;
END $$;
`;
runPsql(setup16Sql);
console.log('16 synthetic rows provisioned in teachers and auth.users.');

// 3. Test Correct 16 IDs -> Must SUCCEED
console.log('\n--- TEST 2: Correct 16 IDs Matching Criteria -> MUST SUCCEED ---');
const test16Ids = Array.from({ length: 16 }, (_, i) => `'a0000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}'`).join(',\n    ');

const executeScriptSql = `
DO $$
DECLARE
  v_target_ids uuid[] := ARRAY[
    ${test16Ids}
  ]::uuid[];
  v_count integer;
  v_matched_count integer;
  v_updated_teachers integer;
  v_banned_users integer;
BEGIN
  v_count := coalesce(array_length(v_target_ids, 1), 0);

  IF v_count <> 16 THEN
    RAISE EXCEPTION 'SAFETY ABORT: Expected exactly 16 target IDs in explicit list, found %. Transaction rolled back.', v_count;
  END IF;

  SELECT count(*)::int INTO v_matched_count
  FROM public.teachers
  WHERE id = ANY(v_target_ids)
    AND role = 'Class Teacher'
    AND created_at >= '2026-09-22 00:00:00+00'
    AND created_at <  '2026-09-24 00:00:00+00';

  IF v_matched_count <> 16 THEN
    RAISE EXCEPTION 'SAFETY ABORT: Criteria mismatch. Found % matching teachers among the 16 target IDs. Transaction rolled back.', v_matched_count;
  END IF;

  UPDATE public.teachers
  SET status = 'inactive'
  WHERE id = ANY(v_target_ids);
  GET DIAGNOSTICS v_updated_teachers = ROW_COUNT;

  UPDATE auth.users
  SET banned_until = '2099-01-01 00:00:00+00'
  WHERE id IN (
    SELECT auth_user_id FROM public.teachers WHERE id = ANY(v_target_ids) AND auth_user_id IS NOT NULL
  ) OR id = ANY(v_target_ids);
  GET DIAGNOSTICS v_banned_users = ROW_COUNT;

  INSERT INTO public.activity_logs (action, metadata, created_at)
  VALUES (
    'deactivate_synthetic_jiddah_local_accounts',
    jsonb_build_object(
      'target_count', v_count,
      'updated_teachers', v_updated_teachers,
      'banned_users', v_banned_users,
      'target_ids', v_target_ids,
      'timestamp', now()
    ),
    now()
  );

  RAISE NOTICE 'SUCCESS: Deactivated % synthetic teacher accounts and banned % auth users.', v_updated_teachers, v_banned_users;
END $$;
`;

const res2 = execSync(`psql "${DB_URL}" -X -v ON_ERROR_STOP=1`, {
  input: executeScriptSql,
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'inherit']
});
console.log(res2);

// Cleanup synthetic rows
console.log('--- CLEANUP: Removing 16 synthetic test rows ---');
runPsql(`
DELETE FROM public.activity_logs WHERE action = 'deactivate_synthetic_jiddah_local_accounts';
DELETE FROM public.teachers WHERE email LIKE '%@jiddah.local' AND name LIKE 'Synthetic Class Teacher%';
DELETE FROM auth.users WHERE email LIKE '%@jiddah.local' AND email LIKE 'synth%';
`);
console.log('Cleanup complete.');

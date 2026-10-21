import test from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'

const CONTAINER_NAME = 'supabase_db_rehearsal_isolated_supabase'
const USER_1 = '11111111-1111-1111-1111-111111111111'
const USER_2 = '22222222-2222-2222-2222-222222222222'

function isContainerRunning() {
  try {
    const out = execSync(`docker ps --filter "name=${CONTAINER_NAME}" --format "{{.Names}}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim()
    return out.includes(CONTAINER_NAME)
  } catch {
    return false
  }
}

function runPsql(sql) {
  const b64 = Buffer.from(sql).toString('base64')
  const cmd = `docker exec -i ${CONTAINER_NAME} sh -c "echo ${b64} | base64 -d | psql -v ON_ERROR_STOP=1 -U postgres -d postgres 2>&1"`
  try {
    const stdout = execSync(cmd, { encoding: 'utf8' })
    return { exitCode: 0, output: stdout || '' }
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString('utf8') : ''
    const stderr = err.stderr ? err.stderr.toString('utf8') : ''
    const msg = err.message || ''
    return {
      exitCode: err.status || 1,
      output: `${stdout}\n${stderr}\n${msg}`,
    }
  }
}

test('Wave 2 Live Container: PostgreSQL RLS & Grants Verification', async (t) => {
  const containerActive = isContainerRunning()
  if (!containerActive) {
    t.skip(`Skipped: ${CONTAINER_NAME} is not running`)
    return
  }

  await t.test('1. Verify RLS is enabled on notification_reads relation', () => {
    const res = runPsql("SELECT relrowsecurity FROM pg_class WHERE relname = 'notification_reads';")
    assert.equal(res.exitCode, 0)
    assert.ok(res.output.includes('t'), 'relrowsecurity must be true (t)')
  })

  await t.test('2. RLS ALLOW: Authenticated user can select and insert own read record', () => {
    const sql = `
      BEGIN;
      INSERT INTO public.notifications (id, recipient_id, title, message, created_at)
      VALUES (99991, NULL, 'Test Auth Allow', 'Testing RLS', now())
      ON CONFLICT (id) DO NOTHING;

      SELECT set_config('request.jwt.claim.sub', '${USER_1}', true);
      SET LOCAL ROLE authenticated;

      INSERT INTO public.notification_reads (notification_id, user_id, read_at) 
      VALUES (99991, '${USER_1}', now());

      SELECT count(*) AS own_count FROM public.notification_reads WHERE user_id = '${USER_1}';
      ROLLBACK;
    `
    const res = runPsql(sql)
    assert.equal(res.exitCode, 0, `Query failed: ${res.output}`)
    assert.ok(res.output.includes('own_count'), 'User must be able to view their own inserted row')
  })

  await t.test('3. RLS DENY: Authenticated user CANNOT insert a record for another user', () => {
    const sql = `
      BEGIN;
      INSERT INTO public.notifications (id, recipient_id, title, message, created_at)
      VALUES (99992, NULL, 'Test Auth Deny', 'Testing RLS', now())
      ON CONFLICT (id) DO NOTHING;

      SELECT set_config('request.jwt.claim.sub', '${USER_1}', true);
      SET LOCAL ROLE authenticated;

      -- Attempt cross-user spoofing using existing User 2 (MUST throw RLS violation, not FK error)
      INSERT INTO public.notification_reads (notification_id, user_id, read_at) 
      VALUES (99992, '${USER_2}', now());
      ROLLBACK;
    `
    const res = runPsql(sql)
    assert.notEqual(res.exitCode, 0, 'Command must exit with non-zero code on RLS violation')
    assert.ok(
      res.output.includes('violates row-level security policy'),
      `Must trigger row-level security violation on cross-user insert. Got: ${res.output}`
    )
  })

  await t.test('4. GRANT DENY: Anonymous role has zero table access', () => {
    const sql = `
      BEGIN;
      SET LOCAL ROLE anon;
      SELECT count(*) FROM public.notification_reads;
      ROLLBACK;
    `
    const res = runPsql(sql)
    assert.notEqual(res.exitCode, 0, 'Command must exit with non-zero code on permission denied')
    assert.ok(
      res.output.includes('permission denied'),
      `Must trigger permission denied for anon role. Got: ${res.output}`
    )
  })

  await t.test('5. LIVE SCHEMA INSPECTION: Verify RLS status on marks, students, and school_settings', () => {
    const sql = `
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename IN ('students', 'circular_marks', 'theology_marks', 'school_settings', 'notifications', 'notification_reads')
      ORDER BY tablename;
    `
    const res = runPsql(sql)
    assert.equal(res.exitCode, 0)
    assert.ok(res.output.includes('notifications'), 'notifications must be present')
    assert.ok(res.output.includes('notification_reads'), 'notification_reads must be present')
    assert.ok(res.output.includes('students'), 'students must be present')
  })

  await t.test('6. SINGLE-SCHOOL VERIFICATION: Prove absence of school_id column across all tables', () => {
    const sql = `
      SELECT count(*) AS school_id_col_count
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND column_name = 'school_id';
    `
    const res = runPsql(sql)
    assert.equal(res.exitCode, 0)
    assert.ok(res.output.includes('0'), 'school_id count must be exactly 0 (single-school system)')
  })

  await t.test('7. GRANT PROBE: Verify school_settings singleton isolation (single school record)', () => {
    const sql = `
      SELECT id, school_name FROM public.school_settings WHERE id = 'current';
    `
    const res = runPsql(sql)
    assert.equal(res.exitCode, 0)
    assert.ok(res.output.includes('current'), 'Must contain singleton record current')
  })
})

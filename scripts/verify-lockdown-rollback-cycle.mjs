// @ts-check
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const anonClient = createClient(SUPABASE_URL, ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

function execSqlFile(filePath) {
  const cmd = `Get-Content "${filePath}" -Raw | docker exec -i supabase_db_rehearsal_isolated_supabase psql -U postgres -d postgres`;
  return execSync(cmd, { shell: 'powershell.exe', encoding: 'utf-8' });
}

async function run() {
  console.log('=== STEP 1: BREAK-TEST UNDER CURRENT LOCKDOWN ===');
  // Anon user attempts to select from students table
  const { data: anonStudents, error: anonErr } = await anonClient.from('students').select('*');
  console.log(`[LOCKDOWN ACTIVE] Anon SELECT students result: data=${JSON.stringify(anonStudents)}, error=${anonErr?.message || 'none'}`);
  // Under lockdown, either an error occurs or empty array is returned due to RLS
  assert.ok(anonErr !== null || (anonStudents && anonStudents.length === 0), 'Anon must NOT be allowed to access student rows under lockdown');
  console.log('[PASS] Break-test confirmed: Anon access to private tables is blocked under lockdown.');

  console.log('\n=== STEP 2: EXECUTE ROLLBACK MIGRATION ===');
  console.log('Applying production_rollback.sql...');
  const rollbackOutput = execSqlFile('supabase/migrations/production_rollback.sql');
  console.log('[PASS] Rollback SQL executed successfully.');

  // Verify RLS status in pg_class for students
  const checkRlsCmd = `docker exec -i supabase_db_rehearsal_isolated_supabase psql -U postgres -d postgres -t -c "SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('students', 'terms');"`;
  const rlsStatusAfterRollback = execSync(checkRlsCmd, { shell: 'powershell.exe', encoding: 'utf-8' });
  console.log('RLS status after rollback:\n' + rlsStatusAfterRollback.trim());
  assert.ok(!rlsStatusAfterRollback.includes('| t'), 'Expected relrowsecurity to be false after rollback');
  console.log('[PASS] Rollback verification: RLS is disabled across public tables.');

  console.log('\n=== STEP 3: RE-APPLY LOCKDOWN MIGRATION ===');
  console.log('Re-applying production_lockdown.sql...');
  const reapplyOutput = execSqlFile('supabase/migrations/production_lockdown.sql');
  console.log('[PASS] Lockdown SQL re-applied successfully.');

  const rlsStatusAfterReapply = execSync(checkRlsCmd, { shell: 'powershell.exe', encoding: 'utf-8' });
  console.log('RLS status after re-apply:\n' + rlsStatusAfterReapply.trim());
  assert.ok(rlsStatusAfterReapply.includes('| t'), 'Expected relrowsecurity to be true after re-applying lockdown');

  console.log('\n=== STEP 4: VERIFY RE-LOCKED INTEGRITY ===');
  const { data: relockStudents, error: relockErr } = await anonClient.from('students').select('*');
  console.log(`[LOCKDOWN RESTORED] Anon SELECT students result: data=${JSON.stringify(relockStudents)}, error=${relockErr?.message || 'none'}`);
  assert.ok(relockErr !== null || (relockStudents && relockStudents.length === 0), 'Anon access must be blocked after re-applying lockdown');
  console.log('[PASS] Re-locked integrity verified.');

  console.log('\n=== COMPLETE ROLLBACK CYCLE VERIFIED (APPLY -> BREAK-TEST -> ROLL BACK -> RE-APPLY) ===');
}

run().catch((err) => {
  console.error('FATAL ROLLBACK TEST ERROR:', err);
  process.exit(1);
});

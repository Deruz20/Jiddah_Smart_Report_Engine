import { execSync } from 'child_process';
import fs from 'fs';

const CONTAINER = 'supabase_db_rehearsal_isolated_supabase';

function getPolicies() {
  const sql = `
SELECT 
  policyname, 
  permissive, 
  roles::text, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'theology_marks' 
ORDER BY policyname;
`;
  return execSync(`docker exec -i ${CONTAINER} psql -U postgres -d postgres -c "${sql.replace(/\n/g, ' ')}"`, { encoding: 'utf8' }).trim();
}

console.log('--- STEP 0: ENSURING CLEAN BASELINE STATE (1) BY EXECUTING ROLLBACK ---');
const rollbackSql = fs.readFileSync('supabase/migrations/20261018_class_teacher_theology_marks_policy_rollback.sql', 'utf8');
execSync(`docker exec -i ${CONTAINER} psql -U postgres -d postgres`, { input: rollbackSql });

console.log('\n=== STATE (1): BEFORE FORWARD MIGRATION (BASELINE) ===');
const state1 = getPolicies();
console.log(state1);

console.log('\n--- STEP 1: APPLYING FORWARD MIGRATION ---');
const forwardSql = fs.readFileSync('supabase/migrations/20261018_class_teacher_theology_marks_policy.sql', 'utf8');
execSync(`docker exec -i ${CONTAINER} psql -U postgres -d postgres`, { input: forwardSql });

console.log('\n=== STATE (2): AFTER FORWARD MIGRATION ===');
const state2 = getPolicies();
console.log(state2);

console.log('\n--- STEP 2: APPLYING ROLLBACK MIGRATION ---');
execSync(`docker exec -i ${CONTAINER} psql -U postgres -d postgres`, { input: rollbackSql });

console.log('\n=== STATE (3): AFTER ROLLBACK MIGRATION ===');
const state3 = getPolicies();
console.log(state3);

console.log('\n=== STEP 3: DIFFING STATE (1) vs STATE (3) ===');
if (state1 === state3) {
  console.log('[PASS] Exact Match: State (1) and State (3) are 100% identical. The diff of (1) vs (3) is EMPTY.');
} else {
  console.error('[FAIL] Divergence detected between State (1) and State (3)!');
  console.error('State 1 length:', state1.length, 'State 3 length:', state3.length);
  process.exit(1);
}

console.log('\n--- RESTORING FORWARD POLICY FOR RUNTIME ---');
execSync(`docker exec -i ${CONTAINER} psql -U postgres -d postgres`, { input: forwardSql });
console.log('Forward policy active.');

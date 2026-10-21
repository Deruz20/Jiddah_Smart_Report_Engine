import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { seedRehearsalDatabase } from './seed-rehearsal-synthetic-users.mjs';

const args = new Set(process.argv.slice(2));
const productionShape = args.has('--production-shape');
const lockdown = args.has('--lockdown');
if (productionShape && lockdown) {
  console.error('Choose only one rebuild mode: --production-shape or --lockdown.');
  process.exit(1);
}
if (productionShape && args.has('--baseline-only')) {
  console.error('--baseline-only cannot be combined with --production-shape; production shape includes the theology_marks baseline policy.');
  process.exit(1);
}
const rebuildMode = productionShape ? 'production-shape' : 'lockdown';
const generatedProductionShapePath = path.resolve('scratch/evidence/generated-production-shape.sql');
const productionPolicyManifestPath = path.resolve('scratch/evidence/production-policy-manifest.json');

console.log(`=== REBUILDING REHEARSAL DATABASE (${rebuildMode}) ===`);

const CONTAINER = 'supabase_db_rehearsal_isolated_supabase';
const DB_NAME = 'postgres';

// === SAFETY GUARD: STRICT LOCAL REHEARSAL ISOLATION ONLY ===
const targetUrl = process.env.TEST_OVERRIDE_URL_FOR_GUARD || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const parsedUrl = new URL(targetUrl);
const hostname = parsedUrl.hostname.toLowerCase();

if (CONTAINER !== 'supabase_db_rehearsal_isolated_supabase') {
  console.error(`[FATAL SAFETY GUARD] Refusing to rebuild database! Target container "${CONTAINER}" is not the isolated rehearsal container.`);
  process.exit(1);
}

if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
  console.error(`[FATAL SAFETY GUARD] Refusing to rebuild database! Target URL "${targetUrl}" is non-local or points to remote/production host.`);
  process.exit(1);
}

if (targetUrl.includes('supabase.co')) {
  console.error(`[FATAL SAFETY GUARD] Refusing to rebuild database! Target URL contains "supabase.co" (production detected).`);
  process.exit(1);
}
console.log(`[Safety Guard PASS] Verified target is local isolated rehearsal (${targetUrl}, container: ${CONTAINER}).`);

if (productionShape) {
  console.log('\n[Production shape] Validating owner-run v3.3.0 probe and generating local rehearsal SQL...');
  execFileSync(process.execPath, [path.resolve('scripts/gen-prod-policies.mjs')], { stdio: 'inherit' });
}

// 1. Reset public schema and clean auth.users
console.log('\n[1/4] Resetting public schema and auth users in rehearsal container...');
const resetSql = `
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND datname = 'postgres';
  DROP SCHEMA IF EXISTS public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
  DELETE FROM auth.users;
`;
execSync(`docker exec -i ${CONTAINER} psql -U postgres -d ${DB_NAME}`, {
  input: resetSql,
  stdio: ['pipe', 'pipe', 'pipe']
});
console.log('  -> Public schema and auth users reset.');

// 2. Apply rehearsal-only core schema bootstrap from supabase/rehearsal
console.log('\n[2/4] Applying rehearsal-only schema bootstrap (supabase/rehearsal/)...');
const rehearsalDir = path.resolve('supabase/rehearsal');
if (fs.existsSync(rehearsalDir)) {
  const rehearsalBootstrapFiles = fs.readdirSync(rehearsalDir)
    .filter(f => f.endsWith('.sql'))
    .filter(f => !productionShape || f !== 'align_to_production_shape.sql')
    .sort();
  for (const file of rehearsalBootstrapFiles) {
    const fullPath = path.join(rehearsalDir, file);
    const sql = fs.readFileSync(fullPath, 'utf8');
    try {
      execSync(`docker exec -i ${CONTAINER} psql -U postgres -d ${DB_NAME}`, {
        input: sql,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      console.log(`  ✔ Applied rehearsal bootstrap: ${file}`);
    } catch (err) {
      console.error(`  ✖ Failed on bootstrap ${file}:`, err.message);
      if (err.stderr) console.error(err.stderr.toString());
      process.exit(1);
    }
  }
}

// 3. Apply all canonical migrations in strict order
const isBaselineOnly = process.argv.includes('--baseline-only');
const migrationsDir = path.resolve('supabase/migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .filter(f => !f.includes('rollback'))
  .filter(f => !f.includes('production_lockdown'))
  .filter(f => !f.includes('stage2_legacy_tables'))
  .filter(f => !f.includes('local_only'))
  .filter(f => !productionShape || f !== 'stage1_security_lockdown.sql')
  .filter(f => !isBaselineOnly || !f.includes('20261018_class_teacher_theology_marks_policy'))
  .sort();

console.log(`\n[3/4] Applying ${migrationFiles.length} canonical migrations in order...`);
for (const file of migrationFiles) {
  const fullPath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(fullPath, 'utf8');
  try {
    execSync(`docker exec -i ${CONTAINER} psql -U postgres -d ${DB_NAME}`, {
      input: sql,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log(`  ✔ Applied ${file}`);
  } catch (err) {
    console.error(`  ✖ Failed on ${file}:`, err.message);
    if (err.stderr) console.error(err.stderr.toString());
    process.exit(1);
  }
}

if (productionShape) {
  console.log('\n[3.5/4] Aligning local rehearsal to owner-provided production table inventory...');
  const alignSql = fs.readFileSync(path.resolve('supabase/rehearsal/align_to_production_shape.sql'), 'utf8');
  execSync(`docker exec -i ${CONTAINER} psql -U postgres -d ${DB_NAME}`, {
    input: alignSql,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  console.log('\n[3.6/4] Applying generated production policies, grants, RLS flags, and teacher checks to rehearsal...');
  const generatedShapeSql = fs.readFileSync(generatedProductionShapePath, 'utf8');
  execSync(`docker exec -i ${CONTAINER} psql -v ON_ERROR_STOP=1 -U postgres -d ${DB_NAME}`, {
    input: generatedShapeSql,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const expectedPolicies = JSON.parse(fs.readFileSync(productionPolicyManifestPath, 'utf8'));
  const policyExportSql = `
    SELECT COALESCE(json_agg(json_build_object(
      'tablename', tablename,
      'policyname', policyname,
      'permissive', permissive,
      'roles', roles,
      'cmd', cmd,
      'qual', qual,
      'with_check', with_check
    ) ORDER BY tablename, policyname), '[]'::json)::text
    FROM pg_policies
    WHERE schemaname = 'public';
  `;
  const rehearsalPolicyJson = execSync(`docker exec -i ${CONTAINER} psql -U postgres -d ${DB_NAME} -X -qAt -P pager=off`, {
    input: policyExportSql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const actualPolicies = JSON.parse(rehearsalPolicyJson.trim());
  const normalizeExpression = (expression) => typeof expression === 'string'
    ? expression
      .replace(/\(\((ARRAY\[.*?\])\)::text\[\]\)/gs, '($1)')
      .replace(/\(('(?:[^']|'')*'::character varying)\)::text/g, '$1')
    : expression;
  const normalizePolicy = (policy) => ({
    tablename: policy.tablename,
    policyname: policy.policyname,
    permissive: policy.permissive,
    roles: [...(policy.roles ?? [])].sort(),
    cmd: policy.cmd,
    qual: normalizeExpression(policy.qual),
    with_check: normalizeExpression(policy.with_check),
  });
  const expectedByName = new Map(expectedPolicies.map((policy) => [policy.policyname, normalizePolicy(policy)]));
  const actualByName = new Map(actualPolicies.map((policy) => [policy.policyname, normalizePolicy(policy)]));
  const policyDiff = [];
  for (const [name, expected] of expectedByName) {
    const actual = actualByName.get(name);
    if (!actual) {
      policyDiff.push({ policyname: name, difference: 'missing in rehearsal' });
    } else if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      policyDiff.push({ policyname: name, production: expected, rehearsal: actual });
    }
  }
  for (const name of actualByName.keys()) {
    if (!expectedByName.has(name)) policyDiff.push({ policyname: name, difference: 'extra in rehearsal' });
  }

  console.log(`\nProduction policy definitions: ${expectedPolicies.length}`);
  console.log(`Rehearsal policy definitions: ${actualPolicies.length}`);
  if (policyDiff.length === 0) {
    console.log('Policy-definition diff (name, cmd, roles, qual, with_check): empty');
  } else {
    console.log('Policy-definition diff (name, cmd, roles, qual, with_check; normalized PostgreSQL array-cast deparse):');
    for (const difference of policyDiff) console.log(JSON.stringify(difference));
    throw new Error('Production and rehearsal policy definitions differ.');
  }
} else {
  // Preserve the existing lockdown-mode permissions for the local notification_reads fixture.
  console.log('\n[3.5/4] Enforcing notification_reads least-privilege permissions (REVOKE anon)...');
  const notifReadsPermSql = `
    REVOKE ALL ON TABLE public.notification_reads FROM anon;
    REVOKE ALL ON TABLE public.notification_reads FROM authenticated;
    GRANT SELECT, INSERT, UPDATE ON TABLE public.notification_reads TO authenticated;
  `;
  execSync(`docker exec -i ${CONTAINER} psql -U postgres -d ${DB_NAME}`, {
    input: notifReadsPermSql,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.log('  ✔ Enforced least-privilege permissions on notification_reads');
}

// 4. Run deterministic seed
console.log('\n[4/4] Running deterministic fixture seeding...');
await seedRehearsalDatabase();

console.log('\n=== REHEARSAL DATABASE FULL REBUILD COMPLETE & VERIFIED! ===');

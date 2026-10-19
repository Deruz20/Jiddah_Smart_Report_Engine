import { execSync } from 'child_process';
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
  console.log('\n[3.5/4] Aligning local rehearsal to owner-provided production table and policy-count facts...');
  const alignSql = fs.readFileSync(path.resolve('supabase/rehearsal/align_to_production_shape.sql'), 'utf8');
  execSync(`docker exec -i ${CONTAINER} psql -U postgres -d ${DB_NAME}`, {
    input: alignSql,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const expectedPolicyCounts = [
    "('academic_terms', 4), ('activity_log', 2), ('activity_logs', 2),",
    "('circular_classes', 1), ('circular_marks', 1), ('circular_results', 1),",
    "('circular_subjects', 1), ('classes', 2), ('enrollments', 1),",
    "('grading_criteria', 2), ('grading_remarks', 8), ('marks', 5),",
    "('marks_audit_log', 0), ('marks_primary', 0), ('notifications', 2),",
    "('nursery_assessments', 0), ('profiles', 3), ('report_templates', 0),",
    "('school_settings', 3), ('signatures', 1), ('students', 3),",
    "('subjects', 2), ('teacher_class_assignments', 0), ('teacher_initials', 2),",
    "('teacher_invites', 0), ('teachers', 7), ('terms', 1),",
    "('theology_classes', 1), ('theology_marks', 1), ('theology_results', 1),",
    "('theology_subjects', 1), ('user_profiles', 3), ('users', 0)"
  ].join('\n');
  const policyReportSql = `
    WITH expected(table_name, production_count) AS (
      VALUES ${expectedPolicyCounts}
    ),
    actual AS (
      SELECT tablename AS table_name, count(*)::integer AS rehearsal_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
    )
    SELECT
      e.table_name,
      e.production_count,
      COALESCE(a.rehearsal_count, 0) AS rehearsal_count,
      COALESCE(a.rehearsal_count, 0) - e.production_count AS difference,
      CASE
        WHEN COALESCE(a.rehearsal_count, 0) = e.production_count THEN 'MATCH'
        ELSE format(
          'MISMATCH: baseline migrations produced %s policies; production has %s. No non-theology policy was created by alignment.',
          COALESCE(a.rehearsal_count, 0),
          e.production_count
        )
      END AS explanation
    FROM expected e
    LEFT JOIN actual a USING (table_name)
    ORDER BY e.table_name;
  `;
  const policyReport = execSync(`docker exec -i ${CONTAINER} psql -U postgres -d ${DB_NAME} -X -P pager=off`, {
    input: policyReportSql,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
  console.log('\nProduction-vs-rehearsal policy count comparison:');
  console.log(policyReport.trim());
  if (policyReport.includes('MISMATCH')) {
    console.warn('Policy-count mismatches are retained and reported: no substitute policies were created because only the theology_marks policy may be authored in this rehearsal.');
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

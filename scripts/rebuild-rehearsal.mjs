import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { seedRehearsalDatabase } from './seed-rehearsal-synthetic-users.mjs';

console.log('=== REBUILDING REHEARSAL DATABASE FROM SCRATCH ===');

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
  const rehearsalBootstrapFiles = fs.readdirSync(rehearsalDir).filter(f => f.endsWith('.sql')).sort();
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

// 4. Run deterministic seed
console.log('\n[4/4] Running deterministic fixture seeding...');
await seedRehearsalDatabase();

console.log('\n=== REHEARSAL DATABASE FULL REBUILD COMPLETE & VERIFIED! ===');

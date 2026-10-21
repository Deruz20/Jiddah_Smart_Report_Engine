import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('=== TESTING FRESH SCRATCH DB BOOTSTRAP FROM EMPTY ===');

const CONTAINER = 'supabase_db_rehearsal_isolated_supabase';
const DB_NAME = 'test_scratch_bootstrap';

// 1. Drop and create fresh database
console.log(`\n[1/4] Creating fresh empty database: ${DB_NAME}...`);
execSync(`docker exec ${CONTAINER} psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME};"`, { stdio: 'inherit' });
execSync(`docker exec ${CONTAINER} psql -U postgres -d postgres -c "CREATE DATABASE ${DB_NAME};"`, { stdio: 'inherit' });

// 2. List all repo migrations
const migrationsDir = path.resolve('supabase/migrations');
const files = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql') && !f.includes('local_only'))
  .sort();

console.log(`\n[2/4] Applying ${files.length} repo migrations in order...`);

let successCount = 0;
for (const file of files) {
  const fullPath = path.join(migrationsDir, file);
  console.log(`  Applying ${file}...`);
  try {
    // Copy file into container or pipe via docker exec
    const sql = fs.readFileSync(fullPath, 'utf8');
    execSync(`docker exec -i ${CONTAINER} psql -U postgres -d ${DB_NAME}`, {
      input: sql,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    successCount++;
    console.log(`    -> OK`);
  } catch (err) {
    console.error(`    -> FAILED on ${file}:`, err.message);
    if (err.stderr) console.error(err.stderr.toString());
    process.exit(1);
  }
}

console.log(`\n[3/4] Successfully applied all ${successCount} migrations to fresh scratch DB!`);

// 3. Inspect tables in fresh DB
console.log(`\n[4/4] Verifying created tables in ${DB_NAME}...`);
const tablesOutput = execSync(`docker exec ${CONTAINER} psql -U postgres -d ${DB_NAME} -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"`, { encoding: 'utf8' });
const tables = tablesOutput.trim().split('\n').map(t => t.trim()).filter(Boolean);

console.log(`Total public tables in bootstrapped DB: ${tables.length}`);
console.log(`Tables: ${tables.join(', ')}`);

const expectedCore = [
  'academic_terms', 'activity_logs', 'circular_classes', 'circular_marks',
  'circular_subjects', 'enrollments', 'grading_criteria', 'notification_reads',
  'notifications', 'school_settings', 'students', 'subjects', 'teacher_initials',
  'teacher_invites', 'teachers', 'terms', 'theology_classes', 'theology_marks',
  'theology_subjects'
];

const missing = expectedCore.filter(t => !tables.includes(t));
if (missing.length > 0) {
  console.error(`Missing expected core tables: ${missing.join(', ')}`);
  process.exit(1);
} else {
  console.log('ALL EXPECTED CORE TABLES PRESENT IN FRESH DB BOOTSTRAP! ✅');
}

console.log('\n=== FRESH SCRATCH DB BOOTSTRAP PROVEN SUCCESSFUL! ===');

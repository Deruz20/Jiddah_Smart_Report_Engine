import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { enforceLocalSafeEnvironment } from '../src/lib/test-guard.mjs';

const ROOT_DIR = process.cwd();
const ARTIFACTS_DIR = path.resolve(ROOT_DIR, '../jiddah_agent_artifacts');

console.log('=====================================================');
console.log('  JIDDAH SMART REPORT ENGINE — LOCAL VERIFY HARNESS  ');
console.log('=====================================================\n');

// Step 1: Pre-flight fail-closed safety check
console.log('--- [Step 1/5] Safety Pre-flight Verification ---');
try {
  enforceLocalSafeEnvironment();
  console.log('✔ Fail-closed safety guard passed: 100% Localhost verified.\n');
} catch (err) {
  console.error('✘ Safety guard failed:', err.message);
  process.exit(1);
}

const scorecard = {
  timestamp: new Date().toISOString(),
  steps: [],
  summary: { total: 5, passed: 0, failed: 0, skipped: 0 },
};

function runStep(name, cmd, opts = {}) {
  console.log(`--- ${name} ---`);
  const startTime = Date.now();
  try {
    const output = execSync(cmd, {
      cwd: ROOT_DIR,
      stdio: 'pipe',
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-synthetic',
        ...opts.env,
      },
    });
    const durationMs = Date.now() - startTime;
    console.log(`✔ PASSED (${durationMs}ms)`);
    scorecard.steps.push({ name, status: 'PASS', durationMs, error: null });
    scorecard.summary.passed++;
    return output;
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(`✘ FAILED (${durationMs}ms): ${err.message}`);
    if (err.stdout) console.log(err.stdout.slice(0, 500));
    if (err.stderr) console.error(err.stderr.slice(0, 500));
    scorecard.steps.push({ name, status: 'FAIL', durationMs, error: err.message });
    scorecard.summary.failed++;
    if (opts.required) {
      console.error('\nAborting remaining verification steps due to required step failure.');
      saveScorecard();
      process.exit(1);
    }
  }
}

// Step 2: TypeScript typecheck
runStep('[Step 2/5] TypeScript Typecheck', 'npm run typecheck');

// Step 3: Unit & Calculations Test Suite
runStep('[Step 3/5] Unit & Domain Calculations Suite', 'npm test', { required: true });

// Step 4: Automated Code & Route Sweeps
runStep(
  '[Step 4/5] Automated Sweeps (Dummy, Dead Control, Settings, Roles, Routes, Hazards)',
  'node scripts/sweeps/dummy-sweep.mjs && node scripts/sweeps/dead-control-sweep.mjs && node scripts/sweeps/settings-census.mjs && node scripts/sweeps/role-literal-census.mjs && node scripts/sweeps/route-enumeration.mjs && node scripts/sweeps/hazard-census.mjs'
);

// Step 5: Database & Live E2E Checks
console.log('--- [Step 5/5] Live Database Integration Checks ---');
let dockerActive = false;
try {
  const dockerCheck = execSync('docker ps --filter "name=supabase_db_rehearsal_isolated_supabase" --format "{{.Names}}"', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  }).trim();
  dockerActive = dockerCheck.includes('supabase_db_rehearsal_isolated_supabase');
} catch {}

if (dockerActive) {
  runStep(
    '[Step 5/5] Live PostgreSQL Container RLS & Grants Suite',
    'node --test src/__tests__/live-postgres-rls-container.test.mjs'
  );
} else {
  console.log('ℹ Status: SKIPPED — Local Supabase rehearsal container not running.');
  console.log('ℹ Procedural compliance: Source-level RLS & grant audit performed in docs/JIDDAH_SECURITY_CHECKLIST.md\n');
  scorecard.steps.push({
    name: '[Step 5/5] Live Database Integration Checks',
    status: 'SKIPPED (Container Inactive)',
    durationMs: 0,
    error: 'Container inactive on host',
  });
  scorecard.summary.skipped++;
}

function saveScorecard() {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const outPath = path.join(ARTIFACTS_DIR, 'verify_local_summary.json');
  fs.writeFileSync(outPath, JSON.stringify(scorecard, null, 2), 'utf8');
  console.log(`Scorecard saved to: ${outPath}`);
}

saveScorecard();

console.log('\n=====================================================');
console.log(`  VERIFICATION COMPLETE: ${scorecard.summary.passed} Passed, ${scorecard.summary.failed} Failed, ${scorecard.summary.skipped} Blocked/Skipped`);
console.log('=====================================================\n');

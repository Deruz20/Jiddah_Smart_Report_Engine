import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { enforceLocalSafeEnvironment } from '../src/lib/test-guard.mjs';

// Enforce fail-closed check that all targets are strictly local
enforceLocalSafeEnvironment();

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!anonKey || !serviceKey) {
  try {
    const statusOutput = execSync('npx supabase status --workdir scratch/rehearsal_isolated_supabase -o json', { encoding: 'utf8' });
    const parsed = JSON.parse(statusOutput);
    anonKey = anonKey || parsed.PUBLISHABLE_KEY || parsed.ANON_KEY;
    serviceKey = serviceKey || parsed.SECRET_KEY || parsed.SERVICE_ROLE_KEY;
    supabaseUrl = parsed.API_URL || supabaseUrl;
  } catch (err) {
    console.warn('Could not read keys from supabase status:', err.message);
  }
}

console.log('========================================================================');
console.log('  STARTING JIDDAH DEV SERVER (REHEARSAL STACK ISOLATED)');
console.log(`  Supabase Target: ${supabaseUrl}`);
console.log('  Port: 3000');
console.log('  Mode: In-memory child-process environment injection (zero file mutation)');
console.log('========================================================================\n');

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anonKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  DASHBOARD_ORIGIN: 'http://localhost:3000,http://localhost:5173',
  PORT: process.env.PORT || '3000'
};

const proc = spawn('npx', ['next', 'dev', '-p', env.PORT], {
  cwd: path.resolve('.'),
  env,
  stdio: 'inherit',
  shell: true
});

proc.on('exit', (code) => {
  process.exit(code || 0);
});

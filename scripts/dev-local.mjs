import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { enforceLocalSafeEnvironment } from '../src/lib/test-guard.mjs';

// Enforce fail-closed check that all targets are strictly local
enforceLocalSafeEnvironment();

import { getRehearsalCredentials } from './rehearsal-credentials.mjs';

const creds = getRehearsalCredentials();
const supabaseUrl = creds.apiUrl;
const anonKey = creds.anonKey;
const serviceKey = creds.serviceRoleKey;

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

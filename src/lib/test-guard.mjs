/**
 * Fail-closed local safety guard for test runners and automation scripts.
 * Aborts immediately if any database or API endpoint points to a non-local address.
 * NEVER prints credentials, tokens, or URL values.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { registerHooks } from 'node:module';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register TypeScript ESM loader hooks for Node builds compiled without native amaro strip-types
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const targetBase = path.resolve(__dirname, '..', specifier.slice(2));
      for (const candidate of [targetBase, `${targetBase}.ts`, `${targetBase}.tsx`, `${targetBase}.js`]) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true };
        }
      }
    }
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const resolvedBase = path.resolve(parentDir, specifier);
      if (!fs.existsSync(resolvedBase)) {
        for (const ext of ['.ts', '.tsx', '.js', '.mjs']) {
          if (fs.existsSync(resolvedBase + ext)) {
            return { url: pathToFileURL(resolvedBase + ext).href, shortCircuit: true };
          }
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts') || url.endsWith('.tsx')) {
      const filePath = fileURLToPath(url);
      const rawSource = fs.readFileSync(filePath, 'utf8');
      const transpiled = ts.transpileModule(rawSource, {
        fileName: filePath,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      });
      return {
        format: 'module',
        source: transpiled.outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

const ALLOWED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'host.docker.internal',
]);

export function enforceLocalSafeEnvironment() {
  const envKeys = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_API_URL',
  ];

  for (const key of envKeys) {
    const val = process.env[key];
    if (!val) continue;

    try {
      const parsed = new URL(val);
      const hostname = parsed.hostname.toLowerCase();

      if (!ALLOWED_HOSTNAMES.has(hostname)) {
        console.error(
          `[FAIL-CLOSED SAFETY GUARD] Aborting: Environment variable "${key}" references a non-local destination. Only localhost / 127.0.0.1 is permitted.`
        );
        process.exit(1);
      }
    } catch {
      if (/supabase\.co|aws|azure|gcp|\.com|\.io|\.net/i.test(val)) {
        console.error(
          `[FAIL-CLOSED SAFETY GUARD] Aborting: Environment variable "${key}" contains non-local host patterns. Aborting execution.`
        );
        process.exit(1);
      }
    }
  }

  return true;
}

export function getRehearsalCredentials() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const envService = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (envUrl && envAnon && envService) {
    return {
      apiUrl: envUrl,
      anonKey: envAnon,
      serviceRoleKey: envService,
      dbUrl: process.env.SUPABASE_DB_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
    };
  }

  let config = {
    api_url: 'http://127.0.0.1:54321',
    db_url: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    project_id: 'rehearsal_isolated_supabase',
    jwt_secret: 'super-secret-jwt-token-with-at-least-32-characters-long'
  };

  const configPath = path.resolve(__dirname, '../../supabase/rehearsal/rehearsal-config.json');
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      // Use fallback
    }
  }

  function signJwt(payload, secret) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
  }

  const secret = config.jwt_secret || 'super-secret-jwt-token-with-at-least-32-characters-long';
  const anonKey = envAnon || signJwt({ iss: 'supabase-demo', role: 'anon', exp: 1983812996 }, secret);
  const serviceRoleKey = envService || signJwt({ iss: 'supabase-demo', role: 'service_role', exp: 1983812996 }, secret);
  const apiUrl = envUrl || config.api_url || 'http://127.0.0.1:54321';
  const dbUrl = process.env.SUPABASE_DB_URL || config.db_url || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

  return {
    apiUrl,
    anonKey,
    serviceRoleKey,
    dbUrl
  };
}

// Auto-populate local rehearsal environment variables for tests
const creds = getRehearsalCredentials();
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) process.env.NEXT_PUBLIC_SUPABASE_URL = creds.apiUrl;
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = creds.anonKey;
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = creds.serviceRoleKey;
if (!process.env.TEST_BASE_URL) process.env.TEST_BASE_URL = 'http://localhost:3000';

// Auto-run guard on module load
try {
  enforceLocalSafeEnvironment();
} catch (err) {
  console.error('[FAIL-CLOSED SAFETY GUARD] Verification error:', err.message);
  process.exit(1);
}

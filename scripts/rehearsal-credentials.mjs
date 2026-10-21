import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Read committed rehearsal config
  let config = {
    api_url: 'http://127.0.0.1:54321',
    db_url: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    project_id: 'rehearsal_isolated_supabase',
    jwt_secret: 'super-secret-jwt-token-with-at-least-32-characters-long'
  };

  const configPath = path.resolve(__dirname, '../supabase/rehearsal/rehearsal-config.json');
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

if (process.argv[1]?.endsWith('rehearsal-credentials.mjs')) {
  console.log(JSON.stringify(getRehearsalCredentials(), null, 2));
}

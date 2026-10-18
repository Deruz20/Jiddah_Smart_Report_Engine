import fs from 'fs';
import path from 'path';

const envLocalPath = path.resolve('.env.local');

if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.*)/);
  if (urlMatch && urlMatch[1]) {
    const rawUrl = urlMatch[1].trim().replace(/^["']|["']$/g, '');
    try {
      const parsed = new URL(rawUrl);
      const isLocal = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
      const isRemoteSupabase = parsed.hostname.endsWith('supabase.co');

      if (!isLocal || isRemoteSupabase) {
        if (process.env.ALLOW_PROD_DEV?.trim() !== '1') {
          console.error(`
================================================================================
[FATAL PREFLIGHT BLOCKED] NON-LOCAL HOST DETECTED IN .env.local
================================================================================
Your .env.local points to a non-local database host (non-local, production?).
Running \`next dev\` against a non-local environment can risk data contamination.

To start the dev server against this non-local host, you MUST explicitly set:
  ALLOW_PROD_DEV=1 npm run dev
(PowerShell: $env:ALLOW_PROD_DEV="1"; npm run dev)
================================================================================
`);
          process.exit(1);
        } else {
          console.warn(`
[WARNING] ALLOW_PROD_DEV=1 detected. Proceeding with non-local database host.
`);
        }
      }
    } catch {
      // Invalid URL format, let next dev handle it
    }
  }
}
process.exit(0);

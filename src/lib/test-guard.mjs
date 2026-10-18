/**
 * Fail-closed local safety guard for test runners and automation scripts.
 * Aborts immediately if any database or API endpoint points to a non-local address.
 * NEVER prints credentials, tokens, or URL values.
 */

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
      // If it's not a valid URL (e.g. malformed connection string), verify it doesn't contain remote domain markers
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

// Auto-run guard on module load
try {
  enforceLocalSafeEnvironment();
} catch (err) {
  console.error('[FAIL-CLOSED SAFETY GUARD] Verification error:', err.message);
  process.exit(1);
}


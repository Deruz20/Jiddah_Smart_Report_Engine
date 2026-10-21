# JIDDAH SECURITY AUDIT — DETAILED FINDINGS

## JIDDAH-SEC-01: Next.js Edge Middleware Naming Divergence
- **Severity:** Medium (Defense-in-Depth)
- **CWE:** CWE-693 (Protection Mechanism Failure)
- **Root Cause:** Next.js App Router executes edge middleware strictly from `middleware.ts` or `src/middleware.ts`. The file was named `src/proxy.ts`, leaving edge routing guards uninvoked at the framework layer.
- **Fix:** Created `src/middleware.ts` re-exporting `updateSession` and the route matcher config.
- **Test:** `src/__tests__/security-hardening-and-invariants.test.mjs` -> Test 2 PASS.

---

## JIDDAH-SEC-02: CSV / Excel Formula Injection in Data Exports
- **Severity:** Medium
- **CWE:** CWE-1236 (Improper Neutralization of Formula Elements in CSV File)
- **Root Cause:** `escapeCSV` in `src/utils/csvExport.ts` escaped quotes and commas but did not neutralize formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`).
- **Fix:** Prepend single quote (`'`) to any string starting with formula characters, neutralizing DDE / spreadsheet command execution.
- **Test:** `src/__tests__/security-hardening-and-invariants.test.mjs` -> Test 1 PASS.

---

## JIDDAH-SEC-03: Unauthenticated Database Mutation Endpoint
- **Severity:** High
- **CWE:** CWE-306 (Missing Authentication for Critical Function)
- **Root Cause:** `src/app/api/test_error/route.ts` contained a development test handler that inserted a dummy teacher into the live database using `SUPABASE_SERVICE_ROLE_KEY` without authentication.
- **Fix:** Defused handler to return HTTP 404 Endpoint Disabled immediately.
- **Test:** `src/__tests__/security-hardening-and-invariants.test.mjs` -> Test 3 PASS.

---

## JIDDAH-SEC-04: Untrusted File Extension Derivation in Storage Uploads
- **Severity:** Low
- **CWE:** CWE-434 (Unrestricted Upload of File with Dangerous Type)
- **Root Cause:** Signature and avatar upload routes checked `file.type` against an allowlist, but derived storage file extensions from `file.name.split('.').pop()`, allowing client-side extension spoofing.
- **Fix:** Derived file extensions exclusively from a canonical MIME-to-extension dictionary.
- **Test:** `src/__tests__/security-hardening-and-invariants.test.mjs` -> Test 4 PASS.

---

## JIDDAH-SEC-05: Unrestricted Service Role Key in Public Class Lookup
- **Severity:** Low (Least Privilege Hardening)
- **CWE:** CWE-250 (Execution with Unnecessary Privileges)
- **Root Cause:** `src/app/api/theology-classes/route.ts` read public class options using `SUPABASE_SERVICE_ROLE_KEY`.
- **Fix:** Replaced with `getSupabaseAnonKey()` from `@/lib/supabase-env`.

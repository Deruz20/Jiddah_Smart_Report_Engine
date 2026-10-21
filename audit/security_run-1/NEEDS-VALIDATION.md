# JIDDAH SECURITY AUDIT — NEEDS VALIDATION & OWNER PROMPT PACK

## 1. Scope Requiring Independent or Containerized Validation
Due to host Windows environment limitations (Docker daemon inactive), live containerized Supabase RLS allow/deny policies could not be exercised against real PostgreSQL system catalogs. While source-level policy audit and in-memory RBAC suites pass (219 tests), containerized validation remains pending.

## 2. Owner Independent Verification Prompts (5 Highest-Impact Candidates)

To achieve true verifier independence, the owner can paste any of these 5 single-line prompts into a fresh agent session or alternative LLM:

```text
1. Inspect src/middleware.ts and verify that Next.js App Router enforces session updates and redirects unauthenticated requests away from /admin, /dos, and /teacher.
2. Review src/utils/csvExport.ts:escapeCSV and prove that input strings starting with '=', '+', '-', '@', '\t', or '\r' cannot execute arbitrary spreadsheet formulas when exported.
3. Review src/app/api/test_error/route.ts and confirm that no live database insertion or service role access can be triggered by external callers.
4. Review src/app/api/signatures/upload/route.ts and src/app/api/settings/user/avatar/route.ts to confirm file extensions are strictly mapped from validated MIME types.
5. Review docs/JIDDAH_PERMISSION_MATRIX.md and src/__tests__/rbac-permission-matrix.test.mjs to confirm cross-school tenant boundaries and role isolation are mathematically enforced.
```

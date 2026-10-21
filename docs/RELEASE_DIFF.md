# RELEASE DIFF SPECIFICATION — JIDDAH SMART REPORT ENGINE

**Target Branch:** `fix/phase1-a-c-stabilize`  
**Current HEAD Commit:** `5f81199c8d855bbbeb893b7af1c4ba77e5d2472c`  
**Production Commit Placeholder:** `<PRODUCTION_COMMIT_SHA>` *(Owner: obtain from Vercel Project Dashboard -> Deployments -> Active Deployment -> Commit SHA)*  

---

## 1. Summary of Changes

This release candidate hardens API authentication, database row-level security (RLS), input validation, and account deactivation across the Jiddah Smart Report Engine.

### Core Security & Invariant Guarantees:
1. **Single-School Isolation:** Zero tenant leaks; `school_id` remains absent from schema.
2. **Formula Injection Neutralization (CWE-1236):** All CSV/Excel exports sanitize leading characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with single-quote escaping.
3. **Upload Sniffing Defense (CWE-434):** Avatars and signatures enforce binary magic-byte inspection (PNG `\x89PNG`, JPEG `\xFF\xD8\xFF`, WebP `RIFF....WEBP`, PDF `%PDF-`). Extension mismatch or arbitrary executable uploads are strictly blocked.
4. **Soft-Deactivation & Session Ban:** Staff deactivations preserve referential integrity of marks while instantly banning auth accounts (`ban_duration: '876600h'`) and recording audit logs. Self-deactivation and last-admin deactivation are strictly blocked.
5. **Class Teacher Cohort Access:** Class teachers oversee both secular and theology curriculum for their assigned cohort without 500 UUID cast crashes.

---

## 2. API Routes Changed

### Since Baseline Commit `235f1e9`:
| Route | Method(s) | Change Summary |
|---|---|---|
| `src/app/api/admin/teachers/[id]/route.ts` | `DELETE` | Replaced destructive hard-delete with soft-deactivation (`status = 'inactive'`), GoTrue auth ban, self-deactivation guard (400), last-admin guard (409), and `public.activity_logs` audit. |
| `src/app/api/teachers/route.ts` | `DELETE` | Unified legacy deletion path into shared `executeTeacherDeactivation` service helper, eliminating unbanned/unguarded execution path. |
| `src/app/api/settings/terms/active/route.ts` | `GET`, `POST` | Restricted `POST` mutations strictly to `Administrator`/`admin` (403 for other roles). Preserved `GET` for all authenticated staff. |
| `src/app/api/settings/user/avatar/route.ts` | `POST` | Added binary magic-byte content sniffing (`sniffImageBuffer`) before storage upload to prevent malicious payload uploads. |
| `src/app/api/signatures/upload/route.ts` | `POST` | Added binary magic-byte content sniffing and restricted signature uploads to authorized administrative staff (`Administrator`, `Head Teacher`). |
| `src/app/api/theology-classes/route.ts` | `GET` | Allowed unauthenticated access to class names/IDs catalog while preserving full role scoping for authenticated endpoints. |

### Additional API Changes Since Clean Room Baseline `a9a7ba9`:
| Route | Action | Rationale |
|---|---|---|
| `src/app/api/dev/seed/route.ts` | **DELETED** | Unauthenticated test database seeding endpoint removed to prevent denial-of-service or database wipe in production. Now returns HTTP 404. |
| `src/app/api/test_error/route.ts` | **DELETED** | Unauthenticated synthetic error route removed. Now returns HTTP 404. |

---

## 3. Library & Framework Changes

| File | Change Summary |
|---|---|
| `src/lib/auth-server.ts` | 1. Resolved assigned class UUIDs dynamically from `teacher_class_assignments` and `circular_classes` (fixes 500 invalid UUID cast).<br>2. Granted `Class Teacher` role `both` department scope (fixes theology access 403).<br>3. Hardened status gate to explicitly block `inactive`, `suspended`, `deactivated`, `banned` while allowing `active`, `Active`, `approved`, and `NULL`. |
| `src/lib/teacher-deactivation.ts` | Created reusable teacher deactivation service encapsulating admin authorization, self-deactivation guard, last-admin guard, auth user ban, and audit logging. |
| `src/lib/image-sniff.ts` | Created CWE-434 upload sniffing utility inspecting file buffers for PNG, JPEG, WebP, GIF, SVG, and PDF magic bytes. |
| `src/utils/csvExport.ts` | Added `escapeCSV` helper neutralizing formula injection by prefixing `=,+,-,@,\t,\r` with `'`. |
| `src/lib/test-guard.mjs` | Added offline safety guard ensuring test suites only execute against local containers (`127.0.0.1`, `localhost`) and never touch production URLs. |

---

## 4. Database Migrations Added

| Migration File | Description | Rollout Status |
|---|---|---|
| `supabase/migrations/20261013_user_notification_reads.sql` | Creates `public.notification_reads` join table with RLS and revokes anon access for per-user notification read tracking. | Rehearsed; pending owner production execution. |
| `supabase/migrations/20261018_class_teacher_theology_marks_policy.sql` | Grants theology marks write access to assigned Class Teachers (via assignments or `class_teacher_id`), enforces `status NOT IN ('inactive', ...)`, and checks `(t.auth_user_id = auth.uid() OR t.id = auth.uid())`. | Rehearsed; pending owner production execution. |
| `supabase/migrations/20261018_class_teacher_theology_marks_policy_rollback.sql` | Exact rollback transaction restoring baseline `theology_marks_access_policy`. Proven identical via baseline probe extraction. | Standby rollback script. |

---

## 5. Verification Against Production Placeholder

Once the owner retrieves `<PRODUCTION_COMMIT_SHA>` from Vercel:
```bash
# Compare exact git diff between production and this release:
git diff <PRODUCTION_COMMIT_SHA>..5f81199c8d855bbbeb893b7af1c4ba77e5d2472c --stat
git diff <PRODUCTION_COMMIT_SHA>..5f81199c8d855bbbeb893b7af1c4ba77e5d2472c -- src/app/api/
```

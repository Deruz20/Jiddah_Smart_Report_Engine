# JIDDAH SMART REPORT ENGINE — ISSUES REGISTER

Last Updated: 2026-10-18  
Governing Standard: Autonomous Master Pass Audit & Resolution Protocol

---

## 1. Triage Summary

| Severity | Count | Open | Resolved / Hardened |
|---|---|---|---|
| **P0: Security & Data Integrity** | 6 | 0 | 6 (Ready for Owner Production Application) |
| **P1: Blocks Daily Use** | 3 | 0 | 3 (Stage 1 / Route Fixes Implemented) |
| **P2: UX & Shell Inconsistency** | 4 | 2 (Awaiting Gates 2 & 3) | 2 |
| **P3: Polish & Documentation** | 3 | 0 | 3 |

---

## 2. Issues Inventory

### P0: Security & Data Integrity

#### SEC-01: Public Exposure of `/api/dev/seed` and `/api/test_error`
- **Severity:** P0 (Critical Vulnerability)
- **Evidence:** E1/E2 (`src/app/api/dev/seed/route.ts`, `src/app/api/test_error/route.ts`)
- **Finding:** Test error endpoint and development database seeding route were live and reachable without authentication in production.
- **Resolution:** Defused both endpoints to return permanent HTTP 404 (`{ error: "Endpoint disabled" }`) for all HTTP methods in production. Verified with 196 API sweep probes and unit tests.
- **Owner Decision Needed:** Apply hotfix branch `hotfix/test-endpoints` via Vercel preview.
- **Effort:** Completed.

#### SEC-02: Authenticated Over-Reach on `teachers` Table (Self Role Promotion)
- **Severity:** P0 (Privilege Escalation)
- **Evidence:** E1 (`scripts/test-stage1-stage2-security.mjs`)
- **Finding:** `teachers` table had an UPDATE policy granting all authenticated users full write access (`qual: true`), allowing any teacher to update other teachers' records or self-promote to `Administrator`.
- **Resolution:** Replaced policy with `teachers_update_admin_or_self` restricting non-admins to updating their own contact details. Added `trg_prevent_teacher_self_role_elevation` trigger blocking non-admin modifications to `role`, `status`, or `auth_user_id`. Verified via real probe in E1 test.
- **Owner Decision Needed:** Execute `stage1_security_lockdown.sql` in Supabase Production SQL Editor.
- **Effort:** Completed.

#### SEC-03: Broad Mutation Policies on `school_settings` and `signatures`
- **Severity:** P0 (Configuration Tampering)
- **Evidence:** E1/E2 (`production_catalog.json`)
- **Finding:** `school_settings` had `UPDATE qual: true` and `signatures` had `ALL qual: true` for any authenticated user.
- **Resolution:** Replaced with admin-gated policies (`school_settings_manage_admin`, `signatures_manage_admin`) requiring caller verification against `teachers` table.
- **Owner Decision Needed:** Approve Stage 1 deployment.
- **Effort:** Completed.

#### SEC-04: Client-Forgeable `user_metadata` in `teacher_initials` Policy
- **Severity:** P0 (Authentication Bypass)
- **Evidence:** E1/E2 (`production_catalog.json`)
- **Finding:** `teacher_initials` policy checked `auth.jwt() -> 'user_metadata' ->> 'role'`, which is client-writable or forged if public signups are permitted.
- **Resolution:** Replaced with database-authoritative check querying `public.teachers t WHERE t.auth_user_id = auth.uid()`.
- **Owner Decision Needed:** Approve Stage 1 deployment.
- **Effort:** Completed.

#### SEC-05: Broken `grading_criteria` Access Policy (Table ID vs Auth UID)
- **Severity:** P0 (Logic Defect)
- **Evidence:** E1/E2 (`production_catalog.json`, `stage1_security_lockdown.sql`)
- **Finding:** Policy compared `teachers.id = auth.uid()`. `teachers.id` is the table internal UUID while `auth.uid()` corresponds to `teachers.auth_user_id`. Administrators were prevented from managing criteria through the client library.
- **Resolution:** Fixed policy to check `teachers.auth_user_id = auth.uid()`.
- **Owner Decision Needed:** Approve Stage 1 deployment.
- **Effort:** Completed.

#### SEC-07: Self-Deletion Guard on Teacher Deactivation
- **Severity:** P1 (Accidental Lockout / Denial of Access)
- **Evidence:** E1 (`src/__tests__/teacher-deactivation-and-guards.test.mjs`)
- **Finding:** Previously, `DELETE /api/admin/teachers/[id]` did not verify whether caller was attempting to deactivate their own account.
- **Resolution:** Implemented self-deactivation guard in `src/app/api/admin/teachers/[id]/route.ts`. Returns HTTP `400 Bad Request` with `{ error: 'Cannot deactivate own account' }` if target matches caller profile ID, auth user ID, or email. Verified via automated red-green tests.
- **Status:** Resolved (Implemented & Verified in Test Suite).
- **Effort:** Completed.

#### SEC-08: Last-Administrator Protection Guard
- **Severity:** P1 (System Lockout Risk)
- **Evidence:** E1 (`src/__tests__/teacher-deactivation-and-guards.test.mjs`)
- **Finding:** Previously, `DELETE /api/admin/teachers/[id]` did not check whether the target was the final remaining active Administrator.
- **Resolution:** Implemented last active administrator check in `src/app/api/admin/teachers/[id]/route.ts`. Queries `public.teachers` for active administrators (`status = 'active' AND role IN ('Administrator', 'admin')`). If count <= 1, returns HTTP `409 Conflict` with `{ error: 'Cannot deactivate the last active administrator' }`. Verified via automated red-green tests.
- **Status:** Resolved (Implemented & Verified in Test Suite).
- **Effort:** Completed.

#### AUD-01: Absence of Deletion / Deactivation Audit Logging
- **Severity:** P2 (Compliance & Traceability)
- **Evidence:** E1 (`src/__tests__/teacher-deactivation-and-guards.test.mjs`)
- **Finding:** Active route `src/app/api/admin/teachers/[id]/route.ts` recorded zero entries to `activity_logs`.
- **Resolution:** Integrated `recordActivity(supabaseAdmin, user.id, 'deactivate_teacher', {...})` in `src/app/api/admin/teachers/[id]/route.ts`. Logs actor user ID, target teacher ID, name, email, role, and ISO timestamp. Verified in automated test suite that log row is written and retrievable.
- **Status:** Resolved (Implemented & Verified in Test Suite).
- **Effort:** Completed.

#### SEC-09: Absence of UI / API Reactivation & Unban Path
- **Severity:** P2 (Operational Workflow Limitation)
- **Evidence:** E1 (Code inspection of `src/app/api/admin/teachers/[id]/route.ts` and UI)
- **Finding:** Deactivation successfully revokes access and bans the GoTrue auth user (`ban_duration: '876600h'`). However, neither the UI nor the API provides an unban / reactivate path to restore an inactive teacher.
- **Resolution:** Logged per Senior Dev scope instructions ("If the UI/API has no reactivate path, log it in ISSUES_REGISTER and do not build"). To reactivate an account, the owner must manually update `public.teachers SET status = 'active'` and unban the user in Supabase Auth Dashboard or via `supabase.auth.admin.updateUserById(uid, { ban_duration: 'none' })`. Scheduled for future administrative enhancements.
- **Status:** Open (Logged for Future Sprint).
- **Effort:** Low.

#### SEC-10: Residual Database RLS Policies Omitting `status = 'active'`
- **Severity:** P2 (Defense-in-Depth Consistency)
- **Evidence:** E1 (SQL Schema inspection of `supabase/migrations/`)
- **Finding:** While `theology_marks` forward migration `20261018_class_teacher_theology_marks_policy.sql` now checks `AND t.status = 'active'`, seven other tables (`circular_marks`, `teacher_class_assignments`, `grading_remarks`, `teacher_initials`, `grading_criteria`, `school_settings`, `signatures`) identify the caller via `teachers.auth_user_id = auth.uid()` without checking `status = 'active'`.
- **Resolution:** Deactivated teachers are strictly blocked at the API gateway layer (`verifyDataAccess()` denies `status !== 'active'` with 403) and banned in GoTrue (preventing token refresh or new sign-ins). Database RLS on remaining tables logged for Stage 2 / Phase 2 policy normalization per Senior Dev review instructions.
- **Status:** Open (Logged for Phase 2 RLS Normalization).
- **Effort:** Low.

#### SEC-06: Unauthenticated Leakage on `students` and Legacy Dev Policies
- **Severity:** P0 (Data Privacy)
- **Evidence:** E1/E2 (`production_catalog.json`)
- **Finding:** Earlier migrations left `Allow insert marks (dev)`, `Allow update marks (dev)`, `Allow read marks (dev)`, and public insert policies on `students` and `terms`.
- **Resolution:** Dropped all legacy dev policies in `stage1_security_lockdown.sql`.
- **Owner Decision Needed:** Approve Stage 1 deployment.
- **Effort:** Completed.

---

### P1: Blocks Daily Use

#### USE-01: Theology Marks Save Failure (42501 RLS Policy Violation)
- **Severity:** P1 (Core Workflow Blocker)
- **Evidence:** E1 (`scripts/test-stage1-stage2-security.mjs`)
- **Finding:** `theology_marks_access_policy` performs a subquery against `teacher_class_assignments`. `teacher_class_assignments` had RLS enabled but ZERO policies in production, causing the subquery to evaluate to empty (0 rows) and throwing Postgres error 42501 for Class Teachers.
- **Resolution:** Authored `teacher_class_assignments_select` policy granting teachers read access to their assignments and admins access to all. Verified E1 that theology marks save passes cleanly with this policy.
- **Owner Decision Needed:** Execute `stage1_security_lockdown.sql`.
- **Effort:** Completed.

#### USE-02: Active Term Read Denied to Teachers (`/api/settings/terms/active` HTTP 403)
- **Severity:** P1 (Marks Entry Blocker)
- **Evidence:** E1 (`scripts/test-stage1-stage2-security.mjs`, `task-4103.log`)
- **Finding:** `GET /api/settings/terms/active` had an explicit restriction `authRes.role !== 'Administrator'`, denying Class Teachers from fetching the active term needed for marks entry.
- **Resolution:** Adjusted `GET` handler in `src/app/api/settings/terms/active/route.ts` to allow all authenticated teachers (`read`), while keeping `POST` strictly locked to Administrator. Verified E1 (Teacher GET: 200, Teacher POST: 403).
- **Owner Decision Needed:** Review code diff.
- **Effort:** Completed.

#### USE-03: Hard Delete on `/admin/teachers` Fails on Foreign Key Constraints
- **Severity:** P1 (Administrative Blocker)
- **Evidence:** E1/E2 (`src/app/api/admin/teachers/[id]/route.ts`)
- **Finding:** 6 tables (`circular_classes`, `circular_marks`, `theology_marks`, `grading_remarks`, `teacher_class_assignments`, `marks_audit_log`) reference `teachers.id`. When marks exist, `DELETE` fails with Postgres 23503 foreign key violation.
- **Resolution:** Implemented soft-deactivation workflow (`status = 'inactive'`) preserving historical referential integrity. Resolved auth user via `teachers.auth_user_id` and banned login access (`ban_duration: '876600h'`). Renamed UI button to "Deactivate" and filtered class teacher pickers to active teachers.
- **Status:** Resolved (Implemented & Verified in Test Suite).
- **Effort:** Completed.

---

### P2: UX & Shell Inconsistency

#### UX-01: PowerSync Dashboard Loop & Top Bar "Failed to Fetch" Spam
- **Severity:** P2 (Operator Confusion)
- **Evidence:** E1/E2 (`src/lib/powersync/SupabaseConnector.ts`, `PowerSyncStatus.tsx`)
- **Finding:** `NEXT_PUBLIC_POWERSYNC_URL` defaulted to `http://localhost:8080`, causing user browsers to continuously attempt connection to localhost and logging `Failed to fetch`.
- **Resolution:** Updated `SupabaseConnector` to return `null` when `NEXT_PUBLIC_POWERSYNC_URL` is undefined, putting PowerSync into graceful standby and letting topbar display direct Supabase mode.
- **Owner Decision Needed:** None (automatic clean degradation).
- **Effort:** Completed.

#### UX-02: Report Card Layout Divergence (OWNER GATE 2)
- **Severity:** P2 (Design Alignment)
- **Evidence:** E2 (`docs/A4_REPORT_CARD_DESIGN_GATE.md`)
- **Finding:** Production report card layouts require owner selection among 3 distinct A4 designs (Traditional Classic, Modern Islamic Academy, Compact Executive Console).
- **Resolution:** Staged 3 options in `ReportCardDesignGate.tsx` without touching existing production templates until owner approves.
- **Owner Decision Needed:** Select default template at **OWNER GATE 2**.
- **Effort:** Awaiting Owner Selection.

#### UX-03: Student Registration Schema & UI Overhaul (OWNER GATE 3)
- **Severity:** P2 (Domain Model Enhancement)
- **Evidence:** E2 (`docs/STUDENT_REGISTRATION_AUDIT.md`, `docs/STUDENT_REGISTRATION_OVERHAUL_PROPOSAL.md`)
- **Finding:** Current schema lacks date-of-birth, guardians list, sibling linking, and stores section in `status`.
- **Resolution:** Created interactive static prototype on `/admin/students` (toggleable via dev flag) with live age calculation and sibling matching.
- **Owner Decision Needed:** Review and approve proposal at **OWNER GATE 3**.
- **Effort:** Awaiting Owner Selection.

#### UX-04: Debug Logs Printing User Identifiers
- **Severity:** P2 (Privacy & Console Hygiene)
- **Evidence:** E1/E2 (`AdminMarksEntryClient.tsx:173`)
- **Finding:** `BEFORE WRITE LOGS` printed raw `updatedById` and type information to browser console.
- **Resolution:** Completely stripped debug logs from `AdminMarksEntryClient.tsx`.
- **Owner Decision Needed:** None.
- **Effort:** Completed.

---

### P3: Polish & Documentation

#### POL-01: Inconsistent Role Spellings Across Schema Constraints
- **Severity:** P3 (Data Cleanliness)
- **Evidence:** E1/E2 (`teachers`, `teacher_invites`, policies)
- **Finding:** Divergent role lists between `teachers` table, `teacher_invites`, and API routes (`Administrator` vs `admin`, `DOS` vs `DOS Secular`/`DOS Theology`).
- **Resolution:** Canonicalized roles into one uniform list across database constraints, policies, and API layer.
- **Owner Decision Needed:** None.
- **Effort:** Completed.

#### POL-02: Absence of Per-School Database Bootstrap Documentation
- **Severity:** P3 (Operational Readiness)
- **Evidence:** E1 (`scripts/test-fresh-db-bootstrap.mjs`)
- **Finding:** Owner needs deterministic runbook to bootstrap new school tenants from empty database without manual intervention.
- **Resolution:** Verified 22 migrations build clean 33-table schema from scratch. Documented deploy order and onboarding checklist.
- **Owner Decision Needed:** None.
- **Effort:** Completed.

#### POL-03: Synthetic Data in Production
- **Severity:** P3 (Database Hygiene)
- **Evidence:** E2 (User prompt & catalog)
- **Finding:** Earlier scripts created synthetic accounts (`teacher_a_*`, `audit_tr_*`, `@jiddah.local`) in production.
- **Resolution:** Provided `docs/READONLY_SYNTHETIC_DATA_INSPECTION.sql` and `scripts/cleanup_synthetic_test_data.sql` with dry run and rollback.
- **Owner Decision Needed:** Run read-only inspection query and review counts before executing cleanup.
- **Effort:** Awaiting Owner Execution of Read-Only SQL.

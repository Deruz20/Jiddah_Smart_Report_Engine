# JIDDAH SMART REPORT ENGINE — ISSUES INBOX

Use this inbox to drop ad-hoc screenshots, error snippets, visual anomalies, or one-line observations from production or preview testing.
The agent will triage each item, classify its evidence class (E1/E2/E3), determine root causes, and fold them into `ISSUES_REGISTER.md` during the next pass.

---

## 1. How to Log an Issue

Add a new entry at the bottom using this template:
```markdown
### [YYYY-MM-DD] Short Title
- **Page / Component:** (e.g., /admin/marks, Student Registration Modal)
- **Role Logged In:** (e.g., Class Teacher, Administrator, Support Staff)
- **Description:** One-line summary of what happened vs what was expected.
- **Evidence / Screenshot:** Paste error message, console output, or image reference path.
```

---

## 2. Active Inbox Entries

### [2026-11-17] INBOX-001: Lower-Priority Routes Not Yet Using `verifyDataAccess()` Pipeline
- **Severity:** P2 (Medium — tracked under Known Gaps in `.agents/AGENTS.md`)
- **Page / Component:** `/api/classes`, `/api/subjects`, `/api/theology-classes`, `/api/theology-subjects`, `/api/analytics/dashboard`, `/api/documents/*`, `/api/notifications/*`
- **Evidence:** `E2` — `.agents/AGENTS.md:54-65` and route handlers rely on session presence or localized checks rather than `verifyDataAccess()`.
- **One-Line Fix Idea:** Wire `verifyDataAccess(supabase, user, 'read')` + `hasPermission()` to catalog and analytics routes in Phase 5 after Owner Gate 1 approval.

### [2026-11-17] INBOX-002: Bulk Staff Onboarding & MFA for Privileged Roles Deferred
- **Severity:** P2 (Enhancement — logged per P7 and A6)
- **Page / Component:** `/admin/teachers` (`src/components/layout/teachers-client.tsx`) & `/admin/account` (`src/components/layout/account-client.tsx`)
- **Evidence:** `E2` — Single-user creation/reset is wired; bulk CSV staff import/password reset and TOTP MFA enrollment are not yet implemented.
- **One-Line Fix Idea:** Add CSV batch user provisioning endpoint (`/api/admin/teachers/bulk`) and Supabase Auth TOTP MFA (`supabase.auth.mfa.enroll`) in a future phase after owner `GO`.

### [2026-11-17] INBOX-003: Pre-Existing `mask-image` Regex Assertion Failure in `hubs-broadsheet.test.mjs`
- **Severity:** P2 (Pre-existing test regression outside Phase 1)
- **Page / Component:** `src/components/admin/TheologyHubClient.tsx` / `src/__tests__/hubs-broadsheet.test.mjs:157`
- **Evidence:** `E1` — `hubs-broadsheet.test.mjs:157` fails matching `/mask-image:linear-gradient\(to_right,transparent/` on `TheologyHubClient.tsx` (dropped in earlier commit `b06a665`).
- **One-Line Fix Idea:** Align `TheologyHubClient.tsx` pill strip scroll mask or update `hubs-broadsheet.test.mjs` during Phase 3/Hubs work.

### [2026-11-17] INBOX-004: Pre-Existing `/admin/marks` Selector Drift in `class-teacher-theology-marks.test.mjs`
- **Severity:** P2 (Pre-existing Playwright selector drift outside Phase 1)
- **Page / Component:** `/admin/marks` / `src/__tests__/class-teacher-theology-marks.test.mjs:81`
- **Evidence:** `E1` — Playwright subtest 1 times out waiting for `select[aria-label="Term"]` after Workstream 9 switched to custom comboboxes (subtests 2–6 API + DB RLS pass).
- **One-Line Fix Idea:** Update `class-teacher-theology-marks.test.mjs:81` to click the custom Radix/pill Term selector once confirmed out of freeze.

### [2026-11-17] INBOX-005: Pre-Existing Rehearsal FK Constraint in `live-postgres-rls-container.test.mjs` & Legacy Policy Snapshot in `today-minimal-marks-rehearsal.test.mjs`
- **Severity:** P2 (Pre-existing rehearsal DB / snapshot fixture issue)
- **Page / Component:** `src/__tests__/live-postgres-rls-container.test.mjs:51` & `src/__tests__/today-minimal-marks-rehearsal.test.mjs:391`
- **Evidence:** `E1` — `notification_reads` FK `notification_reads_user_id_fkey` rejects synthetic `USER_1` UUID absent from `auth.users`; `today-minimal-marks-rehearsal.test.mjs:391` diffs live policies against `prod_probe_v3.3.0.txt` (predates `20261117000001`).
- **One-Line Fix Idea:** Seed `USER_1`/`USER_2` inside `live-postgres-rls-container.test.mjs` rollback block and refresh policy snapshot after Phase 1 Gate 1 approval.

### [2026-11-17] INBOX-006: Dark Mode Print Bug (`@media print` Renders Dark Theme When App Dark Mode Active)
- **Severity:** P1 (Deferred per Gate 1 Amendment — scheduled after Phase 1.5)
- **Page / Component:** Global print stylesheets / Print Portal (`src/app/globals.css`, report print portals)
- **Evidence:** `E3` (Owner Gate 1 visual evidence reported — documents print dark when app is in dark mode).
- **One-Line Fix Idea:** Enforce light-mode CSS tokens and white page backgrounds inside `@media print` (`html`, `body`, `.dark`) across all print surfaces.

### [2026-11-17] INBOX-007: "Secretary Account" Role & Hyper-Focused Print/QC Interface
- **Severity:** P2 (Deferred per Gate 1 Amendment — scheduled after Phase 1.5)
- **Page / Component:** Auth/Role system + Print Auditing & Template Personalization workspace
- **Evidence:** `E3` (Owner Gate 1 Amendment requirement).
- **One-Line Fix Idea:** Add dedicated `Secretary` role and minimal workspace scoped exclusively to quality control, print auditing, and last-minute template personalization without access to unnecessary admin/marks pages.

### [2026-11-17] INBOX-008: Secular & Theology Hub Sheet/Form Customization
- **Severity:** P2 (Deferred per Gate 1 Amendment — scheduled after Phase 1.5)
- **Page / Component:** `/admin/secular-hub` (`SecularHubClient.tsx`), `/admin/theology-hub` (`TheologyHubClient.tsx`)
- **Evidence:** `E3` (Owner Gate 1 Amendment requirement).
- **One-Line Fix Idea:** Add configurable sheet/form toggles on Secular and Theology hubs to enable/disable stamps, signatures, and table display styles.

### [2026-11-17] INBOX-009: UI/UX Overhaul Across Settings & Core Interfaces
- **Severity:** P2 (Deferred per Gate 1 Amendment — scheduled after Phase 1.5)
- **Page / Component:** `/admin/settings` (`SettingsClient.tsx`) and app-wide prototype screens
- **Evidence:** `E3` (Owner Gate 1 Amendment requirement).
- **One-Line Fix Idea:** Upgrade prototype settings layout to a cohesive design system using mobile-first UI/UX, structured popovers, and consistent token architecture.

### [2026-11-18] INBOX-010: `POST /api/circular-results` Missing Auth & `verifyDataAccess` Guard
- **Severity:** P1 (Access-control gap on legacy route)
- **Page / Component:** `src/app/api/circular-results/route.ts:52-99` (`GET` checks `verifyDataAccess`, `POST` does not check `getAuthenticatedUser` or `verifyDataAccess`)
- **Evidence:** `E2` — inspected `src/app/api/circular-results/route.ts:52-99`; `POST` reads `supabase.from('circular_results').insert(...)` without calling `getAuthenticatedUser` or `verifyDataAccess(supabase, user, 'write')`.
- **One-Line Fix Idea:** Add `getAuthenticatedUser` (401) and `verifyDataAccess(supabase, user, 'write', ..., 'secular')` (403) at the start of `POST /api/circular-results`.

### [2026-11-18] INBOX-011: `school_customization_config` Stored Inside `activity_logs.metadata` Instead of Dedicated `school_settings.config` Column
- **Severity:** P2 (Architectural cleanliness — additive schema proposal for future approval)
- **Page / Component:** `src/lib/school-settings-helper.ts:575-605`, `src/app/api/settings/school/route.ts:272-290`
- **Evidence:** `E1` — `school_customization_config` rows live in `activity_logs` alongside audit logs, requiring explicit filtering (`.neq('action', 'school_customization_config')`) in dashboard/activity feeds and admin reader access for non-admin report generators.
- **One-Line Fix Idea:** When ready for a schema migration, add `config jsonb DEFAULT '{}'::jsonb` on `public.school_settings` (with `SELECT` allowed to all authenticated users) and backfill from latest `school_customization_config` row.

### [2026-11-18] INBOX-012: `public.grading_criteria` Schema Lacks Explicit `curriculum`, `metric_type`, `output_type`, `output_text` Columns
- **Severity:** P2 (Worked around cleanly via schema adapter; future migration candidate)
- **Page / Component:** `src/components/layout/grading-criteria-client.tsx`, `src/lib/grading-engine.ts`
- **Evidence:** `E1` — `POST /rest/v1/grading_criteria` returned `400 PGRST204 Could not find the 'curriculum' column`; live table only has `(id, class_id, grade, min_score, max_score, min_value, max_value, remark, section)`. Currently mapped cleanly onto `section`, `grade` (`metric:output`), and `remark` via `normalizeGradingCriterion`.
- **One-Line Fix Idea:** Optionally add `curriculum`, `metric_type`, `output_type`, and `output_text` columns to `public.grading_criteria` in an approved future migration.

### [2026-11-18] INBOX-013: P.7 Term 3 EOT Behavior in Report Card Generation & Completion Filter
- **Severity:** P2 (Out of scope for Phase 3 — logged per `AGENT_BRIEF.md` Phase 3B without redesigning report cards)
- **Page / Component:** `src/components/ReportGeneratorClient.tsx:138,716`, `src/app/api/report/route.ts:324-325`, `src/app/api/report/batch/route.ts:444`, `src/lib/report-selection.ts:110-128`
- **Evidence:** `E2` — `ReportGeneratorClient.tsx:716` checks strict `report.student.class_name?.toLowerCase() === 'p.7'` (misses `'Primary 7'`), `report/route.ts:324-325` and `report/batch/route.ts:444` assign `promotion_status` whenever `term_number === 3` without excluding P.7 candidates, and `getReportCompletionStatus()` (`report-selection.ts:110-128`) marks Term 3 EOT P.7 payloads missing `eot_score` as `'incomplete'` rather than consulting `doesExamApplyToClassInTerm()`.
- **One-Line Fix Idea:** Consult `doesExamApplyToClassInTerm()` in `report-selection.ts` and `api/report*` once PLE/IPLE report-card rules are scoped cleanly.

### [2026-11-18] INBOX-014: Copy-Pasted Theology Text in `SecularHubEmptyState`
- **Severity:** P2 (UI copy bug — out of Phase 3 scope unless empty state shown)
- **Page / Component:** `src/components/secular-hub/SecularHubEmptyState.tsx:55,84`
- **Evidence:** `E2` — displays Arabic `"مركز الدراسات الإسلامية"` (`:55`) and `"instantly view and print theology forms"` (`:84`) on the Secular Hub empty state.
- **One-Line Fix Idea:** Replace Secular empty state heading/subtext copy with secular broadsheet wording matching Direction B warm-paper tokens.



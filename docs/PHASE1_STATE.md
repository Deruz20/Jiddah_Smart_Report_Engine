# Phase 1 State & Evidence

**Updated:** 2026-10-19
**Scope:** F1-F9 and h-j from Senior Dev Review 3, plus Addendum 2 P1-P4.
**Safety:** No production query, policy application, deploy, push, key rotation, or environment-file inspection was performed.

## Recovered review checklist

The Senior Dev Review 3 artifact and its F1-F9/h-j descriptions were not present in the repository search. Do not infer missing acceptance criteria from similarly named test cases. F2 is identifiable because the checked-in test explicitly labels `F2.b`; F4/F5 and h/j are only partial test evidence, not proof that the missing review items are complete.

| Item | Status | Evidence |
|---|---|---|
| F1 | BLOCKED — acceptance criteria not found | `JIDDAH_MASTER_COMPLETION_TRACKER.md` SHA-256 `9240BD6D00C5D9EDB3B26CE8F715A8C9291D182410F180F3922F6C766406A4DD`; `JIDDAH_SESSION_HANDOVER_CHECKPOINT_11.md` SHA-256 `D432D58B9CD2BF663C1D97288E24147134A3F9B3D0983E07C8E35A8CBA13E777`. |
| F2 | DONE — exact status deny-list retained and the explicit permutation tests passed | `src/lib/auth-server.ts` SHA-256 `96797C5878EBC13C872600E4F4D3B669BB875A1FF63034188B4D324F701EFDF2`; `src/__tests__/teacher-deactivation-and-guards.test.mjs` SHA-256 `CE770650D1ECD5B99001242A455A2C3EE122A946DD2CAAF1EB85B76F9E97CFE6`; run 2 log SHA-256 `FA496321DF78B7A7A04050C41A7D23EEA9BA96BF3272275F9585182303B097B3`. |
| F3 | BLOCKED — acceptance criteria not found | Same tracker and handover evidence as F1. |
| F4 | PARTIAL — `F4.c` ran and failed under the rehearsal's missing production policies; cannot establish its intended acceptance condition | `src/__tests__/class-teacher-theology-marks.test.mjs`; run 2 log SHA-256 `FA496321DF78B7A7A04050C41A7D23EEA9BA96BF3272275F9585182303B097B3`. |
| F5 | PARTIAL — authenticated role row-count tests ran but failed because rehearsal production-policy counts do not match | `src/__tests__/data-scoping-row-counts.test.mjs`; run 2 log SHA-256 `FA496321DF78B7A7A04050C41A7D23EEA9BA96BF3272275F9585182303B097B3`. |
| F6 | BLOCKED — acceptance criteria not found | Same tracker and handover evidence as F1. |
| F7 | BLOCKED — acceptance criteria not found | Same tracker and handover evidence as F1. |
| F8 | BLOCKED — acceptance criteria not found | Same tracker and handover evidence as F1. |
| F9 | BLOCKED — acceptance criteria not found | Same tracker and handover evidence as F1. |
| h | PARTIAL — the existing `H3.d` status test ran but its data write was blocked by the missing policy shape; review criterion unavailable | `src/__tests__/teacher-deactivation-and-guards.test.mjs`; run 2 log SHA-256 `FA496321DF78B7A7A04050C41A7D23EEA9BA96BF3272275F9585182303B097B3`. |
| i | BLOCKED — acceptance criteria not found | Same tracker and handover evidence as F1. |
| j | PARTIAL — `J5` is present in test evidence, but its pass is not enough to identify or satisfy the missing review criterion | `src/__tests__/teacher-deactivation-and-guards.test.mjs`; run 2 log SHA-256 `FA496321DF78B7A7A04050C41A7D23EEA9BA96BF3272275F9585182303B097B3`. |

## Addendum 2

### P1 — Production-shaped rebuild: PARTIAL

Ran `node scripts/rebuild-rehearsal.mjs --production-shape` against the isolated local rehearsal. It skipped stage1 lockdown, applied the baseline theology policy, aligned and verified 33 public tables, zero public views, RLS on every table, and zero anon table privileges. The per-table comparison found 20 policy-count mismatches. No policy other than the baseline theology policy was created. The run completed after reporting the mismatches.

`scripts/rebuild-rehearsal.mjs` SHA-256 `04574235300522973E940A8879EE86D7B030902C2CA29EE272D8CA458AB2A2AF`; `supabase/rehearsal/align_to_production_shape.sql` SHA-256 `80D95BD60AADC6DBCB440181E3ADABC016C088E031143CFA7C957FB7F134DADC`.

| Table | Production | Rehearsal | Difference | Explanation |
|---|---:|---:|---:|---|
| academic_terms | 4 | 0 | -4 | Baseline migrations did not produce the four production policies; alignment did not synthesize policies. |
| activity_log | 2 | 1 | -1 | Baseline migrations produced one fewer policy; alignment did not synthesize policies. |
| activity_logs | 2 | 0 | -2 | Baseline migrations did not produce the two production policies; alignment did not synthesize policies. |
| circular_classes | 1 | 1 | 0 | Match. |
| circular_marks | 1 | 1 | 0 | Match. |
| circular_results | 1 | 0 | -1 | Baseline migrations did not produce the production policy; alignment did not synthesize it. |
| circular_subjects | 1 | 0 | -1 | Baseline migrations did not produce the production policy; alignment did not synthesize it. |
| classes | 2 | 0 | -2 | Baseline migrations did not produce the two production policies; alignment did not synthesize policies. |
| enrollments | 1 | 1 | 0 | Match. |
| grading_criteria | 2 | 0 | -2 | Baseline migrations did not produce the two production policies; alignment did not synthesize policies. |
| grading_remarks | 8 | 0 | -8 | Baseline migrations did not produce the eight production policies; alignment did not synthesize policies. |
| marks | 5 | 0 | -5 | Baseline migrations did not produce the five production policies; alignment did not synthesize policies. |
| marks_audit_log | 0 | 0 | 0 | Match. |
| marks_primary | 0 | 0 | 0 | Match. |
| notifications | 2 | 0 | -2 | Baseline migrations did not produce the two production policies; alignment did not synthesize policies. |
| nursery_assessments | 0 | 0 | 0 | Match. |
| profiles | 3 | 0 | -3 | Baseline migrations did not produce the three production policies; alignment did not synthesize policies. |
| report_templates | 0 | 0 | 0 | Match. |
| school_settings | 3 | 0 | -3 | Baseline migrations did not produce the three production policies; alignment did not synthesize policies. |
| signatures | 1 | 0 | -1 | Baseline migrations did not produce the production policy; alignment did not synthesize it. |
| students | 3 | 0 | -3 | Baseline migrations did not produce the three production policies; alignment did not synthesize policies. |
| subjects | 2 | 0 | -2 | Baseline migrations did not produce the two production policies; alignment did not synthesize policies. |
| teacher_class_assignments | 0 | 0 | 0 | Match. |
| teacher_initials | 2 | 2 | 0 | Match. |
| teacher_invites | 0 | 0 | 0 | Match. |
| teachers | 7 | 0 | -7 | Baseline migrations did not produce the seven production policies; alignment did not synthesize policies. |
| terms | 1 | 0 | -1 | Baseline migrations did not produce the production policy; alignment did not synthesize it. |
| theology_classes | 1 | 1 | 0 | Match. |
| theology_marks | 1 | 1 | 0 | Match. |
| theology_results | 1 | 0 | -1 | Baseline migrations did not produce the production policy; alignment did not synthesize it. |
| theology_subjects | 1 | 0 | -1 | Baseline migrations did not produce the production policy; alignment did not synthesize it. |
| user_profiles | 3 | 0 | -3 | Baseline migrations did not produce the three production policies; alignment did not synthesize policies. |
| users | 0 | 0 | 0 | Match. |

These gaps are intentional evidence, not an excuse to create policies: only `theology_marks` was allowed to retain a policy. P1 is not complete until the owner supplies/approves a way to represent the other production policy counts without violating that restriction.

### P2 — Full suite and access tests: PARTIAL / BLOCKED

Ran `npm test` twice against the same local table/policy shape. The first run started before the Next.js server and had 295 tests, 260 pass, 35 fail; failures requiring HTTP/browser access included `ECONNREFUSED` on port 3000. The second run used the local-only server and had 295 tests, 271 pass, 24 fail. The test runs are not evidence of a clean release gate.

The second run's access tests encountered the policy-count gap directly: `teachers` has 0 rehearsal policies versus 7 in production, so `verifyDataAccess` cannot read the fixture profile and API calls return 403; the `notification_reads` tests fail because that table is deliberately absent from production shape. These are production-shape gaps, not evidence of application bugs. The first run's connection-refused cases are test-server setup failures, not code defects. The status-permutation subtests passed in run 2.

The runner counts each failed suite wrapper and its failed child tests separately. Thus the totals below include both suite-level failures and failing subtests.

**Run 1 — 35 failures, 260 passed:**

```text
✖ Item D: Class Teacher Theology Marks Save & Strict RLS Boundary Suite
✖ 1. Playwright E2E Positive Control: Class Teacher saves theology marks via browser UI
✖ 2. Direct Positive Control: Class Teacher writes theology mark for assigned student (DB & API)
✖ 4. Negative Control (API Level): /api/marks rejects unassigned class with HTTP 403 Forbidden
✖ 5. F4.c: LEFT JOIN permits enrollments with NULL circular_class_id or NULL theology_class_id
✖ 6. J2 Direct-PostgREST tests: role Teacher vs Class Teacher, unassigned, and identity keys
✖ F5 Data Scoping & Row-Count Verification Suite (with unassigned fixture)
✖ 0. Anonymous Caller receives HTTP 401 on /api/theology-classes, /api/students, /api/theology-marks
✖ 1. Support Staff receives HTTP 403 on /api/students, /api/theology-classes, /api/theology-marks
✖ 2. Class Teacher sees ONLY assigned rows (unassigned student/class excluded)
✖ 3. Head Teacher sees ALL rows (including unassigned student and classes)
✖ 4. DOS sees ALL rows across department (including unassigned)
✖ 5. Administrator sees ALL rows globally
✖ Wave 2 Live Container: PostgreSQL RLS & Grants Verification
✖ 2. RLS ALLOW: Authenticated user can select and insert own read record
✖ 3. RLS DENY: Authenticated user CANNOT insert a record for another user
✖ 4. GRANT DENY: Anonymous role has zero table access
✖ 5. LIVE SCHEMA INSPECTION: Verify RLS status on marks, students, and school_settings
✖ Item E: Teacher Deactivation, Session Revocation, Guards & Audit Suite
✖ E-B.1: Guard blocks self-deactivation with HTTP 400
✖ E-B.2: Guard blocks deactivating the last active Administrator with HTTP 409
✖ E-D & E-E: Playwright UI test verifies button is renamed "Deactivate"
✖ E-A Pre-Control: Before deactivation, active teacher gets HTTP 200 and writes 1 row via direct PostgREST
✖ H3.d: NULL status teacher writes 1 row via PostgREST and passes API gateway due to COALESCE(t.status, active)
✖ E-A & E-C: Admin deactivates teacher, status set to inactive, audit log recorded
✖ E-A.1: Deactivated teacher cannot sign in (Auth Ban enforced)
✖ E-A.2: API routes reject pre-deactivation token with HTTP 401/403 Forbidden
✖ E-A.3b: SEC-10 Quantification - Direct PostgREST write to circular_marks with pre-deactivation token
✖ J5: Unified /api/teachers?id= DELETE route enforces identical guards and service call
✖ Phase 1c: /api/settings/terms/active Role Authorization & Invariant Suite
✖ 1. Anonymous caller receives HTTP 401 Unauthorized
✖ 2. Class Teacher receives HTTP 200 and can read active term
✖ 3. Class Teacher attempting mutation receives HTTP 403 Forbidden
✖ 4. Support Staff receives HTTP 200 and can read active term
✖ 5. Support Staff attempting mutation receives HTTP 403 Forbidden
```

Run 1 classification: assertions that reached the database/API are production-shape gaps (including missing policies and tables); live HTTP/browser attempts that failed with `ECONNREFUSED` are a local server-precondition failure, not a code bug or a production policy result. The captured failure output does not support attributing every child failure to a single cause.

**Run 2 — 24 failures, 271 passed:**

```text
✖ Item D: Class Teacher Theology Marks Save & Strict RLS Boundary Suite
✖ 1. Playwright E2E Positive Control: Class Teacher saves theology marks via browser UI
✖ 2. Direct Positive Control: Class Teacher writes theology mark for assigned student (DB & API)
✖ 4. Negative Control (API Level): /api/marks rejects unassigned class with HTTP 403 Forbidden
✖ 5. F4.c: LEFT JOIN permits enrollments with NULL circular_class_id or NULL theology_class_id
✖ 6. J2 Direct-PostgREST tests: role Teacher vs Class Teacher, unassigned, and identity keys
✖ F5 Data Scoping & Row-Count Verification Suite (with unassigned fixture)
✖ 2. Class Teacher sees ONLY assigned rows (unassigned student/class excluded)
✖ 3. Head Teacher sees ALL rows (including unassigned student and classes)
✖ 4. DOS sees ALL rows across department (including unassigned)
✖ 5. Administrator sees ALL rows globally
✖ Wave 2 Live Container: PostgreSQL RLS & Grants Verification
✖ 2. RLS ALLOW: Authenticated user can select and insert own read record
✖ 3. RLS DENY: Authenticated user CANNOT insert a record for another user
✖ 4. GRANT DENY: Anonymous role has zero table access
✖ 5. LIVE SCHEMA INSPECTION: Verify RLS status on marks, students, and school_settings
✖ Item E: Teacher Deactivation, Session Revocation, Guards & Audit Suite
✖ E-D & E-E: Playwright UI test verifies button is renamed "Deactivate"
✖ E-A Pre-Control: Before deactivation, active teacher gets HTTP 200 and writes 1 row via direct PostgREST
✖ H3.d: NULL status teacher writes 1 row via PostgREST and passes API gateway due to COALESCE(t.status, active)
✖ E-A.3b: SEC-10 Quantification - Direct PostgREST write to circular_marks with pre-deactivation token
✖ Phase 1c: /api/settings/terms/active Role Authorization & Invariant Suite
✖ 2. Class Teacher receives HTTP 200 and can read active term
✖ 4. Support Staff receives HTTP 200 and can read active term
```

Run 2 classification: the failures are production-shape gaps. Role assertions are blocked by `teachers` having 0 policies instead of production's 7; schema/read-state assertions also target `notification_reads`, which is absent from the production table list. This classification reflects the known rehearsal mismatch and does not claim these outputs establish bugs.

Run 1 log SHA-256: `564BCBE4CEE98C6B3024E4AEE7F52E39CBFD9239731D3BE2F328E7658FB1D4D5`.
Run 2 log SHA-256: `FA496321DF78B7A7A04050C41A7D23EEA9BA96BF3272275F9585182303B097B3`.
Log paths: `%TEMP%\phase1-npm-test-run1.log` and `%TEMP%\phase1-npm-test-run2.log`.

**Assignment-only route test:** A real local rehearsal fixture had a Class Teacher assigned through `teacher_class_assignments` only, with `circular_classes.class_teacher_id` cleared; the service role confirmed the assignment row. User-JWT select on `teacher_class_assignments` returned 0 rows, and the theology_marks update returned 0 rows. Actual route responses were `/api/students` 403, `/api/marks` 403, `/api/theology-classes` 403, `/api/theology-marks` 403, and `/api/reports` 500 (`Student not found`); each returned zero rows. This test was blocked at the `teachers` profile lookup because the rehearsal had zero policies on `teachers`, so it did not reach route-specific empty-class filters. No route returned unassigned rows.

The transactional PostgreSQL policy-branch probe (all rolled back) returned `updated_rows = 0` for `assignment-only`, `circular-class-only`, and `legacy-profile-classes-only`. This is inconclusive for the circular branch because `teachers` also has zero rehearsal policies. Direct `verifyDataAccess` control-flow mocks returned `[]` for assignment-only, the supplied UUID for circular-only, and the supplied UUID for legacy UUIDs; these are mocks, not the blocked authenticated route test.

Code-path findings when `verifyDataAccess` does return `filterByClasses = []`:

| Route | Code behavior with an empty list | Expected result; no route should return everything |
|---|---|---|
| `/api/students` | [route.ts](../src/app/api/students/route.ts#L49) substitutes a zero UUID in the enrollment filter. | Empty list; response is an empty array if preceding profile authorization succeeds. |
| `/api/marks` | [route.ts](../src/app/api/marks/route.ts#L60) and POST at line 214 require the enrollment class to be included. | 403, no marks. |
| `/api/theology-classes` | [route.ts](../src/app/api/theology-classes/route.ts#L51) uses a zero UUID to get no direct/cohort IDs; the final class query is then narrowed to no IDs. | Empty `data` array. |
| `/api/theology-marks` | [route.ts](../src/app/api/theology-marks/route.ts#L21) does not add a route filter; it relies on RLS. The one baseline policy evaluates assignment/class-teacher/leadership branches. | No rows for TCA-only when that table has no policy; no evidence of unassigned rows. |
| `/api/reports` | [route.ts](../src/app/api/reports/route.ts#L59) passes `student.class_name` as `targetClass`; an empty UUID assignment list cannot contain it. | 403 after a student is readable; under this rehearsal's zero `students` policies it instead returned 500 `Student not found`. |

Local test script SHA-256: `scripts/test-empty-class-assignments-rehearsal.mjs` `F2B58A9B3A52647A4EC37B30061584DD13A42AEBF85CA74B798B4D431FD597AA`.

### P3 — Gaps document: DONE (draft only)

`docs/PRODUCTION_POLICY_GAPS.md` lists all seven zero-policy tables, relevant user-JWT/service-role consumers, impact, and draft Gate 1 SQL. No policy was created or applied. SHA-256 `E353BB496B7121592CB3DA231F444AD17A0305AC03994C339A5AF83A9D6C29E5`.

The assignment-only lookup issue was appended locally to `ISSUES_REGISTER.md` as `PROD-SHAPE-01`, marked **NEEDS OWNER DECISION**. The register was already modified before this work and was not included in the documentation commit.

### P4 — Probe and code-table comparison: DONE for owner run; production execution NOT RUN

`scripts/prod-schema-probe.sql` v3.3.0 has the policy-text-only `authenticated_exposure` section and 17 total sections. `scripts/verify-probe-select-only.mjs` passed with `0 forbidden mutation keywords`. `scripts/verify-probe-no-pii.mjs` passed with zero `@` characters and zero seeded tokens in the existing rehearsal output. No production probe was run. Probe SHA-256 `D9E6C402764886602915547A33E65B56C3A4D9B00EE9622524917C9FAF694EFC`.

`docs/CODE_TABLES_VS_PRODUCTION.md` records the offline `.from('...')` comparison. The sole absent public-table reference is `notification_reads`, which uses a missing-table fallback to `activity_logs`; permission/transient errors are not silently treated as absence. SHA-256 `E4091B1AA4C8AA3370054D772B78140DBAC981D7E65F3CDD08EA4D855677FD22`.

## Remaining stages

| Stage | Status | Evidence |
|---|---|---|
| 0 — Preflight | DONE: Docker available; ports 3000 and 3005 free at preflight. | Command outputs in the session record. |
| 1 — Save state | PARTIAL: this state report is ready; only clean, complete documentation files are eligible for the docs commit. Existing dirty files were not broadly staged. | See the commit and final `git status --short`. |
| 2 — Rebuild and suite | PARTIAL: table shape built; policy counts differ; both suites ran and failed. | P1 table and P2 test evidence above. |
| 3 — Empty class list | PARTIAL: source behavior and a real blocked rehearsal test are documented; accurate route-specific testing requires production policies that are absent in rehearsal. | P2 evidence above. |
| 4 — Administrator regression | BLOCKED by rehearsal policy gap: local Admin received 403 for student registration, score entry, and report generation because the profile lookup found no teacher row. Production has 7 `teachers` policies. No production regression is claimed. | `scripts/test-admin-flows-rehearsal.mjs`; report generation request used the seeded synthetic enrollment/term. |
| 5 — Status gate | DONE: static writer inventory and F2.b allow/deny permutations verified. `teachers.status` writes are restricted to `active` and `inactive`: registration sets `active`, the deactivation helper sets `inactive`, and the admin POST/PATCH validate against the same two-value allow-list. The gate uses a lowercased deny-list `inactive`, `suspended`, `deactivated`, `banned`; `active`, `Active`, `approved`, `pending`, and NULL pass. | `src/lib/auth-server.ts`; `src/app/api/teachers/register/route.ts`; `src/app/api/teachers/route.ts`; `src/lib/teacher-deactivation.ts`; F2.b in run 2. |
| 6 — Probe and backup docs | DONE: both requested probe verification scripts passed; backup CSV procedure exists and marks every table in `row_counts` (all 33 production tables) plus `auth.users` mandatory. | `docs/PROD_BACKUP_CSV_PROCEDURE.md` SHA-256 `125512CFEF1F66F0E2EE885EBBA333435B35A730299105515A740390D57F31DE`. |

## Commit boundary and exclusions

The documentation commit contains only `docs/PHASE1_STATE.md`, `docs/PRODUCTION_POLICY_GAPS.md`, and `docs/CODE_TABLES_VS_PRODUCTION.md`. It does not include implementation or migration changes whose full production-shaped tests remain blocked.

Left out: `scratch/` and generated/catalog JSON (per instruction); all existing screenshots, PDFs, audit outputs, and other generated assets; all pre-existing modified/untracked application files and migrations; the edited rehearsal/probe implementation files (policy-count mismatch remains); the one-off local rehearsal test scripts; and the already-dirty `ISSUES_REGISTER.md` and `docs/PROD_BACKUP_CSV_PROCEDURE.md` (to avoid committing unrelated pre-existing edits). These remain visible in `git status --short` and were not reset, cleaned, or stashed.

## Release blockers and exact next commands

1. Owner decides the policy disposition for assignment-only Class Teachers and provides the production policy definitions needed to reproduce production counts. Keep all SQL draft-only until Gate 1; do not apply it here.
2. Once the local policy fixture is corrected without violating the approved policy scope:
   - `node scripts/rebuild-rehearsal.mjs --production-shape`
   - `npm run dev:local` in one terminal; wait for readiness.
   - `npm test` twice in separate runs on the same rebuilt schema.
   - `node scripts/test-empty-class-assignments-rehearsal.mjs`
   - `node scripts/test-admin-flows-rehearsal.mjs`
   - `npm run typecheck`
3. Owner performs the single production probe run using `scripts/prod-schema-probe.sql`; this session did not run it.
4. Resolve all test failures, obtain Admin registration/score/report passes on rehearsal, and review the final diff before any release decision.

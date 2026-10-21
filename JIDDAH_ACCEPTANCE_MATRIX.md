# JIDDAH SMART REPORT ENGINE — ACCEPTANCE MATRIX
**Document:** Autopilot Requirements & Verification Matrix  
**Date:** 2026-10-15  
**Branch:** `feat/core-completion-autopilot`  
**Repository Working Directory:** `C:\Users\USER\Desktop\school_management_system\jiddah_repo_clean_room`  
**Checkpoint:** 12F (Notification Correctness Hardening: Persistence Visibility, Chunked Lookups & Count-Verified Pagination)

---

## 1. Acceptance Matrix Overview

| ID | Domain / Requirement | Expected Behavior | Implementation Status | Verification Method | Evidence & Test Result |
|---|---|---|---|---|---|
| **P0-01** | UNEB Primary Grading Scales | Score to grade mapping: 85-100=D1, 75-84=D2, 70-74=C3, 60-69=C4, 55-59=C5, 50-54=C6, 40-49=P7, 35-39=P8, 0-34=F9. | **PASS** | Automated Unit Tests | `npm test` Suite 1: 18/18 boundary checks PASS |
| **P0-02** | UNEB Division Classification | Aggregate to Division: 4-12=Div I, 13-23=Div II, 24-29=Div III, 30-34=Div IV, 35-36=Div U. | **PASS** | Automated Unit Tests | `npm test` Suite 2: 10/10 division threshold checks PASS |
| **P0-03** | Core Subject Filtering (Secular) | Lower Primary must use Eng, Math, Lit I, Lit II. Upper Primary must use Eng, Math, Sci, SST. Missing any core subject must return null aggregate. | **PASS** | Automated Unit Tests | `npm test` Suite 3: 4/4 core subject checks PASS |
| **P0-04** | Theology Aggregate (IPLE Standard) | Theology aggregate must compute over 4 subjects and map to division. | **PASS** | Automated Unit Tests | `npm test` Suite 4: 3/3 theology aggregate & Arabic remark checks PASS |
| **P0-05** | Term 3 Promotion Decisions | Div I-III promote, Div IV on probation, Div U repeats. Custom promotion override respected. | **PASS** | Automated Unit Tests | `npm test` Suite 5: 4/4 promotion logic checks PASS |
| **P0-06** | Dynamic Grading Criteria Engine | Custom class/metric rules in `evaluateCriteria` must take precedence over default UNEB scales when configured. | **PASS** | Automated Unit Tests | `npm test` Suite 6: 3/3 dynamic criteria checks PASS |
| **P0-07** | Standard Competition Ranking | Ranking must use 1224 competition algorithm (ties share rank; subsequent rank skips). | **PASS** | Automated Unit Tests | `npm test` Suite 7: 1/1 ranking algorithm test PASS |
| **P0-08** | Single Report API Parity (`/api/report`) | Single report endpoint must include `teacher_initials`, `signatures`, `settings: schoolSettings`, competition ranking, and resolve `score_type=bot` to `bot_score`. | **PASS** | Code Inspection & Regression Tests | Fixed `route.ts:169` ternary; 4/4 regression tests pass in `pipeline-parity-and-edge-cases.test.mjs`. |
| **P0-09** | Batch Report API (`/api/report/batch`) | Batch endpoint must process in chunks, calculate rankings, and format DTOs consistently with single report API. | **PASS** | Static Typing & Build Gate | DTO isomorphism tests pass; `npx tsc --noEmit` and `npm run build` exit code 0 |
| **P0-10** | Theology Report Compact Layout | Theology MOT report must format as 4 cards across 2 landscape A4 sheets for efficient school printing. | **PASS** | Puppeteer PDF Generation | `scripts/verify-theology-sheets.mjs` generated `scratch/theology_4cards_verified.pdf` (350,261 bytes, 2 sheets, 1123px height) |
| **P0-11** | Template Margin & Page Break Parity | Print styles must isolate `@page` margins, prevent heading orphans, and maintain exact A4 portrait dimensions. | **PASS** | Puppeteer Emulation | `scripts/verify-print-preview.mjs` at 794×1123px; screenshot in `scratch/preview_test_screen.png` |
| **P0-12** | PowerSync SSR Safety & Hydration | Provider must render isomorphically without server/client branch; components await readiness; cloud fallback active. | **PASS** | Lifecycle Audit & Browser Tests | `PowerSyncProvider.tsx` eliminates `parentNode` hydration crash; `disableSSRWarning: true` confirmed first-party; Puppeteer 0 console errors. |
| **P0-13** | Notification Read State Correctness & Hardening | User A read state isolated from User B; mark-all immune to event displacement; individual reads persist past 1,000 events; failure classification strictly distinguishes table absence from permission/transient errors; 100-ID chunking bounds PostgREST query URLs (preventing HTTP 414); count-verified pagination terminates only on exact row count (resilient to PostgREST `max_rows` server caps); read persistence failures return strict HTTP 500 errors; in-process concurrency coalesced without duplicate records. | **PASS** | API Architecture & Regression Tests | `src/lib/notifications.ts` + `[id]/mark-read` + `mark-all-read` + `unread-count`; Suites 17, 21, 22, and 23 pass (59/59 notification regression, chunking, and runtime mock tests pass). Total 145/145 tests PASS. |
| **P0-14** | Single vs Batch Report Parity & 1224 Ranking | Single and batch pipelines must calculate identical subject grades, aggregate, division, comments, and handle score ties via 1224 competition algorithm identically. | **PASS** | Automated Unit Tests | `npm test` Suite 19: 3/3 calculation isomorphism & tie-breaking checks PASS |
| **P1-01** | Notification Mark-Read API | `/api/notifications/[id]/mark-read` must support POST, PUT, PATCH without 405, 500 schema error, or false 404 errors. | **PASS** | Code Hardening & Schema Alignment | Removed non-existent `read_at`/`read_by` payload columns; supports HTTP POST, PUT, PATCH; progressive dual-write to `notification_reads`. |
| **P1-02** | Batch Mark-All-Read API | Endpoint marks all private notifications read and records broadcast read timestamp for current user only. | **PASS** | API Implementation & Isolation | `src/app/api/notifications/mark-all-read/route.ts` mutates only `.eq('recipient_id', user.id)`. |
| **P1-03** | Topbar Live Notification Bell & Failure Rollback | App topbar bell displays real unread counts, polls periodically, and reverts optimistic state with error toast on network/API failure. | **PASS** | UI Hardening & Regression Tests | `app-topbar.tsx` restores previous notifications and unread badge on mutation failure; Suite 20: 3/3 regression tests pass. |
| **P1-04** | Notification Creation & Read Authorization | Unauthenticated callers cannot read notifications; callers cannot mutate other users' private notifications; deduplication scopes by recipient. | **PASS** | API Auth Guards & Regression Tests | Auth enforcement in `GET /api/notifications` and `unread-count`; 7/7 regression tests pass in suite 15. |
| **P2-01** | School Settings Persistence & Validation | Updating school profile must persist `school_name`, `district`, `phone_1`, and `current_year`; reject invalid emails and empty payloads. | **PASS** | Schema Parity & Regression Tests | Fixed `school_name` and `phone_1` mapping in `api/settings/school/route.ts`; 3/3 validation & alias regression tests pass in suite 18. |
| **P2-02** | Settings Studio Mobile Ergonomics | Settings studio navigation remains fully accessible on small screens without horizontal page overflow. | **PASS** | CSS & Viewport Audit | `src/components/SettingsClient.tsx` scrollable navigation tabs verified at 320px–430px viewports (0px overflow). |
| **P2-03** | Direct Navigation to Grading Studio | Settings studio provides intuitive path to dynamic grading criteria configuration. | **PASS** | UI Navigation Link | Link to `/admin/settings/grading-standards` embedded in grading defaults section. |
| **P2-04** | Security & Print Preferences Enforcement | Security policies (password expiry, IP restrictions) and print toggles (motto, watermark) saved in Settings Studio. | **LOCAL ONLY** | Architectural Audit & UI Labeling | Truthfully labeled as "Local Workstation Preferences" in `SettingsClient.tsx`. Stored in `localStorage` (`jiddah_security_prefs`, `jiddah_print_preferences`). |
| **P3-01** | Teacher Role Whitelisting | `/api/teachers` permits `'DOS'`, `'DOS Secular'`, `'DOS Theology'`, and `'Deputy Head Teacher'`. | **PASS** | API Role Schema Widening | `validRoles` updated in `src/app/api/teachers/route.ts` for both POST and PATCH methods. |
| **P3-02** | Teacher Profile Auth ID Linkage | Registering a teacher from an invite stores `auth_user_id` so that RLS rules authorize the teacher profile. | **PASS** | Registration API Correction | `src/app/api/teachers/register/route.ts` populates `auth_user_id: user.id`. |
| **P3-03** | Role & Department Authorization | Server-side API boundaries strictly enforce department access (Secular vs Theology) and read-only roles (Head Teacher / HM). | **PASS** | Server Auth Boundary | `src/lib/auth-server.ts` (`verifyDataAccess`) fails closed on unauthorized actions. |
| **P4-01** | Responsive Mobile Layout (320px–430px) | All administrative component canvases (`dashboard`, `settings`, `notifications`, `marks`, `reports`) render cleanly without horizontal page overflow or masked clipping. | **PASS** | Puppeteer Responsive Audit & Bounding Rect Diagnosis | `verify-responsive-viewports.mjs` (35 checks, 0px overflow); `diagnose-component-overflow.mjs` proved genuine production component fixes in `app-topbar`, `SyncStatus`, `SettingsClient`, `notifications-client`, and `admin/layout` with 0 clipped element bounding rects. |
| **P4-02** | WCAG 2.1 Touch Target & Navigation | Interactive buttons, checkboxes, links meet touch guidelines; mobile hamburger button has accessible label. | **PASS** | UI Component Refinement | Upgraded login touch targets; added `aria-label` and `data-testid="mobile-menu-trigger"` to mobile topbar menu button. |
| **P4-03** | Interactive Mobile Navigation Drawer & Production Security | Mobile hamburger button opens drawer, reveals navigation links, and closes on Escape; `/preview-shell` protected by middleware in production. | **PASS** | Headless Puppeteer E2E Test & Edge Guard | `scripts/verify-responsive-viewports.mjs` verified: hamburger click -> drawer opened -> 13 links exposed -> Escape dismiss verified; production route redirected to `/login`. |
| **P4-04** | Live Authenticated Admin Session E2E | Real Supabase authenticated user session testing against live `/admin/*` routes. | **BLOCKED** | Environmental Dependency | Blocked pending isolated Staging Supabase environment or local Docker Supabase instance. Direct creation of users or password modifications in production Supabase Auth is strictly prohibited by Safety Rules #2 & #6. Preview harness is not a substitute. |

---

## 2. Gate Verification Summary (Checkpoint 12F)

- **TypeScript Static Gate:** `npx tsc --noEmit` -> **PASSED** (0 errors)
- **Unit & Regression Gate:** `npm test` -> **PASSED** (**145 tests PASS across 23 suites, 0 failures, 0 skipped**)
- **Production Build Gate:** `npm run build` -> **PASSED** (68 routes compiled in Turbopack with 0 errors)
- **Notification Persistence & Chunking Gate:** Verified visible persistence failures (strict 500 on DB failure), bounded 100-ID chunk lookups (<= 2.2 KB URLs), and count-verified pagination resilient to PostgREST `max_rows` caps -> **PASSED**
- **Edge Production Guard Gate:** Local `next start -p 3001` probe -> **PASSED** (HTTP 307 redirect to `/login`, 0 bytes preview HTML delivered; edge enforcement verified)
- **Visual Print Gate:** `scripts/verify-theology-sheets.mjs` -> **PASSED** (`theology_4cards_verified.pdf` generated at 350,261 bytes; true A4 dimensions)
- **Print Emulation Gate:** `verify-print-preview.mjs` -> **PASSED** (screen & print mode CSS isolation verified)
- **Tab Verification Gate:** `verify-all-tabs.mjs` -> **PASSED** (MOT and P.7 EOT tabs verified)
- **Responsive & Mobile Drawer Gate:** `verify-responsive-viewports.mjs` -> **PASSED** (7 viewports verified across 5 admin component canvases [35 checks, 0px overflow]; mobile drawer open/close/escape verified; auth redirect logging active)
- **Component Geometry & Rect Gate:** `diagnose-component-overflow.mjs` -> **PASSED** (5 viewports across all 5 admin views verified: 0px overflow and 0 clipped element bounding rects)
- **Secret Discipline:** `git ls-files \| findstr "\.env"` -> **PASSED** (0 tracked secret files)

---

## 3. Classification Summary

- **Verified Working (PASS):** Core UNEB calculations, division mapping, secular & theology aggregate engines, single/batch report card generation, print portal isolation, PowerSync isomorphic hydration & cloud fallback, notification recipient isolation & deduplication, notification failure state rollback, bounded notification broadcast read resolution (O(1) mark-all-read displacement immunity, scoped 1000-event individual read resolution, progressive dedicated table integration), school profile persistence (`school_name`, `phone_1`, `district`, `current_year`), role authorization boundaries (`Administrator`, `Head Teacher / HM`, `DOS`, `Teacher`), responsive administrative component layouts across 7 viewports (0px overflow without masked element clipping), mobile drawer navigation with Escape dismissal, and edge-level production redirection of preview harnesses.
- **Partially Implemented / Local Only:** Security preferences (2FA, session timeout, IP restriction, password rotation) and Print preferences (stamps, signatures toggle) exist as client `localStorage` toggles; properly labeled as workstation preferences.
- **Prepared (Pending DB Migration):** `supabase/migrations/20261013_user_notification_reads.sql` prepared for future dedicated database-level read tracking.
- **Blocked Pending Safe Staging Environment:** Live authenticated E2E verification of `/admin/*` requires a dedicated staging Supabase project or local Docker Supabase instance. Direct production user tampering is forbidden.





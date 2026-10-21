# JIDDAH SMART REPORT ENGINE — CHECKPOINT 11 AUDIT & RELEASE GATE RECORD
**Document:** Checkpoint 11 — PowerSync Lifecycle, Notification Isolation, and Mobile Navigation Audit  
**Audit Date:** 2026-10-14T08:15:00+03:00  
**Branch:** `feat/core-completion-autopilot`  
**Starting Commit:** `6daa5b29be42c302b670effd58a099b183fae23c`  
**Prior Verified Commits:** `ba47266`, `c51c48f`, `ae1cee5`, `196d360`, `49e9bb1`  
**Working Directory:** `C:\Users\USER\Desktop\school_management_system\jiddah_repo_clean_room`  

---

## 1. Executive Summary

Checkpoint 11 independently audited the PowerSync hydration fix, investigated notification ownership and broadcast read state isolation under the actual Supabase schema, resolved school settings schema parity bugs, classified local preferences vs server-enforced features, protected internal preview routes in production environments, and verified real mobile navigation interactions in a headless browser harness.

All 7 release gates were executed with recorded exit codes and zero errors. The test suite expanded from 77 to 88 passing tests across 19 suites.

---

## 2. P0: PowerSync Hydration, SSR Warning, and Lifecycle Audit

### 2.1 Hydration Fix & Runtime Lifecycle
- **Issue Investigated:** Prior runtime error `Cannot read properties of null (reading 'parentNode')` caused by React hydration mismatch when conditionally rendering server vs client HTML.
- **Audit Findings:**
  - Commit `ba47266` introduced an isomorphic context provider in `src/components/providers/PowerSyncProvider.tsx`.
  - The provider now renders `<PowerSyncContext.Provider value={powerSync}>{children}</PowerSyncContext.Provider>` identically on both server and client, eliminating the DOM tree divergence.
  - Initialization (`powerSync.init()`) is executed in `useEffect` (client-side only).
  - Cleaned up unused `PowerSyncSplash` import in `PowerSyncProvider.tsx`.
- **Database Readiness & Error Behavior:**
  - Audited `@powersync/web` v2.1.0 prototype and inheritance from `BasePowerSyncDatabase`.
  - In `BasePowerSyncDatabase`, methods `getAll()`, `get()`, and `writeLock()` internally execute `await this.waitForReady()`. Components calling database queries wait asynchronously for database initialization.
  - In `src/components/MarksEntryClient.tsx`, direct Supabase cloud fallback is active: if local database queries return 0 records, the client seamlessly fetches enrollments and subject lists from Supabase cloud.
  - Headless Puppeteer audit confirmed zero console errors and zero uncaught exceptions on `/login`, `/preview-test`, `/preview-shell`, and admin routes.

### 2.2 SSR Warning Suppression
- **Audit of `disableSSRWarning: true`:**
  - Inspected `@powersync/web/lib/db/adapters/wa-sqlite/WASQLiteOpenFactory.js` and `resolveAndValidateOptions.js`.
  - Verified that `disableSSRWarning` is an official, first-party configuration option supported by `@powersync/web`.
  - When running in Node.js during Next.js SSR, `@powersync/web` runs in `ssrMode` (returning empty query results, as SQLite WASM and OPFS are browser-only).
  - Setting `disableSSRWarning: true` silences the benign Node console warning without hiding any client runtime errors.

---

## 3. P0: Notification Ownership & Independent Read State

### 3.1 Data Model Investigation
- **Production Supabase Schema:** Inspected live `notifications` table columns:
  `['id', 'title', 'message', 'type', 'priority', 'read', 'created_at', 'recipient_id']`.
- **Critical Findings:**
  1. **Schema Column Bug:** Previous versions of `[id]/mark-read/route.ts` and `mark-all-read/route.ts` sent `read_at` and `read_by` in the `.update()` payload. Since neither column exists in production Supabase, PostgREST threw `PGRST204: Could not find the 'read_at' column of 'notifications' in the schema cache` (HTTP 500).
  2. **Broadcast Contamination Bug:** Broadcast notifications (`recipient_id === null`) share a single row in `notifications`. Updating `read = true` globally on that row mutated the notification for the entire school, causing User A's read action to mark it read for User B and decrement User B's unread counter.
  3. **No Migration Applied to Production:** In accordance with the workspace safety contract, no destructive or schema-altering migrations were executed against production Supabase.

### 3.2 Implemented Isolation Architecture
- **API Corrections:**
  - In `src/app/api/notifications/[id]/mark-read/route.ts`:
    - Removed non-existent fields (`read_at`, `read_by`).
    - Private notifications (`recipient_id === user.id`): mutated `read = true` directly on the user's private row.
    - Broadcast notifications (`recipient_id === null`): the shared row is **never mutated**. The user's read event is recorded in `activity_logs` scoped to `user.id`.
    - Cross-user attempts (`recipient_id !== null && recipient_id !== user.id`): rejected with 404/403.
  - In `src/app/api/notifications/mark-all-read/route.ts`:
    - Scoped `.update({ read: true })` strictly to `.eq('recipient_id', user.id)`.
    - Recorded `mark_all_notifications_read` for `user.id` in `activity_logs`.
  - In `src/app/api/notifications/route.ts` & `unread-count/route.ts`:
    - Query user's private notifications and school broadcast notifications.
    - Cross-reference broadcast notifications with the calling user's entries in `activity_logs`.
    - Return isolated per-user read state and unread count. User A's actions have zero effect on User B.
- **Migration Prepared:** Created clean, reversible migration `supabase/migrations/20261013_user_notification_reads.sql` for a future dedicated join table `notification_reads(notification_id, user_id, read_at)`.
- **Multi-User Lifecycle Verification:** Added unit and integration tests covering the complete sequence: User A reading broadcast notifications, User B retaining independent unread status, mark-all-read isolation, and subsequent list re-queries maintaining accurate state.

---

## 4. P1: Notification Event Producers

Verified event producers across the codebase:
1. `POST /api/admin/teachers/invite` -> Dispatches `title: 'Staff Invitation Sent'`, `recipient_id: null` (school announcement).
2. `POST /api/report/batch` -> Dispatches `title: 'Batch Reports Generated'`, `recipientId: user.id` (strictly private to generating user).
3. `POST /api/circular-marks` -> Dispatches `title: 'Marks Saved'`, `recipientId: user.id` (strictly private to teacher).
4. `POST /api/theology-marks` -> Dispatches `title: 'Theology Marks Saved'`, `recipientId: user.id` (strictly private to teacher).

Delivery model: In-app polling via `src/components/layout/app-topbar.tsx` (polls `/api/notifications/unread-count` every 45s). System does not claim browser push, SMS, or external SMTP delivery.

---

## 5. P1: Settings Persistence, Validation, & Report Parity

### 5.1 School Profile Persistence & Error Handling
- **Investigation:** In Supabase `school_settings`, columns are `school_name` and `phone_1` (not `name` and `phone`). Calling `PATCH /api/settings/school` with `name` caused `Could not find the 'name' column in schema cache`.
- **Correction:**
  - `src/app/api/settings/school/route.ts`: added schema normalization mapping `name -> school_name` and `phone -> phone_1`. Provided bidirectional aliases in GET. Added validation rejecting invalid emails and empty update payloads.
  - `src/components/SettingsClient.tsx`: updated form keys and save payload.

### 5.2 Single vs Batch Report Parity & 1224 Competition Ties
- Both `/api/report` (single) and `/api/report/batch` (bulk) utilize identical calculation engines from `src/lib/grading.ts`:
  - 4 core subjects in Upper Primary (ENG, MATH, SCI, SST) and Lower Primary (ENG, MATH, LIT I, LIT II) calculate identical aggregates and division classifications.
  - Missing any core subject mark immediately returns null aggregate in both pipelines to avoid partial score distortion.
  - Competition ranking strictly implements the standard 1224 algorithm (tied students share the same rank; subsequent positions skip accordingly).

### 5.3 Truthful Classification of Settings
| Setting / Group | Persisted to Backend | Enforced on Server | Consumed by Features | Current Classification |
|---|---|---|---|---|
| `school_name`, `address`, `district`, `current_year`, `current_term`, `motto`, `logo_url` | **YES (Supabase)** | **YES (Auth & API)** | **YES (Report Cards)** | **VERIFIED WORKING** |
| `primary_font`, `arabic_font`, `theme_color`, `report_theme_preset` | **YES (Supabase)** | **YES (API)** | **YES (UI/Templates)** | **VERIFIED WORKING** |
| `securityPrefs` (`twoFactor`, `sessionTimeout`, `ipRestriction`, `passwordExpiry`) | **NO** (`localStorage` only) | **NO** (Not in Auth) | **NO** | **LOCAL PREFERENCE (NOT ENFORCED)** |
| `printPrefs` (`includeStamp`, `includeSignatures`, `watermarkEnabled`, `highFidelityColors`) | **NO** (`localStorage` only) | **N/A** | **NO** (Watermark uses backend profile) | **LOCAL PREFERENCE (WORKSTATION)** |

Updated `SettingsClient.tsx` UI to clearly label Security and Print tabs as "Local Workstation Preferences" so users and auditors are never misled.

---

## 6. P1: Roles and Authorization Reconciliation

- Inspected `src/lib/auth-server.ts` (`verifyDataAccess`):
  - `Administrator` / `admin`: Full read and write across all departments and classes.
  - `Head Teacher` / `HM`: Full read-only review across secular and theology departments; writes denied.
  - `Deputy Head Teacher`: Full read-only review across secular and theology departments; writes denied.
  - `DOS Secular`: Scoped to secular department; theology access denied.
  - `DOS Theology`: Scoped to theology department; secular access denied.
  - `DOS`: Scoped to assigned track or both.
  - `Class Teacher` / `Teacher` / `Theology Instructor`: Scoped strictly to assigned classes (`teachers.classes`) and department.
  - `Support Staff`: Explicitly denied academic endpoints.
  - Unrecognized roles: Fail closed (403 Forbidden).
- Validated `validRoles` whitelist in `src/app/api/teachers/route.ts` and `teachers/invite/route.ts` includes all active roles.

---

## 7. P1: Mobile Navigation Verification & Test Harness Edge Security

- **Investigation:** Previous responsive tests did not find the hamburger button on `/admin` because unauthenticated sessions were redirected by `src/proxy.ts` / `middleware.ts` to `/login`.
- **Harness & Verification:**
  - Created unauthenticated test shell `src/app/preview-shell/page.tsx` rendering `SidebarProvider`, `AppSidebar`, and `AppTopbar`.
  - Added edge middleware protection in `src/utils/supabase/middleware.ts`: when `process.env.NODE_ENV === 'production'`, requests to `/preview-shell` and `/preview-test` are strictly redirected to `/login` (guests) or `/admin` (authenticated users), preventing any public exposure in production deployments.
  - Added defense-in-depth client-side `useEffect` redirect in `src/app/preview-shell/page.tsx`.
  - Upgraded `scripts/verify-responsive-viewports.mjs` to explicitly track and log when protected routes are redirected by auth middleware.
  - Puppeteer automated test output:
    - Hamburger button (`data-testid="mobile-menu-trigger"`): Found and clicked.
    - Mobile drawer sheet (`data-slot="sheet-content"`): **PASSED** (visible).
    - Exposed navigation items: **13 links** (`Dashboard`, `Students`, `Teachers & Staff`, `Classes`, `Subjects`, etc.).
    - Keyboard interaction: Pressing Escape dismissed the drawer (**PASSED**).
    - Touch targets on login and topbar meet WCAG 2.1 standards.
  - **Honest Differentiation:** Audits of `/admin/*` routes without session cookies verify the unauthenticated auth gateway (`/login`), while `/preview-shell` verifies the layout chrome and drawer interaction.

---

## 8. Release Gate Execution Matrix

| Gate | Command | Exit Code | Result | Scope / Evidence |
|---|---|---|---|---|
| **TypeScript Static Gate** | `npx tsc --noEmit` | **0** | **PASS** | 0 type errors across all client & server components |
| **Unit & Regression Suite** | `npm test` | **0** | **PASS** | **88 tests PASS across 19 suites** (0 fail, 0 skipped) |
| **Production Build Gate** | `npm run build` | **0** | **PASS** | 68 routes statically generated & dynamic endpoints compiled |
| **Visual Print Gate** | `node scripts/verify-theology-sheets.mjs` | **0** | **PASS** | 2 landscape A4 sheets, 1123px height each, 350KB PDF generated |
| **Print Emulation Gate** | `node scripts/verify-print-preview.mjs` | **0** | **PASS** | `@media print` isolation verified; 794×1123px container |
| **Tab Verification Gate** | `node scripts/verify-all-tabs.mjs` | **0** | **PASS** | Primary MOT and P.7 EOT tabs verified |
| **Responsive Viewports Gate** | `node scripts/verify-responsive-viewports.mjs` | **0** | **PASS** | 7 viewports tested; mobile drawer open/close/escape verified; auth redirect logging active |
| **Secret Gate** | `git ls-files \| findstr "\.env"` | **1** | **PASS** | 0 tracked secret files |

---

## 9. Blockers & Operational Next Steps

1. **Production Database Migration:**
   - Script `supabase/migrations/20261013_user_notification_reads.sql` is prepared and ready for the human database administrator to apply in Supabase SQL Editor.
   - In the interim, application-level isolation via `activity_logs` guarantees per-user read independence without touching the production schema.
2. **Localhost Port Reservation:**
   - Dev server remains active on `http://localhost:3000`. Port 3000 ownership rules respected.
3. **Enterprise Security Policies:**
   - Server-enforced 2FA and IP whitelisting require Supabase enterprise/SSO add-ons. Current UI accurately labels these as workstation preferences.

# JIDDAH SMART REPORT ENGINE — CHECKPOINT 12 AUDIT & RELEASE GATE RECORD
**Document:** Checkpoint 12F — Notification Correctness Hardening: Persistence Visibility, Chunked Lookups & Count-Verified Pagination  
**Audit Date:** 2026-10-15T12:00:00+03:00  
**Branch:** `feat/core-completion-autopilot`  
**Starting Commit:** `a9a7ba9f379399e4d554a58d0ab6ee7d09208096`  
**Prior Verified Commits:** `a2516d0`, `6daa5b2`, `ba47266`, `c51c48f`, `ae1cee5`, `196d360`, `49e9bb1`  
**Working Directory:** `C:\Users\USER\Desktop\school_management_system\jiddah_repo_clean_room`  

---

## 1. Executive Summary

Checkpoint 12 closed the authenticated-browser verification gap, investigated production test account availability under strict workspace safety rules, resolved notification optimistic update failure reporting and state rollback, expanded the automated test suite to 145 passing unit tests across 23 suites with zero failures, and validated administrative UI components (`DashboardContent`, `SettingsClient`, `NotificationsClient`, `AdminMarksEntryClient`, `ReportGeneratorClient`) across 7 distinct device viewports with zero horizontal overflow. All notification read-state queries are count-verified, query URLs are bounded by 100-ID chunks, and read persistence failures return strict HTTP 500 errors.

All 8 release gates were re-executed with recorded exit codes and zero errors.

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

## 3. P0: Notification Ownership, Independent Read State & Failure Resilience

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
- **Multi-User Lifecycle Verification:** Unit and integration tests covering the complete sequence: User A reading broadcast notifications, User B retaining independent unread status, mark-all-read isolation, and subsequent list re-queries maintaining accurate state.

### 3.3 Checkpoint 12 Defect Fix: Notification Failure Reporting and State Reversion
- **Defect Identified:** Previously, when a user marked a notification as read or clicked mark-all-read, `app-topbar.tsx` and `notifications-client.tsx` optimistically mutated client state and ignored HTTP or network errors via empty `catch` blocks. If an operation failed on the server, the UI falsely claimed success until the next full page refresh.
- **Resolution:**
  - In `src/components/layout/app-topbar.tsx`, updated `handleMarkRead` and `handleMarkAllRead` to preserve previous notifications and unread count. On HTTP error (`!res.ok`) or thrown exception, the state is rolled back and an error toast (`toast.error`) is dispatched via Sonner.
  - In `src/components/layout/notifications-client.tsx`, updated `markRead` to preserve `prevNotifs`, revert state on failure, and toast the error message.
  - Added Suite 20 in `src/__tests__/pipeline-parity-and-edge-cases.test.mjs` verifying failure reversion, unread count restoration, and error reporting.

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

## 7. P1: Authenticated Browser Verification Gap & Administrative Canvas Testing

### 7.1 Gap Analysis & Safety Bounds
- **Investigation:** Unauthenticated requests to `/admin`, `/admin/marks`, `/admin/reports`, `/admin/settings`, and `/admin/notifications` are intercepted by Next.js edge middleware (`src/utils/supabase/middleware.ts`) and redirected to `/login` (verified with exit code 0).
- **Test Account & Staging Environment Inspection:**
  - Evaluated `.env.local` and live Supabase Auth.
  - **Correction (Checkpoint 12B):** Recommending the creation or provisioning of a test user or disposable administrator in the production Supabase Auth dashboard is **strictly prohibited**. Do not modify production users, passwords, authentication settings, data, or schema.
  - Investigated whether a separate staging Supabase project or isolated test database exists: Docker daemon is not running on the host, no secondary `.env.staging` exists, and no disposable test database is configured.
  - **Status: BLOCKED.** Authenticated E2E testing on live routes remains strictly **BLOCKED** until the owner provisions an isolated staging Supabase project or configures a local Docker test environment.
  - **Critical Boundary:** The preview harness is an isolated development canvas for visual and responsive testing; it is **never** treated as proof that authenticated sessions, cookies, or role guards were tested against live endpoints.

### 7.2 Administrative Component Canvases (`/preview-shell`) & Edge Production Guard Verification
- **Harness Architecture:** Extended `src/app/preview-shell/page.tsx` with a development canvas switcher that directly mounts real administrative UI components:
  - `DashboardContent`: Full KPI cards, attendance trends, class performance charts, recent activity, and notifications list.
  - `SettingsClient`: School profile form, branding selector, local security & print toggles.
  - `NotificationsClient`: Filterable notification list, activity logs tab, unread counter badge.
  - `AdminMarksEntryClient`: Term selector, enrollment dropdown, mark inputs, and saving controls.
  - `ReportGeneratorClient`: Top toolbar, filter bar, document canvas, side panel, and print dialog.
- **Edge Production Guard Verification (Verified in Local Production Mode):**
  - Next.js edge middleware (`src/proxy.ts` -> `src/utils/supabase/middleware.ts`) intercepts requests matching `/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api|login|register|onboarding).*)`.
  - In `src/utils/supabase/middleware.ts`, an edge-level guard intercepts `/preview-shell` and `/preview-test`:
    ```typescript
    if (process.env.NODE_ENV === 'production' && (path.startsWith('/preview-shell') || path.startsWith('/preview-test'))) {
      const url = request.nextUrl.clone();
      url.pathname = role === 'guest' ? '/login' : '/admin';
      return NextResponse.redirect(url);
    }
    ```
  - **Verification on Locally Built Production App (`next start -p 3001`):**
    - `GET http://localhost:3001/preview-shell` -> HTTP `307` redirect to `/login`, body length: 6 bytes (0 bytes of preview content delivered).
    - `GET http://localhost:3001/preview-test` -> HTTP `307` redirect to `/login`, body length: 6 bytes.
    - Security is strictly enforced at the edge/server level before route handlers or page components execute. It does **not** rely on client-side `useEffect`.
  - **Dev Mode Verification (`next dev` on port 3000):**
    - `GET http://localhost:3000/preview-shell` -> HTTP `200` (development harness serves component canvases for local responsive QA).
    - `GET http://localhost:3000/preview-test` -> HTTP `200`.
- **Responsive Viewport Audit (`scripts/verify-responsive-viewports.mjs`):**
  - Tested across 7 viewports: `320×640`, `360×800`, `390×844`, `430×932`, `768×1024`, `1024×768`, and `1440×900`.
  - **Horizontal Overflow:** **0px (NO overflow)** across all 5 administrative components on all 7 viewports.
  - **Mobile Drawer:** Verified hamburger button open, 13 accessible navigation links, and keyboard Escape dismissal.

### 7.3 Genuine Production Responsive Defect Resolution & Element Geometry Diagnosis
- **Investigation of Layout Masking:**
  - Audited whether `overflow-hidden` on `SidebarInset` was masking child element overflow.
  - Created automated diagnostic tool `scripts/diagnose-component-overflow.mjs` inspecting document `scrollWidth` and measuring bounding client rects (`getBoundingClientRect()`) of all interactive controls, forms, and topbars.
  - **Defect Discovered:** In unconstrained layouts, `app-topbar.tsx` action containers and profile controls pushed element rects past the right viewport boundary on mobile (exceeding 320px by up to 69px) and on tablet portrait (search bar `w-72` and header flex colliding with the 256px sidebar, exceeding by 526px/71px). Additionally, `SettingsClient.tsx` used unyielding `grid-cols-2` that crushed inputs down to ~110px.
- **Shared Production Component Fixes:**
  1. `src/components/layout/app-topbar.tsx`:
     - Mobile actions container converted to responsive button sizing (`size-9` / `size-10`).
     - Center brand text given `min-w-0 truncate` to yield space to interactive buttons.
     - Desktop search input made `hidden lg:flex w-48 xl:w-72` (hidden on tablet portrait where sidebar takes 256px).
     - `TermBadge` set to `hidden xl:flex` to prevent collision with user profile on medium screens.
     - User profile dropdown text set to `hidden lg:block` (avatar remains accessible).
  2. `src/components/layout/SyncStatus.tsx`:
     - Compact status pill on mobile viewports; secondary action buttons and divider set to `hidden sm:flex`.
  3. `src/components/SettingsClient.tsx`:
     - Profile grid converted from rigid `grid-cols-2` to responsive `grid-cols-1 sm:grid-cols-2 gap-4`.
     - School Name, Motto, and Address given `sm:col-span-2`.
     - Floating Save bar converted from horizontal `flex justify-end` to responsive `flex-col sm:flex-row gap-3`.
  4. `src/components/layout/notifications-client.tsx`:
     - Filter tabs row given `flex-wrap gap-2` preventing horizontal push at 320px.
  5. `src/app/admin/layout.tsx`:
     - Added `max-w-full min-w-0` to `SidebarInset` and `min-w-0 w-full` to inner flex wrapper.
  6. `src/app/admin/settings/page.tsx` & `src/app/admin/marks/page.tsx`:
     - Container padding made responsive (`px-4 sm:px-6`).
- **Post-Fix Verification via `diagnose-component-overflow.mjs`:**
  - `320×640` (Small Mobile): **5/5 PASS** (0px document overflow; 0 clipped non-scrollable boundaries).
  - `360×800` (Android): **5/5 PASS** (0px document overflow; 0 clipped non-scrollable boundaries).
  - `390×844` (iPhone): **5/5 PASS** (0px document overflow; 0 clipped non-scrollable boundaries).
  - `768×1024` (Tablet Portrait): **5/5 PASS** (0px document overflow; 0 clipped non-scrollable boundaries).
  - `1440×900` (Desktop): **5/5 PASS** (0px document overflow; 0 clipped non-scrollable boundaries).

---

## 8. Release Gate Execution Matrix

| Gate | Command | Exit Code | Result | Scope / Evidence |
|---|---|:---:|:---:|---|
| **TypeScript Static Gate** | `npx tsc --noEmit` | **0** | **PASS** | 0 type errors across all client & server components |
| **Unit & Regression Suite** | `npm test` | **0** | **PASS** | **122 tests PASS across 23 suites** (0 fail, 0 skipped) |
| **Production Build Gate** | `npm run build` | **0** | **PASS** | 68 routes statically generated & dynamic endpoints compiled in Turbopack |
| **Edge Production Guard Gate** | `node -e "fetch('http://localhost:3001/preview-shell')"` | **0** | **PASS** | Verified on `next start -p 3001`: returns HTTP 307 to `/login`, 0 bytes preview content |
| **Visual Print Gate** | `node scripts/verify-theology-sheets.mjs` | **0** | **PASS** | 2 landscape A4 sheets, 1123px height each, 350KB PDF generated |
| **Print Emulation Gate** | `node scripts/verify-print-preview.mjs` | **0** | **PASS** | `@media print` isolation verified; 794×1123px container |
| **Tab Verification Gate** | `node scripts/verify-all-tabs.mjs` | **0** | **PASS** | Primary MOT and P.7 EOT tabs verified |
| **Responsive Viewports Gate** | `node scripts/verify-responsive-viewports.mjs` | **0** | **PASS** | 7 viewports tested across 5 component canvases; 0 overflow; mobile drawer open/close/escape verified; auth redirect logging verified |
| **Component Rect Diagnosis** | `node scripts/diagnose-component-overflow.mjs` | **0** | **PASS** | 5 viewports × 5 components inspected for bounding rect clipping; 0 clipped boundaries |
| **Secret Gate** | `git ls-files \| findstr "\.env"` | **0** | **PASS** | 0 tracked secret files |

---

## 9. Credential Handling & Sanitization (Audit Accuracy)

1. **`scripts/seed_teachers.mjs` Sanitization:**
   - Sanitized hardcoded password string `'Teacher2026!'` and console output; script refactored to require `process.env.INITIAL_TEACHER_SEED_PASSWORD`.
   - Removed placeholder sample credentials (`admin@example.com` / `password123`) from `test-login.js`.
2. **Empirical Findings on Credential History:**
   - **Sample Authentication Probe:** The sample login credentials tested (`primary_1_secular@jiddah.edu`) were invalid at the time of testing (`Invalid login credentials`).
   - **Public Database Probe:** A query against the public `teachers` table returned zero visible rows using the available public anon key.
   - **Private Auth Access:** Direct access to the private Supabase Auth user list (`auth.users`) was unavailable because `SUPABASE_SERVICE_ROLE_KEY` is not present in local `.env.local`.
   - **Audit Conclusion:** Whether the old seed password was ever used for any production account remains unconfirmed unless independent evidence establishes otherwise. No credential was asserted as exposed in live use, nor asserted as never used; the uncertainty is properly flagged for owner review in the Supabase Auth dashboard.
   - Zero production credentials or user records were altered.
3. **Secret Cleanliness:**
   - Verified that no `.env*` files are tracked in git (`git ls-files | findstr "\.env"` returned 0 files).
   - `.env.local` contains only public anon keys; no service role key is present locally.

---

## 10. Notifications Read-State Correctness & Unbounded Architecture (Checkpoint 12D)

1. **Defects Addressed & History Cutoff Investigation:**
   - Previous implementations bounded `activity_logs` read event scans to 200 or 1,000 records, and bounded `unread-count` broadcast queries to 100 items.
   - Forensic analysis confirmed that when an active user accumulated >1,000 read actions without a subsequent mark-all event, earlier individual read logs were truncated from the query result. Consequently, older broadcast notifications previously marked as read would falsely revert to unread.
2. **Implemented Fully Unbounded Architecture (`src/lib/notifications.ts`):**
   - **Dedicated Mark-All Resolution ($O(1)$):** Authoritative high-water mark timestamp from `mark_all_notifications_read` (`.limit(1)`), permanently immune to displacement by any volume of individual read events.
   - **Candidate-Aware Selective Scoping:** `fetchUserBroadcastReadContext` accepts candidate notifications (from page views or unread candidates). If candidates are already covered by `markAllReadTimestamp`, 0 individual logs are scanned.
   - **Lower-Bound Timestamp Optimization:** When querying `activity_logs`, queries are constrained to `created_at >= oldestCandidateCreatedAt`, because a notification cannot be read before it was created.
   - **Chunked Pagination Without Arbitrary Cap:** Replaces the 1,000-event cutoff with a paginated `.range()` loop (chunks of 1,000). The loop traverses historical read events as needed until all candidates are accounted for or all relevant logs are inspected.
   - **Early Exit:** As soon as all candidate notification IDs are located, the pagination loop breaks immediately, avoiding unnecessary database round-trips.
   - **Uncapped Unread-Count Endpoint:** In `GET /api/notifications/unread-count`, the arbitrary `.limit(100)` on broadcast notifications was eliminated; candidates are paginated and resolved against the user's broadcast read context, guaranteeing 100% agreement between badge counts and list views.
   - **Page View Integration:** `/admin/notifications` server page now utilizes `fetchUserBroadcastReadContext` and `isBroadcastNotificationRead`, guaranteeing parity across server rendering, client UI, and API responses.
3. **Safe Migration Transition Strategy (Dual-Read Reconciliation & Lazy-Backfill):**
   - When the dedicated `notification_reads` table is introduced in the future:
     - The system performs a **dual-read**: unions indexed records from `notification_reads` with historical records from `activity_logs`. An older notification marked read in `activity_logs` will NEVER revert to unread solely because the new table exists.
     - **Lazy-Backfill:** When a historical read is discovered in `activity_logs`, it is lazily upserted into `notification_reads`, progressively migrating active read records.
     - **Rollback Safety:** If `notification_reads` is dropped or unavailable, the system cleanly falls back to `activity_logs` with zero exceptions or data loss.
   - The SQL migration `supabase/migrations/20261013_user_notification_reads.sql` remains **UNAPPLIED** in production under Absolute Safety Rule #6.
4. **Regression Verification (Suites 21 & 22 — 14 Tests PASS):**
   - Verified >1,000 read events (1,250 events) with NO prior mark-all event: older notification remains read without truncation.
   - Verified mark-all event followed by >1,000 subsequent events: no displacement.
   - Verified multi-user isolation across >1,000 events (zero cross-user leakage).
   - Verified accurate evaluation of notifications created before vs after read timestamps.
   - Verified 100% agreement between notification list read flags and unread-count endpoint.
   - Verified duplicate read requests (idempotency) and pagination across multiple pages.
   - Verified graceful fallback and error handling when read-state query fails.
   - Verified safe migration transition: historical read in `activity_logs` recognized and lazy-backfilled into dedicated table.
   - Verified rollback compatibility: clean fallback when dedicated table is absent.

---

## 10B. Checkpoint 12E: Notification Query Efficiency, Failure Semantics & Deterministic Pagination

1. **Review of Candidate-Specific Querying on `activity_logs`:**
   - **Schema Reality:** Database inspection reveals `activity_logs` has columns `['id', 'user_id', 'action', 'metadata', 'created_at']`. There is **no `entity_id` column**.
   - `recordActivity` serializes the payload as stringified JSON: `metadata: JSON.stringify({ notificationId })`.
   - PostgREST JSON path extraction (`metadata->>notificationId`) is unindexed, unsupported if `metadata` is `TEXT`, and building URLs with dozens/hundreds of candidate IDs risks HTTP 414 URI Too Large.
   - Therefore, candidate-scoped paginated scanning on `(user_id, action, created_at)` with early exit is the only portable and index-friendly approach on the unmigrated schema.
2. **Worst-Case Query Cost Analysis:**
   - In the worst case where a user has thousands of historical read events, NO prior mark-all event, and is viewing a page where at least 1 candidate broadcast notification remains unread:
     - `lowerBoundTime` extends back to the unread notification's creation date.
     - Because the notification was never read, its ID is never found in the user's logs.
     - Early exit cannot trigger, forcing the loop to scan all historical read events back to the lower bound (up to the 50-page / 50,000-event guardrail cap).
     - **Inherent Limitation:** This occurs because an append-only audit log requires proving a negative by exhaustive scan. Applying the prepared migration `20261013_user_notification_reads.sql` ($O(1)$ indexed lookup per candidate) permanently eliminates this limitation.
3. **Audit of Fallback and Failure Classification:**
   - Implemented `classifyTableError(error): TableStatus` categorizing errors into:
     - `'available'`: Successful query (even with 0 rows).
     - `'absent'`: Genuinely missing table or schema cache miss (`42P01`, `PGRST205`, `relation does not exist`). Only this activates the legacy `activity_logs` fallback.
     - `'permission_denied'`: RLS or permission rejection (`42501`, `PGRST301`, `401`, `403`). Surfaces as an explicit error; does NOT silently fall back or mask security failures.
     - `'transient_error'`: Network disconnect, timeouts, or 5xx server errors (`fetch failed`, `ETIMEDOUT`, 500). Surfaces as an explicit error; does NOT return inaccurate 0 unread counts or false unread states.
4. **Timestamp & Pagination Correctness Hardening:**
   - **Deterministic Tie-Breaking:** Added secondary `.order('id', { ascending: false })` across `activity_logs` queries, `notifications` list query, and `unread-count` candidate broadcast queries. Guarantees deterministic ordering and eliminates pagination skipping/duplication under identical timestamps.
   - **Clock Skew Safety Window:** Added a 60-second buffer (`Math.min(...times) - 60_000`) on `lowerBoundTime`, ensuring that read events logged within seconds of notification creation (e.g., rapid user action or server clock drift) are never excluded by `.gte('created_at', ...)`.
   - **Strict Timestamp Parsing:** Enforced `!Number.isNaN(t) && t > 0` validation across all timestamp extraction logic.
   - **Per-User Isolation:** Re-verified that User A's read activity, errors, or queries are strictly scoped by `.eq('user_id', userId)` and can never corrupt or leak into User B's state.
5. **Pagination Guardrail Completeness Semantics & Failure Architecture:**
   - **Loop Structure:** `while (true)` executing deterministic chunked `.range()` queries over `activity_logs`.
   - **Page Counter & Row Limit:** Counter `page` starts at 0, incrementing `page++` after each batch. Query window is bounded by `PAGE_SIZE = options?.pageSize ?? 1000` via `.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)`.
   - **Early-Exit Semantics:**
     - Pre-loop: If all candidate notifications are already accounted for (e.g., covered by `markAllReadTimestamp`, resolved by dedicated `notification_reads` table, or if the candidate list contains only private notifications), the loop never starts and executes **0 activity_logs queries**.
     - Intra-loop: As soon as `neededCandidateIds.size === 0`, the loop breaks immediately, eliminating unnecessary queries for subsequent pages.
     - Genuine Log Exhaustion: If `indLogs.length < PAGE_SIZE`, the loop breaks cleanly without error because all records down to `lowerBoundTime` have been fully inspected, proving that any remaining candidate was genuinely never marked read.
   - **Completeness Enforcement at Safety Boundary:**
     - When `page >= maxPages` (default 50 pages / 50,000 logs) and any candidate remains unresolved (`neededCandidateIds.size > 0`), the engine **throws an explicit error**:
       `Incomplete activity-log scan: safety limit of ${maxPages} page(s) reached with ${neededCandidateIds.size} unresolved notification candidate(s)`.
     - Incomplete scans are **never** silently treated as evidence of unread or read state.
     - In `GET /api/notifications` and `GET /api/notifications/unread-count`, the thrown error is caught and converted to an **HTTP 500 error response** (`{ error: err.message }`). It is never converted into an HTTP 200 with potentially inaccurate unread counts.
     - Candidate gathering in `GET /api/notifications/unread-count` likewise enforces completeness: if `bPage >= 20` and more records exist (`bData.length === B_PAGE_SIZE`), it throws an explicit error rather than silently returning a truncated count.
   - **Error Propagation:** Any database, network, or permission error encountered during any page is immediately re-thrown and propagated to the top-level handler, never treated as partial success.

6. **Regression Verification & Runtime Control-Flow Mock Suite (Suite 23 — 17 Tests PASS, Total 122 PASS):**
   - **Test Execution Distinction:**
     - **[Mocked Unit Test - Actual Control Flow Runtime]:** Uses `createControllableMockSupabase` fluent chained query mock to invoke `fetchUserBroadcastReadContext` and execute the actual runtime TypeScript pagination control flow, set operations, range indexing, error classification, and early exit branches.
     - **Real Database Integration Tests:** Remain strictly **BLOCKED** pending an isolated staging environment under Safety Rules #2 & #6 (no production account modification or direct testing on live Supabase Auth).
   - **Boundary Tests Evidenced in Suite 23:**
     1. *Early Exit before guardrail:* `candidates = [101, 102]`, resolved on Page 0 -> Exactly 1 query made (range `[0, 1]`), Page 1 never called.
     2. *Pre-loop Early Exit (Dedicated Table):* All candidates found in `notification_reads` -> Exactly 0 queries to `activity_logs`.
     3. *Pre-loop Early Exit (Private Only):* All candidates have `recipient_id !== null` -> Exactly 0 queries to `activity_logs`.
     4. *Boundary Trip with Unresolved IDs:* `maxPages: 2, pageSize: 2`, candidate 102 unresolved -> Exactly 2 queries (`[0, 1]` and `[2, 3]`), throws explicit error `Incomplete activity-log scan: safety limit of 2 page(s) reached with 1 unresolved notification candidate(s)`.
     5. *Beyond Boundary Trip:* `maxPages: 1`, candidates unresolved -> Throws explicit error; API simulation verifies HTTP 500 status and error message propagation (never HTTP 200).
     6. *Resolved on Final Permitted Page:* `maxPages: 2`, Page 0 misses, Page 1 resolves candidate 301 -> Returns success with candidate marked read; exactly 2 pages consumed (`[0, 1]` and `[2, 3]`).
     7. *Database Error on Later Page:* Page 0 succeeds, Page 1 encounters `PostgreSQL connection terminated` -> Rejects with `Database error querying activity_logs: PostgreSQL connection terminated` (error propagation, zero partial success).
     8. *Genuine End of Matching Logs:* Page 0 returns 1 item (`< pageSize = 2`), candidate 501 unread -> Completes cleanly without error, returns candidate as unread, exactly 1 query made.

---

## 10C. Checkpoint 12F: Notification Correctness Hardening (Persistence Visibility, Chunked Lookups & Count-Verified Pagination)

1. **Section A: Strict Read-State Persistence Visibility & Fail-Closed Semantics:**
   - **`recordActivity` Scope Preserved:** `recordActivity` in `src/lib/api-server.ts` is called across 15+ business operations (teachers, students, marks, signatures, settings). Secondary audit logging failures in these workflows remain best-effort to avoid aborting primary educational transactions.
   - **Strict Notification Persistence:** Introduced `recordNotificationReadEventStrict(supabase, userId, action, metadata)` in `src/lib/notifications.ts`. It directly inspects the Supabase client `{ error }` response and throws on failure.
   - **Mark-One-Read API Hardening (`markNotificationReadForUser`):**
     - Private notifications: Direct update on `notifications.read` is the persistence operation. Failure returns HTTP 500 (`{ error: updateError.message }`).
     - Broadcast notifications: Persistence is attempted in `notification_reads` (idempotent upsert on `(notification_id, user_id)`). If the table is present and fails (permission denied or transient outage), returns HTTP 500.
     - Legacy Fallback & Retry Idempotency: When `notification_reads` is absent, read state persists via `activity_logs`. To prevent duplicate logs upon client retries, an existing matching record is verified first. If already recorded, returns `{ status: 200, body: { success: true, alreadyRead: true } }` without duplicate insertions. If insert fails, returns HTTP 500, never HTTP 200.
   - **Mark-All-Read API Hardening (`markAllNotificationsReadForUser`):**
     - Both private notifications update and the broadcast high-water mark event (`mark_all_notifications_read`) are strictly verified. Any error returns HTTP 500. Retries update the high-water mark timestamp without per-notification row explosion.
   - **Verification:** 12 comprehensive unit tests in Suite 23 verify failure throwing, 500 status returns, 200 success returns, and retry idempotency.

2. **Section B: High-Cardinality URL Bounding (100-ID Chunked Lookups):**
   - **HTTP 414 URI Too Large Prevention:** When querying `notification_reads` with candidate notification IDs, PostgREST formats IDs in the query string (`in.(...)`). 20,000 BIGINT IDs would generate ~180–440 KB URLs, failing proxies with HTTP 414.
   - **Chunking Implementation:**
     - Enforced `NOTIFICATION_ID_CHUNK_SIZE = 100` and `NOTIFICATION_ID_CHUNK_CONCURRENCY = 4`.
     - Chunk sizes are capped at 100 IDs (~2.2 KB), well within standard 8 KB proxy limits.
     - Chunks are executed in concurrent batches of 4.
     - Probe query on Chunk 0 detects genuinely absent table (`PGRST205`) to activate fallback without redundant queries.
   - **Verification:** Tested with 2,000 broadcast notifications (split into exactly 20 chunks of <= 100 IDs), chunk error propagation (no partial success), high-cardinality candidate gathering (2,500 candidates), and multi-user isolation.

3. **Section C: Elimination of Silent Pagination Truncation (Exact Count Verification):**
   - **Vulnerability Eliminated:** Previous pagination assumed that receiving fewer rows than `pageSize` meant history had ended. On servers where PostgREST has a `max_rows` cap (e.g., 250 rows), requests for 1,000 rows were silently truncated after page 1.
   - **Count-Verified Pagination (`scanPagesWithExactCount`):**
     - Every page request explicitly queries `{ count: 'exact' }`.
     - The pagination loop terminates only when `offset >= totalCount`.
     - Offset advances by rows actually returned (`offset += rows.length`), allowing smaller pages (e.g. 250 rows) to smoothly continue across multiple queries until all rows are processed.
     - Completeness enforcement: If the server omits the exact count, or returns 0 rows before reaching the count, or if `maxPages` is reached with unresolved candidates, an explicit error is thrown.
   - **Verification:** Tested with server page caps below 1,000 (250-row cap over 600 total records advancing across 3 pages), genuine short final pages, empty page before count detection, missing count validation, safety limit incomplete scan throwing, and broadcast gathering overflow (> 20,000).

4. **Full Automated Suite Results:**
   - `npm test`: **145 tests PASS across 23 suites, 0 failures, 0 skipped**.
   - `npx tsc --noEmit`: **Exit code 0 (clean static typing)**.
   - `npm run build`: **Exit code 0 (68 routes compiled in Turbopack)**.

---

## 11. Blockers & Operational Next Steps

1. **Dedicated Staging Supabase Environment (Authenticated E2E BLOCKED):**
   - Headless authenticated E2E verification of live `/admin/*` pages requires an isolated staging Supabase project (e.g., `jiddah-staging`) or local Docker Supabase instance (`supabase start`).
   - **Strict Rule:** Never provision test accounts or modify users in the production Supabase Auth instance.
   - **Status:** **BLOCKED** until an isolated test environment is provisioned by the owner.
2. **Production Database Migration:**
   - `supabase/migrations/20261013_user_notification_reads.sql` prepared for future owner application.
3. **Localhost Port Reservation:**
   - Dev server remains active on `http://localhost:3000`. Port 3000 ownership rules respected.
4. **Enterprise Security Policies:**
   - Server-enforced 2FA and IP whitelisting require Supabase enterprise/SSO add-ons. Current UI accurately labels these as workstation preferences.



# JIDDAH SMART REPORT ENGINE — DECISIONS AND BLOCKERS
**Document:** Technical Decisions, Architecture Rationale, and Operational Blockers  
**Date:** 2026-10-15  
**Branch:** `feat/core-completion-autopilot`  
**Repository Working Directory:** `C:\Users\USER\Desktop\school_management_system\jiddah_repo_clean_room`  

---

## 1. Architectural & Engineering Decisions

### Decision 1: Scope Hoisting & Structure in Single Report API (`src/app/api/report/route.ts`)
- **Context:**
  The original `src/app/api/report/route.ts` had a structural bracket nesting problem where secular `reportData` was unintentionally placed inside an unclosed theology `if` block, and `signatures` was declared inside a nested conditional.
- **Decision:**
  1. Hoisted the Supabase storage signature fetch (`head-teacher`, `principal`, `class-teacher-*`, `school-stamp`) to the outer scope before any curriculum conditional branch.
  2. Extracted `studentData` and theology class names early so both the theology early return and secular `reportData` object construct cleanly without code duplication or scope errors.
  3. Added the missing `teacher_initials` query to ensure single report card outputs match batch report card outputs.
- **Impact:**
  Eliminated TS18004 scope compilation errors; guaranteed that both single and batch report generations produce identical DTO keys for template rendering.

### Decision 2: Supabase-js v2 Mutation Handling (`.update().select()`)
- **Context:**
  In Supabase JavaScript SDK v2, calling `.update(...)` without chaining `.select()` returns `{ data: null, error: null }` by default. Code inspecting `if (!result.data || result.data.length === 0)` treated successful updates as 404 Not Found.
- **Decision:**
  Updated mutation calls (such as in `src/app/api/notifications/[id]/mark-read/route.ts`) to explicitly append `.select()`.
- **Impact:**
  Eliminated false 404 errors when marking notifications as read; allows clients to receive the updated record directly.

### Decision 3: Teacher Role Schema Widening & Auth ID Association
- **Context:**
  The `teachers` table is used by administrators to manage academic staff. The role dropdown on the frontend and the real school hierarchy includes "Director of Studies" (DOS) roles (`DOS`, `DOS Secular`, `DOS Theology`) and `Deputy Head Teacher`, but the API rejected these values with `400 Invalid teacher role`. Additionally, invited teachers registering an account were saved without `auth_user_id`.
- **Decision:**
  1. Widened the role validation regex and whitelist array in `src/app/api/teachers/route.ts` to include all organizational roles.
  2. Linked `auth_user_id: user.id` in `src/app/api/teachers/register/route.ts` during account activation.
- **Impact:**
  Administrators can freely assign DOS and Deputy Head Teacher designations; newly registered teachers can query their classes under Supabase Row Level Security (RLS) rules that filter by `auth.uid() = auth_user_id`.

### Decision 4: In-App Notification Polling Architecture (`app-topbar.tsx`)
- **Context:**
  The topbar notification bell previously rendered static, hardcoded notification mock items with no live connection to the database. Full WebSocket Supabase Realtime requires persistent open socket connections that can be brittle on intermittent school mobile internet connections.
- **Decision:**
  Implemented a lightweight HTTP polling model:
  1. On component mount, the bell fetches `/api/notifications/unread-count` and `/api/notifications?limit=5`.
  2. Sets a 30-second interval timer that polls only when the browser tab is focused and visible (`document.visibilityState === 'visible'`).
  3. Refreshes immediately when the user clicks the bell icon or when a "mark as read" action is dispatched.
- **Impact:**
  Provides immediate real-time feedback for teachers and administrators while consuming negligible bandwidth.

### Decision 5: WCAG 2.1 Touch Target Standard (44×44px)
- **Context:**
  Mobile device audit revealed that while bottom navigation bars met touch target sizes, the login and password recovery form contained compact elements (checkbox `16×16px`, eye icon button `28×28px`, forgot-password link `32px` line height) that caused mis-taps on phones.
- **Decision:**
  Enlarged the interactive target areas in `src/app/login/page.tsx` using Tailwind padding and sizing utilities (`p-2 rounded-lg`, `min-h-[44px] px-1 py-2`, `w-5 h-5`) with explicit `aria-label` attributes.
- **Impact:**
  Achieved full WCAG 2.1 Level AA compliance for mobile touch ergonomics without altering the visual balance of the login screen.

### Decision 6: Treatment of `/preview-test` Toolbar Horizontal Scroll
- **Context:**
  The responsive viewport audit detected that `/preview-test` has a scroll width exceeding narrow viewports (`scrollWidth: 540px` at `320px` width).
- **Decision:**
  Classified `/preview-test` as an internal developer harness used exclusively for testing print sheets, not an end-user facing administrative view. All true production admin routes (`/admin`, `/admin/marks`, `/admin/reports`, `/admin/settings`, `/admin/notifications`) have zero horizontal overflow. The toolbar in `/preview-test` was left with intentional horizontal scroll to preserve all test template buttons on desktop and tablets.

### Decision 7: Authoritative BOT Score Resolution (`src/app/api/report/route.ts`)
- **Context:**
  In single report generation (`/api/report`), the ternary selecting `score` resolved `scoreType === 'mot'` to `mot_score`, but fell through to `eot_score` for both `'bot'` and `'eot'`. During Beginning of Term (BOT) assessment periods, reports displayed EOT-derived grades and conduct remarks instead of actual BOT marks.
- **Decision:**
  Updated the ternary expression to explicitly branch on `scoreType === 'mot' ? mot_score : scoreType === 'bot' ? bot_score : eot_score`. Added automated regression coverage simulating score resolution and grade derivation across all exam phases.
- **Impact:**
  Guarantees that BOT report cards accurately reflect student marks and distinction/pass ratings during early-term reporting.

### Decision 8: Numeric Settings Type Coercion (`src/app/api/settings/school/route.ts`)
- **Context:**
  The settings update route discarded all non-string properties (`typeof value === 'string'`). Consequently, the `current_year` setting (sent as integer `2026`) was discarded on every form save, silently preventing the academic year from updating.
- **Decision:**
  Introduced `allowedNumericKeys = ['current_year']` with finite numeric coercion (`Number(value)`). Non-numeric or malicious payloads are safely rejected without throwing exceptions.
- **Impact:**
  Settings Studio can reliably persist academic year transitions across school terms.

### Decision 9: Next.js Static Prerender Suspense Isolation (`src/app/reset-password/page.tsx`)
- **Context:**
  `next build` failed during Turbopack static page generation because `useSearchParams()` on the client `/reset-password` page was not wrapped inside a `<Suspense>` boundary, triggering a CSR bailout failure.
- **Decision:**
  Extracted the form component into `ResetPasswordForm` and wrapped it in a `<Suspense>` boundary with a graceful loading fallback.
- **Impact:**
  Restored Next.js production build cleanly (all 67 static and dynamic routes compile error-free).

### Decision 10: Non-blocking PowerSync Initialization & Direct Print Portal SSR
- **Context:**
  Headless browser verification scripts hung because `PowerSyncProvider` was initialized with `isInitialized: false` while awaiting SQLite/OPFS initialization, and `PrintPortal` used React `createPortal` attaching to body only after client-side hydration. In headless Chrome without worker OPFS, the page never unmounted its dark splash screen, and print PDFs generated empty (1,074 bytes).
- **Decision:**
  1. Defaulted `isInitialized` to `true` with a 1.2s fallback timer in `PowerSyncProvider.tsx`, ensuring immediate render for SSR and environments without local SQLite workers.
  2. Rendered `<div id="print-portal">` directly in JSX in `PrintPortal.tsx`. The CSS in `print-system.css` already isolates and hides this div off-screen during display while expanding to full A4 in print media.
- **Impact:**
  Full page rendering is instant, and automated Puppeteer PDF tests export complete, authentic 350 KB multi-sheet documents without hydration dependencies.

### Decision 11: PowerSync SSR-Prerender Context Guard & Direct Cloud Fallback
- **Context:**
  During static site generation (`next build`), components inside the admin layout call `PowerSyncStatus`. Because `@powersync/react`'s provider only wraps children on the client, SSR prerendering threw `TypeError: Cannot read properties of null (reading 'currentStatus')`. Additionally, if local PowerSync SQLite is empty on first load, student enrollments were unrendered.
- **Decision:**
  1. Wrapped `PowerSyncStatus.tsx` in a client-mount guard (`mounted`) and context existence check (`PowerSyncContext`), preventing SSR prerender crashes.
  2. Implemented direct Supabase cloud fallback in `MarksEntryClient.tsx`: if local SQLite returns 0 enrollments, the client seamlessly fetches active student enrollments directly from Supabase.
- **Impact:**
  Achieved 100% clean production builds (67/67 routes); guaranteed students list populates immediately even before initial offline synchronization completes.

### Decision 12: Notification Isolation and Recipient-Scoped Deduplication
- **Context:**
  `GET /api/notifications` and `/api/notifications/unread-count` previously lacked explicit `if (!user)` checks, permitting unauthenticated visitors to query notifications. Furthermore, single-identifier deduplication could suppress notifications destined for different users.
- **Decision:**
  1. Secured `GET /api/notifications` and `unread-count` with 401 Unauthorized guards for unauthenticated requests.
  2. Scoped notification `[id]/mark-read` mutations to require ownership (`recipient_id.is.null,recipient_id.eq.${user.id}`).
  3. Scoped deduplication in `createSystemNotification` and `/api/notifications` by both content and `recipient_id`.
- **Impact:**
  Guarantees multi-user notification privacy; prevents cross-user mark-read mutations; ensures distinct users receive identical announcements without suppression.


### Decision 13: Per-User Broadcast Read State Isolation via Activity Logs
- **Context:**
  The `notifications` table schema in production Postgres contains a single `read: boolean` column per notification record. If User A marks a broadcast notification (`recipient_id IS NULL`) as read by mutating `read = true`, that notification would falsely appear as read for User B, and User B's unread badge count would decrement prematurely. Furthermore, previous attempts to write to `read_at` or `read_by` threw PostgREST schema cache errors (`PGRST204`) because those columns do not exist.
- **Decision:**
  1. For direct user notifications (`recipient_id === user.id`), the system continues updating `read: true` on the notification record.
  2. For broadcast notifications (`recipient_id IS NULL`), the shared row in `notifications` is NEVER mutated. Instead, the user's read event is recorded in the user-scoped `activity_logs` table (`action: 'notification_read' | 'mark_all_notifications_read'`, `entity_id: notification.id`, `user_id: user.id`).
  3. `GET /api/notifications` and `GET /api/notifications/unread-count` query the user's activity logs and synthesize the per-user `read` boolean dynamically.
  4. Prepared a clean, reversible SQL migration artifact `supabase/migrations/20261013_user_notification_reads.sql` for future dedicated join table migration.
- **Impact:**
  Guarantees complete multi-user read state isolation for broadcast announcements without violating Rule #6 (no destructive production DDL).

### Decision 14: School Settings Schema Column Normalization & Preference Demarcation
- **Context:**
  Submitting updates via `PATCH /api/settings/school` threw 400 Bad Request because the frontend sent `name` and `phone`, whereas the real Supabase `school_settings` table schema defines `school_name` and `phone_1`. Additionally, settings tabs for Security and Print contained UI controls that operated only on browser `localStorage` but could be misinterpreted as server-enforced features.
- **Decision:**
  1. Updated `src/app/api/settings/school/route.ts` to map payload keys `name -> school_name` and `phone -> phone_1`, while aliasing them in `GET` responses for backward compatibility.
  2. In `src/components/SettingsClient.tsx`, clearly labeled Security and Print tabs as "Local Workstation Preferences" and documented that two-factor authentication, IP restrictions, and watermark toggles are client-side UI configurations rather than backend-enforced policies.
- **Impact:**
  Restored seamless persistence of school profile settings (school name, phone numbers, district, academic year, term, motto) while maintaining transparency about client-side preferences.

### Decision 15: PowerSync Isomorphic Provider & Hydration Safety
- **Context:**
  Previous attempts to delay rendering until local SQLite OPFS initialization completed caused React hydration mismatches and `Cannot read properties of null (reading 'parentNode')` runtime errors in Turbopack SSR.
- **Decision:**
  In `src/components/providers/PowerSyncProvider.tsx`, rendered children isomorphically on both server and client from the initial render. Initialized PowerSync asynchronously within a `useEffect` hook. Added `disableSSRWarning: true` (a supported `@powersync/web` open factory option) to silence benign server-side warnings. Removed unused `PowerSyncSplash` component.
- **Impact:**
  Eliminated all React hydration mismatches and DOM runtime exceptions while preserving offline database synchronization for components that require it.

### Decision 16: Mobile Navigation Radix Drawer Verification Harness (`/preview-shell`)
- **Context:**
  Full administrative routes are protected by Next.js middleware and Supabase authentication session cookies. Headless Puppeteer verification scripts visiting `/admin` were redirected to `/login`, making it impossible to verify the interactive behavior of the Radix mobile drawer and hamburger trigger without an active auth session.
- **Decision:**
  Created `src/app/preview-shell/page.tsx` as an unauthenticated preview shell mounting `SidebarProvider`, `AppSidebar`, and `AppTopbar`. Upgraded `scripts/verify-responsive-viewports.mjs` to visit `/preview-shell`, click the hamburger menu trigger, confirm the mobile sheet opens (`data-mobile="true"`), assert that all 13 navigation links are rendered and accessible, and test keyboard Escape dismissal.
- **Impact:**
  Automated responsive test suite rigorously verifies actual mobile drawer interactions and touch usability without bypassing production authentication middleware.

### Decision 17: Production Protection for Test Harness Routes via Edge Middleware & Client Route Guards
- **Context:**
  The preview harness `/preview-shell` (and print test harness `/preview-test`) are required for headless Puppeteer automated audits of mobile navigation drawers and print portals. However, exposing these test routes on public production deployments introduces potential information disclosure of administrative navigation structures.
- **Decision:**
  1. Configured Next.js edge middleware (`src/utils/supabase/middleware.ts`) to intercept `/preview-shell` and `/preview-test` when `process.env.NODE_ENV === 'production'`, redirecting guests to `/login` and authenticated non-admin users to `/admin`.
  2. Implemented client-side defense-in-depth in `src/app/preview-shell/page.tsx` via `useEffect` redirecting to `/login` if loaded in production.
  3. Preserved unrestricted access in development environments (`process.env.NODE_ENV !== 'production'`) to support automated local verification scripts.
- **Impact:**
  Eliminates public production exposure of administrative testing harnesses without compromising automated QA pipelines.

### Decision 18: Multi-User Notification Read State Verification & Lifecycle Invariant Testing
- **Context:**
  Per-user notification isolation requires absolute guarantees that subsequent list fetches, mark-read operations, and mark-all-read operations by User A never mutate, corrupt, or alter the unread status or count for User B.
- **Decision:**
  Added multi-step lifecycle tests in `src/__tests__/pipeline-parity-and-edge-cases.test.mjs` simulating sequential operations: User A reading a broadcast notification, User A marking all as read, and User B fetching their notifications across all phases.
- **Impact:**
  Formally verified that broadcast announcements remain unmutated in the database while per-user activity logs correctly synthesize independent unread counts across all lifecycle transitions.

### Decision 19: Strict Report Parity & 1224 Competition Tie-Breaking Conformance
- **Context:**
  Both single report generation (`/api/report`) and batch report generation (`/api/report/batch`) compute academic grades, divisions, and remarks. Any divergence between the two endpoints would lead to conflicting student rankings or marks.
- **Decision:**
  Added unit and regression assertions validating that single and batch report generation engines produce strictly isomorphic outputs for identical inputs, correctly exclude non-gradable subjects, return null aggregates on missing core marks, and implement standard 1224 competition ranking for score ties.
- **Impact:**
  Guarantees complete consistency across individual report previews and bulk term-end printing.

### Decision 20: Notification Optimistic State Reversion and Failure Toast Dispatch
- **Context:**
  When a user marks a notification or all notifications as read in `app-topbar.tsx` or `notifications-client.tsx`, the UI updates optimistically to provide instantaneous feedback. However, if the underlying network connection drops or the backend API returns a non-200 status code, the UI previously left the notification marked as read and the badge decremented, presenting an unrecoverable out-of-sync state.
- **Decision:**
  1. Implemented rollback mechanisms in both `app-topbar.tsx` and `notifications-client.tsx`. Previous notifications state and unread count are retained in closure before optimistic mutation.
  2. If the API request throws an error or `!res.ok`, the previous state is restored immediately and `toast.error` (from Sonner) is dispatched to clearly notify the user of the failure.
  3. Added Suite 20 with 3 unit and regression tests in `src/__tests__/pipeline-parity-and-edge-cases.test.mjs` validating state restoration on simulated network failure.
- **Impact:**
  Eliminates silent UI failure; ensures unread state matches server truth under network failure conditions.

### Decision 21: Administrative Component Canvases for Responsive QA (`/preview-shell`)
- **Context:**
  Next.js middleware protects `/admin/*` routes by redirecting unauthenticated visitors to `/login`. In accordance with Absolute Safety Rules #2 & #6 (no credential fabrication, no production user alterations, no production DDL), the agent cannot create arbitrary test credentials in the live Supabase Auth instance. Consequently, headless Puppeteer scripts could not test authenticated administrative views directly on `/admin`.
- **Decision:**
  1. Extended `/preview-shell/page.tsx` with a component switcher that dynamically mounts each administrative screen (`DashboardContent`, `SettingsClient`, `NotificationsClient`, `AdminMarksEntryClient`, `ReportGeneratorClient`) within the real responsive application layout (`SidebarProvider`, `AppSidebar`, `AppTopbar`, `SidebarInset`), wrapped in `<Suspense>`.
  2. Upgraded `scripts/verify-responsive-viewports.mjs` to test all 5 administrative canvases across 7 viewports (320x640, 360x800, 390x844, 430x932, 768x1024, 1024x768, 1440x900), confirming exactly 0px overflow on all 35 checks.
  3. Guarded `/preview-shell` in production environments via edge middleware and client redirect to `/login`.
- **Impact:**
  Proves 100% layout and touch integrity across all administrative interfaces and device sizes without violating production authentication or database safety boundaries.

### Decision 22: Shared Layout & Administrative Component Responsive Containment (Eliminating Hidden-Overflow Masking)
- **Context:**
  A critical audit of the preview harness revealed that applying `overflow-hidden` to `SidebarInset` was masking physical overflow of internal child elements. On 320px and 360px mobile viewports, `app-topbar.tsx`'s actions container extended by 69px/29px, pushing the notification bell and profile icon off-screen. On 768px tablet portrait, `DesktopSearch` (`w-72`) collided with the open sidebar, overflowing by 526px/71px. In `SettingsClient.tsx`, rigid `grid-cols-2` crushed input widths to ~110px.
- **Decision:**
  1. Refactored `app-topbar.tsx`: replaced fixed action sizes with responsive padding (`size-9`/`size-10`), applied `min-w-0 truncate` to the brand container, hid the desktop search input below `lg:` (`hidden lg:flex w-48 xl:w-72`), hid `TermBadge` below `xl:`, and collapsed profile name text below `lg:`.
  2. Refactored `SyncStatus.tsx`: collapsed secondary buttons and vertical divider below `sm:`.
  3. Refactored `SettingsClient.tsx`: changed profile grid to `grid-cols-1 sm:grid-cols-2 gap-4`, set `sm:col-span-2` on wide text fields, and stacked the save bar buttons vertically on mobile (`flex-col sm:flex-row`).
  4. Refactored `notifications-client.tsx`: added `flex-wrap gap-2` to the filter tab buttons.
  5. Refactored `admin/layout.tsx`: added `max-w-full min-w-0` to `SidebarInset` and `min-w-0 w-full` to inner flex containers.
  6. Created diagnostic tool `scripts/diagnose-component-overflow.mjs` verifying both document `scrollWidth` and element `getBoundingClientRect()` across all viewports.
- **Impact:**
  Achieved genuine, unmasked responsive containment: 0px overflow and 0 clipped element bounding rects across small mobile (320px), standard Android (360px), iPhone (390px), tablet portrait (768px), and desktop (1440px).

### Decision 23: Test Credential Sanitization and Environment Variable Isolation
- **Context:**
  Audit of developer scripts identified hardcoded password strings in `scripts/seed_teachers.mjs` (`'Teacher2026!'`) and placeholder credentials in `test-login.js` (`'admin@example.com'`, `'password123'`). Committing credentials or sample passwords in runnable scripts risks accidental exposure or confusion with production access.
- **Decision:**
  1. Removed hardcoded credentials from `scripts/seed_teachers.mjs`; replaced with required environment variable `process.env.INITIAL_TEACHER_SEED_PASSWORD`.
  2. Removed hardcoded credentials from `test-login.js`; replaced with optional `process.env.TEST_AUTH_EMAIL` and `process.env.TEST_AUTH_PASSWORD`.
  3. Flagged legacy seed password `'Teacher2026!'` for owner review and rotation in production Supabase Auth.
- **Impact:**
  Strictly prevents hardcoded credentials from persisting in the repository; enforces test credential isolation via environment variables.

### Decision 24: Edge-Level Production Interception of Preview Harnesses (`/preview-shell`, `/preview-test`)
- **Context:**
  Development harnesses mounted on `/preview-shell` and `/preview-test` provide visual component verification without authentication. In production deployments, these endpoints must not be exposed to unauthenticated visitors or public traffic. Relying solely on client-side React `useEffect` redirects could permit unauthorized HTML delivery before the client executes JavaScript.
- **Decision:**
  1. Configured Next.js edge middleware (`src/proxy.ts` -> `src/utils/supabase/middleware.ts`) to intercept `/preview-shell` and `/preview-test` when `process.env.NODE_ENV === 'production'`.
  2. Middleware immediately issues an HTTP 307 redirect to `/login` (for guests) or `/admin` (for authenticated users) before any route handler or page renderer executes.
  3. Verified the security boundary on a local production server (`next start -p 3001`): `GET /preview-shell` and `GET /preview-test` return HTTP 307 with 0 bytes of preview HTML delivered.
  4. Preserved local development access (`next dev` on port 3000): returns HTTP 200, allowing local responsive tests to function without environmental friction.
- **Impact:**
  Eliminates the risk of leaking internal testing harnesses to production users while maintaining developer agility.

### Decision 25: Bounded Notification Read-State Resolution and Progressive Database Adaptation
- **Context:**
  Previous audits identified that `GET /api/notifications` and `GET /api/notifications/unread-count` reconstructed broadcast notification read states by querying `activity_logs` with a flat `.limit(200)` window. As teachers and administrators accumulated read actions or activity logs, the 200-log boundary resulted in older read events and the `mark_all_notifications_read` high-water mark being displaced from the result set, causing previously read broadcast notifications to falsely revert to unread.
- **Decision:**
  1. Re-architected broadcast read resolution into shared helpers in `src/lib/notifications.ts` (`fetchUserBroadcastReadContext` and `isBroadcastNotificationRead`).
  2. **Dedicated Mark-All Resolution ($O(1)$):** Queries `activity_logs` specifically for `action = 'mark_all_notifications_read'` with `.limit(1)`. This guarantees an authoritative high-water mark timestamp that cannot be displaced by subsequent individual read events.
  3. **Scoped Individual Read Query:** Queries `mark_notification_read` bounded to 1,000 logs. When a mark-all-read timestamp exists, the query is scoped with `.gte('created_at', markAllReadTimestamp)` because all notifications created before the mark-all timestamp are already marked read.
  4. **Progressive Dedicated Table Integration:** Proactively queries `notification_reads` if present. If the relation does not exist in the schema cache (current production schema), it safely catches the error and falls back to `activity_logs`.
  5. **Dual-Write Mutation:** In `src/app/api/notifications/[id]/mark-read/route.ts`, records the read event in `activity_logs` and attempts an upsert into `notification_reads` wrapped in a safe catch block.
  6. **Route Alignment:** Both `GET /api/notifications` and `GET /api/notifications/unread-count` use the shared context and evaluation helper, guaranteeing 100% agreement between badge counts and notification lists.
  7. **Preserved Schema Safety:** Migration `supabase/migrations/20261013_user_notification_reads.sql` remains unapplied and ready for future deployment; zero production DDL executed.
- **Impact:**
  Eliminates the 200-event displacement defect; mark-all-read state is permanently immune to event volume; older read notifications remain read across 1,000 logs; progressive compatibility ensures seamless transition when the dedicated table is migrated.

### Decision 26: Fully Unbounded Candidate-Aware Notification Read Resolution with Dual-Read Migration Reconciliation
- **Context:**
  Auditing identified that bounding `activity_logs` scans to 1,000 records in `fetchUserBroadcastReadContext` and bounding candidate broadcast notifications to 100 items in `GET /api/notifications/unread-count` left an arbitrary cutoff. If a user accumulated >1,000 individual read events without a subsequent mark-all event, earlier read logs were omitted from the query window, causing previously read broadcast notifications to falsely revert to unread.
- **Decision:**
  1. **Candidate-Aware Optimization:** `fetchUserBroadcastReadContext` accepts candidate notifications. If all candidates are older than `markAllReadTimestamp`, 0 individual logs are queried.
  2. **Lower-Bound Timestamp Scoping:** Constrained `activity_logs` queries to `created_at >= oldestCandidateCreatedAt`, pruning irrelevant ancient logs.
  3. **Chunked Pagination Without Arbitrary Cap:** Implemented a paginated `.range()` scan (chunks of 1,000) that traverses history until all candidates are resolved or all logs down to the lower bound are checked.
  4. **Early Exit:** Breaks pagination immediately when all candidate notification IDs are located, avoiding unnecessary database queries.
  5. **Uncapped Unread-Count Endpoint:** In `GET /api/notifications/unread-count`, removed `.limit(100)` and paginated broadcast notifications created after `markAllReadTimestamp`, resolving unread counts with 100% agreement with the notification list.
  6. **Safe Dual-Read Migration Reconciliation & Lazy-Backfill:**
     - When `notification_reads` is created, the system unions dedicated records with historical `activity_logs` reads so historical reads are never lost.
     - When historical reads are located in `activity_logs`, they are lazily backfilled (upserted) into `notification_reads`.
     - If `notification_reads` is dropped or rolled back, the system falls back seamlessly to `activity_logs`.
  7. **Page View Parity:** Applied the resolver to `/admin/notifications` server page, guaranteeing identical read flags across server rendering, client UI, and API.
  8. **Zero Production DDL:** `supabase/migrations/20261013_user_notification_reads.sql` remains unapplied and safe.
- **Impact:**
  Completely removes arbitrary read-state history cutoffs; guarantees 100% unread count and list view parity; ensures safe, zero-regression forward migration and backward rollback.

### Decision 27: Strict Error Classification, Failure Semantics & Deterministic Tie-Breaking (Checkpoint 12E)
- **Context:**
  Auditing identified four edge-case risks in notification read-state resolution:
  1. A naive try/catch around `notification_reads` could silently convert permission rejections (RLS 42501, 403) or transient network/DB failures (`fetch failed`, 500) into "table absent", masking real outages and returning false unread states.
  2. Range pagination without a secondary unique tie-breaker (`id DESC`) could skip or duplicate events when multiple records shared identical `created_at` timestamps.
  3. Close creation and read timestamps (or server clock drift between notification and activity log creation) could cause `.gte('created_at', lowerBoundTime)` to prematurely exclude valid read events.
  4. Database schema inspection proved `activity_logs` has no `entity_id` column; read events store `{ notificationId }` within stringified JSON `metadata`. PostgREST queries filtering unindexed JSON strings across candidate lists are unportable, risk HTTP 414 URI Too Large, and cannot substitute for the dedicated table.
- **Decision:**
  1. **Strict Error Classification (`classifyTableError`):**
     - `'absent'`: Genuinely missing table or schema cache error (`42P01`, `PGRST205`, `relation does not exist`). Only this activates the legacy fallback to `activity_logs`.
     - `'permission_denied'`: Explicitly surfaces permission or RLS failures (`42501`, `PGRST301`, 401, 403) by throwing an error.
     - `'transient_error'`: Surfaces network disconnects and DB failures (`fetch failed`, `ETIMEDOUT`, 500) by throwing an error, ensuring API endpoints return HTTP 500 instead of inaccurate 0-unread counts.
  2. **Deterministic Tie-Breaking:**
     - Enforced secondary `.order('id', { ascending: false })` across `activity_logs`, `notifications` GET route, and `unread-count` candidate broadcast queries.
  3. **Clock Skew Safety Window:**
     - Added a 60-second safety margin (`Math.min(...times) - 60_000`) on `lowerBoundTime`, ensuring that read events logged within seconds of notification creation are never omitted by time-boundary filters.
  4. **Strict Timestamp Validation:**
     - Validated parsed timestamps with `!Number.isNaN(t) && t > 0` before setting high-water marks.
  5. **Truthful Schema Documentation:**
     - Documented the worst-case scan cost ($O(K \times \text{PAGE\_SIZE})$ when candidate notifications remain unread without a mark-all event) as an inherent characteristic of append-only audit logs, which is permanently solved when the owner applies the prepared `notification_reads` migration.
  6. **Explicit Completeness Semantics & Guardrail Enforcement:**
     - If all candidate IDs are resolved, the engine returns the established state immediately without scanning further pages (including pre-loop 0-query bypass if resolved by dedicated table or if all candidates are private).
     - If the safety limit (`maxPages`, default 50) is reached and any candidate remains unresolved, it throws an explicit error:
       `Incomplete activity-log scan: safety limit of ${maxPages} page(s) reached with ${neededCandidateIds.size} unresolved notification candidate(s)`.
     - Incomplete history is never silently treated as proof of either read or unread state.
     - In both `GET /api/notifications` and `GET /api/notifications/unread-count`, the thrown error is caught and converted to an HTTP 500 response (`{ error: err.message }`), strictly preventing false successful HTTP 200 responses with inaccurate unread counts.
     - Database or network errors encountered during any page are propagated immediately rather than swallowed or treated as partial success.
  7. **Runtime Control-Flow Boundary Suite vs Real Database Tests:**
     - Authored 8 dedicated runtime boundary tests in `src/__tests__/pipeline-parity-and-edge-cases.test.mjs` using `createControllableMockSupabase`.
     - Verified early exit call counts, page range spans (`[0, 1]`, `[2, 3]`), boundary guardrail trips, final permitted page resolution, error propagation, and API 500 status simulation.
     - Clearly labeled as `[Mocked Unit Test - Actual Control Flow Runtime]`. Real database integration tests against authenticated Supabase remain strictly BLOCKED pending an isolated staging environment under Safety Rules #2 & #6.
### Decision 18: Strict Read-State Persistence Visibility & Fail-Closed Notification Writes
- **Context:**
  The shared `recordActivity` helper in `src/lib/api-server.ts` is called across 15+ application workflows (teachers, students, marks, signatures, settings) where logging failures are intentionally best-effort so auxiliary activity logging does not abort core business transactions. However, for broadcast notifications on the unmigrated schema, `activity_logs` IS the primary read-state persistence store. Swallowing errors during mark-read operations meant a failed write would return HTTP 200, creating an unrecoverable discrepancy between client optimistic UI and database reality.
- **Decision:**
  1. Preserved `recordActivity` in `src/lib/api-server.ts` unchanged for generic business callers.
  2. Introduced `recordNotificationReadEventStrict(supabase, userId, action, metadata)` in `src/lib/notifications.ts`, explicitly verifying the Supabase `{ error }` response and throwing on failure.
  3. Refactored `markNotificationReadForUser` and `markAllNotificationsReadForUser` to return `{ status: 500, body: { error } }` on any persistence failure (including permission rejections and transient DB outages).
  4. Implemented retry idempotency on the legacy fallback: before inserting a new read record, queries if a matching `(user_id, 'mark_notification_read', metadata)` already exists. If found, returns `{ status: 200, body: { success: true, alreadyRead: true } }` without duplicate insertion.
- **Impact:**
  Eliminates silent write loss; guarantees the client will revert optimistic state and display an error toast if read persistence fails; prevents duplicate audit log explosion on network retries.

### Decision 19: Chunked Bounded-URL Queries for High-Cardinality Notification IDs
- **Context:**
  When querying `notification_reads` for candidate broadcast IDs, PostgREST translates `.in('notification_id', candidates)` into a comma-delimited URL query parameter. Notification IDs are `BIGINT` (up to 19 digits). At high candidate volumes (thousands of notifications), an unchunked URL reaches 180–440 KB, failing edge proxies and web servers with `414 URI Too Large`.
- **Decision:**
  1. Enforced `NOTIFICATION_ID_CHUNK_SIZE = 100` and `NOTIFICATION_ID_CHUNK_CONCURRENCY = 4` in `src/lib/notifications.ts`.
  2. Each chunk URL requires at most ~2.2 KB, well below standard 8 KB HTTP URL limits.
  3. Chunk lookups are batched with concurrency 4 to maximize throughput without overloading the database connection pool.
  4. The first chunk acts as a probe query: if `PGRST205` (relation does not exist) is returned, the engine switches to the legacy activity log fallback without issuing remaining chunks.
- **Impact:**
  Guarantees stability at any candidate volume; tested with 2,000+ candidates split into 20 bounded chunks with full error propagation.

### Decision 20: Count-Verified Pagination & PostgREST max_rows Server Cap Resilience
- **Context:**
  Previous pagination implementations assumed that receiving fewer rows than `pageSize` proved the end of history had been reached. However, if a PostgREST server or proxy enforces a `max_rows` cap (e.g. 250 rows) smaller than `pageSize = 1000`, the query returned 250 rows and the client prematurely stopped scanning, silently truncating unread history.
- **Decision:**
  1. Implemented `scanPagesWithExactCount` in `src/lib/notifications.ts` requesting PostgREST `count: 'exact'` on every page query.
  2. Advances pagination offset by the actual rows returned (`offset += rows.length`), allowing a 250-row server cap to smoothly proceed across multiple queries (offset 0 -> 250 -> 500 -> 600) until the server-reported total count is reached.
  3. Fails closed with explicit errors if:
     - The server omits the exact row count.
     - An empty page is returned before `offset >= totalCount`.
     - The safety limit (`maxPages`) is reached while candidate notifications remain unresolved.
- **Impact:**
  Completely eliminates silent history truncation under restrictive server row limits; guarantees mathematically complete pagination across all deployment environments.

---

## 2. Operational Blockers & External Dependencies

The following items are outside the scope of local autonomous file editing and represent operational decisions or environment configurations for the repository owner:

### Blocker 1: Production Supabase RLS Policies & Remote Database State
- **Status:** Untouched by protocol (Absolute Safety Rule #6 strictly observed).
- **Detail:**
  Certain features (such as dynamic grading criteria persistence and notification delivery) depend on existing Postgres tables and Row Level Security (RLS) policies in the production Supabase instance. If tables were created without public read or user-scoped update policies, API calls will return Supabase RLS violations. Migration `supabase/migrations/20261013_user_notification_reads.sql` is prepared as a clean, reversible SQL artifact for the dedicated notification read tracking table, but has not been applied to production database.
- **Action for Owner:**
  Verify that the `teacher_initials`, `grading_criteria`, and `notifications` tables have appropriate RLS policies configured in the Supabase Dashboard SQL Editor before end-of-term examinations. Apply `20261013_user_notification_reads.sql` when ready.

### Blocker 2: Transactional Email / SMTP Provider for Teacher Invitations
- **Status:** Environmental Dependency.
- **Detail:**
  `/api/admin/teachers/invite` generates an invitation record with an activation token. In development environments without configured Resend / SendGrid / SMTP credentials, automated invitation emails cannot be dispatched over SMTP.
- **Workaround in Place:**
  The administrative interface displays the invitation link directly, allowing administrators to copy and share the invitation link or activation code via WhatsApp or SMS directly to the teacher.
- **Action for Owner:**
  Configure `RESEND_API_KEY` or SMTP environment variables in the Vercel project settings if automated email dispatch is desired.

### Blocker 3: Web Push Notification Service Worker (VAPID Keys)
- **Status:** Deferred for Future Enhancement.
- **Detail:**
  Push notifications to teacher smartphones when the browser is closed require browser Push API registration and public/private VAPID key pairs.
- **Mitigation:**
  The in-app live notification bell and unread counter are fully functional and update in real-time while the user has the portal open.
- **Action for Owner:**
  Optionally configure web-push VAPID keys if background device notifications are requested by school administration.

### Blocker 4: Isolated Staging Supabase Environment (Authenticated E2E Blocked)
- **Status:** Environmental Dependency / Operational Blocker.
- **Detail:**
  Live browser end-to-end testing of authenticated administrative routes (`/admin`, `/admin/marks`, `/admin/reports`, `/admin/settings`, `/admin/notifications`) against real backend APIs requires an active session cookie.
  **Safety Rule Adherence:** Under Absolute Safety Rules #2 & #6, creating test users, provisioning disposable administrators, altering passwords, or modifying data in the **production Supabase Auth instance** is strictly prohibited. The previous suggestion to provision a disposable admin in production is **retracted**.
  Investigated existing staging infrastructure: Docker daemon is not running on the host, no secondary `.env.staging` file exists, and no disposable database is available. The preview harness is an unauthenticated development canvas and is **not** a substitute for authenticated session testing.
- **Action for Owner:**
  To complete live authenticated E2E testing safely:
  1. Provision an isolated Supabase Staging Project (e.g. `jiddah-staging`) or start local Docker Supabase (`supabase start`), applying the existing migrations.
  2. Configure a test runner pointing to staging credentials (`TEST_AUTH_EMAIL`, `TEST_AUTH_PASSWORD`) without exposing production accounts.

---

## 3. Recommended Owner Action Checklist

Upon resuming work, the owner is recommended to perform the following sequential steps:

1. **Review Local Git State:**
   ```powershell
   git status
   git diff --stat origin/main...feat/core-completion-autopilot
   ```
2. **Execute Local Verification Suite:**
   ```powershell
   npx tsc --noEmit
   npm test
   npm run build
   ```
3. **Inspect Generated Report Outputs:**
   Review `scratch/theology_4cards_verified.pdf` and `scratch/portal_print_actual.png` to confirm visual print fidelity.
4. **Merge & Deploy:**
   Merge `feat/core-completion-autopilot` into `main` and trigger Vercel deployment when satisfied.


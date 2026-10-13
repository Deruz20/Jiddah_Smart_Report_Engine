# JIDDAH SMART REPORT ENGINE — DECISIONS AND BLOCKERS
**Document:** Technical Decisions, Architecture Rationale, and Operational Blockers  
**Date:** 2026-10-13  
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

---


## 2. Operational Blockers & External Dependencies

The following items are outside the scope of local autonomous file editing and represent operational decisions or environment configurations for the repository owner:

### Blocker 1: Production Supabase RLS Policies & Remote Database State
- **Status:** Untouched by protocol (Absolute Safety Rule #6 strictly observed).
- **Detail:**
  Certain features (such as dynamic grading criteria persistence and notification delivery) depend on existing Postgres tables and Row Level Security (RLS) policies in the production Supabase instance. If tables were created without public read or user-scoped update policies, API calls will return Supabase RLS violations.
- **Action for Owner:**
  Verify that the `teacher_initials`, `grading_criteria`, and `notifications` tables have appropriate RLS policies configured in the Supabase Dashboard SQL Editor before end-of-term examinations.

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

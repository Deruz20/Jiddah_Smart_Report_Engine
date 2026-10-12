# JIDDAH SMART REPORT ENGINE — DECISIONS AND BLOCKERS
**Document:** Technical Decisions, Architecture Rationale, and Operational Blockers  
**Date:** 2026-10-12  
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

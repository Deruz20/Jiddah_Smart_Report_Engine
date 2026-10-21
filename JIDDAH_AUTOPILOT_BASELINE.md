# JIDDAH SMART REPORT ENGINE — AUTOPILOT BASELINE REPORT
**Date:** 2026-10-11  
**Timestamp:** 2026-10-11T21:48:20+03:00  
**Repository Working Directory:** `C:\Users\USER\Desktop\school_management_system\jiddah_repo_clean_room`  
**Git Toplevel:** `C:/Users/USER/Desktop/school_management_system/jiddah_repo_clean_room`  
**Base HEAD SHA:** `e14e30afcdb4f00e467f850c1b191ffc65b7764e`  
**Working Branch:** `feat/core-completion-autopilot` (branched from `main` preserving all uncommitted changes)  
**Remote URL:** `origin https://github.com/Deruz20/Jiddah_Smart_Report_Engine.git`  
**External Checkpoint Directory:** `C:\Users\USER\Desktop\school_management_system\.checkpoints\jiddah_autopilot_baseline_20261011_214820` (44 files preserved)

---

## 1. Executive Summary & Working-Tree State

At the start of this autopilot session, `jiddah_repo_clean_room` was verified as the authoritative live clean-room codebase matching Vercel production.
A Next.js development server was already running on `http://localhost:3000`.

### Owner's Uncommitted Working-Tree Files Found:
- **Modified (23 files):**
  - `AGENTS.md` (Next.js 16 auto-rules header)
  - `package.json` & `package-lock.json` (`next` ^16.3.6, `@serwist/next` ^9.4.1)
  - `src/app/apple-icon.tsx`, `favicon.ico`, `icon.tsx`, `layout.tsx`, `manifest.ts` (Branding icons & metadata)
  - `src/app/globals.css` & `src/app/print.css` (Print layout isolation & styles)
  - `src/styles/reports/print-system.css` (Deep print pagination, @page sizing, layout rules)
  - `src/components/MarksEntryClient.tsx` (Integration of report preview & portals)
  - `src/components/ReportGeneratorClient.tsx` (Print portal integration, preview cell)
  - `src/components/figma-ui/DocumentCanvas.tsx`
  - `src/components/layout/PowerSyncSplash.tsx`, `PowerSyncStatus.tsx`
  - `src/components/providers/PowerSyncProvider.tsx`
  - `src/components/reports/PrimaryBOTReport.tsx` (CSS namespacing with `.mot-*`, line-saving layout, totals binding)
  - `src/components/reports/PrimaryMOTReport.tsx` (CSS namespacing with `.mot-*`, single-page print preservation)
  - `src/components/reports/PrimaryEOTReport.tsx` (Subject remarks fallback, table formatting)
  - `src/components/reports/TheologyMOTReport.tsx` (2-up & 4-cards-per-sheet compact print layout)
  - `src/components/reports/ReportViewport.tsx`
  - `src/components/reports/shared/ReportContainer.tsx`
- **Untracked (21 files):**
  - `public/apple-touch-icon.png`, `favicon.ico`, `icon-192.png`, `icon-512.png`, `jiddah_badge.jpg`, `jiddah_badge.png`, `school_badge_enhanced.png`
  - `scratch/` verification artifacts (`theology_4cards_verified.pdf`, test screenshots)
  - `scripts/verify-all-tabs.mjs`, `scripts/verify-print-preview.mjs`, `scripts/verify-theology-sheets.mjs`
  - `src/app/preview-test/` (Interactive multi-template test harness)
  - `src/components/reports/PrintPortal.tsx` (DOM portal for print isolation)
  - `src/components/reports/ReportPreviewCell.tsx` (Responsive scaled preview component)

**Action Taken:** All 44 files were archived to `C:\Users\USER\Desktop\school_management_system\.checkpoints\jiddah_autopilot_baseline_20261011_214820` and artifact storage before creating feature branch `feat/core-completion-autopilot`. All owner changes remain intact in the working tree.

---

## 2. Route & Journey Map

### Public & Authentication Routes:
- `/` — Landing page / redirect to `/admin` or `/login`
- `/login` — Email/password login with Supabase Auth
- `/register` — Account registration (linked to teacher invitations)
- `/reset-password` — Password reset journey
- `/pending` — Awaiting approval state
- `/preview-test` — Internal multi-template preview & print harness

### Core Admin Journeys (`/admin/*`):
- `/admin` — High-level dashboard with KPIs, notifications preview, recent activity
- `/admin/marks` — Marks Entry (Secular & Nursery assessments)
- `/admin/secular-hub` — Tabular secular marks management & subject-level entry
- `/admin/theology-hub` — Theology marks management, assessment sheets, top student rankings
- `/admin/reports` — Report Card Generator (Single and Batch generation, PDF download, print portal)
- `/admin/settings` — School Profile, Academic Terms, Teacher Initials, Branding & Theme, Language
- `/admin/settings/grading-standards` — Dynamic Grading Criteria Engine (override rules per class/metric)
- `/admin/notifications` — In-app notification center & full activity log
- `/admin/teachers` — Faculty directory & role assignments
- `/admin/invites` — Teacher invitation tracking & activation codes
- `/admin/students` — Learner directory, enrollment, editing, soft delete
- `/admin/classes` — Class configuration (circular & theology)
- `/admin/terms` — Term management & active term selection

---

## 3. Data Flow & Authoritative Calculation Pipeline

```
Marks Input (circular_marks / theology_marks)
       │
       ▼
Database Storage (Supabase Postgres)
       │
       ▼
Calculation Layer (`/api/report` & `/api/report/batch`)
       │
       ├─► 1. Grade Evaluation (`getSubjectGradeNumber` / `getGradeDisplay` from `@/lib/grading`)
       ├─► 2. Overriding Criteria (`evaluateCriteria` from `@/lib/grading-engine`)
       ├─► 3. Core Subject Filtering (`CORE_SUBJECTS_BY_SECTION`, `isGradableSubject`)
       ├─► 4. Aggregate Calculation (`calculateAggregate`: lower=ENG,MATH,LIT1,LIT2; upper=ENG,MATH,SCI,SST)
       ├─► 5. Division Classification (`getDivision`: I [<=12], II [<=23], III [<=29], IV [<=34], U)
       ├─► 6. Position Ranking (Competition ranking: `totals.indexOf(targetTotal) + 1`)
       ├─► 7. Automated Comments (`getClassTeacherComment`, `getHeadTeacherComment`, `getConductRemark`)
       │
       ▼
DTO Snapshot (`reportData`: student, term, circular/theology, meta, signatures, settings)
       │
       ├─► Single Preview & Print (`PrimaryBOTReport`, `PrimaryMOTReport`, `PrimaryEOTReport`, `TheologyMOTReport`)
       └─► Batch Reports & PDF Generation (`ReportGeneratorClient`, Puppeteer print-to-PDF)
```

---

## 4. Account Roles & Authorization Baseline

### Database Model:
`teachers` table: `id`, `auth_user_id` (references `auth.users`), `name`, `email`, `role`, `subject`, `classes`, `status`.

### Validated Roles in `src/lib/auth-server.ts`:
- **Administrator / admin:** Full read/write access across all departments, settings, and accounts.
- **Head Teacher / Deputy Head Teacher:** School-wide read access to all departments. Disallowed from raw mark writes.
- **DOS Secular:** Scoped to secular curriculum and secular marks/standards.
- **DOS Theology:** Scoped to theology curriculum and theology marks/standards.
- **Class Teacher / Teacher:** Scoped to assigned classes and secular curriculum.
- **Theology Instructor:** Scoped to assigned classes and theology curriculum.
- **Support Staff:** Denied access to academic endpoints.

### Identified Defects in Role Management:
1. `src/app/api/teachers/route.ts` has a hardcoded `validRoles` list missing `'DOS'`, `'DOS Secular'`, `'DOS Theology'`, and `'Deputy Head Teacher'`. When an admin tries to create or update a DOS teacher, the API rejects it with `400 Invalid teacher role`.
2. `src/app/api/teachers/register/route.ts` creates the `teachers` row with `id: userId`, but does not populate `auth_user_id: userId`. RLS policies checking `teachers.auth_user_id = auth.uid()` fail for newly registered teachers.

---

## 5. Notification Subsystem Baseline

### Implementation Status:
- **Database:** `notifications` table queried by `/api/notifications`, `/api/notifications/unread-count`, and `/admin/notifications/page.tsx`.
- **Top Bar Bell (`src/components/layout/app-topbar.tsx`):** Contains a static placeholder with hardcoded `"3 new"` badge and 3 dummy alerts. It does not fetch real notifications or link to `/admin/notifications`.
- **Mark-Read API (`src/app/api/notifications/[id]/mark-read/route.ts`):**
  - Only implements `PUT` and `PATCH`, while `notifications-client.tsx` calls `{ method: "POST" }` (causing HTTP 405 Method Not Allowed).
  - Supabase `.update(...)` call omits `.select()`, causing `result.data` to be `null` in Supabase v2, triggering an unintentional `404 Not Found`.

---

## 6. Settings Studio & Customization Baseline

### Implementation Status:
- **School Profile:** Persists to `school_settings` via `PATCH /api/settings/school`. Correctly binds `name`, `address`, `district`, `phone`, `email`, `pay_code`, `motto`.
- **Branding & Theme:** Persists `primary_font`, `arabic_font`, `theme_color`, `report_theme_preset`.
- **Academic Terms:** Persists term start/end dates and active term selection.
- **Teacher Initials:** Persists to `teacher_initials` table via `TeacherInitialsConfig.tsx`.
- **Grading Defaults:** Redirects to `/admin/settings/grading-standards` for dynamic criteria.
- **Disconnection Found:** In `SettingsClient.tsx`, notification preferences and security settings are purely local client state and do not save to backend.
- **Report Parity Disconnection:** `batch/route.ts` fetches and binds `teacher_initials` to subjects, whereas `report/route.ts` (single report) omitted `teacher_initials` and omitted `signatures`/`settings` on theology-only outputs.

---

## 7. Responsive UI/UX Baseline

- **Desktop (1440×900):** Clean layout, well-structured cards, functional navigation.
- **Mobile (320px–430px):**
  - Topbar NotificationBell and ProfileDropdown are positioned, but notifications popup overflows narrow screens.
  - Sidebar collapses to mobile drawer, but certain dense tables (e.g. marks entry, teacher list, reports history) require horizontal scrolling with sticky identity columns.
  - Buttons and action items meet or exceed 44×44px touch targets on mobile bottom nav and primary forms.

---

## 8. Baseline Feature & Correctness Matrix

| Feature / Domain | Status | Severity | Evidence & Details |
|---|---|---|---|
| **Primary BOT Report Template** | PARTIAL | High | Owner overhauled CSS scoping (`mot-*`) and totals; single-page layout preserved. Needs single vs batch parity test. |
| **Primary MOT Report Template** | PARTIAL | High | Layout namespaced and print pagination optimized. |
| **Primary EOT Report Template** | VERIFIED | Medium | 4-term UNEB layout renders correctly with remarks fallback. |
| **Theology MOT Report Template** | VERIFIED | Medium | 2-up / 4-card compact layout verified with PDF export in scratch/. |
| **Single Report API (`/api/report`)** | BROKEN | High | Missing `teacher_initials`; missing `signatures` & `settings` on theology curriculum early return. |
| **Batch Report API (`/api/report/batch`)** | PARTIAL | Medium | Typescript TS2367 comparison error; otherwise rich DTO pipeline with chunking and rankings. |
| **Notification Bell Dropdown** | BROKEN | High | Mock static content in `app-topbar.tsx`. Does not poll or link to `/admin/notifications`. |
| **Notification Mark-Read API** | BROKEN | High | Missing `POST` handler; `.update()` missing `.select()` causing false 404. |
| **Teachers API Role Validation** | BROKEN | Medium | Missing `'DOS'` in `validRoles` array in `POST` and `PATCH`. |
| **Teacher Registration Auth Link** | BROKEN | High | Fails to populate `auth_user_id` column during invite claim. |
| **Settings Studio Persistence** | PARTIAL | Medium | School profile, fonts, and terms persist; notification toggles are disconnected in UI. |
| **Transliterate Batch API** | BROKEN | Low | TypeScript TS6234: `response.text()` should be `response.text` getter. |
| **Reports Client Page** | BROKEN | Low | TypeScript TS2304: Missing `PageState` import. |
| **Theology Hub Client** | PARTIAL | Low | TypeScript TS2367: `examPhase` state omitted `'bot'`. |

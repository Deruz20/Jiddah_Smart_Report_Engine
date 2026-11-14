# Jiddah Smart Report Engine — Full System Renovation & SaaS Readiness Ledger

**Branch:** `feat/overnight-system-renovation`  
**Platform:** Jiddah Smart Report Engine (`jiddah_repo_clean_room`) — Foundational Academic & Assessment Engine for `school_management_system`  
**Architectural Mandate:** Exhaustive 15-Module Renovation, Unified Teacher & Department Scoping Engine (`resolveUserScope`), Zero Blocking Browser Dialogs (`alert` / `confirm`), and Production Verification Gate.

---

## 1. Workstream 1: Unified Teacher & Department Scoping Engine (`src/lib/access-scope.ts`)

We architected and wired a single authoritative server + client permission and scope resolver (`resolveUserScope`, `canAccessClassInScope`, `canAccessSubjectInScope`, `canAccessFullClassBroadsheet`) across all UI views and `/api/*` endpoints:

1. **Admin / Headteacher / DOS:**
   - Full institutional access across Secular and Theology departments, settings, staff, and audit logs.
   - DOS Secular (`department: 'secular'`) and DOS Theology (`department: 'theology'`) retain leadership capabilities (`isDOS: true`, `isFullAccess: true` within their department) while staying cleanly isolated to their curriculum track.
2. **Department Isolation (`secular` | `theology` | `both`):**
   - Secular teachers only see and access Secular subjects (`circular_subjects`), Secular Marks Entry, and `Secular Hub`.
   - Theology teachers only see and access Theology subjects (`theology_subjects`), Theology Marks Entry, and `Theology Hub`.
3. **Subject Teacher vs. Class Teacher (Homeroom / Muraqib) Scope:**
   - **Subject Teachers (`isSubjectTeacher: true, isClassTeacher: false`):** Restricted in `Marks Entry`, `Subjects`, and `Hubs` strictly to their assigned `class_id + subject_id` pairs (`assignedSubjectPairs` / `assignedSubjects`) for the active term. Their first assigned class (`defaultClassId`) and subject (`defaultSubjectId`) are auto-selected by default.
   - **Class Teachers (`isClassTeacher: true`):** Granted access to `Classes` (rollcalls, rosters, profiles), `Students`, `Report Center` (generating/printing reports and editing Class Teacher Remarks), and full-class Hub broadsheets strictly for their assigned homeroom class(es).
4. **Graceful Unassigned State (`<UnassignedTeacherState />`):**
   - When an active teacher account has no assigned classes or subjects (`isUnassigned: true`), routes render a clean institutional empty-state card (`src/components/UnassignedTeacherState.tsx`) explaining what needs to be assigned by the Administrator/DOS instead of throwing a `403` crash or infinite loading spinner.

---

## 2. Workstream 2: Exhaustive 15-Module Renovation Audit Table

| # | Module | Files Modified | Bugs Fixed & Enhancements Delivered | Teacher / Department Scope Verified | Build & Test Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Global Top Header & Shell** | `src/components/layout/app-sidebar.tsx`, `src/components/layout/command-palette.tsx` | Added `Classes`, `Subjects`, and `School Settings` to sidebar navigation; synced role/subject changes from `teachers` table in `AppSidebar`; upgraded `⌘K` Command Palette (`command-palette.tsx`) to index and search live **Students**, **Classes** (Secular & Theology), and **Staff** alongside navigation routes. | Filtered sidebar links and `⌘K` search results by `resolveUserScope` (Subject Teachers see `Dashboard`, `Marks Entry`, `Subjects`, and their department's `Hub`; Class Teachers also see `Students`, `Classes`, and `Report Center`). | Verified (`tsc` + `build` PASS) |
| **2** | **Dashboard** | `src/app/admin/page.tsx`, `src/components/layout/dashboard-content.tsx`, `src/app/api/analytics/dashboard/route.ts` | Removed hardcoded `94%` attendance fallback when `totalAttendance === 0`; built `classStatuses` for Theology cohorts (`theology_classes` + `theology_marks`) as well as Secular cohorts; replaced hardcoded `"100% secular"` badge and mock staff entries; rewrote `/api/analytics/dashboard` to return real DB metrics. | Enforced `verifyDataAccess` + `resolveUserScope`; renders `<UnassignedTeacherState />` when `isUnassigned` is true; adapts quick-action CTAs for Subject Teachers vs Class Teachers vs Admin/DOS. | Verified (`tsc` + `build` PASS) |
| **3** | **Marks Entry** | `src/app/admin/marks/page.tsx`, `src/components/AdminMarksEntryClient.tsx`, `src/components/shared-marks-entry.tsx`, `src/components/layout/circular-client.tsx`, `src/components/layout/theology-client.tsx`, `src/app/api/marks/route.ts` | Added strict `[0, 100]` numeric score range validation on both client and server (`POST /api/marks`); included Theology class cohorts in `classOptions`; auto-selected first assigned class and subject for Subject Teachers. | Enforced `resolveUserScope` and `canAccessSubjectInScope` on UI and `GET/POST /api/marks`; renders `<UnassignedTeacherState />` when teacher has no assigned classes/subjects. | Verified (`tsc` + `build` PASS) |
| **4** | **Students** | `src/app/admin/students/page.tsx`, `src/components/StudentsListClient.tsx` | Removed hardcoded `|| 2` fallback on `runningClassesCount`; wired `?search=` query param from `⌘K` Global Search into `StudentsListClient.tsx` so student search links filter the roster immediately; replaced bare `"No assigned classes."` text with `<UnassignedTeacherState />`. | Enforced `verifyDataAccess` + `rosterClassFilters` so Class Teachers only view/manage students enrolled in their assigned Secular/Theology classes. | Verified (`tsc` + `build` PASS) |
| **5** | **Report Center** | `src/app/admin/reports/page.tsx`, `src/components/ReportGeneratorClient.tsx`, `src/components/reports/ReportStudioClient.tsx` | Wired `resolveUserScope` and `<UnassignedTeacherState />` into `/admin/reports`; preserved locked inline styles and A4 print stability across all 6 official report card templates (`PrimaryEOTReport`, `PrimaryMOTReport`, `NurseryEOTReport`, `NurseryMOTReport`, `TheologyMOTReport`, `NurseryTheologyEOTReport`). | Restricted Report Center to Admin, Head Teacher, DOS, and homeroom Class Teachers (`canAccessReports`), scoped to their assigned classes and department. | Verified (`tsc` + `build` + `eot-report-auth-and-badges.test.mjs` PASS) |
| **6** | **Notifications & Account** | `src/components/layout/notifications-client.tsx`, `src/components/layout/account-client.tsx`, `src/app/api/notifications/route.ts`, `src/app/api/notifications/mark-all-read/route.ts` | Replaced all 9 raw `alert()` calls in `account-client.tsx` with `sonner` `toast.success` / `toast.error`; synced profile name and phone updates to both `profiles` and `teachers` tables with `router.refresh()`. | Verified per-user notification read isolation (`notification_reads` + high-water mark fallback) across 106 unit/edge-case tests. | Verified (`tsc` + `build` + `pipeline-parity-and-edge-cases.test.mjs` PASS) |
| **7** | **Teachers & Staff** | `src/components/layout/teachers-client.tsx`, `src/app/api/admin/teachers/[id]/route.ts`, `src/app/api/teachers/route.ts` | Replaced `window.confirm` on teacher deactivation with `<ConfirmDestructiveDialog />`; added `"Subject Teacher"` role and `"Both (Secular & Theology)"` scope options; fixed `PUT /api/admin/teachers/[id]` to sync `teacher_class_assignments` and safely resolve `auth_user_id` inside `try/catch`; wired `?search=` param for `⌘K` staff search. | Restricted teacher mutations (`PUT`/`DELETE`) to Administrators (`isAdministratorRole`) and scoped `GET /api/teachers` by department for DOS. | Verified (`tsc` + `build` PASS) |
| **8** | **Classes & Roll Call** | `src/app/admin/classes/page.tsx`, `src/app/admin/classes/[id]/page.tsx`, `src/components/layout/classes-client.tsx`, `src/components/layout/class-dashboard-client.tsx`, `src/components/teacher/RollCallClient.tsx` | Replaced all `alert()` and `confirm()` calls across `classes-client.tsx`, `class-dashboard-client.tsx`, and `RollCallClient.tsx` with `sonner` toasts and `<ConfirmDestructiveDialog />`; replaced placeholder performance tab in `class-dashboard-client.tsx` with real subject-level mean score & grading coverage analytics; added Theology class support to `/admin/classes` and `/admin/classes/[id]`. | Enforced `verifyDataAccess` + `resolveUserScope` + `canAccessClassInScope`; renders `<UnassignedTeacherState />` when teacher has no classes; gates class creation/deletion to leadership (`canManageClasses`). | Verified (`tsc` + `build` PASS) |
| **9** | **Subjects** | `src/app/admin/subjects/page.tsx`, `src/components/layout/subjects-client.tsx` | Replaced all 5 `alert()` calls in `subjects-client.tsx` with `sonner` toasts and `router.refresh()`; gated subject creation/editing/deletion with `canManageSubjects`. | Enforced department isolation (`secular` vs `theology`) and Subject Teacher filtering (`canAccessSubjectInScope`) in `/admin/subjects` and `subjects-client.tsx`. | Verified (`tsc` + `build` PASS) |
| **10** | **Secular Hub** | `src/app/admin/secular-hub/page.tsx`, `src/components/secular-hub/SecularHubClient.tsx`, `src/app/api/secular-hub/route.ts` | Wired `resolveUserScope` and `<UnassignedTeacherState />` into `/admin/secular-hub`; filtered subjects in `GET /api/secular-hub` for Subject Teachers while preserving full-class broadsheets for Class Teachers and leadership. | Enforced `verifyDataAccess(supabase, user, 'read', null, 'secular')` and class/subject scope boundaries. | Verified (`tsc` + `build` PASS) |
| **11** | **Theology Hub** | `src/app/admin/theology-hub/page.tsx`, `src/components/theology-hub/TheologyHubClient.tsx`, `src/app/api/theology-hub/route.ts` | Wired `resolveUserScope` and `<UnassignedTeacherState />` into `/admin/theology-hub`; filtered theology subjects in `GET /api/theology-hub` for Theology Subject Teachers while preserving full-class Arabic broadsheets for Class Teachers (Muraqib) and leadership. | Enforced `verifyDataAccess(supabase, user, 'read', null, 'theology')` and class/subject scope boundaries. | Verified (`tsc` + `build` PASS) |
| **12** | **Activity Log & Audit Trail** | `src/app/admin/activity/page.tsx`, `src/components/layout/activity-client.tsx`, `src/components/layout/my-activity-client.tsx` | Unified dual-table audit trail (`activity_logs` + `activity_log`) with actor resolution and department tagging. | Enforced `verifyDataAccess` and department scoping (`filterByDepartment`) on `/admin/activity`. | Verified (`tsc` + `build` PASS) |
| **13** | **Invites & Onboarding** | `src/app/admin/invites/page.tsx`, `src/app/onboarding/page.tsx`, `src/app/register/register-client.tsx` | Updated `/admin/invites` to use `verifyDataAccess` instead of brittle email-only lookup, supporting Administrators, Head Teachers, and DOS. | Enforced server-side `verifyDataAccess` role verification. | Verified (`tsc` + `build` PASS) |
| **14** | **Uploads** | `src/components/layout/upload-client.tsx`, `src/app/api/documents/upload/route.ts`, `src/app/api/signatures/upload/route.ts` | Replaced all 6 `alert()` calls and 1 `window.confirm()` call in `upload-client.tsx` with `sonner` toasts, `<ConfirmDestructiveDialog />`, and `router.refresh()`. | Verified MIME-to-extension canonicalization and magic-byte content sniffing (`security-hardening-and-invariants.test.mjs`). | Verified (`tsc` + `build` PASS) |
| **15** | **School Settings** | `src/components/SettingsClient.tsx`, `src/components/layout/grading-criteria-client.tsx`, `src/components/layout/terms-client.tsx`, `src/components/layout/signatures-client.tsx`, `src/app/admin/dev-tools/page.tsx` | Replaced all remaining `alert()` and `confirm()` / `window.confirm()` calls across `SettingsClient.tsx`, `grading-criteria-client.tsx`, `terms-client.tsx`, `signatures-client.tsx`, and `dev-tools/page.tsx` with `sonner` toasts and `<ConfirmDestructiveDialog />`. | Enforced `verifyDataAccess` on `/admin/settings`, `/api/settings/school`, `/api/settings/terms`, and `/api/settings/terms/active`. | Verified (`tsc` + `build` PASS) |

---

## 3. Workstream 3 & 4: Verification Evidence

1. **Zero Raw Browser `alert()` / `confirm()` Dialogs:**
   - Command: `grep -rn "window\.confirm\|window\.alert\|[^a-zA-Z0-9_]confirm(\|[^a-zA-Z0-9_]alert(" src/ --exclude-dir=__tests__`
   - Result: **0 matches** across all UI components and pages.
2. **TypeScript Type Check (`npx tsc --noEmit`):**
   - Result: **0 errors** (Exit code `0`).
3. **Automated Test Suites (`./node_modules/.bin/jiti src/__tests__/*.test.mjs`):**
   - `rbac-permission-matrix.test.mjs`: **14/14 PASS** (including Suite 6: `Unified Teacher & Department Scoping Engine (resolveUserScope)`)
   - `teacher-access.test.mjs`: **13/13 PASS**
   - `customization-and-contrast.test.mjs`: **7/7 PASS**
   - `eot-report-auth-and-badges.test.mjs`: **11/11 PASS**
   - `grading-and-calculations.test.mjs`: **47/47 PASS**
   - `independent-grading-oracle.test.mjs`: **1,020/1,020 PASS**
   - `pipeline-parity-and-edge-cases.test.mjs`: **106/106 PASS**
   - `ranking-preferences-regression.test.mjs`: **6/6 PASS**
   - `report-studio-positioning-and-previews.test.mjs`: **11/11 PASS**
   - `security-hardening-and-invariants.test.mjs`: **6/6 PASS**
   - `signature-deactivation.test.mjs`: **8/8 PASS**
   - `student-registration-v2-prototype.test.mjs`: **8/8 PASS**
   - `theology-2026-standards.test.mjs`: **11/11 PASS**
4. **Next.js Production Build (`npm run build`):**
   - Result: **0 build errors** (Compiled and bundled cleanly).


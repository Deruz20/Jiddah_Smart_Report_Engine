# OWNER CHECKLIST — JIDDAH SMART REPORT ENGINE

**Governing Hard Limits:** Zero production database connection strings in tooling; no automated CLI scripts executed against production; all owner actions are reviewed and executed directly by the owner.  
**Plan Tier Constraint:** Supabase Free Tier (no automated PITR backups). Manual CSV export fallback mandatory.  
**Execution Gate Status:** OWNER GATE 1 IS NOT APPROVED. No migrations are applied anywhere. Production changes happen only from this checklist after staging verification.

---

## 1. Role Permission Matrix (Plain English — From Code, Unapproved)

Every capability row below is extracted directly from static code inspection of the actual repository and rehearsal test execution. Every row is explicitly marked `[from code, unapproved]` pending owner review and sign-off.

| Capability / Action | Unauthenticated (`anon`) | Support Staff | Theology Instructor | Class Teacher | DOS (Secular/Theology) | Head Teacher / Deputy | Administrator (`admin`) | Status & Provenance |
|---|---|---|---|---|---|---|---|---|
| **View System Health (`/api/health`)** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | `[from code, unapproved]` |
| **Read Theology Class Catalog (Names & IDs only)** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | `[from code, unapproved]` |
| **Read Student Registry (`/api/students`)** | ❌ Blocked (401) | ❌ Blocked (403) | 🔍 Assigned Only | 🔍 Assigned Only | 🔍 Dept Only | ✅ Full Read | ✅ Full Read | `[from code, unapproved]` |
| **Register / Enroll Student Profile** | ❌ Blocked (401) | ❌ Blocked (403) | ⚠️ Assigned Class Only (API allows) | ⚠️ Assigned Class Only (API allows) | ✅ Dept Wide | ✅ All Classes | ✅ All Classes | `[from code, unapproved]` |
| **Read Active Term (`GET /api/settings/terms/active`)** | ❌ Blocked (401) | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | `[from code, unapproved]` (GET: any authenticated staff. Status: PENDING GATE 1.) |
| **Set Active Term (`POST /api/settings/terms/active`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Allowed | `[from code, unapproved]` (POST: Administrator only. Status: PENDING GATE 1.) |
| **Enter Marks (Assigned Class & Subjects)** | ❌ Blocked (401) | ❌ Blocked (403) | ✅ Theology Only | ✅ Circular Only | ✅ Dept Moderation | ❌ Read Only | ✅ Full Write | `[from code, unapproved]` |
| **Enter Marks (Cross-Class / Unassigned)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Admin Override | `[from code, unapproved]` |
| **Generate Report Card (`/api/report`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | 🔍 Assigned Class | ✅ Dept Wide | ✅ All Classes | ✅ All Classes | `[from code, unapproved]` |
| **View Global Activity Logs (`/api/activity`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Dept Logs | ✅ Full Read | ✅ Full Read | `[from code, unapproved]` |
| **Manage School Settings & Themes** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Allowed | `[from code, unapproved]` |
| **Invite / Edit / Deactivate Teachers** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Allowed | `[from code, unapproved]` |
| **Change Own Role (Self-Elevation)** | ❌ Blocked | ❌ Blocked (Trigger) | ❌ Blocked (Trigger) | ❌ Blocked (Trigger) | ❌ Blocked (Trigger) | ❌ Blocked (Trigger) | ❌ Blocked (Trigger) | `[from code, unapproved]` |
| **Upload Institutional Signatures & Stamps** | ❌ Blocked (401) | ⚠️ Unchecked in API | ⚠️ Unchecked in API | ⚠️ Unchecked in API | ⚠️ Unchecked in API | ✅ Intended Admin/HT | ✅ Intended Admin/HT | `[from code, unapproved]` |

---

## 2. Role Discrepancy Inventory: Disagreements Across Database, API, and Application Code

This inventory documents all 9 locations where the Database schema, API server endpoints, and Frontend application contradict each other regarding roles:

1. **Database `teachers_role_check` vs `teacher_invites_role_check` (Database Internal Conflict):**
   - In `public.teachers`: `CHECK (role IN ('Head Teacher', 'Class Teacher', 'Theology Instructor', 'Administrator', 'Support Staff', 'DOS'))`.
   - In `public.teacher_invites`: `CHECK (role IN ('teacher', 'DOS Secular', 'DOS Theology', 'Class Teacher', 'Head Teacher', 'Theology Instructor', 'Deputy Head Teacher', 'Support Staff', 'Administrator'))`.
   - **Discrepancy:** An administrator can invite a staff member as `'teacher'` (lowercase generic), `'DOS Secular'`, `'DOS Theology'`, or `'Deputy Head Teacher'`. However, when that user attempts to complete registration, the insert into `public.teachers` fails with PostgreSQL error `23514 (check_violation)` because `teachers_role_check` rejects all four values. Conversely, `teachers` permits `'DOS'`, but `teacher_invites` rejects `'DOS'`.

2. **Zod Validation Schemas vs Database Canonical Roles (`src/lib/validation.ts`):**
   - `teacherFormSchema` (line 23): `z.enum(['Head Teacher', 'Class Teacher', 'Theology Instructor', 'Deputy Head Teacher', 'Support Staff'])`.
     - **Discrepancy:** Missing `Administrator`, `admin`, `DOS`, `DOS Secular`, and `DOS Theology`. Any administrative form submitted through this schema fails validation.
   - `signUpFormSchema` (line 38): `z.enum(['Admin', 'Secular DOS', 'Theology DOS'])`.
     - **Discrepancy:** Uses `'Admin'` (capital A, truncated; DB expects `'Administrator'`) and reverses word order: `'Secular DOS'` and `'Theology DOS'` (DB and invite table use `'DOS Secular'` and `'DOS Theology'`).

3. **Deputy Head Teacher Navigation Routing (`src/utils/supabase/middleware.ts` vs `src/lib/auth-server.ts`):**
   - In `src/lib/auth-server.ts` (line 56): `Deputy Head Teacher` is treated as a senior academic executive with school-wide read access across all classes in both departments.
   - In `src/utils/supabase/middleware.ts` (line 74): `Deputy Head Teacher` is assigned `targetLanding = '/pending'`, redirecting them away from the admin dashboard to the pending/unassigned page.
   - In `src/app/admin/invites/page.tsx` (line 21): Checks `profile.role !== 'Administrator' && profile.role !== 'admin'`, denying Deputy Head Teachers access to invite status tracking.

4. **Signatures Utility Slot Role Names (`src/utils/signatures.ts` vs Database):**
   - `src/utils/signatures.ts` (line 48): Defines slot with `role: 'Principal'`.
   - `src/utils/signatures.ts` (line 112): Defines slot with `role: 'Theology Teacher'`.
   - **Discrepancy:** Neither `'Principal'` nor `'Theology Teacher'` exists anywhere in the database schema or check constraints. The database uses `'Head Teacher'` and `'Theology Instructor'`.

5. **Student Registration Authorization (`src/app/api/students/route.ts` vs Permission Matrix):**
   - Proposed Matrix: Only DOS, Head Teacher, and Administrator can register/enroll students.
   - Actual API Implementation (`src/app/api/students/route.ts` lines 107-123): `verifyDataAccess(supabase, user, 'write')` is called. For `Class Teacher` and `Theology Instructor`, it returns `isAuthorized: true` with `filterByClasses`. The API allows teachers to create and enroll students as long as the student is enrolled into their assigned class.

6. **School Settings Access (`src/app/api/settings/school/route.ts` vs UI `SettingsClient.tsx`):**
   - UI Display (`src/components/SettingsClient.tsx` lines 894-897): Tells users that Head Teacher and DOS have "Read-Only Standards" access to school settings.
   - Actual API Route (`src/app/api/settings/school/route.ts` line 47): `if (authRes.role !== 'Administrator' && authRes.role !== 'admin') return 403`. Head Teacher and DOS callers receive HTTP `403 Access Denied: Administrator only`.

7. **Signatures Upload Route Authorization (`src/app/api/signatures/upload/route.ts` vs Database RLS):**
   - Database / Stage 1 SQL: Restricts `signatures` table access to `Administrator`, `admin`, and `Head Teacher`.
   - Actual API Route (`src/app/api/signatures/upload/route.ts` lines 24-28): Only verifies `user` is authenticated (`if (!user) return 401`). It performs NO role check whatsoever. Any logged-in staff member or teacher could upload to `/api/signatures/upload` using the API.

8. **Dashboard UI Role Enum (`src/components/layout/dashboard-content.tsx`):**
   - Line 40 defines `role: 'admin' | 'dos' | 'teacher'`.
   - **Discrepancy:** Coarse 3-role enum flattens Head Teacher, Deputy Head Teacher, Support Staff, and Theology Instructor into arbitrary fallback buckets.

9. **DOS Role Normalization Workaround (`src/app/api/teachers/register/route.ts`):**
   - Lines 38-44: Explicitly rewrites `invite.role = 'DOS Theology'` or `'DOS Secular'` to `finalRole = 'DOS'` and sets `subject = 'Theology'` or `'Secular'`.
   - **Discrepancy:** This hardcoded mutation exists solely because the database `teachers` table constraint did not allow `'DOS Secular'` or `'DOS Theology'`.

---

## 3. ORDERED EXECUTION PROTOCOL FOR THE OWNER

Please follow these steps in sequential order. Check off each box as you complete it and report results back.

---

### STEP 1: Pre-Flight Safety & CSV Backup Fallback (Mandatory)
Because Supabase Free tier does not offer automated point-in-time recovery, export critical tables before applying any changes:
- [ ] 1.1 Open [Supabase Dashboard](https://supabase.com/dashboard) -> Select `Jiddah Smart Report Engine` project.
- [ ] 1.2 Navigate to **Table Editor**. For each table below, open it, click **Export** (top right) -> **Export to CSV**, and save in an encrypted backup folder:
  - `teachers`
  - `students`
  - `enrollments`
  - `circular_marks`
  - `theology_marks`
  - `teacher_class_assignments`
  - `school_settings`
  - `signatures`
  - `teacher_initials`
  - `terms`
  - `academic_terms`
  - `notifications`

---

### STEP 2: Disable Public Sign-Ups in Supabase Auth
- [ ] 2.1 In Supabase Dashboard, click **Authentication** (left sidebar) -> **Configuration** (or **Providers** / **Email**).
- [ ] 2.2 Find the toggle **Enable Email Signups** (or **Allow new users to sign up**).
- [ ] 2.3 Turn it **OFF** (Disabled).
- [ ] 2.4 Click **Save**.
- [ ] *Verification Note:* Teacher account creation in Jiddah uses `supabaseAdmin.auth.admin.createUser` from the secure server backend (`/api/teachers/register`), which bypasses this setting. Disabling public sign-ups prevents unauthorized external accounts while keeping teacher invitations 100% operational.

---

### STEP 3: Read-Only Synthetic Data Inspection (Safe Production SQL)
- [ ] 3.1 Open Supabase Dashboard -> **SQL Editor** -> **New Query**.
- [ ] 3.2 Open [`docs/READONLY_SYNTHETIC_DATA_INSPECTION.sql`](file:///c:/Users/USER/Desktop/school_management_system/jiddah_repo_clean_room/docs/READONLY_SYNTHETIC_DATA_INSPECTION.sql).
- [ ] 3.3 Copy the entire content, paste into the SQL Editor, and click **Run**.
- [ ] 3.4 Review the output:
  - Count of test users matching `teacher_a_*`, `teacher_b_*`, `audit_tr_*`, `@jiddah.local`.
  - Count of test students created on 22-23 Sep 2026.
  - Count of linked marks and assignments.
- [ ] 3.5 Copy or save the counts and report them in your feedback response.
- [ ] *Note on Cleanup:* Review [`scripts/cleanup_synthetic_test_data.sql`](file:///c:/Users/USER/Desktop/school_management_system/jiddah_repo_clean_room/scripts/cleanup_synthetic_test_data.sql). It defaults to `ROLLBACK;` for a safe dry-run preview. Do NOT change it to `COMMIT;` until you have verified the dry-run numbers.

---

### STEP 4: Apply Stage 1 Security Hardening (Single Transaction)
Remediates authenticated over-reach on `teachers`, `school_settings`, `signatures`, `notifications`, `activity_log`, `teacher_initials`, repairs `grading_criteria`, and adds the missing `teacher_class_assignments` policies (resolving the theology_marks 42501 error).
- [ ] 4.1 In Supabase Dashboard -> **SQL Editor** -> **New Query**.
- [ ] 4.2 Open [`supabase/migrations/stage1_security_lockdown.sql`](file:///c:/Users/USER/Desktop/school_management_system/jiddah_repo_clean_room/supabase/migrations/stage1_security_lockdown.sql).
- [ ] 4.3 Copy all SQL text, paste into the SQL Editor. Confirm `BEGIN;` is at line 1 and `COMMIT;` is at the end.
- [ ] 4.4 Click **Run** (`Ctrl + Enter`).
- [ ] 4.5 Confirm result banner displays: `Success. No rows returned` (0 errors).

---

### STEP 5: Apply Stage 2 Legacy Table Lockdown (Single Transaction)
Enables RLS on 6 legacy tables (`grading_remarks`, `marks_audit_log`, `marks_primary`, `report_templates`, `user_profiles`, `users`) with zero policies. Drops no tables.
- [ ] 5.1 In Supabase Dashboard -> **SQL Editor** -> **New Query**.
- [ ] 5.2 Open [`supabase/migrations/stage2_legacy_tables.sql`](file:///c:/Users/USER/Desktop/school_management_system/jiddah_repo_clean_room/supabase/migrations/stage2_legacy_tables.sql).
- [ ] 5.3 Copy all SQL text, paste into the SQL Editor. Confirm `BEGIN;` and `COMMIT;`.
- [ ] 5.4 Click **Run**.
- [ ] 5.5 Confirm result banner displays: `Success. No rows returned`.

---

### STEP 6: Deploy P0 Hotfix to Vercel Preview (Git Commands)
Run these commands in your local PowerShell terminal to create a separate preview deployment:
```powershell
# 1. Switch to a dedicated hotfix branch
git checkout -b hotfix/test-endpoints

# 2. Stage only the defused test endpoints and security fixes
git add src/app/api/dev/seed/route.ts src/app/api/test_error/route.ts src/app/api/settings/terms/active/route.ts src/lib/powersync/SupabaseConnector.ts src/components/AdminMarksEntryClient.tsx src/utils/supabase/middleware.ts

# 3. Commit with semantic message
git commit -m "security(hotfix): defuse test endpoints with 404, allow teacher active term read, eliminate powersync localhost loop, and strip id debug logs"

# 4. Push branch to GitHub
git push -u origin hotfix/test-endpoints

# 5. Generate Vercel Preview Deployment
vercel --preview
```
- [ ] 6.1 Confirm Vercel outputs a Preview URL: `https://<preview-domain>.vercel.app`.

---

### STEP 7: Smoke Tests Per Role (Verification Protocol)

Execute these 3 smoke tests against your preview or production domain:

#### Smoke Test 1: P0 Endpoints Defusal Check
- [ ] Run in terminal:
  ```powershell
  curl -i -X GET https://<your-domain>/api/test_error
  curl -i -X POST https://<your-domain>/api/test_error
  curl -i -X POST https://<your-domain>/api/dev/seed
  ```
- **Expected Result:** HTTP `404 Not Found` with `{ "error": "Endpoint disabled" }` on all three requests.

#### Smoke Test 2: Anonymous Caller Data Shield Check
- [ ] Run in terminal:
  ```powershell
  curl -i -X GET https://<your-domain>/api/settings/school
  curl -i -X GET https://<your-domain>/api/theology-classes
  ```
- **Expected Results:**
  - `/api/settings/school`: HTTP `401 Unauthorized` with `{ "error": "Unauthorized" }` (zero fields returned).
  - `/api/theology-classes`: HTTP `200 OK` returning an array of `{ id, class_name_arabic, class_name_english, level }` with ZERO student, teacher, or marks data.

#### Smoke Test 3: Authenticated Roles Verification
- [ ] **Class Teacher Login:**
  1. Log in as an assigned Class Teacher.
  2. Open `/admin/marks`.
  3. Verify the Active Term loads (`Term 1, 2026`) without any 403 error.
  4. Enter marks for an assigned Theology class and click **Save Marks**.
  5. Confirm save succeeds with green confirmation badge (42501 error eliminated).
  6. Verify browser console is free of `BEFORE WRITE LOGS` and `Failed to fetch` error loops.
- [ ] **Administrator Login:**
  1. Log in as Administrator.
  2. Open `/admin/settings` -> update motto or branding -> save succeeds.
  3. Open `/admin/teachers` -> verify staff table renders without errors.

---

### STEP 8: PowerSync Dashboard Check
- [ ] 8.1 If PowerSync Cloud service is in use, open your [PowerSync Dashboard](https://powersync.com).
- [ ] 8.2 Verify sync streams are connected to the Supabase database.
- [ ] 8.3 If PowerSync is NOT active or self-hosted instance is offline:
  - In app top bar, verify status badge displays normal synchronized / direct cloud state without looping network errors.

---

### EMERGENCY ROLLBACK RUNBOOK
If any unexpected failure or regression occurs:
1. Open Supabase Dashboard -> **SQL Editor**.
2. Run [`supabase/migrations/stage1_security_rollback.sql`](file:///c:/Users/USER/Desktop/school_management_system/jiddah_repo_clean_room/supabase/migrations/stage1_security_rollback.sql) (Single transaction; restores exact prior catalog policies).
3. Run [`supabase/migrations/stage2_legacy_rollback.sql`](file:///c:/Users/USER/Desktop/school_management_system/jiddah_repo_clean_room/supabase/migrations/stage2_legacy_rollback.sql) (Restores legacy grants and policies).
4. Revert code via: `git checkout main`.

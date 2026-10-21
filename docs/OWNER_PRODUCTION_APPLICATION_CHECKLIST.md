# JIDDAH SMART REPORT ENGINE — OWNER PRODUCTION APPLICATION RUNBOOK

**Target Project:** Jiddah Islamic Schools — Supabase Production Instance  
**Safety Protocol:** Manual Application via Supabase Web Console Only  
**Connection Policy:** ZERO connection strings pasted or CLI commands executed against production.  
**Plan Tier Constraint:** Supabase Free Plan (No automated PITR backups).

---

## 1. Formal Withdrawal of Prior Instructions

> **NOTICE OF WITHDRAWAL (2026-10-17):**  
> All prior production checklists instructing the owner to execute `psql`, run automated CLI migration tools, or execute rehearsal alignment scripts against the production database are **hereby formally withdrawn**.  
> The production database possesses real physical tables (`circular_results`, `theology_results`, `circular_subjects`, `theology_subjects`, `terms`, `teacher_initials`) which must NOT be altered using rehearsal view scripts.

---

## 2. Pre-Flight Backup Procedure (Free Plan Safe Fallback)

Because Supabase Free tier projects do not provide automated Point-In-Time-Recovery (PITR), the owner MUST capture snapshot exports before executing any SQL:

### Step 2.1: Table CSV Exports
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and navigate to your Jiddah project.
2. In the left navigation, click **Table Editor**.
3. For each of the following critical tables, click the table name, click **Export** (top right), and select **Export to CSV**:
   - `students`
   - `teachers`
   - `enrollments`
   - `circular_marks`
   - `theology_marks`
   - `school_settings`
   - `teacher_initials`
   - `academic_terms`
   - `terms`
4. Save these CSV files to a secure, encrypted offline folder (e.g. `jiddah_backup_2026-10-17/`).

### Step 2.2: Schema DDL Snapshot
1. Navigate to **Database** -> **Schema**.
2. Click **Export Schema** (or copy table DDL via the schema viewer) and save to your offline backup folder.

---

## 3. Staged Application Order (Single Transaction)

The production hardening script is structured as an **atomic, all-or-nothing transaction** (`BEGIN; ... COMMIT;`).

1. In Supabase Dashboard, click **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Open the repository file:
   [`supabase/migrations/production_lockdown.sql`](file:///c:/Users/USER/Desktop/school_management_system/jiddah_repo_clean_room/supabase/migrations/production_lockdown.sql)
4. Copy the entire contents of `production_lockdown.sql` and paste it into the SQL Editor.
5. Review the SQL query window to confirm `BEGIN;` is at the top and `COMMIT;` is at the bottom.
6. Click **Run** (or press `Ctrl + Enter`).
7. Confirm the result banner displays:
   `Success. No rows returned` (Exit code 0, 0 errors).

---

## 4. Post-Application Smoke Tests (Verification)

Run the following verification queries in a new SQL Editor tab:

### Test 1: Verify RLS is Enabled
```sql
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname IN ('students', 'terms', 'circular_marks', 'theology_marks');
```
*Expected Result:* All rows show `relrowsecurity = true`.

### Test 2: Verify Public Policy Removal
```sql
SELECT tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'students';
```
*Expected Result:* No policies with `roles = '{public}'` or `policyname = 'Allow read all students'`. All active policies target `authenticated`.

### Test 3: Application Health Check
1. In an incognito browser window, navigate to your production URL: `https://<your-domain>/api/health`.
   *Expected Result:* HTTP 200 with status `"healthy"`.
2. Navigate to `https://<your-domain>/api/settings/school`.
   *Expected Result:* HTTP 401 Unauthorized (Anonymous caller cannot dump school settings or internal keys).
3. Log in as an Administrator in your browser:
   * Verify Student Registry loads without errors.
   * Verify Marks Entry and Report Studio load existing marks.

---

## 5. Instant Rollback Procedure

If any smoke test fails or unexpected behavior is observed:

1. Open Supabase Dashboard -> **SQL Editor**.
2. Click **New Query**.
3. Open the repository file:
   [`supabase/migrations/production_rollback.sql`](file:///c:/Users/USER/Desktop/school_management_system/jiddah_repo_clean_room/supabase/migrations/production_rollback.sql)
4. Copy the entire contents and paste into the SQL Editor.
5. Click **Run**.
6. The rollback script will:
   - Drop the new lockdown policies.
   - Restore the exact prior production policies (`Allow read all students`, `Allow insert students`, and user_metadata `teacher_initials`).
   - Disable RLS on the prior unhardened tables (`students`, `terms`, `circular_results`, `theology_results`, `circular_subjects`, `theology_subjects`).
   - Re-grant prior `anon` permissions.

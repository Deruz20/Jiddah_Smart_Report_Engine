# ONE-PAGE PLAIN-ENGLISH ROLE × ACTION PERMISSION MATRIX
### OWNER GATE 1 PROPOSAL — JIDDAH SMART REPORT ENGINE

---

## 1. Plain-English Role Definitions

1. **Administrator (`Administrator`, alias `admin`):**
   Full operational and system authority. Can invite/deactivate teachers, configure school settings and branding, upload institutional signatures, manage academic terms, and access all student records and marks across both departments.

2. **Head Teacher (`Head Teacher` / `Deputy Head Teacher`):**
   Senior academic executive. Has comprehensive read access across all classes, students, and report cards in both Secular and Theology departments. Final approver for printed report cards. Cannot alter database configuration, delete teachers, or mutate raw marks directly.

3. **Director of Studies (`DOS`, `DOS Secular`, `DOS Theology`):**
   Academic coordinator for a curriculum department. Moderates grading criteria, reviews marks entry progress, queries global activity logs, and audits teacher submissions. Access is restricted to their assigned department (Secular, Theology, or Both). Cannot modify school branding or teacher user accounts.

4. **Class Teacher (`Class Teacher` / `Teacher`):**
   Frontline classroom educator. Enters and saves marks *strictly for students in their assigned classes*. Can read class rosters and generate draft report cards for their students. Attempting to view or modify marks for unassigned classes returns HTTP 403 Forbidden.

5. **Theology Instructor (`Theology Instructor`):**
   Specialized religious studies instructor. Enters marks strictly for assigned theology classes/subjects. Has zero access to secular curriculum grading or administrative settings.

6. **Support Staff (`Support Staff`):**
   Administrative and operational assistance (e.g. bursar, front desk). Strictly isolated from student exam marks, report cards, and academic grading surfaces.

7. **Unauthenticated Guest (`anon`):**
   Public caller with zero credentials. Allowed only to inspect system health (`/api/health`), obtain CSRF tokens, and view the public theology class name list. Completely blocked from student identities, contact details, marks, and settings.

---

## 2. Role × Action Permission Matrix

| Capability / Action | Unauthenticated | Support Staff | Theology Instructor | Class Teacher | DOS (Secular/Theology) | Head Teacher | Administrator |
|---|---|---|---|---|---|---|---|
| **View System Health (`/api/health`)** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Read Theology Class Catalog (Names & IDs only)** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Read Student Registry (`/api/students`)** | ❌ Blocked (401) | ❌ Blocked (403) | 🔍 Assigned Only | 🔍 Assigned Only | 🔍 Dept Only | ✅ Full Read | ✅ Full Read |
| **Register / Edit Student Profile** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Read Active Term (`GET /api/settings/terms/active`)** | ❌ Blocked (401) | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Set Active Term (`POST /api/settings/terms/active`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Allowed |
| **Enter Marks (Assigned Class & Subjects)** | ❌ Blocked (401) | ❌ Blocked (403) | ✅ Theology Only | ✅ Assigned Classes (Secular & Theology) | ✅ Dept Moderation | ❌ Read Only | ✅ Full Write |
| **Enter Marks (Cross-Class / Unassigned)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Admin Override |
| **Generate Report Card (`/api/report`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | 🔍 Assigned Class | ✅ Dept Wide | ✅ All Classes | ✅ All Classes |
| **View Global Activity Logs (`/api/activity`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Dept Logs | ✅ Full Read | ✅ Full Read |
| **Manage School Settings & Themes** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Allowed |
| **Invite / Edit / Deactivate Teachers** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Allowed |
| **Change Own Role (Self-Promotion)** | ❌ Blocked | ❌ Blocked (Trigger) | ❌ Blocked (Trigger) | ❌ Blocked (Trigger) | ❌ Blocked (Trigger) | ❌ Blocked (Trigger) | ❌ Blocked (Trigger) |
| **Upload Institutional Signatures & Stamps** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Allowed |

> **Active Term Access Rule (`/api/settings/terms/active`):** GET: any authenticated staff; POST: Administrator only. Status: PENDING GATE 1.  
> **Theology Marks Access Rule for Class Teachers:** Class Teachers can access and enter theology marks strictly for students in their assigned classes (via `teacher_class_assignments` or `circular_classes.class_teacher_id`). Access to unassigned classes is blocked at both API (403) and Database RLS (42501). Status: PENDING GATE 1.  
> **Teacher Deactivation Rule (`/api/admin/teachers/[id]`):** DELETE: Administrator only; performs soft-delete (`status = 'inactive'`) preserving historical marks/remarks referential integrity. Blocked for all non-admin roles (403). Status: PENDING GATE 1.

## 4. Teacher Marks Scoping Draft — PENDING GATE 1

The following policy changes are rehearsal-only in `supabase/hardening/20261020_teacher_marks_scoping.sql`. They are **DRAFT / DO NOT APPLY TO PRODUCTION** until Gate 1 approval:

| Proposed behavior | Difference from production policy text | Gate |
|---|---|---|
| `current_teacher_id()` also resolves a teacher row by `teachers.id = auth.uid()` when `auth_user_id` is NULL. | Production mark policies identify teachers via `auth_user_id = auth.uid()` only. | PENDING GATE 1 |
| A `DOS` row with subject `Theology` or `Secular` receives the corresponding department's mark-write access. | Production policy role lists contain `DOS Theology` / `DOS Secular`; the live role constraint excludes those strings and production DOS users use role `DOS` with a subject. | PENDING GATE 1 |
| An authenticated user can SELECT their own rows in `teacher_class_assignments`. | Production has RLS enabled and no policy on this table; the user-JWT lookup currently sees no assignment rows. | PENDING GATE 1 |

The rehearsal fixture/test covers `class_teacher_id`-only, assignment-only, and legacy-`teachers.classes`-only teachers. Legacy `teachers.classes` entries do not authorize mark writes; a teacher gains access only after an administrator adds a corresponding assignment row. Teacher status `inactive`, `suspended`, `deactivated`, or `banned` is denied. No SQL reads `teachers.classes`.

---

## 3. Four Core Security Invariants

1. **Fail-Closed RBAC (`src/lib/auth-server.ts`):** Any unknown role, inactive account, or missing profile automatically terminates with HTTP `403 Forbidden`.
2. **PostgreSQL Trigger Role Defense:** PostgreSQL trigger `trg_prevent_teacher_self_role_elevation` aborts any update statement that attempts to change `role`, `status`, or `auth_user_id` when executed by a non-administrator.
3. **Database-Level RLS Parity:** Row-Level Security policies on `circular_marks`, `theology_marks`, and `teacher_class_assignments` mirror the API rules directly in PostgreSQL. Even if a direct client REST request is attempted, PostgreSQL rejects unassigned marks writes with error `42501`.
4. **Zero Anonymous Surface:** Unauthenticated requests to student registers, marks, reports, or school settings receive instant `401 Unauthorized` with zero data disclosure.

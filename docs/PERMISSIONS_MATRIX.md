# ONE-PAGE PLAIN-ENGLISH ROLE × ACTION PERMISSION MATRIX
### APPROVED (GATE 1 — 2026-11-17) — JIDDAH SMART REPORT ENGINE

---

## 1. Plain-English Role Definitions (Hierarchy Order)

1. **Administrator (`Administrator`, alias `admin`):**
   Full operational and system authority. Can create/invite/deactivate users, edit role and per-user permissions, configure school settings and branding, upload institutional signatures, manage academic terms, and access/modify all student records and marks across both departments.

2. **Principal (`Principal`) — *APPROVED (GATE 1 — 2026-11-17)*:**
   Overall supervisor — the director on the ground. Sits above the Head Teacher and all of the Head Teacher's staff. Distinct role (never aliased to Head Teacher). School-wide across both Secular and Theology departments: reads all students, marks, hubs, and reports; reviews, approves, and locks anything the Head Teacher can (`edit_head_teacher_remarks`, `lock_marks`); views the staff directory (`view_staff`) and activity/audit logs (`view_activity_logs`). No user/role/permission/system management (Administrator-only — confirmed by Owner Gate 1).

3. **Head Teacher / Deputy Head Teacher (`Head Teacher`, `Deputy Head Teacher`):**
   Senior academic executive sitting below the Principal. Has school-wide read access across all classes, students, and report cards in both Secular and Theology departments, plus review/approve/lock actions (`edit_head_teacher_remarks`, `lock_marks`). Cannot alter system settings, manage user accounts, or mutate raw marks by default.

4. **Director of Studies (`DOS`, `DOS Secular`, `DOS Theology`):**
   Academic coordinator for a curriculum department. Moderates grading criteria, enters/moderates department marks, reviews marks entry progress, edits remarks, and views activity logs within their assigned department (Secular, Theology, or Both). Cannot modify school settings or user accounts.

5. **Class Teacher (`Class Teacher` / `Teacher`):**
   Frontline classroom educator. Enters and saves marks, edits class teacher comments/conduct, reads class rosters, and generates report cards *strictly for students in their assigned classes* in their department. Attempting to view or modify marks for unassigned classes returns HTTP 403 Forbidden.

6. **Theology Instructor (`Theology Instructor`):**
   Specialized religious studies instructor. Enters marks and reads rosters strictly for assigned theology classes/subjects. Has zero access to secular curriculum grading, report card generation, or administrative settings.

7. **Support Staff (`Support Staff`):**
   Administrative and operational assistance (e.g. bursar, front desk). Strictly isolated from student exam marks, report cards, and academic grading surfaces.

8. **Unauthenticated Guest (`anon`):**
   Public caller with zero credentials. Allowed only to inspect system health (`/api/health`), obtain CSRF tokens, and view the public theology class name list. Completely blocked from student identities, contact details, marks, and settings.

---

## 2. Role × Action Permission Matrix (PROPOSED — PENDING OWNER GATE 1)

| Capability / Action (`PermissionKey`) | Unauthenticated | Support Staff | Theology Instructor | Class Teacher | DOS (Secular/Theology) | Head Teacher / Deputy | Principal | Administrator |
|---|---|---|---|---|---|---|---|---|
| **View System Health (`/api/health`)** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Read Active Term (`GET /api/settings/terms/active`)** | ❌ Blocked (401) | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Read Student Registry (`read_students`)** | ❌ Blocked (401) | ❌ Blocked (403) | 🔍 Assigned Only | 🔍 Assigned Only | 🔍 Dept Only | ✅ Full Read | ✅ Full Read | ✅ Full Read |
| **Register / Edit Student Profile (`write_students`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Read Marks & Hub Broadsheets (`read_marks`)** | ❌ Blocked (401) | ❌ Blocked (403) | 🔍 Theology Assigned | 🔍 Assigned Classes | 🔍 Dept Only | ✅ All Classes | ✅ All Classes | ✅ All Classes |
| **Enter Marks (`write_marks`) — Assigned Scope** | ❌ Blocked (401) | ❌ Blocked (403) | ✅ Theology Only | ✅ Assigned Classes | ✅ Dept Moderation | ❌ Read Only | ❌ Read Only | ✅ Full Write |
| **Enter Marks — Cross-Class / Unassigned** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Admin Override |
| **Edit Class Teacher Comments & Conduct (`edit_class_teacher_remarks`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Homeroom Class | ✅ Dept Wide | ❌ Blocked (403) | ❌ Blocked (403) | ✅ All Classes |
| **Review & Approve Head Teacher Remarks (`edit_head_teacher_remarks`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Dept Wide | ✅ All Classes | ✅ All Classes | ✅ All Classes |
| **Approve & Lock Exam Sets (`lock_marks`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ All Classes | ✅ All Classes | ✅ All Classes |
| **Generate Report Card (`read_reports`, `/api/report`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | 🔍 Assigned Class | ✅ Dept Wide | ✅ All Classes | ✅ All Classes | ✅ All Classes |
| **View Global Activity Logs (`view_activity_logs`, `/api/activity`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Dept Logs | ✅ Full Read | ✅ Full Read | ✅ Full Read |
| **View Staff Directory (`view_staff`, `GET /api/teachers`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Full Read | ✅ Full Read |
| **Set Active Term / Manage School Settings (`manage_settings`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Allowed |
| **Manage Users, Roles & Permissions (`manage_users`, `/admin/teachers`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Allowed |
| **Self-Service Account Email Change (`/api/settings/user/email`)** | ❌ Blocked (401) | ❌ Read-Only (403) | ❌ Read-Only (403) | ❌ Read-Only (403) | ❌ Read-Only (403) | ❌ Read-Only (403) | ❌ Read-Only (403) | ✅ Allowed (Confirm Link) |
| **Change Own Role / Escalate Profile (`PATCH /api/settings/user`)** | ❌ Blocked | ❌ Blocked (403 + Trigger) | ❌ Blocked (403 + Trigger) | ❌ Blocked (403 + Trigger) | ❌ Blocked (403 + Trigger) | ❌ Blocked (403 + Trigger) | ❌ Blocked (403 + Trigger) | ❌ Blocked (Trigger) |
| **Upload Institutional Signatures & Stamps (`/api/signatures/upload`)** | ❌ Blocked (401) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ❌ Blocked (403) | ✅ Allowed |

> **Seeded & Editable Defaults (`public.role_permissions`):** All role defaults above are seeded into `public.role_permissions` (never hard-coded only) and can be edited live by the Administrator on `/admin/teachers` (**Roles & Permissions Matrix** tab), with per-user `+key`/`-key` overrides stored in `public.teachers.permissions`. Every request resolves effective permissions dynamically in `verifyDataAccess()`.  
> **Principal Superset Invariant (`Principal ⊇ Lower Roles`):** For every read (`read_students`, `read_marks`, `read_reports`, `view_activity_logs`, `view_staff`), review, and approve (`edit_head_teacher_remarks`, `lock_marks`) capability, `Principal ⊇ Head Teacher ⊇ Deputy Head Teacher` and `Principal ⊇ DOS ⊇ Class Teacher ⊇ Theology Instructor ⊇ Support Staff`.  
> **Active Term Access Rule (`/api/settings/terms/active`):** GET: any authenticated staff; POST: Administrator only (`manage_settings`). Status: PENDING GATE 1.  
> **Theology Marks Access Rule for Class Teachers:** Class Teachers can access and enter theology marks strictly for students in their assigned classes (via `teacher_class_assignments` for their theology class or `circular_classes.class_teacher_id`). Access to unassigned classes is blocked at both API (403) and Database RLS (42501). Status: PENDING GATE 1.  
> **Teacher Deactivation Rule (`/api/admin/teachers/[id]`):** DELETE: Administrator only; performs soft-delete (`status = 'inactive'`) and revokes active class assignments while preserving historical marks/remarks referential integrity. Blocked for all non-admin roles (403). Status: PENDING GATE 1.

---

## 3. Four Core Security Invariants

1. **Fail-Closed RBAC (`src/lib/auth-server.ts`):** Any unknown role, inactive account, or missing profile automatically terminates with HTTP `403 Forbidden`.
2. **PostgreSQL Trigger Role Defense:** PostgreSQL trigger `trg_prevent_teacher_self_role_elevation` aborts any update statement that attempts to change `role`, `status`, or `auth_user_id` when executed by a non-administrator.
3. **Database-Level RLS Parity:** Row-Level Security policies on `circular_marks`, `theology_marks`, `students`, `enrollments`, `teachers`, `role_permissions`, and `teacher_class_assignments` mirror the API rules directly in PostgreSQL (`supabase/migrations/20261117000001_phase1_rbac_principal_and_permissions.sql`).
4. **Zero Anonymous Surface:** Unauthenticated requests to student registers, marks, reports, or school settings receive instant `401 Unauthorized` with zero data disclosure.

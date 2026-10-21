# JIDDAH RBAC & PERMISSION MATRIX

*Authoritative role-to-operation and route-guard matrix for Jiddah Smart Report Engine.*

## 1. Canonical Roles

| Canonical Role ID | Display Name | Scope / Responsibility |
|---|---|---|
| `admin` | Administrator | Full school authority, settings, user management, templates |
| `head_teacher` | Head Teacher | Reporting cycle oversight, approvals, final report publishing |
| `dos` | Director of Studies | Academic moderation, mark verification, grading standards |
| `class_teacher` | Class Teacher | Class marks entry, remarks, student roster |
| `theology_instructor`| Theology Instructor | Quranic & Islamic theology marks and remarks |
| `support_staff` | Support Staff | Read-only administrative assistance |
| `student` | Student | Read-only access to own reports (when enabled) |
| `parent` | Parent / Guardian | Read-only access to child's reports (when enabled) |
| `guest` | Unauthenticated | Login, registration, password recovery only |

---

## 2. Operations Matrix (Role x Capability x Scope)

| Operation | Admin | Head Teacher | DOS | Class Teacher | Theology | Support | Guest |
|---|---|---|---|---|---|---|---|
| **View Dashboard** | Full | Full | Moderation | Assigned Class | Assigned Subjects | Limited | Denied |
| **Enter Secular Marks** | All | View | All/Verify | Own Class/Subj | Denied | Denied | Denied |
| **Enter Theology Marks** | All | View | All/Verify | Denied | Own Subj | Denied | Denied |
| **Approve / Moderate Marks** | Yes | Yes | Yes | No | No | No | No |
| **Generate Report Cards** | All | All | All | Own Class | Denied | Denied | Denied |
| **Print Preview Reports** | All | All | All | Own Class | Own Class | Denied | Denied |
| **Edit School Settings & Logo** | Yes | No | No | No | No | No | No |
| **Edit Grading Standards** | Yes | View | View | View | View | No | No |
| **Invite / Manage Teachers** | Yes | No | No | No | No | No | No |
| **View Global Audit Log** | Yes | View | View | No | No | No | No |
| **Manage Notifications** | Own | Own | Own | Own | Own | Own | Denied |

---

## 3. High-Risk Route Guard Mappings

| Route | Type | Methods | Required Guard | Current Guard Status | Action Needed |
|---|---|---|---|---|---|
| `/admin` | Page | GET | Any Auth Staff | Admin/DOS/Teacher/Theology | Verified |
| `/admin/marks` | Page | GET | Staff (Admin/DOS/Teacher) | Public / Unguarded in page | Enforce auth middleware & component check |
| `/admin/reports` | Page | GET | Staff (Admin/DOS/Teacher) | Public / Unguarded in page | Enforce auth middleware & component check |
| `/admin/settings` | Page | GET | Admin only | verifyDataAccess(RBAC) | Verified Admin |
| `/admin/settings/grading-standards` | Page | GET | Admin only | verifyDataAccess(RBAC) | Verified Admin |
| `/admin/teachers` | Page | GET | Admin only | verifyDataAccess(RBAC) | Verified Admin |
| `/api/settings/school` | API | GET, PATCH | Admin only | verifyDataAccess(RBAC) | Verified Admin |
| `/api/marks` | API | GET, POST | Teacher / DOS / Admin | Role & assignment check | Audit scope validation |
| `/api/report/batch` | API | POST | Staff | Authenticated | Audit batch generation rate limits |
| `/api/notifications/mark-all-read` | API | POST | Authenticated user | getAuthenticatedUser | Verified user isolated |

---

## 4. Teacher Deactivation Path Unification (PENDING GATE 1)

- **Legacy Endpoint (`DELETE /api/teachers?id=...`):**
  - Prior implementation only validated `if (!user)` (any authenticated session).
  - Non-admin staff roles (Head Teacher, DOS, Class Teacher, Teacher, Theology Instructor, Support Staff) had un-guarded deactivation capability.
- **Unified Implementation (`src/lib/teacher-deactivation.ts`):**
  - Both `/api/admin/teachers/[id]` and legacy `/api/teachers?id=...` now invoke `executeTeacherDeactivation`.
  - Required permission: strictly `Administrator` (or `role === 'admin'`).
  - Access narrowing: Access is formally narrowed to administrators only. All non-admin roles receive HTTP 403 Forbidden.
  - Invariants enforced: Non-admin 403, self-deactivation 400, last-admin 409, GoTrue ban (`876600h`), status update to `'inactive'`, and audit logging via `recordActivity`.
  - Gate 1 Flag: **PENDING GATE 1 OWNER CONFIRMATION**.

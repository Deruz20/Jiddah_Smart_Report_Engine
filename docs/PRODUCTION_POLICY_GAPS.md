# Production Policy Gaps

**Status: DRAFT / NOT APPLIED / needs Gate 1.**
This document reflects owner-provided, read-only production facts dated 2026-10-19. No production policy was created or applied as part of this review.

Production has RLS enabled and zero policies on these seven tables:

| Table | Current code path and client | User-visible impact | Proposed disposition |
|---|---|---|---|
| `marks_audit_log` | No application `.from('marks_audit_log')` call found under `src/`. | No route currently reads it; no confirmed user-facing impact. | Keep inaccessible until an audited consumer and data-retention purpose are specified. |
| `marks_primary` | No application `.from('marks_primary')` call found under `src/`. | No route currently reads it; no confirmed user-facing impact. | Keep inaccessible until a consumer is specified. |
| `nursery_assessments` | `/api/reports` reads it with the cookie/user-JWT client (`src/app/api/reports/route.ts`). | Nursery report reads can return no rows under RLS; the route throws `No assessments found` and responds with an error rather than a report. | Add a narrowly-scoped read policy only after nursery enrollment/class ownership has been verified against production schema, or move the read to a server-only service-role path with equivalent server-side class authorization. |
| `report_templates` | No application `.from('report_templates')` call found under `src/`. | No current route uses it. | Keep inaccessible until a consumer and required operations are identified. |
| `teacher_class_assignments` | `verifyDataAccess` reads it with the caller's user-JWT client (`src/lib/auth-server.ts`). Its API callers are `/api/theology-results`, `/api/marks`, `/api/theology-marks`, `/api/enrollments`, `/api/theology-hub`, `/api/theology-classes`, `/api/classes`, `/api/settings/terms`, `/api/settings/terms/active`, `/api/circular-results`, `/api/circular-marks`, `/api/settings/school`, `/api/secular-hub`, `/api/reports`, `/api/reports/history`, `/api/report`, `/api/report/batch`, `/api/admin/reset-password`, `/api/students`, `/api/students/[id]`, and `/api/teachers`. `/api/theology-classes` also queries the table directly with its user-JWT client. No application service-role read was found. | RLS filters assignment rows to zero. A Class Teacher assigned only through this table loses class scoping across these paths; specifically, `/api/students` can return no rows, `/api/marks` can reject the requested class, and `/api/theology-classes` can return an empty list. The theology marks policy's assignment branch likewise cannot see a row through this table. | Draft a SELECT policy limited to the authenticated teacher's own assignment rows. Review identity mapping and the exact assignment schema at Gate 1 before use. |
| `teacher_invites` | `/admin/invites` reads it with a user-JWT client; `/api/admin/teachers/invite` and `/api/teachers/register` use the service role for invite creation/lookup/update. | The admin invite-status page cannot read the rows under RLS; it logs the query error and renders an empty list. Service-role API paths are not blocked by RLS. | Prefer moving the page's read to a server-only service-role client after its existing server-side administrator check; do not grant broad authenticated access to invite data. |
| `users` | No application `.from('users')` call found under `src/`; Supabase Auth admin API calls are not public-table queries. | No confirmed public application route depends on this table. | Keep inaccessible until a public-table consumer is demonstrated. |

## Gate 1 draft SQL (not executable)

The following is a proposal for `teacher_class_assignments` only. It is **DRAFT / NOT APPLIED / needs Gate 1** and must not be pasted into production before verifying the production columns, identity relationship, and intended teacher read scope:

```sql
-- DRAFT / NOT APPLIED / needs Gate 1
CREATE POLICY "teacher_reads_own_class_assignments"
ON public.teacher_class_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.teachers t
    WHERE t.id = teacher_class_assignments.teacher_id
      AND t.auth_user_id = auth.uid()
  )
);
```

No policy SQL is proposed for the other zero-policy tables pending a confirmed consumer and access contract. For `teacher_invites`, the preferred proposal is a route/client change rather than an authenticated policy. Nursery-assessment policy SQL is intentionally withheld until the class-to-student relationship and eligible teacher roles are verified. No policy on any table other than `theology_marks` was applied; the existing theology policy remains draft-only.

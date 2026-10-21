# Teacher Access Recovery Matrix

This is a source-derived recovery baseline for the isolated `recovery/teacher-access` worktree. It is not evidence of production role assignments or production enforcement. Production identities are **NOT VERIFIED**. No production database was queried or changed.

## Academic access

| Role | Students and rosters | Marks | Reports | Scope |
|---|---|---|---|---|
| Administrator / `admin` | Read and manage across classes | Read and write across curricula | All classes | School-wide |
| Head Teacher / Deputy Head Teacher / `HM` | Read across classes | Read only | Read across classes | School-wide academic read |
| `DOS`, `DOS Secular`, `DOS Theology` | Read within the resolved department | Department-scoped access in application authorization | Department scope | `DOS` uses its `subject`; `both`/`all` currently resolves to both |
| Class Teacher | Read and manage students in assigned classes | Assigned circular and theology classes; theology cohort access follows an assigned circular homeroom (**pending Gate 1 confirmation**) | Assigned classes | `teacher_class_assignments` and `circular_classes.class_teacher_id`; legacy `teachers.classes` is not an authorization source |
| `Teacher` | Assignment-scoped, curriculum-limited | Assigned curriculum only | Assignment-scoped | Defaults to circular/secular unless the subject contains `theology` |
| Theology Instructor | Assigned theology classes | Assigned theology classes only | Assigned theology classes | Theology |
| Support Staff | No academic student access | No access | No access | Denied |
| Missing, ambiguous, inactive, or unrecognized identity | Denied | Denied | Denied | Fail closed |
| Unauthenticated caller | Denied | Denied | Denied | No staff access |

These rows describe the shared application authorization logic and the API checks reviewed in this worktree. They do not prove that direct PostgREST requests are equally restricted.

## Administrative and personal operations

| Operation | Current source behavior | Recovery boundary |
|---|---|---|
| School branding/settings and general term configuration | Administrative role checks are present on the reviewed settings APIs | Administrator only |
| Active-term read | Requires an active teacher/staff record | Authenticated active staff |
| Active-term change | Requires `Administrator` in the reviewed route | Administrator only |
| Own profile fields | `/api/settings/user` updates the caller's own `profiles` row and permits first name, last name, and phone | Own profile only |
| Teacher invites | Administrator-only after this recovery correction; caller identity is resolved through the shared Auth UID/profile check | Administrator only |
| Password reset / teacher deactivation | Administrative server-side checks are present | Administrator only |
| Grading rules, templates, signatures, and cross-user settings | Not all direct-client/RLS paths were verified in this recovery pass | Do not grant non-admin access without a scoped server check and matching RLS policy |
| Cross-school operations | No applicable authorization model was established | Deny / not implemented |

## Database and verification limits

- Production identity-to-role assignments are **NOT VERIFIED**.
- Production reports `teacher_class_assignments` with RLS enabled and zero policies. The recovery server resolves assignments with a service-role lookup; mark writes remain user-JWT operations and can still be rejected by production RLS.
- `docs/PERMISSIONS_MATRIX.md` specifies that only Administrators manage teacher accounts; this supports the Administrator-only invite guard. Its current rows also conflict with the broader recovery request on student profile registration/editing by Class Teachers; the route now enforces assignment scope, but that role-level change remains an owner policy decision.
- Theology access inherited from an assigned circular homeroom is present in the current app authorization path. The older permissions matrix marks that expansion as pending Gate 1, so no production-equivalence claim is made for it.
- No policy, migration, backfill, or production change was applied.
- DOS/Head invitation access from the prior route implementation was removed in this recovery branch because no owner-approved requirement for that cross-user privilege was established.
- Pure authorization tests passed, and TypeScript typechecking passed. Real-route integration tests were not run: the available rehearsal seed script deletes/recreates synthetic Auth users and removes non-fixture students/enrollments, so running it would mutate the existing local rehearsal stack.
- A passing source-level check is not a substitute for rehearsal evidence or a Gate 1 database decision.

# Code Tables vs Production

**Generated offline:** compared literal `.from('...')` references in application source against the owner-provided 33-table production list (2026-10-19). This is not a production query.

## Referenced tables absent from the production list

| Table reference | Affected route(s) | Behavior when absent | Classification |
|---|---|---|---|
| `notification_reads` | `/api/notifications`, `/api/notifications/unread-count`, `/api/notifications/[id]/mark-read`, `/api/notifications/mark-all-read` through `src/lib/notifications.ts` | The notification read-state helper recognizes a missing table and falls back to `activity_logs`; permission and transient errors are surfaced rather than silently treated as absence. The missing table alone is therefore a graceful legacy fallback, not a 500. | Graceful for table absence; permission/transient failures remain errors. |

`user_notification_reads`, `audit_logs`, and `special_exam_marks` are absent from production per the owner-provided facts, but no literal application `.from('...')` reference to those tables was found under `src/`. They are not included as code-table mismatches.

## Production list comparison

All other literal application table references found under `src/` are members of the supplied production table list. Table names used only as storage buckets are not treated as public tables.

## Scope and limits

- The comparison is an offline source scan; dynamic table names and SQL embedded outside literal `.from('...')` calls are not inferred.
- No production request or database query was run.
- The local Docker rehearsal was available and verified the 33-table/no-view/RLS/anon-grant shape. Policy counts differed on 20 tables; see [PHASE1_STATE.md](./PHASE1_STATE.md) for the full comparison and explanation.

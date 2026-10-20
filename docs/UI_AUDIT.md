# UI audit

## Status

**BLOCKED — visual audit could not be completed safely.** The clean worktree has no local Supabase configuration. The local app reports that its URL and key are required, and the login page's notification request fails. Supplying production or rehearsal credentials would violate the audit constraints, so no database-backed route was accessed. Playwright could not complete a screenshot: the page remained in a chunk-loading error state and the screenshot timed out. No screenshot files were created; screenshots are not represented as if they had been captured.

The app was started from the `ui/hybrid-theme` worktree at `http://127.0.0.1:3000`. The required Playwright viewport set is 360x740, 390x844, 768x1024, and 1366x768. Expected, but currently **blocked**, screenshot locations are `scratch/ui-audit/<route>-<width>x<height>.png`.

## Page-by-page capture status

The table records every `src/app/**/page.tsx` route present in this worktree. Since pages could not be rendered with safe local data, overflow, overlap, empty/oversized areas, form scrolling, tap-target size, contrast, and explanatory copy are **not measured** for any route. No layout defects are inferred from inaccessible pages.

| Page | 360x740 | 390x844 | 768x1024 | 1366x768 | Per-page findings |
|---|---|---|---|---|---|
| `/` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/account` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/activity` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/analytics` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/circular` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/classes` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/classes/[id]` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/dev-tools` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/invites` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/marks` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/my-activity` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/notifications` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/reports` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/reports/blank` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/secular-hub` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/settings` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/settings/grading-standards` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/signatures` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/students` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/subjects` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/teachers` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/terms` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/theology` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/theology-hub` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/admin/upload` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/login` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | App shell did not finish loading |
| `/onboarding` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/pending` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/register` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/reset-password` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |
| `/test-report` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | Not measurable |

## Ranked findings

These are audit blockers or source-level review targets, not visually confirmed defects:

1. **P0 — Audit coverage blocked:** all 32 routes and all four requested viewports lack valid captures and measurements because safe local Supabase credentials and test data are unavailable. Do not treat the page-by-page `BLOCKED` entries as passing.
2. **P1 — Responsive app shell requires validation:** sidebar, top-bar search, breadcrumbs, and mobile drawer are shared across admin routes. Re-run the four viewport checks once a local-only test setup is available; the current browser session did not produce evidence to confirm overlap, safe-area, or tap-target behavior.
3. **P1 — Teacher class-name mapping requires test data:** the page performs a server-side class-ID lookup, while the client also fetches class names. Confirm circular and theology class names (and legacy-value fallback) with non-production fixtures before approving the teacher-page change.
4. **P1 — Forms and marks-entry fit require validation:** inspect representative long forms at 360x740 and 390x844 for scroll behavior, sticky actions, and minimum 44px targets once the pages can be rendered.
5. **P2 — Shared tables, tabs, dashboard, and copy require viewport review:** inspect truncation, tooltips, horizontal overflow, chart sizing, spacing, contrast, and long explanatory text after unblocking visual access.

## Safe follow-up

Use a local-only Supabase-compatible fixture or another approved isolated test environment, then capture the complete screenshot matrix into `scratch/ui-audit/` and replace the blocked entries with measured findings. Do not use production or rehearsal credentials for UI validation.

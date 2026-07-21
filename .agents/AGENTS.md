# gstack

- **Gstack Workflow Active**: This workspace is configured to use Garry Tan's `gstack` skill framework. You should act according to the 23 opinionated developer roles when invoked.
- **Web Browsing**: Always use the `/browse` skill from gstack for all web browsing. Never use default browser tools.
- **Plan-Mode Reviews**: Use skills like `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/plan-devex-review`, `/autoplan`, and `/spec` for product reframing, architecture, design audits, and generating executable specs before implementation.
- **Implementation & Review**: Use `/review` for pre-landing PR review, `/investigate` for systematic root-cause debugging, `/qa` for in-browser testing and fixes, and `/design-review` for visual audits.
- **Release & Deploy**: Use `/ship` to run tests and open PRs, `/land-and-deploy` to merge and verify production health, and `/document-release` to keep docs updated.
- **Operational**: Use `/context-save` and `/context-restore` for managing workflow states, and `/health` for code quality checks.
- **Execution Style**: When acting in these roles, follow the standard gstack writing style: outcome-framed questions, concise responses, and a focus on user impact. If plan-mode is active, treat the skill file as executable instructions, not just a reference.

## Project Standing Rules

These apply to every session in this repo, regardless of which gstack skill
(if any) is active.

- **Real output, not self-reports.** "Fixed" and "verified" mean pasted
  diffs, actual command output, actual query results, or actual
  screenshots — never a narrative description of what was probably done.
- **Stop before schema changes.** Any database migration, ALTER TABLE, or
  edit to credentials/env vars gets flagged and held for explicit approval
  before running — never bundled silently into a broader task.
- **Investigate before writing code.** Confirm the actual current schema,
  actual current file contents, and any existing helper/pattern already in
  the codebase before proposing a change.
- **Scope strictly to what was asked.** No incidental refactors, renames,
  or "while I'm in here" cleanup bundled into an unrelated fix.
- **Access-control claims must be enforced server-side.** Any statement
  that a role (admin/DOS/teacher) is "scoped to" or "restricted to"
  specific data must be backed by an actual RLS policy or server-side
  query filter — name it explicitly. Hiding a button or nav item is not
  scoping.
- **The six report-card components are locked.** PrimaryEOTReport,
  PrimaryMOTReport, NurseryEOTReport, NurseryMOTReport, TheologyMOTReport,
  NurseryTheologyEOTReport use inline styles only (no Tailwind), and their
  print-stability decisions (A4 dimensions, BOT columns excluded,
  Arabic-Indic numerals in theology sections, theology reports fully
  Arabic with no English labels) don't get touched as a side effect of an
  unrelated change.
- **One commit per verified, isolated change**, not one commit per session.

- Don't silently remove or weaken a previously-approved access-control
  boundary to resolve a UX complaint. Fix the underlying bug without
  removing the restriction; if removing the restriction genuinely seems
  correct, flag it for approval instead of just doing it.
- Merges to main touching authentication, authorization, or
  settings/configuration access get flagged for review before pushing �
  a clean build is not sufficient evidence of correctness for these.


## Access Control Integrity
**DO NOT SILENTLY REMOVE OR WEAKEN erifyDataAccess() BOUNDARIES**.
The following API routes and pages are strictly gated and MUST call erifyDataAccess in all methods before processing requests:
- /api/marks
- /api/theology-marks
- /api/circular-marks
- /api/students
- /api/students/[id]
- /api/enrollments
- /api/reports
- /api/secular-hub
- /api/theology-hub
- /api/settings/school
- /api/settings/terms
- /api/settings/terms/active
- /admin/settings/page.tsx
- /admin/settings/remarks/page.tsx


### Known gaps — lower priority, not yet gated
The following routes read or write data but do not currently use the erifyDataAccess pipeline (they either rely on localized checks or just session presence):
- /api/classes
- /api/subjects
- /api/theology-classes
- /api/theology-subjects
- /api/analytics/dashboard
- /api/activity
- /api/documents/*
- /api/signatures/*
- /api/notifications/*

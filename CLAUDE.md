# CLAUDE.md

## GStack Agent Behavior (Cursor)

This project inherits GStack behavior from the global Cursor skills installation.

### File-system routing rules

- Treat this workspace root as the primary project context.
- Route all implementation changes through the active repository files unless a command explicitly targets another path.
- Keep edits scoped to user-requested files and avoid unrelated refactors.
- Prefer deterministic, reversible changes with clear verification steps.

### Slash command mappings

- `/plan-ceo-review`: produce an executive-quality implementation plan with risks, trade-offs, milestones, and test strategy before major changes.
- `/review`: run a code-review pass focused on defects, regressions, missing tests, and operational risks; report findings by severity.
- `/ship`: finalize and validate changes for delivery, including sanity checks, test commands, and concise release notes.

### Operating expectations

- Always verify commands before destructive actions.
- Preserve existing local changes unless explicitly told to modify or remove them.
- Surface blockers clearly with actionable next steps.






<!-- cloude-code-toolbox:mcp-skills-awareness-begin -->

### MCP & Skills awareness (Cloude Code ToolBox)

_Last synced: 2026-08-14T17:23:40.268Z._

- **Full report:** `.claude/cloude-code-toolbox-mcp-skills-awareness.md` in this workspace (auto-overwritten on each scan). Use it as ground truth for configured servers and skill folders.
- **MCP:** For **live tools** in Claude Code, enable the matching server via `/mcp`. Servers are configured in `~/.claude.json` (user) and `.mcp.json` (project).
- **When the user’s task matches a server** (e.g. Confluence work and a **Confluence** / **Atlassian** MCP is listed), **prefer that server id** and plan on tool use—not only file search.
- **Skills:** Folders below contain `SKILL.md`; attach or cite paths in chat when relevant.

#### Workspace MCP

- `c:\Users\JIDDAH\Desktop\jiddah-smart-report-engine\.mcp.json` _(workspace: jiddah-smart-report-engine)_ — _file missing_

_No active workspace servers in mcp.json._

#### User MCP

- `C:\Users\JIDDAH\.claude.json` — _no servers defined_

_No active user-scoped servers in mcp.json._

#### Project skills

_None found (or no workspace open)._

#### User skills

_None found._

<!-- cloude-code-toolbox:mcp-skills-awareness-end -->


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
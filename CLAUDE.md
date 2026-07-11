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

_Last synced: 2026-07-10T13:17:24.405Z._

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

- **autoplan** — `C:\Users\JIDDAH\.cursor\skills\autoplan` — Auto-review pipeline — reads the full CEO, design, eng, and DX review skills from disk and runs them sequentially with auto-decisions using 6 decision principles. (gstack)

- **benchmark** — `C:\Users\JIDDAH\.cursor\skills\benchmark` — Performance regression detection using the browse daemon. (gstack)

- **benchmark-models** — `C:\Users\JIDDAH\.cursor\skills\benchmark-models` — Cross-model benchmark for gstack skills. (gstack)

- **browse** — `C:\Users\JIDDAH\.cursor\skills\browse` — Fast headless browser for QA testing and site dogfooding. (gstack)

- **canary** — `C:\Users\JIDDAH\.cursor\skills\canary` — Post-deploy canary monitoring. (gstack)

- **careful** — `C:\Users\JIDDAH\.cursor\skills\careful` — Safety guardrails for destructive commands. (gstack)

- **codex** — `C:\Users\JIDDAH\.cursor\skills\codex` — OpenAI Codex CLI wrapper — three modes. (gstack)

- **context-restore** — `C:\Users\JIDDAH\.cursor\skills\context-restore` — Restore working context saved earlier by /context-save. (gstack)

- **context-save** — `C:\Users\JIDDAH\.cursor\skills\context-save` — Save working context. (gstack)

- **cso** — `C:\Users\JIDDAH\.cursor\skills\cso` — Chief Security Officer mode. (gstack)

- **design-consultation** — `C:\Users\JIDDAH\.cursor\skills\design-consultation` — Design consultation: understands your product, researches the landscape, proposes a complete design system (aesthetic, typography, color, layout, spacing, motion), and generates font+color preview... (gstack)

- **design-html** — `C:\Users\JIDDAH\.cursor\skills\design-html` — Design finalization: generates production-quality Pretext-native HTML/CSS. (gstack)

- **design-review** — `C:\Users\JIDDAH\.cursor\skills\design-review` — Designer's eye QA: finds visual inconsistency, spacing issues, hierarchy problems, AI slop patterns, and slow interactions — then fixes them. (gstack)

- **design-shotgun** — `C:\Users\JIDDAH\.cursor\skills\design-shotgun` — Design shotgun: generate multiple AI design variants, open a comparison board, collect structured feedback, and iterate. (gstack)

- **devex-review** — `C:\Users\JIDDAH\.cursor\skills\devex-review` — Live developer experience audit. (gstack)

- **diagram** — `C:\Users\JIDDAH\.cursor\skills\diagram` — Turn an English description (or mermaid source) into a diagram triplet: the source, an editable .excalidraw file you can open (gstack)

- **document-generate** — `C:\Users\JIDDAH\.cursor\skills\document-generate` — Generate missing documentation from scratch for a feature, module, or entire project. (gstack)

- **document-release** — `C:\Users\JIDDAH\.cursor\skills\document-release` — Post-ship documentation update. (gstack)

- **freeze** — `C:\Users\JIDDAH\.cursor\skills\freeze` — Restrict file edits to a specific directory for the session. (gstack)

- **gstack** — `C:\Users\JIDDAH\.cursor\skills\gstack` — Router for the gstack skill suite. (gstack)

- **gstack-upgrade** — `C:\Users\JIDDAH\.cursor\skills\gstack-upgrade` — Upgrade gstack to the latest version.

- **guard** — `C:\Users\JIDDAH\.cursor\skills\guard` — Full safety mode: destructive command warnings + directory-scoped edits. (gstack)

- **health** — `C:\Users\JIDDAH\.cursor\skills\health` — Code quality dashboard. (gstack)

- **investigate** — `C:\Users\JIDDAH\.cursor\skills\investigate` — Systematic debugging with root cause investigation. (gstack)

- **ios-clean** — `C:\Users\JIDDAH\.cursor\skills\ios-clean` — Remove the DebugBridge SPM package and all #if DEBUG wiring from an iOS app. (gstack)

- **ios-design-review** — `C:\Users\JIDDAH\.cursor\skills\ios-design-review` — Visual design audit for iOS apps on real hardware. (gstack)

- **ios-fix** — `C:\Users\JIDDAH\.cursor\skills\ios-fix` — Autonomous iOS bug fixer. (gstack)

- **ios-qa** — `C:\Users\JIDDAH\.cursor\skills\ios-qa` — Live-device iOS QA for SwiftUI apps. (gstack)

- **ios-sync** — `C:\Users\JIDDAH\.cursor\skills\ios-sync` — Regenerate the iOS debug bridge against the latest upstream gstack templates. (gstack)

- **land-and-deploy** — `C:\Users\JIDDAH\.cursor\skills\land-and-deploy` — Land and deploy workflow. (gstack)

- **landing-report** — `C:\Users\JIDDAH\.cursor\skills\landing-report` — Read-only queue dashboard for workspace-aware ship. (gstack)

- **learn** — `C:\Users\JIDDAH\.cursor\skills\learn` — Manage project learnings.

- **make-pdf** — `C:\Users\JIDDAH\.cursor\skills\make-pdf` — Turn any markdown file into a publication-quality PDF. (gstack)

- **office-hours** — `C:\Users\JIDDAH\.cursor\skills\office-hours` — YC Office Hours — two modes. (gstack)

- **open-gstack-browser** — `C:\Users\JIDDAH\.cursor\skills\open-gstack-browser` — Launch GStack Browser — AI-controlled Chromium with the sidebar extension baked in.

- **pair-agent** — `C:\Users\JIDDAH\.cursor\skills\pair-agent` — Pair a remote AI agent with your browser. (gstack)

- **plan-ceo-review** — `C:\Users\JIDDAH\.cursor\skills\plan-ceo-review` — CEO/founder-mode plan review. (gstack)

- **plan-design-review** — `C:\Users\JIDDAH\.cursor\skills\plan-design-review` — Designer's eye plan review — interactive, like CEO and Eng review. (gstack)

- **plan-devex-review** — `C:\Users\JIDDAH\.cursor\skills\plan-devex-review` — Interactive developer experience plan review. (gstack)

- **plan-eng-review** — `C:\Users\JIDDAH\.cursor\skills\plan-eng-review` — Eng manager-mode plan review. (gstack)

- **plan-tune** — `C:\Users\JIDDAH\.cursor\skills\plan-tune` — Self-tuning question sensitivity + developer psychographic for gstack (v1: observational). (gstack)

- **qa** — `C:\Users\JIDDAH\.cursor\skills\qa` — Systematically QA test a web application and fix bugs found. (gstack)

- **qa-only** — `C:\Users\JIDDAH\.cursor\skills\qa-only` — Report-only QA testing. (gstack)

- **retro** — `C:\Users\JIDDAH\.cursor\skills\retro` — Weekly engineering retrospective. (gstack)

- **review** — `C:\Users\JIDDAH\.cursor\skills\review` — Pre-landing PR review. (gstack)

- **scrape** — `C:\Users\JIDDAH\.cursor\skills\scrape` — Pull data from a web page. (gstack)

- **setup-browser-cookies** — `C:\Users\JIDDAH\.cursor\skills\setup-browser-cookies` — Import cookies from your real Chromium browser into the headless browse session. (gstack)

- **setup-deploy** — `C:\Users\JIDDAH\.cursor\skills\setup-deploy` — Configure deployment settings for /land-and-deploy.

- **setup-gbrain** — `C:\Users\JIDDAH\.cursor\skills\setup-gbrain` — Set up gbrain for this coding agent: install the CLI, initialize a local PGLite or Supabase brain, register MCP, capture per-remote trust policy. (gstack)

- **ship** — `C:\Users\JIDDAH\.cursor\skills\ship` — Ship workflow: detect + merge base branch, run tests, review diff, bump VERSION, update CHANGELOG, commit, push, create PR. (gstack)

- **skillify** — `C:\Users\JIDDAH\.cursor\skills\skillify` — Codify the most recent successful /scrape flow into a permanent browser-skill on disk. (gstack)

- **spec** — `C:\Users\JIDDAH\.cursor\skills\spec` — Turn vague intent into a precise, executable spec in five phases. (gstack)

- **sync-gbrain** — `C:\Users\JIDDAH\.cursor\skills\sync-gbrain` — Keep gbrain current with this repo's code and refresh agent search guidance in CLAUDE.md. Wraps the gstack-gbrain-sync orchestrator with state (gstack)

- **unfreeze** — `C:\Users\JIDDAH\.cursor\skills\unfreeze` — Clear the freeze boundary set by /freeze, allowing edits to all directories again. (gstack)

- **_gstack-command** — `C:\Users\JIDDAH\.cursor\skills\_gstack-command` — Router for the gstack skill suite. (gstack)

<!-- cloude-code-toolbox:mcp-skills-awareness-end -->

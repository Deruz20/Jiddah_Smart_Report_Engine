# Cloude Code ToolBox — MCP & Skills awareness

_Generated: 2026-07-10T13:17:24.367Z_

## How to use this report

- **Saved copy:** This file is **`.claude/cloude-code-toolbox-mcp-skills-awareness.md`** — refreshed whenever the toolbox runs an MCP & Skills scan (including on workspace open when auto-scan is enabled). It is meant for **Claude Code workspace context** together with `CLAUDE.md` (which gets a shorter replaceable summary when auto-merge is on).
- **MCP:** Lists **configured** servers from Claude Code config (`~/.claude.json` for user scope, `.mcp.json` for project scope). Use `/mcp` in the Claude Code panel to connect servers for your session.
- **Skills:** **On-disk** folders with `SKILL.md`. Claude Code does not auto-load them; attach `SKILL.md` or paths in chat when useful.
- **Task routing:** When the user’s request matches a server’s purpose (e.g. Confluence → Confluence/Atlassian MCP), prefer that **server id** from the tables below.

---

## MCP — workspace

Workspace `mcp.json` _(folder: jiddah-smart-report-engine)_

- **c:\Users\JIDDAH\Desktop\jiddah-smart-report-engine\.mcp.json** — _File missing_

_No active workspace servers in mcp.json._

## MCP — user profile

- **C:\Users\JIDDAH\.claude.json** — _File exists — no servers defined_

_No active user-scoped servers in mcp.json._

## Skills (local `SKILL.md` folders)

### Project-scoped

_None found (or no workspace open)._

### User-scoped

- **autoplan** — `C:\Users\JIDDAH\.cursor\skills\autoplan`
  - Auto-review pipeline — reads the full CEO, design, eng, and DX review skills from disk and runs them sequentially with auto-decisions using 6 decision principles. (gstack)

- **benchmark** — `C:\Users\JIDDAH\.cursor\skills\benchmark`
  - Performance regression detection using the browse daemon. (gstack)

- **benchmark-models** — `C:\Users\JIDDAH\.cursor\skills\benchmark-models`
  - Cross-model benchmark for gstack skills. (gstack)

- **browse** — `C:\Users\JIDDAH\.cursor\skills\browse`
  - Fast headless browser for QA testing and site dogfooding. (gstack)

- **canary** — `C:\Users\JIDDAH\.cursor\skills\canary`
  - Post-deploy canary monitoring. (gstack)

- **careful** — `C:\Users\JIDDAH\.cursor\skills\careful`
  - Safety guardrails for destructive commands. (gstack)

- **codex** — `C:\Users\JIDDAH\.cursor\skills\codex`
  - OpenAI Codex CLI wrapper — three modes. (gstack)

- **context-restore** — `C:\Users\JIDDAH\.cursor\skills\context-restore`
  - Restore working context saved earlier by /context-save. (gstack)

- **context-save** — `C:\Users\JIDDAH\.cursor\skills\context-save`
  - Save working context. (gstack)

- **cso** — `C:\Users\JIDDAH\.cursor\skills\cso`
  - Chief Security Officer mode. (gstack)

- **design-consultation** — `C:\Users\JIDDAH\.cursor\skills\design-consultation`
  - Design consultation: understands your product, researches the landscape, proposes a complete design system (aesthetic, typography, color, layout, spacing, motion), and generates font+color preview... (gstack)

- **design-html** — `C:\Users\JIDDAH\.cursor\skills\design-html`
  - Design finalization: generates production-quality Pretext-native HTML/CSS. (gstack)

- **design-review** — `C:\Users\JIDDAH\.cursor\skills\design-review`
  - Designer's eye QA: finds visual inconsistency, spacing issues, hierarchy problems, AI slop patterns, and slow interactions — then fixes them. (gstack)

- **design-shotgun** — `C:\Users\JIDDAH\.cursor\skills\design-shotgun`
  - Design shotgun: generate multiple AI design variants, open a comparison board, collect structured feedback, and iterate. (gstack)

- **devex-review** — `C:\Users\JIDDAH\.cursor\skills\devex-review`
  - Live developer experience audit. (gstack)

- **diagram** — `C:\Users\JIDDAH\.cursor\skills\diagram`
  - Turn an English description (or mermaid source) into a diagram triplet: the source, an editable .excalidraw file you can open (gstack)

- **document-generate** — `C:\Users\JIDDAH\.cursor\skills\document-generate`
  - Generate missing documentation from scratch for a feature, module, or entire project. (gstack)

- **document-release** — `C:\Users\JIDDAH\.cursor\skills\document-release`
  - Post-ship documentation update. (gstack)

- **freeze** — `C:\Users\JIDDAH\.cursor\skills\freeze`
  - Restrict file edits to a specific directory for the session. (gstack)

- **gstack** — `C:\Users\JIDDAH\.cursor\skills\gstack`
  - Router for the gstack skill suite. (gstack)

- **gstack-upgrade** — `C:\Users\JIDDAH\.cursor\skills\gstack-upgrade`
  - Upgrade gstack to the latest version.

- **guard** — `C:\Users\JIDDAH\.cursor\skills\guard`
  - Full safety mode: destructive command warnings + directory-scoped edits. (gstack)

- **health** — `C:\Users\JIDDAH\.cursor\skills\health`
  - Code quality dashboard. (gstack)

- **investigate** — `C:\Users\JIDDAH\.cursor\skills\investigate`
  - Systematic debugging with root cause investigation. (gstack)

- **ios-clean** — `C:\Users\JIDDAH\.cursor\skills\ios-clean`
  - Remove the DebugBridge SPM package and all #if DEBUG wiring from an iOS app. (gstack)

- **ios-design-review** — `C:\Users\JIDDAH\.cursor\skills\ios-design-review`
  - Visual design audit for iOS apps on real hardware. (gstack)

- **ios-fix** — `C:\Users\JIDDAH\.cursor\skills\ios-fix`
  - Autonomous iOS bug fixer. (gstack)

- **ios-qa** — `C:\Users\JIDDAH\.cursor\skills\ios-qa`
  - Live-device iOS QA for SwiftUI apps. (gstack)

- **ios-sync** — `C:\Users\JIDDAH\.cursor\skills\ios-sync`
  - Regenerate the iOS debug bridge against the latest upstream gstack templates. (gstack)

- **land-and-deploy** — `C:\Users\JIDDAH\.cursor\skills\land-and-deploy`
  - Land and deploy workflow. (gstack)

- **landing-report** — `C:\Users\JIDDAH\.cursor\skills\landing-report`
  - Read-only queue dashboard for workspace-aware ship. (gstack)

- **learn** — `C:\Users\JIDDAH\.cursor\skills\learn`
  - Manage project learnings.

- **make-pdf** — `C:\Users\JIDDAH\.cursor\skills\make-pdf`
  - Turn any markdown file into a publication-quality PDF. (gstack)

- **office-hours** — `C:\Users\JIDDAH\.cursor\skills\office-hours`
  - YC Office Hours — two modes. (gstack)

- **open-gstack-browser** — `C:\Users\JIDDAH\.cursor\skills\open-gstack-browser`
  - Launch GStack Browser — AI-controlled Chromium with the sidebar extension baked in.

- **pair-agent** — `C:\Users\JIDDAH\.cursor\skills\pair-agent`
  - Pair a remote AI agent with your browser. (gstack)

- **plan-ceo-review** — `C:\Users\JIDDAH\.cursor\skills\plan-ceo-review`
  - CEO/founder-mode plan review. (gstack)

- **plan-design-review** — `C:\Users\JIDDAH\.cursor\skills\plan-design-review`
  - Designer's eye plan review — interactive, like CEO and Eng review. (gstack)

- **plan-devex-review** — `C:\Users\JIDDAH\.cursor\skills\plan-devex-review`
  - Interactive developer experience plan review. (gstack)

- **plan-eng-review** — `C:\Users\JIDDAH\.cursor\skills\plan-eng-review`
  - Eng manager-mode plan review. (gstack)

- **plan-tune** — `C:\Users\JIDDAH\.cursor\skills\plan-tune`
  - Self-tuning question sensitivity + developer psychographic for gstack (v1: observational). (gstack)

- **qa** — `C:\Users\JIDDAH\.cursor\skills\qa`
  - Systematically QA test a web application and fix bugs found. (gstack)

- **qa-only** — `C:\Users\JIDDAH\.cursor\skills\qa-only`
  - Report-only QA testing. (gstack)

- **retro** — `C:\Users\JIDDAH\.cursor\skills\retro`
  - Weekly engineering retrospective. (gstack)

- **review** — `C:\Users\JIDDAH\.cursor\skills\review`
  - Pre-landing PR review. (gstack)

- **scrape** — `C:\Users\JIDDAH\.cursor\skills\scrape`
  - Pull data from a web page. (gstack)

- **setup-browser-cookies** — `C:\Users\JIDDAH\.cursor\skills\setup-browser-cookies`
  - Import cookies from your real Chromium browser into the headless browse session. (gstack)

- **setup-deploy** — `C:\Users\JIDDAH\.cursor\skills\setup-deploy`
  - Configure deployment settings for /land-and-deploy.

- **setup-gbrain** — `C:\Users\JIDDAH\.cursor\skills\setup-gbrain`
  - Set up gbrain for this coding agent: install the CLI, initialize a local PGLite or Supabase brain, register MCP, capture per-remote trust policy. (gstack)

- **ship** — `C:\Users\JIDDAH\.cursor\skills\ship`
  - Ship workflow: detect + merge base branch, run tests, review diff, bump VERSION, update CHANGELOG, commit, push, create PR. (gstack)

- **skillify** — `C:\Users\JIDDAH\.cursor\skills\skillify`
  - Codify the most recent successful /scrape flow into a permanent browser-skill on disk. (gstack)

- **spec** — `C:\Users\JIDDAH\.cursor\skills\spec`
  - Turn vague intent into a precise, executable spec in five phases. (gstack)

- **sync-gbrain** — `C:\Users\JIDDAH\.cursor\skills\sync-gbrain`
  - Keep gbrain current with this repo's code and refresh agent search guidance in CLAUDE.md. Wraps the gstack-gbrain-sync orchestrator with state (gstack)

- **unfreeze** — `C:\Users\JIDDAH\.cursor\skills\unfreeze`
  - Clear the freeze boundary set by /freeze, allowing edits to all directories again. (gstack)

- **_gstack-command** — `C:\Users\JIDDAH\.cursor\skills\_gstack-command`
  - Router for the gstack skill suite. (gstack)

---

## Suggested next steps

- **MCP:** Use this extension’s hub **MCP** tab, or `claude mcp list` in the terminal. In Claude Code, use `/mcp` to connect servers for the session.
- **Edit config:** Open `~/.claude.json` (user MCP) or `<workspace>/.mcp.json` (project MCP) via the extension commands.
- **Refresh this report:** run **Intelligence — scan MCP & Skills awareness** again after changing MCP config or adding skills.

_Report from Cloude Code ToolBox extension._

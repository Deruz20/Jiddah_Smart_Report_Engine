JIDDAH — WORK ORDER 2026-11-17
Repo: C:\Users\USER\Desktop\school_management_system\jiddah_repo_clean_room (Next.js 16, Supabase, Vercel, PowerSync; Windows/PowerShell — PowerShell-compatible commands only)

You are the implementation agent. A senior reviewer audits everything you report. Before anything else: save this brief verbatim as AGENT_BRIEF.md in the repo root (do not commit it), then read DESIGN.md, PERMISSIONS_MATRIX.md, ISSUES_REGISTER.md, ISSUES_INBOX.md, JIDDAH_MASTER_COMPLETION_TRACKER.md and OWNER_CHECKLIST.md (any missing = say NOT FOUND). Re-read AGENT_BRIEF.md at the start of every phase and whenever unsure of scope.

== NON-NEGOTIABLES ==
1. Discover, never assume. Every file, table, column, route, function, env var and role name you cite must come from code or data you inspected this session. Not found = write NOT FOUND and stop that thread. Never invent a stand-in.
2. Label every claim. E1 = executed, real output pasted. E2 = read from code, file:line given. E3 = claimed or assumed — counts as NOT done. Never fabricate output, counts or "should work".
3. Verify library behaviour (Next.js 16, supabase-js, PowerSync) against the installed versions' types/docs, not memory.
4. Scope lock. Do only what is listed, in order. Anything else you spot → log in ISSUES_INBOX.md (severity, evidence, one-line fix idea) and carry on. No refactors, renames, new dependencies or restyling outside the new screens.
5. Production is live and teachers depend on the single admin account right now. Never run scripts, seeds or tests against production; never create users there. Experiments run only on the local Supabase rehearsal stack — if it can't run, stop and tell me. Never modify, rotate or disable the working admin account. Every schema/data change = migration file + rollback script, NOT applied to production; list what I must run, in what order, and which tables to export to CSV first (no backups on the Free plan). Prefer delay over a risky change.
6. Work on a new branch. No push to main, no deploy, no secrets committed, no user ids/emails/tokens in logs, no new debug/test/seed endpoints.
7. Reuse what exists: ranking util (ties 1,2,2,4 is the default), grading config, permission checks, settings readers, DESIGN.md components. Never hand-calculate a number — every figure shown comes from tested code.
8. Stop conditions (stop and report at once): needs a production change; needs an unreviewed schema change; destructive operation; a who-may-see-what ambiguity PERMISSIONS_MATRIX.md doesn't answer; rehearsal stack won't run; same fix failed twice (don't thrash).
9. Phases run in order. At each phase start restate its scope in ≤3 lines. At its end send the REPORT (format at bottom) and STOP. Don't start the next phase until I reply GO.

== PHASE 1 — RBAC / ACL (today's must-have) ==
Goal: Principal, Head Teacher, DOS (Secular and Theology) and Class Teacher accounts work with sensible default permissions, and the Administrator's permission/access editor is fully wired and enforced — so teachers can stop sharing the admin account.

1A Recon (read-only, E2): how roles and permissions are modelled (tables, enums, claims) and where each is enforced — UI gating, proxy/middleware, API routes/server actions, RLS, PowerSync sync rules, session/JWT. List anything enforced only in the UI. Compare code vs PERMISSIONS_MATRIX.md. Roles I use (confirm each exists in code/DB): Administrator, Principal, Head Teacher, Deputy Head Teacher, DOS (Secular/Theology), Class Teacher, Theology Instructor, Support Staff. If "Principal" is not a role distinct from Head Teacher, don't alias or invent it — put the exact proposed change (schema impact, migration, rollback) in the report and continue with the rest.

1B Reproduce why non-admin accounts fail (E1, local stack only): create one test user per role and run every critical flow — sign-in, session load, active-term fetch, own classes/students, secular and theology marks save, remarks, comments/conduct, hub analysis, reports, settings pages, user and permission management. Record pass/fail, HTTP status and the failing layer. Check these last-recorded issues against current code before acting (they may be stale): RLS state on core tables, class-teacher theology-marks save failure, /api/settings/terms/active returning 403 to teachers, PowerSync connection failures, teacher delete failing.

1C Fix root causes. One source of truth: role → permissions. Server-side enforcement on every route/action (UI hiding is cosmetic). Proposed default scoping (PERMISSIONS_MATRIX.md is the contract; show me any conflict, don't silently choose): Class Teacher = own class(es) in own department only; DOS = own department, all classes; Principal/Head Teacher/Deputy = school-wide read plus review/approve actions, no user/role/permission/system management; Administrator = everything. RLS: write and test per-role policies locally and deliver them as a migration; do not apply to production.

1D Defaults: update PERMISSIONS_MATRIX.md as PROPOSED — pending my approval (Owner Gate 1): role × capability, least privilege, matching 1C. Defaults must be seeded data the Administrator can edit — never hard-coded. Theology Instructor and Support Staff: no regression, no new access.

1E Permission editor (all on the local stack): verify end to end — UI → persisted → enforced on the next request, no redeploy. Define and test how open sessions pick up changes; handle every cache (session/JWT, PowerSync, Next cache). Safeguards: cannot remove own access or the last Administrator; log who/what/when/before→after (reuse the existing audit mechanism, or propose the minimal one). Also verify create-user, disable-user, reset-password and teacher-delete work with public sign-ups OFF.

1F Prove it (E1): a role × capability matrix run through Playwright AND direct API calls that bypass the UI (class teacher asking for another class's data by id, a DOS asking for the other department's data, Head Teacher hitting an admin-only endpoint — each per the matrix). Every cell: expected vs actual, pasted.

1G Write (don't execute) the cut-over plan: how teachers move off the shared admin account, in what order, rollback, and how I smoke-test one real account per role first.

== PHASE 2 — Comments & conduct settings don't take effect (and remarks) ==
Settings changed in the UI have no visible effect; remarks had the same problem before. Treat as one suspected bug class.

2A Find the feature (git log --since="3 days ago" --stat; grep conduct|comment|remark). Map the chain: UI → API/action → table(s) → every consumer (report card, remarks UI, hubs, print).

2B Trace one setting end to end (E1): change in UI → request/response → DB row → what the consumer reads → rendered result. Name the first broken link. Test, don't assume: (a) write "succeeds" but affects 0 rows (RLS, or row missing so it needs upsert; an update without .select() hides this); (b) writer and reader use different tables/columns/keys/scopes (global vs class vs term vs secular/theology); (c) duplicate rows, reader picks the wrong one; (d) stale reads — Next data/route cache, missing revalidation, client cache, PowerSync local replica not syncing that table or serving stale rows; (e) hard-coded default or ?? fallback overriding the saved value; (f) setting saved but nothing reads it; (g) role lacks permission and the UI swallows the error (links to Phase 1).

2C Fix the root cause for comments, conduct and remarks. Saves must read back before showing success; failures must show the real error.

2D Regression tests: change setting → reload → effect visible in each consumer, per affected role (E1).

2E Add a 5-step manual test (clicks + expected result) to OWNER_CHECKLIST.md.

== PHASE 3 — P.7 guard, then Section filter + top 10 on BOTH hubs (Secular and Theology) ==
3A Recon (E2): existing analysis / top-10 / class-filter code for each hub; how classes are stored and named (list the real class names — don't assume "P.7" vs "P7"); how Term 3 / EOT and exam types are represented; how P.7 is identified. Capture a baseline of current outputs before changing anything.

3B P.7 awareness (do first). Fact: P.7 (secular and theology) are candidates — they sit PLE and IPLE and have NO Term 3 EOT. Now: one central rule (one helper, one config location) answering "does exam X apply to class Y in term Z?", used by every analysis, metric, ranking, completion and missing-marks check, so P.7 Term 3 EOT is excluded: no zero-filling, no missing-marks warnings, no distortion of class/section/school averages, ranks, completion % or cumulative figures; show "N/A — candidate class". Only Term 3 EOT is affected. NOT now: PLE/IPLE entry or analysis — log "P.7 candidate-class logic (PLE/IPLE)" as deferred in JIDDAH_MASTER_COMPLETION_TRACKER.md with these facts. Proof (E1): before/after outputs for every non-P.7 class are identical. If P.7 Term 3 behaves oddly elsewhere (e.g. report-card generation), log it; don't redesign it.

3C Section filter beside Class on both hubs. Sections = named groups of classes defined in ONE place (follow how the codebase stores settings; seeded defaults): Nursery = Baby → Top (all nursery classes combined); Lower Primary = P.1–P.3; Upper Primary = P.4–P.7. Map by class id/code, not name matching; an unmapped class shows a data-quality warning, never silently dropped. Report the exact class→section mapping seeded and flag any class that doesn't clearly fit. Selecting a section aggregates all its classes: analysis and top 10 run over the combined set, ranked with the existing ranking util. If classes in a section differ in subjects or max marks, rank on a normalised measure (state the method on screen, e.g. average % over subjects actually sat) — never compare raw totals across non-comparable classes. Missing marks: exclude from rank and list them, never zero. Term/exam selectors keep working; Phase 1 scoping applies server-side. The Theology hub gets identical behaviour. UI per DESIGN.md (warm neutral palette, tabular numerals, hairline rules, compact density, no decorative charts), with empty/loading/error states, axe-clean.

3D Tests (E1): unit tests for section aggregation and the P.7 rule; E2E on both hubs; reconciliation — section counts = sum of class counts, section top 10 = independently recomputed (SQL or script).

== PHASE 4 — Detailed report on BOTH hubs ==
For Administrator, Principal/Head/Deputy, DOS and Class Teachers — each seeing only what their role allows, enforced server-side. Scope: school / section / class (as permitted) × term × exam × year, as the system already supports. Include only metrics computable from existing data; omit the rest and list them in the report. Candidates: (1) cohort: enrolled, sat, missing marks by class/subject, P.7 N/A notes; (2) performance: mean, median, high, low, spread, pass rate if a pass mark exists, grade/division distribution from the existing grading config (never invent boundaries); (3) subjects: mean per subject, strongest/weakest, subject × class comparison; (4) learners: top 10 and a "needs support" list below a labelled, adjustable threshold; (5) trend vs previous term where data exists, most improved/declined; (6) class vs class within a section, section vs section; (7) gender split only if captured; (8) cycle completeness: marks, remarks, conduct done by class, only if tracked; (9) data-quality flags: out-of-range, duplicate, missing, unmapped.
Insights are deterministic rules: each sentence is generated from a number on the same page (e.g. "P.5 mean fell 6.2 pts vs Term 2"); no free-text or model-written commentary. Every metric shows its definition and scope (term, exam, n). Output: on screen + print-ready A4 reusing the app's existing print/PDF approach (no new PDF dependency without asking) + CSV of the underlying tables if an export pattern exists. Proof (E1): figures reconcile with Phase 3; role × scope matrix; attach a printed sample.

== PHASE 5 — Gap audit (read-only, report only) ==
Find what else blocks every role from working smoothly — e.g. forgot-password/reset, first login for newly issued accounts, session expiry, 401/403/500 handling per role, loading splash, PowerSync offline behaviour, account lifecycle, audit logging, backup/CSV-export routine, secrets/logging hygiene. Output a prioritised table (P0 blocks teachers going live / P1 / P2): evidence, effort, risk. Implement nothing without my GO.

== REPORT FORMAT (end of each phase; keep it tight) ==
- Table: Task | Status (DONE-E1 / PARTIAL / BLOCKED / NOT FOUND) | Evidence (E-label + file:line or command)
- Files changed (path — why, one line each); migrations created (name, purpose, rollback, NOT applied)
- Out-of-scope defects logged (ids)
- OWNER ACTION: only what only I can do, exact steps (also written to OWNER_CHECKLIST.md); max 5 lines
- Open questions (max 3), each with your recommended default
- Self-check: list every E3 item left in this report; fix it or move it to BLOCKED. If blocked, say so in line 1 with the exact error.  AMENDMENT TO PHASE 1 — overrides the "Principal" sentence in 1A and the "Principal/Head Teacher/Deputy" scoping line in 1C wherever they conflict.

Hierarchy (owner-confirmed): the Principal is the overall supervisor — the director on the ground. The Head Teacher and all of the Head Teacher's staff sit below the Principal. Principal is a distinct role; never alias or merge it with Head Teacher.

1A: confirm in code/DB whether a Principal role exists. If yes, wire it. If not, make every code path such that adding it is a data/migration step only, put the exact change (schema/enum impact, migration, rollback — not applied to production) in the report, and continue with everything else.

1B/1F: Principal gets its own local test user and its own row in the role × capability matrix.

1C scoping (proposed; PERMISSIONS_MATRIX.md stays the contract):
- Principal: school-wide across both departments — read everything, review/approve/lock anything the Head Teacher can, view staff (and their activity where the system records it). No user/role/permission/system management by default (Administrator-only) — flag for Gate 1.
- Head Teacher / Deputy Head Teacher: school-wide read plus review/approve actions; no user/role/permission/system management.

1D: PERMISSIONS_MATRIX.md gets a Principal row. Add a seeded-default test (E1): for every read, review and approve capability, Principal ⊇ each role below it.AMENDMENT 2 — Phase 1 top priority: Users, Permissions & Access Management page (Administrator). Do this first, right after 1A; 1E folds into it.

P1. Control inventory: list every tab, button, field, filter and action on the page and its admin API. For each: handler → route/action → DB effect → enforcement layer → WORKS / BROKEN / PLACEHOLDER, proven on the local stack (E1). Nothing stays half-wired: fix it, or disable/remove it and tell me.

P2. Permission map (E2): every permission key shown in the editor ↔ every place code enforces it. A key with no enforcement = DEAD; a check using an unlisted key = ORPHAN. Fix or remove each — no dead toggles.

P3. Must work end to end (E1, local stack):
- Users: list/search/filter by role and department; create (role, department, class assignments as the code models them, initial credentials or invite) with public sign-ups OFF; edit; change role; assign/unassign classes and department; disable/enable; reset password; delete without orphaning marks or history (propose soft-delete or a guard — don't improvise).
- Roles & permissions: edit each role's defaults, plus any per-user overrides the page already has. Saved → enforced on the next request, no redeploy; defined behaviour for already-open sessions.
- Access: class and department assignments are what Phase 1 scoping reads — one source of truth. Assigning a class to a Class Teacher grants exactly that access immediately; removing it revokes it.

P4. Safeguards: Administrator-only, enforced server-side (every other role hitting the URL or API directly → denied, E1); can't remove own access or the last Administrator; confirm on destructive actions; every change logged (who/what/when/before→after); the privileged Supabase secret/service-role key lives only in server code — prove it's absent from the client bundle.

P5. Real error messages on every failure — no silent success, no swallowed 403/500; every save reads back before it reports success.

P6. Deliver a SELECT-only SQL diagnostic for production that I run myself (you never run it): per role, accounts where the auth user, staff row, role or assignments don't line up, plus leftover test/seed accounts (e.g. @jiddah.local). I paste the results back.

P7. Anything this page still needs (e.g. bulk assign/reset for onboarding dozens of staff): list with effort; don't build without my GO.AMENDMENT 3 — Phase 1 add-on: "My Account & Security" page (every role). Do it right after the Users/Permissions/Access page. Same rules: local stack only, E1 evidence, nothing touches production.

Owner report: changing the name worked; password change untested; email is read-only and I want it changeable from the UI. I call the Full Name field "username" — check whether a separate username exists anywhere; if not, don't invent one.

A1. Inventory (E1): every field and button on the page (name, phone, photo, email, role, assigned classes, password, sign out): handler → route/action → table/column or Auth call → result. Prove name, phone and photo persist, survive reload and update everywhere (top-bar avatar/initials, sidebar, PowerSync local copy) without signing out.

A2. Password: make the current password required (it's optional today), verified server-side by re-authenticating — a mechanism that does not depend on email delivery. Min length 8 in local Auth config and client (proposed; tell me the production setting to change). On success: sign out all other sessions, clear success message, log the event (never the password). Prove: wrong current password rejected; new password works, old one doesn't.

A3. Email: the Auth user is the single source of truth; the staff-table email is a mirror that updates automatically on confirmation. Administrator self-service: new email entered twice, current password required, confirmation to the new address before it takes effect, visible "pending confirmation" state with resend/cancel — a typo must never lock the account out. Other roles stay read-only (proposed; flag for Gate 1). The Administrator changes anyone's email from the Users page via the server-side admin API (no confirmation email needed), before→after logged. Don't assume staff emails are deliverable (some may be @jiddah.local-style). Test with the local stack's mail catcher. List what production needs (custom SMTP, Site URL, Redirect URLs) for me to check — the earlier forgot-password failure may share the cause.

A4. Anti-escalation (E1, direct API calls per role): the profile endpoint accepts only whitelisted fields (name, phone, photo). A non-admin sending role, department, assigned classes, permissions or email → ignored/denied.

A5. Defects visible on the page: "Assigned Classes" shows a raw UUID — resolve to class names ("All classes" for Administrator) and report what that ID is and whether the data is wrong. Photo upload: enforce PNG/JPG/WEBP (no SVG) and 2MB server-side or in the Storage policy, own-path writes only, old photo replaced. Phone: validate format, optional.

A6. Extras — small ones only: "Sign out other devices" and last sign-in time. Bigger ideas (e.g. MFA for Administrator/Principal) → list with effort; don't build without my GO.

A7. Real errors on every failure; read back before showing success; every change logged. Add manual test steps to OWNER_CHECKLIST.md.

== GATE 1 APPROVAL & AMENDMENT — URGENT PHASE 1.5 (Grading Logic Overhaul) ==
Gate 1 decisions approved by owner:
1. PERMISSIONS_MATRIX.md default approved (Principal gets school-wide read/review without user management).
2. Email changes remain Administrator-only.
3. Class Teachers keep both homeroom and explicit Theology assignments.

Phase 1.5 Scope (inserted immediately before Phase 2):
1. Recon existing grading logic (E2): Find where aggregates, divisions, and grades are calculated for both Secular and Theology.
2. Fix the Aggregate Logic: 1st Grade (Secular) and Mamtaz (Theology) must correctly span from 4 to 12 aggregates.
3. Fix Theology Grade Mapping: Stop mapping both secular subject grades (D1-F9) and overall divisions (1-U) to the same Arabic terms (Mamtaz, Jayyid Jidd, Jayyid, etc.). Re-engineer to align with official IPLE grading documentation with distinct, accurate mappings for individual subject performance versus overall aggregate division.
4. Configurable Base: Engineer grading logic so thresholds (like 4-12 for Div 1) are easily adjustable/configurable rather than deeply hardcoded.
5. Proof (E1): Run local tests proving 4 aggregates and 12 aggregates both yield Division 1 / Mamtaz, and 13 yields Division 2. Show corrected Arabic mapping for a single subject vs overall student grade.
6. Deferred tasks logged to ISSUES_INBOX.md (Dark Mode Print Bug, Secretary Account, Hub Customization, UI/UX Overhaul).
7. Output standard REPORT and wait for GO before starting Phase 2.

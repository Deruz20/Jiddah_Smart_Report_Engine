# Google Gemini / Material-3 Workspace Rebuild Ledger
**Project:** Jiddah Smart Report Engine (`jiddah_repo_clean_room`)  
**Date:** 2026-11-13  
**Status:** COMPLETE & VERIFIED (Zero Typecheck Errors, 175/175 Unit Tests Passing, Zero Next.js Build Errors)

---

## Executive Summary
This overhaul completes the total transition of the **Jiddah Smart Report Engine** to the **Google Gemini / Material-3 Workspace UI System**. We eliminated legacy prototype UI shells, muddy green card borders, blinding white dark-mode inputs, and cluttered action buttons. In their place stands a high-craft, professional web workspace characterized by:
- **True Neutral Theme Architecture:** Dark mode centered on `#131314` (canvas), `#1E1F20` (surface), `#282A2C` (hover/active), `#3C4043` (borders), `#E3E3E3`/`#C4C7C5` (text). Light mode centered on `#FFFFFF` (canvas), `#F0F4F9` (sidebar/sunken), `#D3E3FD` (active pill), `#1F1F1F`/`#444746` (text).
- **Google Gemini Collapsible Sidebar (`app-sidebar.tsx`):** Smooth transition between 64px collapsed rail and 260px expanded drawer. Includes the signature top-left logo morph (school emblem fades out to reveal `PanelLeftOpen` on hover with a circular hover pill and Radix tooltip), expanded header with Quick Search (⌘K) trigger and `PanelLeftClose`, full-width rounded-full pill rows (`h-9 px-3 rounded-full`), and pinned bottom footer for settings and user account.
- **Universal 3-Dot (`⋮`) Action Menu (`MoreActionsMenu`):** Built on `@radix-ui/react-dropdown-menu` with Gemini tokens (`rounded-2xl`, `#1E1F20`, `#E1E3E1`/`#282A2C` hairline borders, and `rounded-xl` items). Replaces cluttered inline button rows across dense tables and marksheets.
- **Engine Reliability Gate:** Permanently fixed all `supabaseKey is required` and 500 runtime crashes across API routes, decoded stringified JSON logo values safely in `normalizeSchoolLogoUrl()`, purged references to dropped tables (`stamp_configs`, `watermark_configs`), and eliminated Framer Motion rgba/transparent warnings.

---

## 1. Design System & Theme Token Map

### A. Dark Mode Palette (`.dark`)
| Token Role | Color Value | Description |
| :--- | :--- | :--- |
| **Canvas Background** | `#131314` | True Google Gemini neutral deep dark background. Zero blue or muddy green tint. |
| **Surface / Card Background** | `#1E1F20` | Elevated surfaces, cards, modals, dropdowns, and flyouts. |
| **Sunken / Recessed Input** | `#131314` | Input fields, search bars, and table containers. |
| **Active Nav Pill** | `#282A2C` | Active navigation pill surface. Text `#E3E3E3`. |
| **Hover Nav Pill** | `#333537` (or `rgba(255,255,255,0.06)`) | Subtle neutral hover interaction state. |
| **Hairline Border** | `#282A2C` / `rgba(255,255,255,0.08)` | Hairline borders between sections and table rows. |
| **Input Border** | `#3C4043` | Recessed input borders; focuses to emerald accent (`#34D399`) or Gemini blue (`#A8C7FA`). |
| **Primary Text** | `#E3E3E3` | High-contrast, glare-free primary text. |
| **Secondary Text** | `#C4C7C5` | Subheadings, table headers, and form labels. |
| **Muted Text** | `#8E918F` | Captions, metadata, and placeholder text. |

### B. Light Mode Palette (`:root`)
| Token Role | Color Value | Description |
| :--- | :--- | :--- |
| **Canvas Background** | `#FFFFFF` | Crisp pure white canvas. |
| **Sidebar & Sunken Surface** | `#F0F4F9` | Material-3 soft neutral tint for sidebar and sunken containers. |
| **Card Background** | `#FFFFFF` | Clean card background with `#E1E3E1` hairline border. |
| **Active Nav Pill** | `#D3E3FD` | Material-3 soft blue active pill with `#041E49` deep navy text. |
| **Hover Nav Pill** | `rgba(31,31,31,0.06)` | Clean, non-jarring hover feedback. |
| **Primary Text** | `#1F1F1F` | Deep charcoal primary text. |
| **Secondary Text** | `#444746` | Form labels and secondary descriptions. |
| **Muted Text** | `#747775` | Timestamps, table captions, and secondary metadata. |

---

## 2. Global Shell & Sidebar Architecture

### A. Google Gemini Collapsible Sidebar (`src/components/layout/app-sidebar.tsx`)
- **Collapsed Mode (`w-[64px]`):**
  - **Top-Left Logo Morph:** A centered `size-10` button hosting the school emblem (`/logo-512h.png`). On mouse hover (`group/logo`), the emblem smoothly fades out (`opacity-0 scale-75`) while revealing `PanelLeftOpen` (`opacity-100 scale-100`) inside a circular hover pill. Wrapped in a Radix `<Tooltip>` reading `"Open sidebar"`.
  - **Nav Icons:** Centered 40px rounded-full buttons with smooth neutral hover backgrounds and Radix tooltip pills on the right (`sideOffset={12}`).
  - **Footer:** Centered Settings gear icon and user avatar initials circle with role tooltip.
- **Expanded Mode (`w-[260px]`):**
  - **Top Header:** Emblem (24px) paired with `"Jiddah"` brand typography (`text-[17px] font-semibold text-[#1F1F1F] dark:text-[#E3E3E3]`). Right side features a quick search button (opens ⌘K command palette) and a circular `PanelLeftClose` button with tooltip `"Close sidebar"`.
  - **Nav Items:** Clean, full-width rounded-full pill rows (`h-9 px-3 rounded-full text-[13.5px]`). Removed all uppercase section headings (`DAILY WORK`, `REPORTING`, `ADMINISTRATION`) for an uncluttered Google Workspace feel.
  - **Footer:** Full-width School Settings pill button and user account tile displaying user name and formatted role.

### B. Universal 3-Dot (`⋮`) Action Menu (`src/components/ui/more-actions-menu.tsx`)
- Constructed with `@radix-ui/react-dropdown-menu`.
- Compact 32×32px rounded-full trigger button with `MoreVertical` icon.
- Dropdown container styled with `rounded-2xl`, `#FFFFFF` (light) / `#1E1F20` (dark), `#E1E3E1` / `#282A2C` hairline border, and `rounded-xl` item rows with support for icons, shortcut badges, and destructive variants.

---

## 3. Five Overhauled Priority Modules

### 1. Marks Entry (`shared-marks-entry.tsx`, `circular-client.tsx`, `theology-client.tsx`)
- **Streamlined Top Controls:** Replaced cluttered toolbars with a single compact bar featuring pill selectors (Class, Subject, Term, Student Stepper) and a primary `Save Marks` pill button.
- **Header `MoreActionsMenu`:** Consolidates secondary utilities: `Import CSV`, `Export Marksheet`, `Clear Unsaved Changes`, and `Lock/Unlock Exam Set`.
- **High-Readability Score Inputs:** In dark mode, inputs use recessed `#131314` background, `#3C4043` border, and `#E3E3E3` monospace text. Blinding white inputs and illegible contrast are eliminated.
- **Row-Level `MoreActionsMenu`:** Replaced inline edit/delete buttons in `circular-client.tsx` and `theology-client.tsx` with contextual menus.

### 2. Report Center (`ReportGeneratorClient.tsx`, `TopToolbar.tsx`, `SearchFilterBar.tsx`)
- **Toolbar Decluttering:** Reduced toolbar noise to essential selectors, selection counter (`Print Selected (X)`), a 1-click primary `Print` pill button, and a `MoreActionsMenu` (`Report Studio 2.0`, `Export Broadsheet`, `Batch Settings`, `Audit & Activity`).
- **Student Checklist Row `MoreActionsMenu`:** Each row in the selection drawer provides: `Preview Report`, `Download PDF`, `Edit Remarks`, and `View Student Profile`.
- **Keyboard & Multi-Select:** Preserved fluid `Select All`, `Shift+Click` contiguous range selection, and completion filter pills (`All`, `Complete`, `Partial`, `Empty`).

### 3. Secular Hub & Theology Hub (`SecularHubClient.tsx`, `TheologyHubClient.tsx`, `print-system.css`)
- **Clean Toolbars:** Secondary export, broadsheet download, and column toggle buttons consolidated into `MoreActionsMenu`.
- **A4 Landscape Assessment Printing:** Standardized `@page hub-landscape-page { size: A4 landscape; margin: 8mm; }` in `print-system.css`, with `:last-child` page-break-after suppression to prevent trailing blank pages.
- **Institutional Branding:** Integrated official school letterhead and badge rendering.

### 4. Students & Classes (`StudentsListClient.tsx`, `classes-client.tsx`, `class-dashboard-client.tsx`)
- **Students Table:** Replaced 5 horizontal action buttons per row with a unified `MoreActionsMenu` (`View Profile`, `Edit Details`, `Print Report Card`, `Transfer Class`, `Archive / Restore`, `Delete Student`).
- **Classes Management:** Streamlined class rows with `MoreActionsMenu` (`View Dashboard`, `Edit Class`, `Print Class Roster`, `Assign Teacher`, `Delete Class`).
- **Class Dashboard Tabs:** Corrected P.3 dashboard tab label from duplicate `"Students"` to `"Subjects"`, and capped distinct student count accurately.

### 5. School Settings, Account & Notifications (`SettingsClient.tsx`, `account-client.tsx`, `notifications-client.tsx`, `upload-client.tsx`)
- **Account & Settings:** Fully updated to `#131314`/`#1E1F20` dark palette. Read-only inputs use `#131314` surface and `#E3E3E3` text with clean `#3C4043` borders. Role display correctly reflects `"Administrator (All Departments)"`.
- **Notifications Center:** Purged dummy hardcoded notification items and added row-level `MoreActionsMenu` (`Mark as Read`, `Delete Notification`).
- **Upload Center:** Sleek single-row layout with file row `MoreActionsMenu` (`Preview Document`, `Clean Signature Ink`, `Download`, `Delete`).

---

## 4. Phase 1 Forensic Remediation (Engine Reliability Gate)
1. **Server Supabase Key Resolution (`supabase-env.ts` & `server.ts`):**
   - Implemented fail-safe server key resolution that seamlessly falls back from `SUPABASE_SERVICE_ROLE_KEY` to authenticated SSR or anonymous keys without crashing.
   - Updated API routes (`/api/signatures`, `/api/settings/user`, `/api/students/[id]`, etc.) to use the unified server client factory.
2. **School Badge / Logo JSON Parsing (`school-settings-helper.ts`):**
   - `normalizeSchoolLogoUrl()` decodes stringified JSON objects (`{"logo":"/school_budge.jpeg"}`), extracts the `.logo` property, and normalizes legacy paths to `'/logo-512h.png'`.
3. **Purged Dropped Table References:**
   - Updated `ReportStudioClient.tsx`, `StampGenerator.tsx`, and `WatermarkConfigurator.tsx` to persist stamp and watermark configurations to `school_settings.print_preferences` instead of nonexistent `stamp_configs` or `watermark_configs` tables.
4. **Framer Motion Warning Elimination (`FloatingControls.tsx`):**
   - Replaced `background: 'transparent'` with `backgroundColor: 'rgba(255, 255, 255, 0)'` to satisfy Framer Motion type and animation requirements.

---

## 5. Verification Evidence

### A. TypeScript Typecheck Gate (`npm run typecheck` / `tsc --noEmit`)
```bash
> jiddah-smart-report-engine@0.1.0 typecheck
> tsc --noEmit
# Exit code: 0 (Zero errors)
```

### B. Unit & Domain Logic Test Suites (`node --test ...`)
```bash
> node --import ./src/lib/test-guard.mjs --test \
    src/__tests__/overhaul-workstreams.test.mjs \
    src/__tests__/theology-2026-standards.test.mjs \
    src/__tests__/eot-report-auth-and-badges.test.mjs \
    src/__tests__/settings-renovation.test.mjs \
    src/__tests__/dashboard-and-offline-sync.test.mjs \
    src/__tests__/customization-and-contrast.test.mjs \
    src/__tests__/grading-and-calculations.test.mjs \
    src/__tests__/independent-grading-oracle.test.mjs \
    src/__tests__/ranking-preferences-regression.test.mjs \
    src/__tests__/report-studio-positioning-and-previews.test.mjs \
    src/__tests__/security-hardening-and-invariants.test.mjs

ℹ tests 175
ℹ suites 42
ℹ pass 175
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10227.27ms
```

### C. Next.js Production Build (`npm run build` / `next build --webpack`)
```bash
▲ Next.js 16.4.6 (webpack)
- Environments: .env.local
✓ Running next.config.ts took 1418ms
✓ (serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'...
✓ Compiled successfully in 44s
✓ Collecting page data using 3 workers in 5.0s
✓ Generating static pages using 3 workers (68/68) in 2.0s
✓ Collecting build traces in 27.6s
✓ Finalizing page optimization in 27.6s

All 68 app routes built cleanly with zero compilation or packaging errors.
# Exit code: 0
```

---

## 6. Access Control & Invariant Guarantees
- **No Weakened Boundaries:** All strictly gated API routes (`/api/marks`, `/api/theology-marks`, `/api/circular-marks`, `/api/students`, `/api/students/[id]`, `/api/enrollments`, `/api/reports`, `/api/secular-hub`, `/api/theology-hub`, `/api/settings/*`) retain their complete server-side `verifyDataAccess()` pipeline.
- **Locked Report Components Untouched:** The six locked report card components (`PrimaryEOTReport`, `PrimaryMOTReport`, `NurseryEOTReport`, `NurseryMOTReport`, `TheologyMOTReport`, `NurseryTheologyEOTReport`) remain strictly locked with inline styles and zero breaking changes.
- **Non-Interactive Database Safety:** No interactive prompts, destructive migrations, or unauthorized schema modifications were executed.

---

## 7. Hotfix: Temporal Dead Zone (TDZ) Initialization Fix
- **Issue:** `ReferenceError: Cannot access 'selectedEnrollment' before initialization` at `SharedMarksEntry (src/components/shared-marks-entry.tsx:322:36)`.
- **Root Cause:** `marksMoreActions` `useMemo` hook referenced `selectedEnrollment` in its dependency array at line 322 before `selectedEnrollment` was initialized at line 406.
- **Resolution:** Hoisted `const selectedEnrollment = useMemo(...)` up to line 255 right before `marksMoreActions`, eliminating the TDZ reference error.
- **Verification:** Verified with `npm run typecheck`, full unit test suite (175/175 passing), and clean `npm run build` (68/68 routes compiled).



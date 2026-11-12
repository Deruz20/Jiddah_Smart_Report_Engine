# School Settings Renovation Ledger (`SETTINGS_RENOVATION_LEDGER.md`)

**Branch:** `feat/overnight-system-renovation`
**Architecture:** Google Chrome Material-3 Settings Layout + End-to-End Supabase & Report Engine Wiring

---

## 1. Phase 1 Audit Findings & Root Causes Resolved

| Broken / Disconnected Area | Root Cause Identified | Resolution Applied |
| :--- | :--- | :--- |
| `/admin/settings` crash (`column terms.label does not exist`) | `src/app/admin/settings/page.tsx` queried legacy columns (`label`, `term_number`, `is_current`, `next_term_start`) instead of canonical `terms` columns (`name`, `academic_year`, `start_date`, `end_date`, `next_term_begins`, `is_active`). | Updated `src/app/admin/settings/page.tsx` and `/api/settings/terms` (`GET`, `POST`, `DELETE`) to use the canonical `terms` table schema and pre-fetch `fetchMergedSchoolSettings()`. |
| `SettingsClient` only rendered basic Term cards | `src/components/SettingsClient.tsx` only displayed a term switcher and lacked School Identity, Grading Scales, Division Boundaries, Stamps & Signatures, Report Card Print Layout, Marks Locks, and My Account. | Rebuilt `src/components/layout/SettingsClient.tsx` (re-exported via `src/components/SettingsClient.tsx`) into a unified 7-category Google Chrome Material-3 Settings workspace. |
| Extended School Identity fields (`arabic_name`, `registration_number`, `po_box`, `website_url`) not persisted | `/api/settings/school` `PATCH` only whitelisted basic columns and dropped extended identity and JSON fields (`division_boundaries`, `fee_structure`, `marks_locks`). | Updated `src/lib/school-settings-helper.ts` and `src/app/api/settings/school/route.ts` to persist all extended identity and JSON configuration payloads via `school_settings` + `activity_logs` fallback. |
| Custom `grading_scale` and `division_boundaries` ignored in Aggregate & Division calculations | `calculateAggregate()`, `getDivision()`, `getClassTeacherComment()`, and `getHeadTeacherComment()` in `src/lib/grading.ts` used hardcoded UNEB cutoffs. | Updated `src/lib/grading.ts`, `src/app/api/report/route.ts`, and `src/app/api/report/batch/route.ts` to pass `schoolSettings.grading_scale` and `schoolSettings.division_boundaries` into every report calculation. |
| `showClassPosition` toggle missing from `print_preferences` | `DEFAULT_PRINT_PREFERENCES` only had 4 keys (`includeStamp`, `includeSignatures`, `watermarkEnabled`, `highFidelityColors`). | Added `showClassPosition: true` to `PrintPreferencesConfig` and wired `/api/report` and `/api/report/batch` to suppress `position` and `theologyPosition` (`null`) when `showClassPosition === false`. |
| Marks Entry Locks (`bot_locked`, `mot_locked`, `eot_locked`) not enforced server-side | No server-side lock check existed in `/api/marks`, `/api/circular-marks`, or `/api/theology-marks`. | Added `isExamSetLockedForUser(settings, scoreType, isAdmin)` in `src/lib/school-settings-helper.ts` and enforced HTTP `423 Locked` for non-admin staff across `POST`, `PUT`, and `DELETE` on `/api/marks`, `/api/circular-marks`, and `/api/theology-marks` while preserving Administrator overrides. |
| `AccountClient` Change Password silent failure | `changePasswordSchema` in `src/components/layout/account-client.tsx` required `currentPassword` (min 6 chars) in Zod validation, but no `currentPassword` input was rendered in the form. | Rebuilt `src/components/layout/account-client.tsx` and `/api/settings/user/password` with explicit Current Password, New Password, and Confirm New Password fields plus `/api/settings/user/avatar` upload and role/department/class badges. |

---

## 2. Google Chrome Material-3 Settings Architecture

- **Top Pill Search Header (`src/components/layout/SettingsClient.tsx`):**
  - Centered pill search bar (`max-w-[680px] w-full h-11 rounded-full bg-[#EEF3EE] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0D5C3A]/20 border border-transparent focus-within:border-[#0D5C3A]/30 px-4 text-sm`) with placeholder `"Search settings (e.g. grading, stamp, active term, fees, password)..."`.
  - Real-time cross-category filtering across all 7 categories.
- **Left Navigation Rail (`w-64 shrink-0 pr-4` on desktop, horizontal scroll pills on mobile):**
  - Active Tab Pill: `bg-[#E2EEE2] text-[#0D5C3A] font-semibold rounded-r-full py-2.5 px-4`
  - Inactive State: `text-[#374151] hover:bg-[#F1F5F1] rounded-r-full py-2.5 px-4`
  - 7 Categories with `18px` `lucide-react` icons:
    1. `School Identity & Profile` (`Building2`)
    2. `Academic Terms & Calendar` (`CalendarRange`)
    3. `Grading & Remarks Engine` (`Award`)
    4. `Stamps & Signatures` (`Stamp`)
    5. `Report Card & Print Layout` (`Printer`)
    6. `Marks & Access Locks` (`ShieldCheck`)
    7. `My Account & Security` (`UserCheck`)
- **Centered Modular Card Column (`max-w-[760px] w-full mx-auto space-y-5`):**
  - Crisp white cards (`bg-white rounded-2xl border border-[#E3E8E3] shadow-[0_1px_3px_rgba(15,41,30,0.04)] p-6`), 2-column summary counters, `@radix-ui/react-switch` optimistic auto-saving toggles with inline spinner and `sonner` toast confirmation, and dirty-aware `"Save Changes"` footer bars.

---

## 3. End-to-End Wiring Matrix

| Category | UI Component | API Endpoint | Downstream Consumers |
| :--- | :--- | :--- | :--- |
| **1. School Identity & Profile** | `SettingsClient.tsx` | `GET/PATCH /api/settings/school`, `POST /api/signatures/upload` (`school-logo`) | `AppTopbar`, `/api/report`, `/api/report/batch`, all 8 Report Card headers |
| **2. Academic Terms & Calendar** | `terms-client.tsx` | `GET/POST/DELETE /api/settings/terms`, `PATCH /api/settings/terms/active`, `PATCH /api/settings/school` (`fee_structure`) | `AppTopbar` (`jiddah:active-term-changed` live event), Marks Entry default term, Report Generator next term date |
| **3. Grading & Remarks Engine** | `SettingsClient.tsx` | `PATCH /api/settings/school` (`grading_scale`, `theology_grading_scale`, `theology_remarks`, `division_boundaries`) | `validateGradingBands()`, `calculateAggregate()`, `getDivision()`, `getClassTeacherComment()`, `getHeadTeacherComment()`, Secular & Theology Hubs |
| **4. Stamps & Signatures** | `signatures-client.tsx` | `GET/PATCH/DELETE /api/signatures`, `POST /api/signatures/upload` | `fetchActiveSignatureMap()`, `/admin/reports/studio`, all 8 Report Card templates |
| **5. Report Card & Print Layout** | `SettingsClient.tsx` | `PATCH /api/settings/school` (`print_preferences`) | `resolveReportBranding()`, `/api/report`, `/api/report/batch` (`includeStamp`, `includeSignatures`, `watermarkEnabled`, `highFidelityColors`, `showClassPosition`) |
| **6. Marks & Access Locks** | `SettingsClient.tsx` | `PATCH /api/settings/school` (`marks_locks`) | `isExamSetLockedForUser()` enforced in `/api/marks`, `/api/circular-marks`, and `/api/theology-marks` |
| **7. My Account & Security** | `account-client.tsx` | `GET/PATCH /api/settings/user`, `POST /api/settings/user/avatar`, `PATCH /api/settings/user/password` | Supabase Auth, `profiles`, `teachers` |


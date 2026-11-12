# Stamp, Signature, Badge & Minimalism Overhaul Ledger

Date: 2026-11-12
Branch: `feat/overnight-system-renovation`

## Workstreams Executed

### 1. Unbreakable School Badge / Logo Rendering
- **Root Cause:** Legacy settings and fallbacks referenced missing `/logo.png` (absent from `public/`, which provides `/logo-512h.png`, `/school_logo.svg`, `/school_logo.png`, `/logo.svg`, `/school_budge.jpeg`, etc.).
- **Fixes:**
  - `src/lib/school-settings-helper.ts`: Defined `CANONICAL_SCHOOL_LOGO = '/logo-512h.png'` and exported `normalizeSchoolLogoUrl(rawUrl?)`, replacing missing/broken paths (`/logo.png`, `/school_badge.png`, `/images/logo.png`, `/badge.png`) and empty/null values while preserving custom valid paths (`/...`, `http(s)://`, `data:image/...`, `blob:`).
  - `src/components/layout/SettingsClient.tsx`: Replaced broken `/logo.png` defaults/fallbacks with `/school_logo.svg` and added a loop-guarded `onError` handler on the School Crest preview image.
  - All 8 report templates (`PrimaryEOTReport.tsx`, `PrimaryMOTReport.tsx`, `PrimaryBOTReport.tsx`, `P7EOTReport.tsx`, `NurseryEOTReport.tsx`, `NurseryMOTReport.tsx`, `TheologyMOTReport.tsx`, `NurseryTheologyEOTReport.tsx`) include safe logo resolution and loop-guarded `onError` fallbacks, preserving inline styles/scoped CSS and existing `TheologyMOTReport` / `PrimaryMOTReport` / `PrimaryBOTReport` header badge contracts.
  - `src/app/api/report/route.ts` and `src/app/api/report/batch/route.ts`: Aligned `stamp_date` handling across both single GET and batch POST report endpoints.

### 2. Automatic Signature Ink Extractor & Stroke Enhancer
- `src/lib/signature-ink-processor.ts`: Built client/Node-pure extraction pipeline (`hasOpaquePaperBackground`, `extractCleanSignaturePixels`, `processSignatureFileToPng`, `cleanSignatureImageUrl`) featuring ~16px 80th-percentile local illumination grid subtraction, sigmoid contrast stretching, 3x3 despeckle filtering, `blue` (`#14387F`) / `black` (`#0F172A`) / `original` ink tinting, stroke boldness scaling, and tight bounding-box cropping.
- `src/components/reports/shared/CleanSignatureImg.tsx`: Created retroactive transparent signature renderer (`cleanSignatureImageUrl` + `mixBlendMode: 'multiply'`, inline-style compatible for locked report cards).
- `src/components/SignatureInkReviewCard.tsx`, `src/components/layout/signatures-client.tsx`, `src/components/layout/upload-client.tsx`: Added live Before/After ink extraction review and ink mode / boldness controls prior to upload.

### 3. Official Stamp Engine & Dashed Border Removal
- `src/components/reports/StampGenerator.tsx`: Upgraded `VectorStamp`, `OfficialReportStamp`, and `StampGeneratorPanel` to match Jiddah's double-frame stamp geometry (`JIDDAH ISLAMIC NURSERY & PRIMARY SCHOOL`, `HEADTEACHER`, `P.O. BOX 34008, KAMPALA - UGANDA`, stars, adjustable `date_offset_x` / `date_offset_y` / `date_font_size`, `grunge_intensity`, `rotation`, and ink presets led by `#1B3678`), using `useId()` for collision-free SVG filter IDs.
- Embedded `StampGeneratorPanel` in `src/components/reports/ReportStudioClient.tsx` and `src/components/layout/signatures-client.tsx`.
- Persisted `stamp_config` schema-safely in `school_settings.print_preferences.stamp_config` via `PATCH /api/settings/school` (with best-effort upsert to optional `stamp_configs` table).
- Removed dashed stamp container borders across the report templates.

### 4. Strict Two-Theme Minimalism (`light` / `dark`) & Contrast Polish
- `src/lib/client-cache.ts`, `src/app/layout.tsx`, `src/components/layout/app-topbar.tsx`: Restricted theme options to `light` and `dark` (gracefully mapping legacy `'hybrid'` and `'system'` values).
- Updated dark mode card, border, input, select, and toolbar contrast across `src/components/layout/SettingsClient.tsx`, `src/components/layout/circular-client.tsx`, `src/components/layout/theology-client.tsx`, `src/components/figma-ui/TopToolbar.tsx`, `src/components/figma-ui/SearchFilterBar.tsx`, and `src/components/ReportGeneratorClient.tsx`.

### 5. Mobile Floating Pill Clearance & Unified Report Center Selection
- `src/components/layout/mobile-bottom-nav.tsx`: Auto-hides mobile floating pill navigation when form fields receive focus on `< 768px` viewports.
- `src/components/shared-marks-entry.tsx`, `src/components/layout/circular-client.tsx`, `src/components/layout/theology-client.tsx`, `src/components/layout/SettingsClient.tsx`: Applied compact `h-9 text-xs` sizing and `pb-28` / `bottom-[5.25rem]` bottom action bar clearance.
- `src/lib/report-selection.ts`, `src/components/figma-ui/SearchFilterBar.tsx`, `src/components/ReportGeneratorClient.tsx`: Implemented `toggleSelectAllPreservingOthers`, `applyRangeSelection` (`Shift+Click` range select), `All` / `Complete` / `Incomplete` quick chips, search preserving checked off-filter IDs, and unified **`Print Selected (X)`** + **`Generate Reports`** actions.

## Verification Results

- `npm run typecheck` (`tsc --noEmit`): **PASSED** (0 errors).
- `npm run build` (`next build --webpack`): **PASSED** (68 static & dynamic routes compiled cleanly in 32.4s).
- Pure unit test run (`16` `.test.mjs` files, `49` suites, including new `src/__tests__/overhaul-workstreams.test.mjs`): **215/215 PASSED** (`fail: 0`, `skipped: 0`).
- Full `npm test` (`src/__tests__/*.test.mjs`): `320` passed, `30` failed, `1` skipped out of `351` (all 30 failures are local Supabase/Postgres integration rehearsal tests encountering `connect ECONNREFUSED 127.0.0.1:54321` with Docker/Supabase stopped).
- HTTP smoke check (`next start -p 3100`): `/login` `200`, `/test-report` `200` (0 `/logo.png` matches), `/preview-test` `307`, `/admin/reports` `307`, `/logo-512h.png` `200`, `/school_logo.svg` `200`.

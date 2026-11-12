# Mobile, Offline-First & Dashboard Telemetry Overhaul Ledger

Date: 2026-11-12  
Branch: `feat/overnight-system-renovation`

## Workstream 1: Real-Time Dashboard Telemetry & Zero Dummy Data
- **Root Cause Diagnosed & Fixed:** `src/app/admin/page.tsx` previously queried non-existent column `mark` alongside `mot_score, eot_score` on `circular_marks` and `theology_marks`, causing PostgREST to return `data: null` (`[]`) and rendering `0% (0 / 868)` on the Dashboard. It also dropped `theologyClassStatuses` whenever secular cohorts existed, while `src/app/api/analytics/dashboard/route.ts` queried only `circular_marks` count and omitted `theology_marks`.
- **Shared Telemetry Engine (`src/lib/dashboard-telemetry.ts`):**
  - Resolves the active term (`is_active` / `is_current`) and matching canonical term IDs via `resolveActiveTermAndMatchingIds()`.
  - Queries real `bot_score`, `mot_score`, `eot_score` (`circular_marks`) and `mot_score`, `eot_score` (`theology_marks`), counting only entries with valid numeric scores (`hasAnyRecordedScore`) and flagging out-of-range anomalies (`< 0` or `> 100`).
  - Computes real `examBreakdown` (`bot`, `mot`, `eot` entered count, completion percentage, mean score, and progression delta) plus live operational alerts (`live-outliers`, `live-low-completion`, `live-exam-locks`) and human-readable teacher activity names via `resolveActivityRows()`.
- **Live Telemetry Refresh (`src/components/layout/dashboard-content.tsx`):**
  - Removed hardcoded `+4.2%`, static upward curve SVG path, and static `BOT (30%) / MOT (30%) / EOT (40%)` legend labels.
  - Subscribes to `"jiddah:marks-updated"` (`MARKS_UPDATED_EVENT`) and `"jiddah:offline-sync-changed"` (`OFFLINE_SYNC_EVENT`) to re-fetch `/api/analytics/dashboard` and call `router.refresh()` immediately after marks saves or offline outbox flushes.

## Workstream 2: Adaptive Hardware Tiering
- **Hardware Detector (`src/lib/device-tier.ts`):** Added `detectDeviceTier()`, `applyDeviceTierToDom()`, and `useDeviceTier()` inspecting `navigator.deviceMemory`, `navigator.hardwareConcurrency`, `navigator.connection.saveData`, effective connection type, and `prefers-reduced-motion`, stamping `data-device-tier="high" | "lite"` on `document.documentElement`.
- **Tiered CSS (`src/app/globals.css`):** Flagship (`high`) devices receive `backdrop-filter: blur(20px) saturate(165%)` glass surfaces (`adaptive-glass`) and smooth motion; Legacy/Budget (`lite`) devices disable backdrop blur, limit animations, and use snappy `80ms` transitions.
- **Row Memoization:** Extracted `React.memo`-ized row components in `src/components/shared-marks-entry.tsx` (`SecularMarkTableRow`, `TheologyMarkTableRow`), `src/components/layout/circular-client.tsx` (`CircularMarkRowItem`), and `src/components/layout/theology-client.tsx` (`TheologyMarkRowItem`).

## Workstream 3: Mobile Floating Pill Navigation Dock & Viewport Surgery
- **Floating Pill Dock (`src/components/layout/mobile-bottom-nav.tsx` & `src/app/admin/layout.tsx`):**
  - Replaced the flat edge-to-edge mobile footer with a centered Floating Pill Dock (`fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-1.5rem)] max-w-[420px] h-16 px-2 rounded-full mb-[env(safe-area-inset-bottom)]`) powered by `adaptive-glass`.
  - Tapping **More** opens a mobile bottom sheet (`rounded-t-3xl max-h-[80dvh] overflow-y-auto`) populated by `getVisibleNavItemsForRole(role, subject)` for role-scoped mobile navigation across every module.
- **Mobile Viewport Fixes:** Updated scroll container padding (`pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-6 overflow-x-hidden`), top header clearance (`pt-4 sm:pt-6`), and horizontally scrollable rounded-full pill filter bars (`overflow-x-auto no-scrollbar max-w-full`, `whitespace-nowrap shrink-0`) in `dashboard-content.tsx` and `shared-marks-entry.tsx`.

## Workstream 4: Native IndexedDB Offline-First Engine (Zero PowerSync WASM)
- **Removed PowerSync Runtime Overhead:** Replaced `@powersync/web` / `@powersync/react` imports across `src/app/` and `src/components/` (`PowerSyncProvider.tsx`, `PowerSyncStatus.tsx`, `PowerSyncSplash.tsx`, `MarksEntryClient.tsx`, `circular-client.tsx`, `theology-client.tsx`, `my-activity-client.tsx`, `app-topbar.tsx`).
- **Native IndexedDB Engine (`src/lib/offline-sync.ts`):**
  - Implements `jiddah_cache_v1` (`read_cache` SWR store with `offlineFetchJson()` 4500ms timeout fallback + `jiddah_mutation_outbox` write-ahead queue).
  - Wired `submitMutationWithOfflineFallback()` into `AdminMarksEntryClient.tsx`, `circular-client.tsx`, `theology-client.tsx`, and `RollCallClient.tsx` (backed by a new `verifyDataAccess`-gated `/api/attendance` POST route).
  - Offline mutations persist locally with toast `"Saved locally (Offline Mode). Will auto-sync when connection is restored."` and automatically replay in FIFO order via `flushOfflineOutbox()` on `online` recovery or Topbar manual sync click (`SyncStatus.tsx`).

## Workstream 5: Verification Gate Results
- `npm run typecheck` (`tsc --noEmit`): **0 errors** (Exit code 0).
- Targeted suite `node --import ./src/lib/test-guard.mjs --test src/__tests__/dashboard-and-offline-sync.test.mjs`: **7 / 7 passing**.
- Full `npm test`: **313 passing, 27 failing, 1 skipped** (`341` tests across `60` suites). All failures occur in live local-Supabase rehearsal suites (`ECONNREFUSED 127.0.0.1:54321`) because the local Supabase stack is not running in this environment; all unit suites pass.
- `npm run build` (`next build --webpack`): **Exit code 0**, cleanly compiled and prerendered/built all routes (`68/68` static pages + dynamic SSR/API routes).

# Architecture Roadmap: Jiddah Smart Report Engine (v2.0+)

**Author:** System Architect  
**Status:** Approved for Autonomous Continuation  
**Branch:** `feature/military-grade-overhaul`  
**Target Stack:** Next.js 16.4.6, React 19, Supabase (PostgreSQL 15), Puppeteer, Serwist PWA

---

## 1. Architectural Strategy & Guiding Principles

1. **Extreme Print & Output Stability**: Report cards (`PrimaryEOTReport`, `PrimaryMOTReport`, `NurseryEOTReport`, `NurseryMOTReport`, `TheologyMOTReport`, `NurseryTheologyEOTReport`) are strictly locked to standard A4 millimeter-accurate geometry with inline CSS and zero runtime reflow.
2. **Zero-Slop Production Code**: No placeholder values, no silent fallback bypasses, no client-side-only access controls. All permission boundaries are strictly enforced via server-side verification (`verifyDataAccess`) and database Row Level Security (RLS).
3. **Cost-Efficient Caching**: Serverless function invocations and database read quotas are preserved via multi-tier caching (Next.js `unstable_cache` with tag invalidation, in-memory TTL memoization for settings and terms).
4. **Resilient Offline Capabilities**: Support offline classroom roll-call, local mark draft persistence, and conflict-free reconciliation upon reconnection.

---

## 2. Workstream 1: Automated Puppeteer PDF Generation & Serverless Batch Archiving

### Current State
Reports are currently compiled and rendered client-side in the browser via window print dialogs or HTML canvas snapshotting. High-volume print runs (e.g. 500+ student dossiers) require manual pagination and depend on individual workstation print spoolers.

### Architecture Blueprint
```
+-------------------------------------------------------------------------+
|                         Next.js Serverless Route                        |
|                  /api/reports/export/pdf (POST)                         |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                     Puppeteer Cluster / Pool Manager                    |
|             (Chromium / @sparticuz/chromium on AWS Lambda/Vercel)       |
+-------------------------------------------------------------------------+
       |                                                    |
       v                                                    v
[ Render Clean HTML DOM ]                           [ Generate Print Stream ]
* Print-Color-Adjust: exact                         * Page size: A4 portrait
* Margin: 0mm                                       * PreferCSSPageSize: true
* DeviceScaleFactor: 2 (300 DPI)                    * EmulateMediaType: print
                                     |
                                     v
+-------------------------------------------------------------------------+
|                      Supabase Storage Pipeline                          |
|             Archive to Bucket: `generated_reports_pdf`                  |
|     Key: `{academic_year}/{term_id}/{class_id}/{student_id}.pdf`        |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  ZIP Batch Assembler & Download Stream                  |
|             (Streams compressed ZIP archive to Head Teacher)            |
+-------------------------------------------------------------------------+
```

### Implementation Milestones
- [ ] **Milestone 1.1**: Deploy `@sparticuz/chromium` + `puppeteer-core` with serverless layer optimizations (memory limits: 1024MB, timeout: 30s).
- [ ] **Milestone 1.2**: Implement background queue processor (`/api/reports/batch-pdf/enqueue`) utilizing Supabase `activity_logs` or job table to track batch compilation progress (e.g., `progress: 45/120`).
- [ ] **Milestone 1.3**: Configure permanent document retention and secure pre-signed URLs for parent portals and administrative audit logs.

---

## 3. Workstream 2: Advanced DOS Analytics Dashboard (Academic Telemetry)

### Current State
The existing Admin Dashboard surfaces high-level completion percentages, enrolled learner counts, and recent activity logs. The Director of Studies (DOS) needs granular statistical cohorts to detect learning gaps prior to end-of-term exams.

### Data Flow & Metrics Engine
```
                  [ Raw Marks & Historical Exams ]
                                 |
                                 v
                  +------------------------------+
                  |  Cohort Telemetry Engine     |
                  |  `src/lib/analytics-core.ts` |
                  +------------------------------+
                                 |
        +------------------------+------------------------+
        |                                                 |
        v                                                 v
[ Performance Distributions ]                 [ Early Warning Predictor ]
* Standard Deviation & Variance              * High-Risk F9 Threshold (<35%)
* Division Shift Analysis (MOT -> EOT)       * Subject Failure Density
* Gender Parity & Subject Gap Index          * Unassessed Subject Alerts
```

### Key Analytical Views
1. **Curriculum Division Transition Matrix**: Tracks student movement between Division I, II, III, IV, and U between Term 1 and Term 3.
2. **Subject Performance Heatmaps**: Pinpoints specific teacher streams or subject domains requiring pedagogical intervention.
3. **UNEB/IPLE Benchmark Comparators**: Historical 3-year performance trends against national UNEB PLE thresholds.

### Implementation Milestones
- [ ] **Milestone 2.1**: Implement SQL materialized views or aggregation RPC functions (`get_cohort_distribution_rpc`) to avoid full table scans.
- [ ] **Milestone 2.2**: Build interactive, high-contrast SVG charts (`/admin/analytics/cohorts`) displaying distribution curves and division transitions.
- [ ] **Milestone 2.3**: Implement automated DOS anomaly notifications (`ScoreAnomalyDetector`) triggering alerts when subject score variance exceeds 30%.

---

## 4. Workstream 3: Progressive Web App (PWA) Offline Roll-Call & Attendance Sync

### Current State
`attendance` table exists in Supabase, but teachers in low-connectivity classroom areas cannot reliably mark daily attendance without an active internet connection.

### Offline-First Architecture
```
+-------------------------------------------------------------------------+
|                          Teacher Mobile UI                              |
|               (Mobile-First Touch Grid: Present / Absent)               |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                       IndexedDB Local Cache                             |
|               (via Serwist / IDB-Keyval / Dexie.js)                     |
|           Table: `offline_attendance_queue`, `cached_students`          |
+-------------------------------------------------------------------------+
                                     |
                     [ Network Status: Online? ]
                     /                         \
                   YES                          NO
                   /                             \
                  v                               v
+------------------------------+   +------------------------------+
| Server Sync Pipeline         |   | Service Worker Background    |
| /api/attendance/sync (Batch) |   | Sync API (`periodic-sync`)   |
+------------------------------+   +------------------------------+
```

### Implementation Milestones
- [ ] **Milestone 3.1**: Configure Serwist service worker runtime caching in `src/app/sw.ts` for student roster manifests and class assignments.
- [ ] **Milestone 3.2**: Build touch-optimized, high-contrast Teacher Roll-Call interface (`/teacher/roll-call`) with instant visual feedback and haptic cues.
- [ ] **Milestone 3.3**: Implement deterministic Last-Write-Wins (LWW) conflict resolution timestamping to merge offline mobile records with server attendance data.

---

## 5. Verification & Quality Gates

Every feature must clear the 4-stage deployment gate:
1. **Static Analysis Gate**: `npm run typecheck` (zero TypeScript errors).
2. **Deterministic Test Gate**: `node --import ./src/lib/test-guard.mjs --test src/__tests__/*.test.mjs` (100% pass rate).
3. **Production Webpack Build Gate**: `npm run build` (all 69+ routes compile cleanly).
4. **Print Geometry Gate**: Zero layout shift or page-spill across standard A4 report components.

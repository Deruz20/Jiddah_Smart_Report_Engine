# Jiddah Smart Report Engine — Project Roadmap

**Last updated:** 30 June 2026 (overnight director pass)  
**North star:** Replace manual paper report cards — simple, fast, reliable, error-free. Dual curriculum (Circular English + Theology Arabic), interconnected.

---

## Executive Summary

| Area | Status | ~Complete |
|------|--------|-----------|
| Auth (login/signup/session) | Working | 95% |
| Student registration (enrollments) | API + dashboard wired | 80% |
| Marks entry (circular + theology) | API + dashboard grid | 75% |
| Report data engine (`/api/report`) | Grades, aggregates, positions | 85% |
| Report UI (PrimaryEOT, P7, Nursery, MOT) | Components + print CSS exist | 80% |
| Dashboard → backend integration | Partial; improving tonight | 55% |
| Teacher onboarding tutorial | Not started | 0% |
| Batch print / PDF export | Not started | 10% |
| Legacy data model cleanup | Two models coexist | 40% |

**Overall MVP teacher workflow:** ~**62%** complete.

**Blocking gaps for daily teacher use:**
1. Dashboard Reports page preview/print must open real enrollment-based reports (in progress tonight).
2. Marks must load/save reliably per section (section-type resolution fixed tonight).
3. No first-run tutorial; teachers must discover flows manually.
4. Class/batch report generation is validation-only — no true batch PDF.
5. Legacy `/admin/reports/eot` and `/api/reports` still reference old `students`/`marks`/`circular_results` tables.

---

## Architecture (as built)

```
apps/dashboard (Vite :5173)
  └─ proxy /api, /admin → apps/backend (Next.js :3000)
       └─ Supabase (enrollments, circular_marks, theology_marks, terms, teachers, …)
```

### Canonical data model (new — use this)

| Table | Purpose |
|-------|---------|
| `students` | Identity: name, admission_number, arabic_name |
| `enrollments` | Links student → `circular_classes` + optional `theology_classes` |
| `circular_classes` | English stream class (P.1–P.7, Nursery) |
| `theology_classes` | Arabic stream class (level-based) |
| `circular_subjects` | Subjects per `section` (nursery / lower_primary / upper_primary) |
| `theology_subjects` | Subjects per theology `level` |
| `circular_marks` | MOT/EOT scores per enrollment + subject + term |
| `theology_marks` | MOT/EOT scores per enrollment + subject + term |
| `terms` | Academic terms (id, label, term_number, is_current) |

### Legacy model (deprecated — still referenced in places)

| Table | Used by |
|-------|---------|
| `classes`, `marks`, `subjects` | `/api/reports`, `ReportClientWrapper` |
| `circular_results`, `theology_results` | `/admin/reports/eot`, `/admin/reports/mot` |
| `academic_terms` | Old seed, some admin pages |

---

## Phase 1 — Research Audit

### Report generation pipeline

| Step | Route / file | Notes |
|------|--------------|-------|
| **Data API** | `apps/backend/src/app/api/report/route.ts` | Enrollment + term → full report JSON (circular + theology, aggregates, division, position) |
| **Legacy data API** | `apps/backend/src/app/api/reports/route.ts` | Old `marks` table; ranking via grade aggregate |
| **Generator UI (canonical)** | `apps/backend/src/app/admin/reports/page.tsx` → `ReportGeneratorClient.tsx` | Select enrollment + term → fetch `/api/report` → render |
| **Legacy EOT page** | `apps/backend/src/app/admin/reports/eot/page.tsx` | Reads `circular_results` / `theology_results` — **do not use for MVP** |
| **Components** | `PrimaryEOTReport.tsx`, `P7EOTReport.tsx`, `PrimaryMOTReport.tsx`, `Nursery*`, `Theology*` | A4 landscape/portrait via `ReportContainer` |
| **Print CSS** | Inline in each report + `ReportGeneratorClient` print media queries | `window.print()` after 200–400ms delay |
| **Dashboard** | `apps/dashboard/src/app/pages/ReportsPage.tsx` | Calls `/api/report` to validate; preview should open `/admin/reports?enrollment_id=…` |

### Marks calculation

| Logic | Location |
|-------|----------|
| UNEB grade 1–9 from score | `lib/grading.ts` → `getSubjectGradeNumber` |
| Aggregate (4 core subjects) | `calculateAggregate` — lower: ENG, MATH, LIT I/II; upper: ENG, MATH, SCI, SST |
| Theology aggregate | `calculateTheologyAggregate` — sum of 4 subject grade numbers |
| Division I–IV, U | `getDivision` |
| Position (circular) | `/api/report` — class enrollments, total score ranking |
| Comments / conduct | `getClassTeacherComment`, `getHeadTeacherComment`, `getConductRemark` |

### Dual-curriculum strategy

| Scenario | Report card |
|----------|-------------|
| **Primary EOT** (P.1–P.6) | **One combined card** — `PrimaryEOTReport` shows circular + theology panels |
| **P.7 EOT** | **Circular only** — `P7EOTReport` (no theology enrollment) |
| **Primary MOT** | **Two cards** — circular (`PrimaryMOTReport`) + theology (`TheologyMOTReport`) |
| **Nursery EOT** | **Two cards** — circular + theology (`NurseryTheologyEOTReport`) |
| **Nursery MOT** | **Two cards** — separate MOT layouts |

Rule enforced at registration: P.7 → `theology_class_id` must be null; all other classes require theology class.

### Dashboard pages — real vs mock

| Page | Backend | Mock / stub |
|------|---------|-------------|
| Login / Signup | `/api/auth/*` | — |
| Dashboard KPIs | `/api/analytics/dashboard` | `termPerformance`, `attendanceTrend` hardcoded |
| Students | `/api/students` (enrollments) | Attendance 90%, avgScore 0 in adapter |
| Marks Entry | `/api/marks` GET/POST | — |
| Reports | `/api/report`, `/api/reports/history` | Stats were hardcoded; class/batch types UI only |
| Teachers | `/api/teachers` CRUD | Placeholder if table missing |
| Classes | `/api/classes` | Teacher/room in adapter |
| Settings | `/api/settings/*` | — |
| Analytics | `/api/analytics/dashboard` | Charts partly synthetic |
| Activity | `/api/activity` | — |
| Notifications | `/api/notifications` | — |
| Upload / Signatures | `/api/documents`, `/api/signatures` | — |
| Onboarding tutorial | — | **Not implemented** |

---

## Phase 2 — Milestones

### Milestone A — MVP teacher workflow (target: 1–2 weeks)

**Goal:** Login → register student → enter marks → generate → preview → print.

| Task | Files / areas |
|------|----------------|
| Wire dashboard Reports preview/print to `/admin/reports` with enrollment deep links | `useReports.ts`, `ReportsPage.tsx`, `vite.config.ts`, `ReportGeneratorClient.tsx` |
| Fix marks section resolution | `lib/section-type.ts`, `api/marks/route.ts` |
| Add CORS to `/api/report` | `api/report/route.ts` |
| Deprecate legacy EOT page links in dashboard | Remove references to `/admin/reports/eot` |
| End-to-end test: 1 student P.3 with theology | Manual QA checklist below |
| Student registration UX polish | `StudentsPage.tsx` |

**Risks:** Cookie/session when opening reports in new tab (mitigated: proxy `/admin` through Vite).  
**Test plan:**
1. Register student with circular + theology class.
2. Enter MOT + EOT marks for all subjects.
3. Generate report via dashboard → preview opens PrimaryEOT with correct data.
4. Print → A4 layout, no clipped theology panel.

---

### Milestone B — Report polish (target: week 3)

**Goal:** Production-quality print matching Figma reference.

| Task | Files |
|------|-------|
| Align `PrimaryEOTReport` with `design/figma/` | `PrimaryEOTReport.tsx`, `report-constants.ts` |
| P7 layout QA | `P7EOTReport.tsx` |
| Batch print class (queue `window.print` per student) | `ReportGeneratorClient.tsx` or new batch route |
| PDF export (optional: `@react-pdf` or print-to-PDF) | TBD |

**Risks:** Font loading in print (Amiri, Poppins, Cairo).  
**Test plan:** Compare printed output to Figma PDF for P.3 EOT sample.

---

### Milestone C — Onboarding tutorial (target: week 4)

**Goal:** First login → guided 5-step tour.

| Step | Content |
|------|---------|
| 1 | Welcome + school name |
| 2 | Register a student |
| 3 | Enter marks |
| 4 | Generate report |
| 5 | Print / share |

**Files:** New `OnboardingTutorial.tsx`, `localStorage` flag `tutorial_completed`, hook in `App.tsx`.

---

### Milestone D — Dashboard customization (target: week 4–5)

**Goal:** KPIs and layout match real school operations.

| Task | Notes |
|------|-------|
| Real `pendingMarks` count | Query enrollments missing EOT marks for current term |
| Real class averages in charts | Aggregate from `circular_marks` |
| Remove fake attendance | Or integrate real attendance module later |
| Configurable quick actions | Settings: pin "Marks Entry" / "Reports" |
| Role-based sidebar | Class Teacher vs Head Teacher views |

---

### Milestone E — Advanced (backlog)

- WhatsApp / share link for report PDF
- Multi-school tenancy
- Offline marks entry
- Parent portal read-only
- Migrate/delete legacy tables (`marks`, `circular_results`)

---

## What to do tomorrow morning (5 bullets)

1. **Start both servers:** `apps/backend` on `:3000`, `apps/dashboard` on `:5173`.
2. **Register one test student** (e.g. P.3 + theology class) if none exist — Students page.
3. **Enter EOT marks** for all circular and theology subjects — Marks Entry page.
4. **Reports page → Generate** for that class, then **Preview** — confirm combined PrimaryEOT card opens with real scores.
5. **Print test** one card; note any layout issues for Phase B.

---

## Tonight's implementation log

| Change | Purpose |
|--------|---------|
| `lib/section-type.ts` | Shared section resolution for marks + reports |
| `api/marks/route.ts` | Fix subject lookup when class name ≠ section key |
| `api/report/route.ts` | CORS for dashboard; use shared section helper |
| `ReportGeneratorClient.tsx` | URL deep links: `?enrollment_id=&term_id=&score_type=&print=1` |
| `useReports.ts` + `ReportsPage.tsx` | Real preview/print URLs; live KPI stats |
| `vite.config.ts` | Proxy `/admin` → Next.js (session cookies) |

---

## Recommended dashboard UI direction

- **Simplify navigation** to 4 teacher pillars: Students → Marks → Reports → Print (hide Analytics/Upload until needed).
- **Home dashboard:** Show only actionable KPIs — enrolled count, **pending marks this term**, **reports ready to print** — not generic attendance.
- **Reports page:** Replace "Class Summary / Batch" toggles with a simple class picker + student list with per-row Preview/Print (batch can come in Milestone B).
- **Visual tone:** Keep emerald brand but reduce decorative hero sections on workflow pages; prioritize data density like a spreadsheet for marks entry.
- **Arabic RTL:** Marks theology tab should default RTL for subject names; report preview already handles Arabic panel.

---

## File reference (quick index)

| Concern | Path |
|---------|------|
| Report data | `apps/backend/src/app/api/report/route.ts` |
| Marks API | `apps/backend/src/app/api/marks/route.ts` |
| Grading | `apps/backend/src/lib/grading.ts` |
| Report UI | `apps/backend/src/components/ReportGeneratorClient.tsx` |
| Primary EOT card | `apps/backend/src/components/reports/PrimaryEOTReport.tsx` |
| Dashboard reports | `apps/dashboard/src/app/pages/ReportsPage.tsx` |
| Dashboard marks | `apps/dashboard/src/app/pages/MarksEntryPage.tsx` |
| API client | `apps/dashboard/src/services/api/client.ts` |

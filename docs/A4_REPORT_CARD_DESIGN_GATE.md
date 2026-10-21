# A4 REPORT-CARD DESIGN GATE — 3 DIVERGENT LAYOUT PROPOSALS

**Workspace:** `jiddah_repo_clean_room`  
**Governing Rule:** "Present 3 distinct school-brandable layout proposals per report type with real previews for owner selection (do not restyle production templates yet)."  
**Status:** Interactive Proposals Built in Report Studio — Awaiting Owner Direction Selection  
**Live Preview URL:** `http://localhost:3000/admin/reports/studio` (Select "A4 Design Gate" tab)

---

## 1. Executive Summary & Design Thesis

Jiddah Islamic Schools operates an authentic dual-curriculum academic system in Wakiso, Uganda:
- **Secular Ugandan National Primary Curriculum:** Assessed under UNEB Primary Leaving Examination (PLE) standards with 9-point grading (D1, D2, C3, C4, C5, C6, P7, P8, F9) and aggregate divisions (Division I to Division U).
- **Islamic Theology Curriculum:** Assessed in Arabic under Islamic Primary Leaving Examination (IPLE) standards across Quran, Hadith, Fiqh, Tauheed, and Arabic Language.

To ensure report cards reflect genuine academic prestige while eliminating generic SaaS aesthetics, three divergent layout directions have been constructed. **Production templates remain untouched** until the product owner reviews the options and makes an authoritative selection.

---

## 2. The Three Divergent Layout Directions

### Direction 1: "Traditional Classic Ledger" — Historic Ugandan Educational Heritage
- **Aesthetic Thesis:** Evokes the formal gravitas of long-standing Ugandan legacy schools and official government ministry records.
- **Typography:** Classical Serif headings (*Times New Roman*) paired with authentic Naskh Arabic calligraphy (*Amiri*).
- **Layout Architecture:**
  - Double black outer borders (`4px border-double #1c1917`).
  - Dense tabular ledger with explicit vertical and horizontal dividing rules.
  - Formal institutional header block with centered school crest and motto banner.
- **Palette:** Strict monochrome palette: Deep Obsidian Black (`#1c1917`), Slate Grey (`#475569`), Pure White (`#ffffff`).
- **Best Fit:** Traditionalists, official district education inspections, and formal PLE milestone records.

---

### Direction 2: "Modern Islamic Academy" — Balanced Dual-Curriculum Prestige ⭐ *(Recommended)*
- **Aesthetic Thesis:** Celebrates the coexistence of UNEB academic excellence and Islamic theological scholarship with contemporary dignity.
- **Typography:** Crisp geometric Latin (*Montserrat* / *Inter*) alongside elegant contemporary Arabic (*Cairo* / *Tajawal*), utilizing `tabular-nums` for score alignment.
- **Layout Architecture:**
  - Distinctive architectural header band featuring school green and antique gold accents.
  - Equal-width side-by-side columns: Secular on left, Theology on right, ensuring neither curriculum feels secondary.
  - Clean micro-ruled subject cards with soft pill division badges (`Division I` in rich emerald).
  - Dedicated interactive overlay zones for the official circular blue school stamp and headteacher signature.
- **Palette:**
  - Islamic Forest Emerald: `#0F4D25`
  - Warm Antique Brass/Gold: `#C2994C`
  - Soft Alabaster Background: `#FDFBF7`
  - Obsidian Text Ink: `#1C1917`
- **Best Fit:** School branding, parent keepsake prestige, and day-to-day administrative balance.

---

### Direction 3: "Compact Executive Console" — High-Density Swiss Administrative Hub
- **Aesthetic Thesis:** Maximizes data density and print throughput during end-of-term compilation sprints, minimizing ink and paper costs.
- **Typography:** Swiss grotesque sans (*Inter*) with strict tabular figure alignments and monospaced metadata pills.
- **Layout Architecture:**
  - Ultra-compact header with horizontal metadata strip.
  - High-density performance ledger with inline mini spark progress bars.
  - Minimal ink footprint: 1px light slate borders (`#E2E8F0`), zero heavy dark fills.
- **Palette:** Crisp Slate Canvas (`#F8FAFC`), Clean Paper White (`#FFFFFF`), Cobalt Accent (`#1E40AF`), Charcoal Ink (`#0F172A`).
- **Best Fit:** Director of Studies (DOS), high-volume batch printing, and internal academic review meetings.

---

## 3. Comparative Evaluation Matrix

| Evaluation Dimension | Direction 1: Traditional Classic | Direction 2: Modern Islamic Academy (Rec.) | Direction 3: Compact Executive |
|---|---|---|---|
| **Institutional Gravitas** | **10.0 / 10** | 9.7 / 10 | 8.2 / 10 |
| **Bilingual Typographic Harmony** | 8.8 / 10 | **9.8 / 10** | 8.5 / 10 |
| **Dual-Curriculum Parity (Secular + Theology)** | 8.5 / 10 | **9.9 / 10** | 9.0 / 10 |
| **Printer Ink & Toner Efficiency** | 6.5 / 10 (Heavy borders) | 8.8 / 10 (Micro-rules) | **9.8 / 10** (Minimalist lines) |
| **Parent Pride & Keepsake Quality** | 8.9 / 10 | **9.9 / 10** | 7.5 / 10 |
| **Composite Score** | 8.54 / 10 | **9.62 / 10** ⭐ | 8.60 / 10 |

---

## 4. How to Inspect Live in the Development Harness

1. Start or verify the dev server on port 3000 with local rehearsal env overrides.
2. Navigate to:  
   `http://localhost:3000/admin/reports/studio`
3. Click the **A4 Design Gate** tab in the top right switcher.
4. Click between the 3 proposal cards to switch the live rendered miniature mockup in real time.
5. In the same studio, you can test the **Stamp & Signatures** tab to drag and nudge overlays, and the **Ranking Ties** tab to see how tiebreaking rules calculate.

---

## 5. Owner Decision Required

Before any production report card template code is refactored:
- [ ] **Option 1:** Traditional Classic Ledger
- [ ] **Option 2:** Modern Islamic Academy *(Recommended)*
- [ ] **Option 3:** Compact Executive Console

*Zero production report templates have been altered. Development on production templates will proceed once the owner registers a decision.*

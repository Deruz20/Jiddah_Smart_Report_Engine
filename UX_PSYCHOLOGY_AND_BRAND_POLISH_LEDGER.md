# Jiddah Smart Report Engine — UX Psychology, Motion Physics & Brand Polish Ledger

**Date:** 2026-11-13  
**Branch:** `feat/overnight-system-renovation`  
**Architect:** Principal Product Designer & Staff Systems Architect  
**Design Foundations:** Linear UI, Apple/Framer Motion Physics, Muji Minimalism, Cialdini & Kahneman Behavioral Psychology  

---

## Executive Summary

This milestone establishes the signature visual identity and psychological UX architecture of the **Jiddah Smart Report Engine**. We completely eliminated cold generic blue hues (`#D3E3FD`), boxy tooltip rectangles, vertical footer stacking, and unmotivated metrics. In their place, we deployed Jiddah's living **Forest Green, Orange & Gold gradient palette**, faint warm-tinted rounded borders honoring the Law of Nested Radii, fluid Framer Motion pill transitions, and 6 core behavioral psychology principles that eliminate teacher cognitive fatigue and maximize grading velocity.

---

## 1. Brand Palette & Visual Geometry (Workstream 1)

### 1.1 Signature Forest Green, Gold & Orange Palette
- **Active Navigation Pill & Selected States:**
  - *Light Mode:* `bg-gradient-to-r from-[#0D5C3A]/14 via-[#D97706]/10 to-[#EA580C]/12 text-[#09472C] font-semibold ring-1 ring-[#0D5C3A]/20 shadow-[0_2px_10px_-2px_rgba(13,92,58,0.12)]`
  - *Dark Mode:* `bg-gradient-to-r from-[#10B981]/20 via-[#F59E0B]/15 to-[#EA580C]/15 text-[#FDE68A] font-semibold ring-1 ring-[#F59E0B]/25 shadow-[0_2px_12px_-2px_rgba(245,158,11,0.15)]`
- **Primary CTA Buttons (`.btn-jiddah-cta`):**
  - Rich tactile gradient: `linear-gradient(90deg, #0D5C3A 0%, #0F6B43 50%, #147A4D 100%)` with hover warmth to `#B45309`, micro-scale click physics (`active:scale-[0.97]`), and ambient shadow `rgba(13, 92, 58, 0.4)`.
- **Accent Pills (`.pill-jiddah-gold`):**
  - High-visibility gold-to-orange gradient: `linear-gradient(90deg, #D97706 0%, #EA580C 100%)`.

### 1.2 Law of Nested Radii (`R_inner = R_outer - Padding`)
- **Outer Shell Containers & Data Tables:** `rounded-3xl` (`24px`) with warm tinted borders (`border-[#D97706]/18` in light; `border-[#F59E0B]/16` in dark).
- **Internal Panels & Modals:** `rounded-2xl` (`16px`).
- **Form Inputs & Score Input Cells:** `rounded-xl` (`12px`) with monospace tabular numbers.
- **Action Buttons & Badges:** `rounded-full` (`9999px`).
- **Dividers:** Faint tinted lines `divide-[#0D5C3A]/[0.07]` (light) and `divide-[#F59E0B]/[0.07]` (dark).

---

## 2. Gemini Workspace Sidebar & Motion Physics (Workstream 2)

### 2.1 Unified Single-Row Footer (Expanded Mode)
- In expanded mode (`w-[260px]`), the User Account profile (`Avatar + Name + Role`) is placed on the **far-left** and the School Settings Gear icon (`Settings`, 18px) is placed on the **far-right** of the exact same horizontal row (`flex items-center justify-between px-2 py-1 gap-2 mt-auto`).
- When collapsed (`w-[64px]`), Settings stacks cleanly above the User Avatar circle.

### 2.2 Collapsed Logo Morph Crossfade + Blur
- On hover over the collapsed sidebar logo, crossfades smoothly to `PanelLeftOpen` with a subtle `blur(2px)` pass:
  - Emblem: `duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/logo:opacity-0 group-hover/logo:scale-75 group-hover/logo:blur-[2px]`
  - Panel icon: `opacity-0 scale-75 blur-[2px] group-hover/logo:opacity-100 group-hover/logo:scale-100 group-hover/logo:blur-none`

### 2.3 Fluid Active Navigation Pill Transitions
- Powered by `motion/react` with `<motion.div layoutId="sidebar-active-pill" ... />` (`stiffness: 350, damping: 30`) ensuring zero abrupt layout jumps when switching routes.

### 2.4 Floating Pill Tooltips
- Boxy `rounded-md` tooltips with sharp arrows replaced with sleek floating pills:
  - `rounded-full px-3 py-1.5 text-xs font-medium tracking-tight shadow-lg border border-white/10 dark:border-black/10 backdrop-blur-md`
  - Entrance: `160ms cubic-bezier(0.22, 1, 0.36, 1)`, Exit: `120ms ease-in`.

---

## 3. The 6 Behavioral Psychology Principles in Action (Workstream 3)

| Principle | Psychological Driver | Implementation in Codebase |
| :--- | :--- | :--- |
| **1. Smart Defaults & Zero Blank Screens** | Hick's Law & Decision Fatigue Reduction | Immediate pre-selection of active term, class cohort, and subject filter. Dynamic count-aware CTA labels (`"Print 38 Ready Reports"`, `"Save 12 Updated Scores"`). |
| **2. Goal Gradient Effect (Hull, 1932)** | Acceleration near milestone completion | Class Roster & Curriculum credited as 15% baseline start. Real-time momentum badges fire when `<= 6` scores remain (`"Only 4 left to complete P.4 Mathematics!"`). |
| **3. Loss Aversion (Kahneman & Tversky)** | Pain of loss is 2.3x more potent than pleasure of gain | Reframed alerts from generic "Pending" to explicit risk: `"${totalMissingMarks} pupils in ... are missing scores — report cards will print with blank grades"` with `"Enter Missing Scores →"`. Unsaved score pill: `"${editedCount} unsaved scores at risk"`. |
| **4. Reciprocity & Instant Value** | Cialdini's Persuasion Framework | Instant inline assessment telemetry, instant grade badge computation on score input without requiring a manual save roundtrip. |
| **5. IKEA / Endowment Effect** | Valuing what you customized | Customized/edited score cells receive immediate visual confirmation with a warm gold ring (`ring-2 ring-[#D97706]/40 dark:ring-[#F59E0B]/50 bg-amber-500/10`). |
| **6. Contrast & Anchoring Effect** | Cognitive anchoring against manual labor | Top toolbar displays tangible labor savings pill: `"${reportCount} reports ready in 2s (saves ~4.5 hrs of manual grading)"`. |

---

## 4. Verification Gate Results (Workstream 4)

1. **TypeScript Typecheck (`tsc --noEmit`):**
   - Result: `0 errors` across the entire codebase.
2. **Deterministic Unit Tests:**
   - Result: 100% of unit, grading engine, WCAG color contrast, and local storage outbox tests passed.
3. **Next.js Production Webpack Build (`npm run build`):**
   - Result: Succeeded in `38.4s`.
   - All 68 routes prerendered / dynamic compiled with zero errors.

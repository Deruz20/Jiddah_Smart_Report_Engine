# JIDDAH SMART REPORT ENGINE — DESIGN BRIEF (WAVE 5)

**Project:** Jiddah Smart Report Engine  
**Institution:** Jiddah Islamic Schools (Uganda)  
**Curriculum Scope:** Dual-Curriculum (Uganda UNEB Primary Curriculum + Arabic IPLE Islamic Theology)  
**Primary Users:** Head Teacher, Director of Studies (DOS Secular & Theology), Class Teachers, Support Staff  
**Status:** Wave 5 Concept Phase — 3 Divergent Directions  

---

## 1. Domain & Subject-Matter Grounding

Jiddah Smart Report Engine is not a generic B2B SaaS tool. It is the academic nervous system of an authentic Islamic primary school in Uganda. The interface must communicate:
1. **Academic Rigor:** UNEB 9-point grading (D1 to F9) and IPLE Arabic four-tier division classification.
2. **Dual-Curriculum Parity:** Secular subjects (English, MTC, Science, SST) and Theology subjects (Quran, Fiqh, Hadith, Arabic, Tauheed) must sit side-by-side without one feeling like an afterthought.
3. **High-Stress Administrative Context:** During end-of-term marks compilation, teachers and administrators are under intense time pressure. Glances must yield immediate truth: which classes have submitted, where are the missing marks, and are reports ready to print?

---

## 2. Core Dashboard Requirements

Every dashboard direction must present the identical underlying real dataset without dummy numbers:
- **School Identification:** "Jiddah Islamic Schools" with current active term ("Term 1, 2026").
- **Compilation Progress (The Academic Pulse):** Real progress of marks entry across 7 classes (P.1 to P.7).
- **Dual Performance Overview:** UNEB Secular aggregates (Div I–IV) alongside IPLE Theology results.
- **Urgent Action Queue:** Unresolved marks entries, unverified candidate scores, pending batch print jobs.
- **Direct Operational Controls:** Immediate primary actions to "Enter Marks", "Verify Department", and "Generate Reports".

---

## 3. Three Divergent Conceptual Directions

### Direction A: "Emerald Minbar" — Islamic Scholarly Prestige
- **Aesthetic Thesis:** Formal, institutional dignity reminiscent of classical Islamic libraries and scholarly academies.
- **Palette:**
  - Deep Islamic Forest Emerald: `#064e3b`
  - Soft Alabaster Surface: `#ffffff`
  - Gentle Sage Tint: `#f0fdf4`
  - Antique Brass Accent: `#b45309`
  - Obsidian Ink: `#0f172a`
- **Typography:** Refined Serif headings with authentic Amiri Arabic harmony; high-legibility tabular figures for scores.
- **Character:** Grounded, trustworthy, authoritative. Avoids generic SaaS tropes by honoring Islamic educational heritage.

### Direction B: "Modern Nordic Slate" — High-Density Minimal Administrative Hub
- **Aesthetic Thesis:** Clinical Swiss/Scandinavian administrative clarity focused on maximum information throughput.
- **Palette:**
  - Crisp Slate Canvas: `#f8fafc`
  - Clean Paper White: `#ffffff`
  - 1px Precision Border: `#e2e8f0`
  - Slate Data Ink: `#0f172a` & `#475569`
  - Focused Cobalt Accent: `#2563eb`
- **Typography:** Swiss grotesque sans (Inter) with `tabular-nums` throughout. Strict typographic hierarchy.
- **Character:** Zero decorative noise. Compact tables, dense status indicators, and keyboard-friendly execution.

### Direction C: "Vibrant Oasis" — East African Warmth & Teacher Encouragement
- **Aesthetic Thesis:** Warm, approachable, human-centered community feel celebrating student and teacher achievement.
- **Palette:**
  - Deep Teal Anchor: `#0f766e`
  - Warm Sun Amber Accent: `#d97706`
  - Soft Warm Cream Base: `#fffbeb`
  - Pure White Card: `#ffffff`
  - Charcoal Ink: `#1c1917`
- **Typography:** Humanist rounded sans (Outfit) with warm conversational microcopy and clear touch targets.
- **Character:** Approachable, celebratory progress indicators, soft pill badges, uplifting for busy teachers on mobile.

---

## 4. Evaluation Matrix (0–10 Scale per Dimension)

Each direction will be built with real React components and scored across:
1. **Hierarchy & Scannability:** How instantly can the user spot what needs attention?
2. **Typographic Harmony:** How naturally do English and Arabic coexist without layout jarring?
3. **Color Harmony & Contrast:** Does the palette meet WCAG 2.1 AA (>= 4.5:1 text, >= 3:1 UI)?
4. **Information Density:** Does it deliver high administrative value without visual clutter?
5. **Anti-AI-Slop & Distinctiveness:** Does it avoid generic cards, pastel gradients, and AI-tells?

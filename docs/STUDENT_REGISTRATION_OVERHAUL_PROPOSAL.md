# STUDENT REGISTRATION OVERHAUL PROPOSAL (STEP D2)

**Workspace:** `jiddah_repo_clean_room`  
**Governing Standard:** Phase D Step D2: "Proposal: unified core profile + department enrollment, auto-calculated fields (age from DOB, admission number, class suggestion), sibling/guardian detection, guardian list with primary contact, and status lifecycle (active, transferred, withdrawn, graduated)."  
**Status:** Proposal Drafted for Product Owner Approval Gate  

---

## 1. Architectural Philosophy: Unified Core Profile + Department Enrollment

Jiddah Islamic Schools operates a **dual-curriculum** institution. A pupil belongs to the school as a human being first (Core Profile), and is subsequently enrolled into two parallel academic departments:
1. **Secular Department (UNEB Primary Curriculum):** Nursery (Baby, Middle, Top) and Primary (P.1 through P.7) with class streams (e.g., Red, Blue, Green).
2. **Theology Department (Arabic Islamic Studies):** Raudha (الروضة) and Ibtidaai (الابتدائية صف 1 إلى 7).

Pupils must be able to progress through secular and theology departments independently (e.g., a student entering P.4 secular who is a beginner in Arabic may enroll in الصف الأول or الصف الثاني in theology). Non-Muslim pupils are formally exempt from Theology without breaking secular marks compilation.

---

## 2. Core Profile Data Model

### 2.1 Identity & Demographics
- `first_name` (text, required)
- `last_name` (text, required)
- `other_names` (text, optional)
- `arabic_name` (text, optional — e.g. يوسف موتيبي)
- `gender` (text enum: `male`, `female`)
- `dob` (date, optional but recommended)
- `religion` (text enum: `Muslim`, `Non-Muslim`)
- `nationality` (text, default `'Ugandan'`)
- `lin` (text, optional — Ugandan Learner Identification Number / EMIS)
- `ple_index_number` (text, optional — P.7 candidates only)

### 2.2 Auto-Calculated Fields
1. **Age from Date of Birth:**  
   $$\text{Age} = \text{DateDifference}(\text{CurrentDate}, \text{DOB})$$  
   *Example:* Born `2017-04-15` $\rightarrow$ `9 years, 0 months`.
2. **Class Recommendation Engine:**  
   - Age 3 $\rightarrow$ Baby Class
   - Age 4 $\rightarrow$ Middle Class
   - Age 5 $\rightarrow$ Top Class
   - Age 6 $\rightarrow$ Primary 1 (P.1)
   - Age 7 $\rightarrow$ Primary 2 (P.2)
   - Age 8 $\rightarrow$ Primary 3 (P.3)
   - Age 9 $\rightarrow$ Primary 4 (P.4)
   - Age 10 $\rightarrow$ Primary 5 (P.5)
   - Age 11 $\rightarrow$ Primary 6 (P.6)
   - Age 12+ $\rightarrow$ Primary 7 (P.7)
3. **Deterministic Sequential Admission Numbering:**  
   Format: `JIS/{AcademicYear}/{SequentialIndex:04d}`  
   *Example:* `JIS/2026/0142` (replaces client-side pseudo-random strings).

### 2.3 Sibling & Guardian Detection Engine
- **Primary Contact Fields:**
  - `guardian_name` (text, required)
  - `guardian_phone` (text, required — normalized Uganda format `+256 7XX XXXXXX`)
  - `guardian_relationship` (text: `Father`, `Mother`, `Uncle`, `Aunt`, `Grandparent`, `Legal Guardian`)
  - `guardian_email` (text, optional)
  - `residence_address` (text, optional — village / parish / district)
- **Automatic Sibling Detection Algorithm:**  
  When an administrator enters a guardian's phone number or exact surname + address, the registration interface immediately checks existing active student enrollments:
  > *"Found 1 registered sibling: **Amina Nakato** (P.4 Blue, JIS/2024/0512). Click to link family record and auto-fill guardian contact details."*

### 2.4 True Student Status Lifecycle
Replaces the erroneous `'Nursery' | 'Primary'` status column with legitimate lifecycle states:
- **`active`:** Currently registered and attending classes.
- **`transferred`:** Formally transferred to another primary school (retains historical marks).
- **`withdrawn`:** Withdrawn by parent or discontinued.
- **`graduated`:** Successfully sat PLE and completed Primary 7.
- **`suspended`:** Temporary administrative hold.

---

## 3. Proposed Additive Schema (Local Migration)

To maintain 100% backward compatibility with all existing 46 test suites and production parity:
- **Zero columns dropped.**
- All new fields added as **nullable** columns on `students` and `enrollments`.
- Existing `name` column remains populated (`first_name || ' ' || last_name`).

```sql
-- Additive extensions to students
ALTER TABLE students 
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS lin text,
  ADD COLUMN IF NOT EXISTS guardian_name text,
  ADD COLUMN IF NOT EXISTS guardian_phone text,
  ADD COLUMN IF NOT EXISTS guardian_relationship text,
  ADD COLUMN IF NOT EXISTS residence_address text,
  ADD COLUMN IF NOT EXISTS lifecycle_status text DEFAULT 'active' 
    CHECK (lifecycle_status IN ('active', 'transferred', 'withdrawn', 'graduated', 'suspended'));

-- Additive stream support on enrollments
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS stream text;

CREATE INDEX IF NOT EXISTS idx_students_guardian_phone ON students(guardian_phone);
CREATE INDEX IF NOT EXISTS idx_students_lifecycle_status ON students(lifecycle_status);
```

---

## 4. Next Step: Static Prototype & Approval Gate

A clickable interactive static prototype will be presented in `src/components/students/StudentRegistrationPrototype.tsx`.  
**Awaiting Product Owner Approval before applying any database migrations.**

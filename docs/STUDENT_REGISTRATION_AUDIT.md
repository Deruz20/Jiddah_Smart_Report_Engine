# STUDENT REGISTRATION SYSTEM AUDIT (STEP D1 — NO CODE)

**Workspace:** `jiddah_repo_clean_room`  
**Governing Standard:** Phase D Step D1: "Audit first (no code) — inventory every field in registration wizard, API, tables cross-referenced with downstream report cards/exports. Flag unused, duplicate, derivable, and department-specific fields."  
**Execution Date:** 2026-10-17  
**Status:** Audit Complete — Zero Code Mutated  

---

## 1. Inventory Across All 4 Layers

### 1.1 Layer 1: Client Registration Wizard (`CreateStudentWizard.tsx` & `EditStudentModal.tsx`)

| Field Name | Type / UI Input | Required? | Purpose in Wizard |
|---|---|---|---|
| `name` | Text input | **Yes** | Full student name in English. |
| `arabic_name` | Text input (RTL) | No | Student name in Arabic calligraphy for theology reports. |
| `gender` | Button toggle ('Male' / 'Female') | **Yes** | Student sex. |
| `religion` | Card toggle ('Muslim' / 'Non-Muslim') | **Yes** | Governs whether Theology class selection is available. |
| `admission_number` | Text input + Regenerate button | **Yes** | Unique student identifier; auto-generated with random string. |
| `section` | Card selection ('Nursery' / 'Lower' / 'Upper') | **Yes** | Filters secular class dropdown in Step 3. |
| `circular_class_id` | Select dropdown | **Yes** | Assigned secular class UUID. |
| `theology_section` | Card selection ('روضة' / 'ابتدائية_سفلى' / 'ابتدائية_عليا' / 'not_applicable') | No | Filters theology class dropdown in Step 4. |
| `theology_class_id` | Select dropdown (RTL) | No | Assigned Arabic theology class UUID. |
| `academic_year` | Number input | **Yes** | Academic enrollment year (default 2026). |

---

### 1.2 Layer 2: API Endpoints (`/api/students` & `/api/students/[id]`)

| Parameter / Field | Source | API Validation & Action |
|---|---|---|
| `name` | Request Body | Required; trimmed; written to `students.name`. |
| `admission_number` | Request Body | Required; trimmed; unique constraint checked; written to `students.admission_number`. |
| `gender` | Request Body | Lowercased; written to `students.gender`. |
| `arabic_name` | Request Body | Optional; trimmed; written to `students.arabic_name`. |
| `religion` | Request Body | Checked for 'muslim' / 'islam'; writes boolean `is_muslim` to `students.is_muslim`. |
| `circular_class_id` | Request Body | Required; verified against `circular_classes`; written to `enrollments.circular_class_id`. |
| `theology_class_id` | Request Body | Optional; rejected if class is P.7 or student is Non-Muslim; written to `enrollments.theology_class_id`. |
| `academic_year` | Request Body | Required; integer parsed; written to `enrollments.academic_year`. |
| `is_active` | System generated | Set to `true` on `enrollments`. |
| `is_archived` | Filter param | Defaults to `false` on `students`. |

---

### 1.3 Layer 3: Database Tables (`students` & `enrollments`)

```sql
-- Table: students (11 columns)
id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
name                 text NOT NULL,
gender               text,
status               text,                -- FLAW: stores 'Nursery' / 'Primary' / 'Theology'
created_at           timestamptz DEFAULT now(),
admission_number     text UNIQUE,
arabic_name          text,
is_archived          boolean DEFAULT false,
is_muslim            boolean DEFAULT true,
religion             text,
is_theology_enrolled boolean              -- FLAW: redundant with enrollments.theology_class_id

-- Table: enrollments (7 columns)
id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
student_id           uuid REFERENCES students(id),
circular_class_id    uuid REFERENCES circular_classes(id),
theology_class_id    uuid REFERENCES theology_classes(id),
term_id              text,
academic_year        text,
is_active            boolean DEFAULT true
```

---

### 1.4 Layer 4: Downstream Report Cards & CSV Exports

| Field | Primary EOT | Primary MOT | Primary BOT | P.7 EOT | Nursery EOT | Theology MOT | Broadsheet CSV | Top Students CSV |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `name` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** |
| `arabic_name` | **Yes** (or Ar translit) | No | No | No | No | **Yes** | No | No |
| `admission_number` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | No | No | No |
| `circular_class` | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | No | **Yes** | **Yes** |
| `theology_class_arabic` | **Yes** | **Yes** | No | No | No | **Yes** | No | No |
| `gender` | Used in comments | No | No | No | No | No | No | No |
| `religion` | Hides theology if non-muslim | No | No | Non-muslim PLE logic | No | Excludes non-muslim | No | No |
| `status` (table column) | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** | **NEVER** |
| `is_archived` | Filtered out | Filtered out | Filtered out | Filtered out | Filtered out | Filtered out | Filtered out | Filtered out |

---

## 2. Forensic Categorization of Fields

### 2.1 Unused & Misplaced Fields
1. **`students.status`:**  
   *Current Value:* `'Nursery' | 'Primary' | 'Theology'`.  
   *Diagnosis:* Severe domain model confusion. Academic division (Nursery vs Primary) belongs to the *class/section* of the student's enrollment, NOT the student's status. As a result, the student table has no way to represent actual enrollment lifecycle states (`active`, `transferred`, `withdrawn`, `graduated`, `suspended`).
2. **`students.is_theology_enrolled`:**  
   *Diagnosis:* Completely unused in report generation and redundant with `enrollments.theology_class_id IS NOT NULL`.

### 2.2 Duplicate & Redundant Fields
1. **`students.is_muslim` vs `students.religion`:**  
   Both exist in the database. `is_muslim` is a boolean derived from `religion === 'Muslim'`. Storing both introduces state desynchronization risk.
2. **`section`:**  
   Stored in `circular_classes.section`, yet client components attempt to derive or cache it on the student record.

### 2.3 Derivable Fields (Missing Native Auto-Calculation)
1. **Student Age:**  
   Currently cannot be derived because `date_of_birth` does not exist in any table.
2. **Class Recommendation:**  
   Cannot be derived from age.
3. **Admission Number Format:**  
   Currently generated client-side with random hash: `generateAdmissionNumber()` produces `JINPS-2026-X8A9B2`. Real schools require sequential deterministic numbering: `JIS/{year}/{sequence}` (e.g. `JIS/2026/0142`).

### 2.4 Critical Missing Fields for Authentic Operations
1. **Parent / Guardian Details:**  
   Zero parent fields exist anywhere in the application. A primary school management system without parent contact numbers or guardian names cannot handle school fees, emergency calls, or student pickup authorization.
2. **Sibling Linking:**  
   Currently impossible to know that two students belong to the same family.
3. **Ugandan Learner ID / PLE Index:**  
   No `lin` (Learner Identification Number) or `ple_index_number` for UNEB examination candidate registration.

---

## 3. Audit Conclusion & Recommendations

1. **Keep Core Schema Additive:** Do not drop existing columns on live tables (`students`, `enrollments`).
2. **Add Guardian & Identity Extensions:** Add nullable columns for `dob`, `guardian_name`, `guardian_phone`, `guardian_relationship`, `lin`, and true `lifecycle_status`.
3. **Fix Section vs Status:** Re-purpose or supplement `status` to represent legitimate student lifecycle states (`active`, `transferred`, `withdrawn`, `graduated`).

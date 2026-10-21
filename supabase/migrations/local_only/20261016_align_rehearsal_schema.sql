-- ============================================================================
-- ALIGN REHEARSAL SCHEMA TO ACTIVE APPLICATION DATA CONTRACTS
-- LOCAL-ONLY REHEARSAL MIGRATION
-- ============================================================================

-- 1. Circular Classes: align column names (name -> class_name, stream -> section)
ALTER TABLE public.circular_classes ADD COLUMN IF NOT EXISTS class_name text;
ALTER TABLE public.circular_classes ADD COLUMN IF NOT EXISTS section text;
UPDATE public.circular_classes SET class_name = name WHERE class_name IS NULL AND name IS NOT NULL;
UPDATE public.circular_classes SET section = stream WHERE section IS NULL AND stream IS NOT NULL;

-- 2. Students: align required fields for marks, cards & reports
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS admission_number text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS arabic_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_muslim boolean DEFAULT true;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS religion text DEFAULT 'Muslim';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_theology_enrolled boolean DEFAULT true;

-- 3. Enrollments: align active status
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 4. Circular Marks: align assessment phases and term reference
ALTER TABLE public.circular_marks ADD COLUMN IF NOT EXISTS term_id text;
ALTER TABLE public.circular_marks ADD COLUMN IF NOT EXISTS bot_score numeric;
ALTER TABLE public.circular_marks ADD COLUMN IF NOT EXISTS mot_score numeric;
ALTER TABLE public.circular_marks ADD COLUMN IF NOT EXISTS eot_score numeric;
ALTER TABLE public.circular_marks ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE public.circular_marks DROP CONSTRAINT IF EXISTS circular_marks_enrollment_subject_term_key;
ALTER TABLE public.circular_marks ADD CONSTRAINT circular_marks_enrollment_subject_term_key UNIQUE (enrollment_id, subject_id, term_id);

-- 5. Theology Marks: align assessment phases and term reference
ALTER TABLE public.theology_marks ADD COLUMN IF NOT EXISTS term_id text;
ALTER TABLE public.theology_marks ADD COLUMN IF NOT EXISTS mot_score numeric;
ALTER TABLE public.theology_marks ADD COLUMN IF NOT EXISTS eot_score numeric;
ALTER TABLE public.theology_marks ADD COLUMN IF NOT EXISTS device_id text;
ALTER TABLE public.theology_marks DROP CONSTRAINT IF EXISTS theology_marks_enrollment_subject_term_key;
ALTER TABLE public.theology_marks ADD CONSTRAINT theology_marks_enrollment_subject_term_key UNIQUE (enrollment_id, subject_id, term_id);

-- 6. Subjects Table: secular and theology catalog
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name text NOT NULL,
  curriculum text NOT NULL CHECK (curriculum IN ('secular', 'theology')),
  section text,
  created_at timestamptz DEFAULT now()
);

-- 7. Grading Criteria & Teacher Initials
CREATE TABLE IF NOT EXISTS public.grading_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade text NOT NULL,
  min_score numeric NOT NULL,
  max_score numeric NOT NULL,
  remark text,
  section text
);

CREATE TABLE IF NOT EXISTS public.teacher_initials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text,
  subject_id uuid,
  class_id uuid,
  initials text NOT NULL
);

-- 8. Enable RLS and grants on newly created tables
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_initials ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.subjects TO anon, authenticated;
GRANT SELECT ON public.grading_criteria TO anon, authenticated;
GRANT SELECT ON public.teacher_initials TO anon, authenticated;

CREATE POLICY "subjects_read" ON public.subjects FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "grading_criteria_read" ON public.grading_criteria FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "teacher_initials_read" ON public.teacher_initials FOR SELECT TO anon, authenticated USING (true);

-- 9. Compatibility Views for legacy circular_subjects & theology_subjects queries
CREATE OR REPLACE VIEW public.circular_subjects AS
SELECT id, subject_name, section, true as is_core, true as is_gradable
FROM public.subjects
WHERE curriculum = 'secular';

CREATE OR REPLACE VIEW public.theology_subjects AS
SELECT id, subject_name as name_arabic, subject_name, section as level
FROM public.subjects
WHERE curriculum = 'theology';

GRANT SELECT ON public.circular_subjects TO anon, authenticated;
GRANT SELECT ON public.theology_subjects TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

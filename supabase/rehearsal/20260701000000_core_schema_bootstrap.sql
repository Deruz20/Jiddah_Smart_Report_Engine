-- ============================================================================
-- JIDDAH SMART REPORT ENGINE — CORE BASELINE SCHEMA BOOTSTRAP
-- Migration: 20260701000000_core_schema_bootstrap.sql
-- Enables fresh scratch database initialization from empty without manual scripts.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. School Settings (Singleton)
CREATE TABLE IF NOT EXISTS public.school_settings (
  id text PRIMARY KEY DEFAULT 'current',
  school_name text DEFAULT 'Jiddah Islamic Schools',
  name text,
  address text,
  district text,
  email text,
  phone_1 text,
  phone_2 text,
  pay_code text,
  current_term text,
  current_year integer DEFAULT 2026,
  motto text,
  logo_url text,
  primary_color text DEFAULT '#0F4D25',
  theme_color text DEFAULT '#0F4D25',
  primary_font text DEFAULT 'Inter',
  arabic_font text DEFAULT 'Amiri',
  report_theme_preset text DEFAULT 'traditional',
  ranking_method text DEFAULT 'standard',
  ranking_basis text DEFAULT 'total_score',
  ranking_scope text DEFAULT 'stream',
  ranking_tiebreak text DEFAULT 'none',
  show_rank boolean DEFAULT true,
  next_term_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed default singleton record if not present
INSERT INTO public.school_settings (id, school_name, current_year, primary_color)
VALUES ('current', 'Jiddah Islamic Schools', 2026, '#0F4D25')
ON CONFLICT (id) DO NOTHING;

-- 2. Terms & Academic Terms
CREATE TABLE IF NOT EXISTS public.academic_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year integer NOT NULL DEFAULT 2026,
  term_number integer NOT NULL,
  label text,
  is_active boolean DEFAULT false,
  start_date date,
  end_date date,
  next_term_start date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year integer NOT NULL DEFAULT 2026,
  term_number integer NOT NULL,
  label text,
  is_current boolean DEFAULT false,
  start_date date,
  end_date date,
  next_term_start date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Teachers & Profiles
CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid,
  name text,
  email text UNIQUE,
  phone text,
  role varchar NOT NULL DEFAULT 'Class Teacher',
  subject text,
  classes text[] DEFAULT ARRAY[]::text[],
  status text DEFAULT 'active',
  initials text,
  joined date DEFAULT CURRENT_DATE,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
  role text DEFAULT 'Teacher',
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Classes (Circular & Theology)
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  level text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.circular_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  class_name text,
  stream text,
  section text,
  class_teacher_id uuid REFERENCES public.teachers(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theology_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name_arabic text,
  class_name_english text,
  level integer,
  created_at timestamptz DEFAULT now()
);

-- 5. Subjects (Catalog & Tables)
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name text NOT NULL,
  curriculum text NOT NULL DEFAULT 'secular' CHECK (curriculum IN ('secular', 'theology')),
  section text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.circular_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name text NOT NULL,
  section text,
  is_core boolean DEFAULT true,
  is_gradable boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theology_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_arabic text,
  subject_name_arabic text,
  subject_name text,
  section text,
  level integer,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 6. Students & Enrollments
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  arabic_name text,
  admission_number text UNIQUE,
  index_number text,
  lin text,
  gender text,
  dob date,
  religion text DEFAULT 'Muslim',
  is_muslim boolean DEFAULT true,
  is_theology_enrolled boolean DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archived_reason text,
  parent_name text,
  parent_phone text,
  parent_email text,
  address text,
  emergency_contact text,
  medical_conditions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  circular_class_id uuid REFERENCES public.circular_classes(id),
  theology_class_id uuid REFERENCES public.theology_classes(id),
  academic_year integer NOT NULL DEFAULT 2026,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (student_id, academic_year)
);

-- 7. Marks & Results
CREATE TABLE IF NOT EXISTS public.marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id),
  class_id uuid,
  subject_id uuid,
  term_id uuid,
  score numeric,
  section text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.circular_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,
  term_id text NOT NULL,
  bot_score numeric,
  mot_score numeric,
  eot_score numeric,
  updated_by uuid REFERENCES public.teachers(id),
  device_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT circular_marks_enrollment_subject_term_key UNIQUE (enrollment_id, subject_id, term_id)
);

CREATE TABLE IF NOT EXISTS public.circular_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id),
  mot_mark numeric,
  eot_mark numeric,
  year integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theology_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.theology_subjects(id),
  term_id text NOT NULL,
  mot_score numeric,
  eot_score numeric,
  updated_by uuid REFERENCES public.teachers(id),
  device_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT theology_marks_enrollment_subject_term_key UNIQUE (enrollment_id, subject_id, term_id)
);

CREATE TABLE IF NOT EXISTS public.theology_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id),
  mot_score numeric,
  eot_score numeric,
  year integer,
  created_at timestamptz DEFAULT now()
);

-- 8. Grading & Remarks
CREATE TABLE IF NOT EXISTS public.grading_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid,
  grade text NOT NULL,
  min_score numeric NOT NULL,
  max_score numeric NOT NULL,
  min_value numeric,
  max_value numeric,
  remark text,
  section text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grading_remarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.teachers(id),
  subject_id uuid,
  min_score numeric,
  max_score numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 9. Teacher Initials & Invites
CREATE TABLE IF NOT EXISTS public.teacher_initials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid,
  subject_id uuid,
  level text,
  initials text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teacher_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL,
  classes jsonb DEFAULT '[]'::jsonb,
  invited_by uuid,
  status text DEFAULT 'pending',
  token text UNIQUE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

CREATE TABLE IF NOT EXISTS public.teacher_class_assignments (
  teacher_id uuid REFERENCES public.teachers(id),
  class_id uuid NOT NULL,
  class_type text NOT NULL CHECK (class_type in ('circular','theology')),
  subject_id uuid,
  primary key (teacher_id, class_id)
);

-- 10. Activity, Notifications, Signatures
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_log (
  id serial PRIMARY KEY,
  user_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id serial PRIMARY KEY,
  recipient_id uuid,
  title text,
  message text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_id integer NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE (user_id, notification_id)
);

CREATE TABLE IF NOT EXISTS public.signatures (
  id serial PRIMARY KEY,
  uploaded_by uuid,
  image_url text,
  role text,
  uploaded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marks_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_table text NOT NULL,
  mark_id uuid NOT NULL,
  changed_by uuid REFERENCES public.teachers(id),
  old_value jsonb,
  new_value jsonb,
  changed_at timestamptz DEFAULT now()
);

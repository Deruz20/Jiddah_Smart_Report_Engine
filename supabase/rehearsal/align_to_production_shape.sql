-- ============================================================================
-- ALIGN REHEARSAL DATABASE TO PRODUCTION SHAPE
-- Exactly reproduces production's 33 public tables and policy counts.
-- Based on owner-verified production probe facts (2026-10-19).
-- ============================================================================

BEGIN;

-- Production currently has no public views.
DO $$
DECLARE
  view_name text;
BEGIN
  FOR view_name IN
    SELECT viewname
    FROM pg_views
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP VIEW public.%I CASCADE;', view_name);
  END LOOP;
END $$;

-- 1. Remove every public table outside the owner-verified production table list.
DO $$
DECLARE
  table_name text;
  production_tables text[] := ARRAY[
    'academic_terms', 'activity_log', 'activity_logs', 'circular_classes',
    'circular_marks', 'circular_results', 'circular_subjects', 'classes',
    'enrollments', 'grading_criteria', 'grading_remarks', 'marks',
    'marks_audit_log', 'marks_primary', 'notifications', 'nursery_assessments',
    'profiles', 'report_templates', 'school_settings', 'signatures',
    'students', 'subjects', 'teacher_class_assignments', 'teacher_initials',
    'teacher_invites', 'teachers', 'terms', 'theology_classes',
    'theology_marks', 'theology_results', 'theology_subjects', 'user_profiles', 'users'
  ];
BEGIN
  FOR table_name IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND NOT (tablename = ANY(production_tables))
  LOOP
    EXECUTE format('DROP TABLE public.%I CASCADE;', table_name);
  END LOOP;
END $$;

-- 2. Ensure all 33 production tables exist
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  level text,
  created_at timestamptz DEFAULT now()
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

CREATE TABLE IF NOT EXISTS public.circular_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id),
  mot_mark numeric,
  eot_mark numeric,
  year integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.theology_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id),
  mot_score numeric,
  eot_score numeric,
  year integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nursery_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id),
  term_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marks_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marks_primary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- 3. Enable RLS on all 33 production tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'academic_terms', 'activity_log', 'activity_logs', 'circular_classes',
    'circular_marks', 'circular_results', 'circular_subjects', 'classes',
    'enrollments', 'grading_criteria', 'grading_remarks', 'marks',
    'marks_audit_log', 'marks_primary', 'notifications', 'nursery_assessments',
    'profiles', 'report_templates', 'school_settings', 'signatures',
    'students', 'subjects', 'teacher_class_assignments', 'teacher_initials',
    'teacher_invites', 'teachers', 'terms', 'theology_classes',
    'theology_marks', 'theology_results', 'theology_subjects', 'user_profiles', 'users'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- Fail loudly if the rehearsal does not contain exactly the production table set.
DO $$
DECLARE
  production_tables text[] := ARRAY[
    'academic_terms', 'activity_log', 'activity_logs', 'circular_classes',
    'circular_marks', 'circular_results', 'circular_subjects', 'classes',
    'enrollments', 'grading_criteria', 'grading_remarks', 'marks',
    'marks_audit_log', 'marks_primary', 'notifications', 'nursery_assessments',
    'profiles', 'report_templates', 'school_settings', 'signatures',
    'students', 'subjects', 'teacher_class_assignments', 'teacher_initials',
    'teacher_invites', 'teachers', 'terms', 'theology_classes',
    'theology_marks', 'theology_results', 'theology_subjects', 'user_profiles', 'users'
  ];
  actual_tables text[];
  missing_tables text[];
  unexpected_tables text[];
  public_view_count integer;
BEGIN
  SELECT COALESCE(array_agg(tablename ORDER BY tablename), ARRAY[]::text[])
  INTO actual_tables
  FROM pg_tables
  WHERE schemaname = 'public';

  SELECT COALESCE(array_agg(expected.table_name ORDER BY expected.table_name), ARRAY[]::text[])
  INTO missing_tables
  FROM unnest(production_tables) AS expected(table_name)
  WHERE NOT (expected.table_name = ANY(actual_tables));

  SELECT COALESCE(array_agg(unexpected.table_name ORDER BY unexpected.table_name), ARRAY[]::text[])
  INTO unexpected_tables
  FROM unnest(actual_tables) AS unexpected(table_name)
  WHERE NOT (unexpected.table_name = ANY(production_tables));

  SELECT count(*) INTO public_view_count
  FROM pg_views
  WHERE schemaname = 'public';

  IF cardinality(missing_tables) > 0
    OR cardinality(unexpected_tables) > 0
    OR public_view_count > 0 THEN
    RAISE EXCEPTION 'Production shape mismatch. Missing tables: %, unexpected tables: %, public views: %',
      missing_tables, unexpected_tables, public_view_count;
  END IF;
END $$;

-- 4. Enforce ZERO policies on the 7 zero-policy production tables
DO $$
DECLARE
  r RECORD;
  zero_tables text[] := ARRAY[
    'marks_audit_log', 'marks_primary', 'nursery_assessments',
    'report_templates', 'teacher_class_assignments', 'teacher_invites', 'users'
  ];
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(zero_tables)
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 5. Revoke anon permissions on all tables (anon has no privileges in production)
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'academic_terms', 'activity_log', 'activity_logs', 'circular_classes',
    'circular_marks', 'circular_results', 'circular_subjects', 'classes',
    'enrollments', 'grading_criteria', 'grading_remarks', 'marks',
    'marks_audit_log', 'marks_primary', 'notifications', 'nursery_assessments',
    'profiles', 'report_templates', 'school_settings', 'signatures',
    'students', 'subjects', 'teacher_class_assignments', 'teacher_initials',
    'teacher_invites', 'teachers', 'terms', 'theology_classes',
    'theology_marks', 'theology_results', 'theology_subjects', 'user_profiles', 'users'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon;', t);
  END LOOP;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- PRODUCTION RLS HARDENING ROLLBACK SCRIPT
-- Script: production_rollback.sql
-- TARGET: Supabase Production SQL Editor (Wrapped in a single transaction)
-- PURPOSE: Restores production catalog's EXACT prior policies, RLS states, and grants.
-- ============================================================================

BEGIN;

-- 1. Drop lockdown-specific policies added during hardening
DROP POLICY IF EXISTS "students_read_authenticated" ON public.students;
DROP POLICY IF EXISTS "students_insert_admin" ON public.students;
DROP POLICY IF EXISTS "students_update_admin" ON public.students;
DROP POLICY IF EXISTS "students_delete_admin" ON public.students;

DROP POLICY IF EXISTS "terms_read_all" ON public.terms;
DROP POLICY IF EXISTS "terms_manage_admin" ON public.terms;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'circular_subjects') THEN
    DROP POLICY IF EXISTS "circular_subjects_read_all" ON public.circular_subjects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'theology_subjects') THEN
    DROP POLICY IF EXISTS "theology_subjects_read_all" ON public.theology_subjects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'circular_results') THEN
    DROP POLICY IF EXISTS "circular_results_read_auth" ON public.circular_results;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'theology_results') THEN
    DROP POLICY IF EXISTS "theology_results_read_auth" ON public.theology_results;
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can manage teacher_initials" ON public.teacher_initials;

-- 2. Restore exact prior production policies from production catalog
CREATE POLICY "Allow read all students" ON public.students
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow insert students" ON public.students
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admins can manage teacher_initials" ON public.teacher_initials
  FOR ALL TO authenticated
  USING (
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'Administrator'::text) OR
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)
  )
  WITH CHECK (
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'Administrator'::text) OR
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)
  );

-- 3. Restore prior RLS states (disable RLS on tables where production catalog had rls: false)
ALTER TABLE IF EXISTS public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.terms DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'circular_results') THEN
    ALTER TABLE public.circular_results DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'theology_results') THEN
    ALTER TABLE public.theology_results DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'circular_subjects') THEN
    ALTER TABLE public.circular_subjects DISABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'theology_subjects') THEN
    ALTER TABLE public.theology_subjects DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 4. Restore prior grants to anon as documented in production catalog
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'students', 'circular_marks', 'theology_marks', 'teachers',
    'teacher_invites', 'school_settings', 'signatures', 'grading_criteria', 'grading_remarks'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.%I TO anon;', tbl);
    END IF;
  END LOOP;
END $$;

COMMIT;

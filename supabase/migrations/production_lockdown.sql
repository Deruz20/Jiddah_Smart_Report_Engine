-- ============================================================================
-- PRODUCTION RLS HARDENING & ACCESS CONTROL LOCKDOWN
-- Script: production_lockdown.sql
-- TARGET: Supabase Production SQL Editor (Wrapped in a single transaction)
-- ============================================================================

BEGIN;

-- 1. Enable RLS on unhardened tables identified in production catalog
ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.terms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'circular_results') THEN
    ALTER TABLE public.circular_results ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'theology_results') THEN
    ALTER TABLE public.theology_results ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'circular_subjects') THEN
    ALTER TABLE public.circular_subjects ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'theology_subjects') THEN
    ALTER TABLE public.theology_subjects ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 2. Remediate Vulnerability on Students Table:
-- Prior policies "Allow read all students" and "Allow insert students" were granted TO public with USING(true),
-- which in PostgreSQL grants full read and insert access to unauthenticated 'anon'.
DROP POLICY IF EXISTS "Allow read all students" ON public.students;
DROP POLICY IF EXISTS "Allow insert students" ON public.students;

-- Revoke write privileges on students from anon
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.students FROM anon;

-- Secure Students Policies: Authenticated staff can read; Admins/DOS can manage
DROP POLICY IF EXISTS "students_read_authenticated" ON public.students;
CREATE POLICY "students_read_authenticated" ON public.students
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "students_insert_admin" ON public.students;
CREATE POLICY "students_insert_admin" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'Head Teacher', 'DOS Secular', 'DOS Theology', 'admin')
    )
  );

DROP POLICY IF EXISTS "students_update_admin" ON public.students;
CREATE POLICY "students_update_admin" ON public.students
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'Head Teacher', 'DOS Secular', 'DOS Theology', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'Head Teacher', 'DOS Secular', 'DOS Theology', 'admin')
    )
  );

DROP POLICY IF EXISTS "students_delete_admin" ON public.students;
CREATE POLICY "students_delete_admin" ON public.students
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'admin')
    )
  );

-- 3. Remediate Vulnerability on teacher_initials:
-- Replace user_metadata policy with authoritative teachers table check
DROP POLICY IF EXISTS "Admins can manage teacher_initials" ON public.teacher_initials;

CREATE POLICY "Admins can manage teacher_initials" ON public.teacher_initials
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'Head Teacher', 'DOS Secular', 'DOS Theology', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'Head Teacher', 'DOS Secular', 'DOS Theology', 'admin')
    )
  );

-- 4. Policies for Newly Locked Down Tables
-- Terms (Read-only for all, managed by Admin)
DROP POLICY IF EXISTS "terms_read_all" ON public.terms;
CREATE POLICY "terms_read_all" ON public.terms
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "terms_manage_admin" ON public.terms;
CREATE POLICY "terms_manage_admin" ON public.terms
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'Head Teacher', 'admin')
    )
  );

-- Circular & Theology Subjects and Legacy Results (guarded for table presence)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'circular_subjects') THEN
    DROP POLICY IF EXISTS "circular_subjects_read_all" ON public.circular_subjects;
    CREATE POLICY "circular_subjects_read_all" ON public.circular_subjects FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'theology_subjects') THEN
    DROP POLICY IF EXISTS "theology_subjects_read_all" ON public.theology_subjects;
    CREATE POLICY "theology_subjects_read_all" ON public.theology_subjects FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'circular_results') THEN
    DROP POLICY IF EXISTS "circular_results_read_auth" ON public.circular_results;
    CREATE POLICY "circular_results_read_auth" ON public.circular_results FOR SELECT TO authenticated USING (true);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'theology_results') THEN
    DROP POLICY IF EXISTS "theology_results_read_auth" ON public.theology_results;
    CREATE POLICY "theology_results_read_auth" ON public.theology_results FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- 5. Revoke Unnecessary Anon Mutation Grants across All Sensitive Tables
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'circular_marks', 'theology_marks', 'teachers', 'teacher_invites',
    'school_settings', 'signatures', 'grading_criteria', 'grading_remarks'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon;', tbl);
    END IF;
  END LOOP;
END $$;

COMMIT;

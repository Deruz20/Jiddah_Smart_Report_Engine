-- ==============================================================================
-- EPIC 1: MULTI-TENANT DATABASE HARDENING ROLLBACK
-- ==============================================================================
-- Migration: 20261120000000_multi_tenant_isolation_rollback.sql
-- Description:
--   Rolls back multi-tenant isolation policies and school_id foreign keys if needed.
-- ==============================================================================

DO $$
DECLARE
  tbl text;
  policy_name text;
  tables text[] := ARRAY[
    'teachers',
    'teacher_invites',
    'students',
    'enrollments',
    'circular_classes',
    'theology_classes',
    'circular_subjects',
    'theology_subjects',
    'circular_marks',
    'theology_marks',
    'attendance',
    'terms',
    'school_settings',
    'stamp_configs',
    'grading_criteria',
    'grading_standards',
    'activity_logs',
    'notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      policy_name := format('tenant_isolation_%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
    END IF;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS auth.current_school_id();
DROP TABLE IF EXISTS public.schools CASCADE;

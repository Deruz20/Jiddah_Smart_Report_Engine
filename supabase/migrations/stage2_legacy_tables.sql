-- ============================================================================
-- STAGE 2 LEGACY TABLE LOCKDOWN
-- File: supabase/migrations/stage2_legacy_tables.sql
-- TARGET: Supabase Production SQL Editor (Single Transaction)
-- Description: Enables RLS with 0 policies on legacy tables. Drops nothing.
-- ============================================================================

BEGIN;

-- 1. ENABLE RLS ON ALL LEGACY TABLES
ALTER TABLE IF EXISTS public.grading_remarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marks_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marks_primary ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING PERMISSIVE / USER POLICIES ON LEGACY TABLES
-- grading_remarks policies
DROP POLICY IF EXISTS "Teachers can view their own remarks" ON public.grading_remarks;
DROP POLICY IF EXISTS "Teachers can insert their own remarks" ON public.grading_remarks;
DROP POLICY IF EXISTS "Teachers can update their own remarks" ON public.grading_remarks;
DROP POLICY IF EXISTS "Teachers can delete their own remarks" ON public.grading_remarks;
DROP POLICY IF EXISTS "Teachers can view their own grading remarks" ON public.grading_remarks;
DROP POLICY IF EXISTS "Teachers can insert their own grading remarks" ON public.grading_remarks;
DROP POLICY IF EXISTS "Teachers can update their own grading remarks" ON public.grading_remarks;
DROP POLICY IF EXISTS "Teachers can delete their own grading remarks" ON public.grading_remarks;

-- user_profiles policies
DROP POLICY IF EXISTS "Users can read their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- 3. REVOKE UNRESTRICTED ACCESS FROM ANON AND AUTHENTICATED ROLES
REVOKE ALL ON public.grading_remarks FROM anon, authenticated;
REVOKE ALL ON public.marks_audit_log FROM anon, authenticated;
REVOKE ALL ON public.marks_primary FROM anon, authenticated;
REVOKE ALL ON public.report_templates FROM anon, authenticated;
REVOKE ALL ON public.user_profiles FROM anon, authenticated;
REVOKE ALL ON public.users FROM anon, authenticated;

-- NOTE: 0 tables are dropped. All 6 legacy tables remain intact for audit safety.
-- Drop Candidates for Future Owner Approval:
--   1. grading_remarks (superseded by remarks directly on marks / report cards)
--   2. marks_audit_log (superseded by activity_log)
--   3. marks_primary (superseded by circular_marks)
--   4. report_templates (superseded by TypeScript templates in src/components/reports/templates)
--   5. user_profiles (superseded by public.teachers directory)
--   6. users (superseded by Supabase auth.users & public.teachers)

COMMIT;

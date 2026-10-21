-- ============================================================================
-- STAGE 2 LEGACY TABLE ROLLBACK: RESTORE EXACT PRIOR PERMISSIONS AND POLICIES
-- File: supabase/migrations/stage2_legacy_rollback.sql
-- TARGET: Supabase Production SQL Editor (Single Transaction)
-- ============================================================================

BEGIN;

-- 1. RESTORE GRANTS TO AUTHENTICATED AND ANON AS RECORDED IN PRODUCTION CATALOG
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grading_remarks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marks_audit_log TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marks_primary TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_templates TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon, authenticated;

-- 2. RESTORE ORIGINAL POLICIES ON GRADING_REMARKS
CREATE POLICY "Teachers can view their own remarks" ON public.grading_remarks
  FOR SELECT TO public USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own remarks" ON public.grading_remarks
  FOR INSERT TO public WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own remarks" ON public.grading_remarks
  FOR UPDATE TO public USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own remarks" ON public.grading_remarks
  FOR DELETE TO public USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view their own grading remarks" ON public.grading_remarks
  FOR SELECT TO public USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own grading remarks" ON public.grading_remarks
  FOR INSERT TO public WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own grading remarks" ON public.grading_remarks
  FOR UPDATE TO public USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own grading remarks" ON public.grading_remarks
  FOR DELETE TO public USING (auth.uid() = teacher_id);

-- 3. RESTORE ORIGINAL POLICIES ON USER_PROFILES
CREATE POLICY "Users can read their own profile" ON public.user_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

COMMIT;

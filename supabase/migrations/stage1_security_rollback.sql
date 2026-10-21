-- ============================================================================
-- STAGE 1 SECURITY ROLLBACK: RESTORE EXACT PRIOR PRODUCTION CATALOG STATE
-- File: supabase/migrations/stage1_security_rollback.sql
-- TARGET: Supabase Production SQL Editor (Single Transaction)
-- ============================================================================

BEGIN;

-- 1. DROP STAGE 1 TRIGGER & HARDENED POLICIES
DROP TRIGGER IF EXISTS trg_prevent_teacher_self_role_elevation ON public.teachers;
DROP FUNCTION IF EXISTS public.prevent_teacher_self_role_elevation();

DROP POLICY IF EXISTS "teachers_select_hardened" ON public.teachers;
DROP POLICY IF EXISTS "teachers_insert_admin" ON public.teachers;
DROP POLICY IF EXISTS "teachers_update_admin_or_self" ON public.teachers;
DROP POLICY IF EXISTS "teachers_delete_admin" ON public.teachers;

DROP POLICY IF EXISTS "school_settings_select_authenticated" ON public.school_settings;
DROP POLICY IF EXISTS "school_settings_manage_admin" ON public.school_settings;

DROP POLICY IF EXISTS "signatures_select_authenticated" ON public.signatures;
DROP POLICY IF EXISTS "signatures_manage_admin" ON public.signatures;

DROP POLICY IF EXISTS "notifications_select_recipient" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_recipient_or_admin" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_recipient_or_admin" ON public.notifications;

DROP POLICY IF EXISTS "activity_log_select_admin" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_insert_authenticated" ON public.activity_log;

DROP POLICY IF EXISTS "teacher_initials_select_authenticated" ON public.teacher_initials;
DROP POLICY IF EXISTS "teacher_initials_manage_admin" ON public.teacher_initials;

DROP POLICY IF EXISTS "grading_criteria_select_authenticated" ON public.grading_criteria;
DROP POLICY IF EXISTS "grading_criteria_manage_admin" ON public.grading_criteria;

DROP POLICY IF EXISTS "teacher_class_assignments_select" ON public.teacher_class_assignments;
DROP POLICY IF EXISTS "teacher_class_assignments_manage_admin" ON public.teacher_class_assignments;


-- 2. RESTORE ORIGINAL CATALOG POLICIES ON TEACHERS
CREATE POLICY "Authenticated users can read teachers" ON public.teachers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert teachers" ON public.teachers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update teachers" ON public.teachers
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete teachers" ON public.teachers
  FOR DELETE TO authenticated USING (true);


-- 3. RESTORE ORIGINAL CATALOG POLICIES ON SCHOOL_SETTINGS
CREATE POLICY "Authenticated users can read school settings" ON public.school_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update school settings" ON public.school_settings
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert school settings" ON public.school_settings
  FOR INSERT TO authenticated WITH CHECK (true);


-- 4. RESTORE ORIGINAL CATALOG POLICIES ON SIGNATURES
CREATE POLICY "Authenticated users can manage signatures" ON public.signatures
  FOR ALL TO authenticated USING (true);


-- 5. RESTORE ORIGINAL CATALOG POLICIES ON NOTIFICATIONS
CREATE POLICY "Authenticated users can manage notifications" ON public.notifications
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO public USING ((auth.uid() = recipient_id) OR (recipient_id IS NULL));


-- 6. RESTORE ORIGINAL CATALOG POLICIES ON ACTIVITY_LOG
CREATE POLICY "Authenticated users can read activity" ON public.activity_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert activity" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (true);


-- 7. RESTORE ORIGINAL CATALOG POLICIES ON TEACHER_INITIALS
CREATE POLICY "Everyone can read teacher_initials" ON public.teacher_initials
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage teacher_initials" ON public.teacher_initials
  FOR ALL TO authenticated
  USING (
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'Administrator'::text)
    OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)
  )
  WITH CHECK (
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'Administrator'::text)
    OR (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'admin'::text)
  );


-- 8. RESTORE ORIGINAL CATALOG POLICIES ON GRADING_CRITERIA
CREATE POLICY "Allow read access to all authenticated users" ON public.grading_criteria
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow full access to authorized roles" ON public.grading_criteria
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE (teachers.id = auth.uid())
        AND (teachers.role::text = ANY (ARRAY[
          'Administrator'::character varying,
          'Head Teacher'::character varying,
          'DOS Secular'::character varying,
          'DOS Theology'::character varying
        ]::text[]))
    )
  );

-- 9. RESTORE ORIGINAL TEACHER_CLASS_ASSIGNMENTS STATE: RLS ON, 0 POLICIES
-- (Policies were already dropped in Step 1)

COMMIT;

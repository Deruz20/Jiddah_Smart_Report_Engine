-- ============================================================================
-- STAGE 1 SECURITY HARDENING: REMEDIATE AUTHENTICATED OVER-REACH & RLS FIXES
-- File: supabase/migrations/stage1_security_lockdown.sql
-- TARGET: Supabase Production SQL Editor (Single Transaction)
-- ============================================================================

BEGIN;

-- 1. RECONCILE CANONICAL ROLES ACROSS CONSTRAINTS
-- Canonical list: 'Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher', 
-- 'DOS', 'DOS Secular', 'DOS Theology', 'Class Teacher', 'Theology Instructor', 
-- 'Teacher', 'Support Staff'

DO $$
BEGIN
  -- Reconcile teachers role constraint
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.teachers'::regclass AND conname = 'teachers_role_check') THEN
    ALTER TABLE public.teachers DROP CONSTRAINT teachers_role_check;
  END IF;
  ALTER TABLE public.teachers ADD CONSTRAINT teachers_role_check
    CHECK (role::text = ANY (ARRAY[
      'Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher',
      'DOS', 'DOS Secular', 'DOS Theology',
      'Class Teacher', 'Theology Instructor', 'Teacher', 'Support Staff'
    ]::text[]));

  -- Reconcile teacher_invites role constraint
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.teacher_invites'::regclass AND conname = 'teacher_invites_role_check') THEN
    ALTER TABLE public.teacher_invites DROP CONSTRAINT teacher_invites_role_check;
  END IF;
  ALTER TABLE public.teacher_invites ADD CONSTRAINT teacher_invites_role_check
    CHECK (role::text = ANY (ARRAY[
      'Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher',
      'DOS', 'DOS Secular', 'DOS Theology',
      'Class Teacher', 'Theology Instructor', 'Teacher', 'Support Staff'
    ]::text[]));
END $$;


-- 2. HARDEN TEACHERS TABLE
-- Drop overly broad authenticated policies
DROP POLICY IF EXISTS "Authenticated users can read teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated users can insert teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated users can update teachers" ON public.teachers;
DROP POLICY IF EXISTS "Authenticated users can delete teachers" ON public.teachers;
DROP POLICY IF EXISTS "teachers_select_authenticated" ON public.teachers;
DROP POLICY IF EXISTS "teachers_insert_authenticated" ON public.teachers;
DROP POLICY IF EXISTS "teachers_update_authenticated" ON public.teachers;
DROP POLICY IF EXISTS "teachers_select_hardened" ON public.teachers;
DROP POLICY IF EXISTS "teachers_insert_admin" ON public.teachers;
DROP POLICY IF EXISTS "teachers_update_admin_or_self" ON public.teachers;
DROP POLICY IF EXISTS "teachers_delete_admin" ON public.teachers;

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- SELECT: Authenticated users can read the staff directory
CREATE POLICY "teachers_select_hardened" ON public.teachers
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: Only Admin roles can insert teachers
CREATE POLICY "teachers_insert_admin" ON public.teachers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'admin', 'Head Teacher')
    )
  );

-- UPDATE: Admin roles can update any record; teachers can update their own row
CREATE POLICY "teachers_update_admin_or_self" ON public.teachers
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'admin', 'Head Teacher')
    )
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'admin', 'Head Teacher')
    )
  );

-- DELETE: Only Administrator can delete teachers
CREATE POLICY "teachers_delete_admin" ON public.teachers
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'admin')
    )
  );

-- Trigger: Strictly prevent self role elevation, status changes, or auth_user_id tampering
CREATE OR REPLACE FUNCTION public.prevent_teacher_self_role_elevation()
RETURNS trigger AS $$
DECLARE
  viewer_role text;
BEGIN
  -- If invoked in an authenticated client session, strictly enforce role immutability
  IF auth.role() = 'authenticated' THEN
    SELECT role INTO viewer_role
    FROM public.teachers
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    IF viewer_role IS NULL OR viewer_role NOT IN ('Administrator', 'admin', 'Head Teacher') THEN
      IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Security Violation: Non-administrators cannot change teacher roles.';
      END IF;
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Security Violation: Non-administrators cannot modify teacher active/inactive status.';
      END IF;
      IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
        RAISE EXCEPTION 'Security Violation: Cannot reassign teacher authentication linkage.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_teacher_self_role_elevation ON public.teachers;
CREATE TRIGGER trg_prevent_teacher_self_role_elevation
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_teacher_self_role_elevation();


-- 3. HARDEN SCHOOL_SETTINGS
DROP POLICY IF EXISTS "Authenticated users can read school settings" ON public.school_settings;
DROP POLICY IF EXISTS "Authenticated users can update school settings" ON public.school_settings;
DROP POLICY IF EXISTS "Authenticated users can insert school settings" ON public.school_settings;
DROP POLICY IF EXISTS "school_settings_select_authenticated" ON public.school_settings;
DROP POLICY IF EXISTS "school_settings_manage_admin" ON public.school_settings;

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_settings_select_authenticated" ON public.school_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "school_settings_manage_admin" ON public.school_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'admin', 'Head Teacher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'admin', 'Head Teacher')
    )
  );


-- 4. HARDEN SIGNATURES
DROP POLICY IF EXISTS "Authenticated users can manage signatures" ON public.signatures;
DROP POLICY IF EXISTS "signatures_select_authenticated" ON public.signatures;
DROP POLICY IF EXISTS "signatures_manage_admin" ON public.signatures;

ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signatures_select_authenticated" ON public.signatures
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "signatures_manage_admin" ON public.signatures
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'admin', 'Head Teacher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'admin', 'Head Teacher')
    )
  );


-- 5. HARDEN NOTIFICATIONS
DROP POLICY IF EXISTS "Authenticated users can manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own or broadcast notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own private notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_authenticated_read" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_recipient" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_recipient_or_admin" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_recipient_or_admin" ON public.notifications;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_recipient" ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR recipient_id IS NULL);

CREATE POLICY "notifications_insert_authenticated" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "notifications_update_recipient_or_admin" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    recipient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'admin')
    )
  )
  WITH CHECK (
    recipient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'admin')
    )
  );

CREATE POLICY "notifications_delete_recipient_or_admin" ON public.notifications
  FOR DELETE TO authenticated
  USING (
    recipient_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN ('Administrator', 'admin')
    )
  );


-- 6. HARDEN ACTIVITY LOGS (activity_log and activity_logs)
DROP POLICY IF EXISTS "Authenticated users can read activity" ON public.activity_log;
DROP POLICY IF EXISTS "Authenticated users can insert activity" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_select_admin" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_insert_authenticated" ON public.activity_log;

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_select_admin" ON public.activity_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN (
          'Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher',
          'DOS', 'DOS Secular', 'DOS Theology'
        )
    )
  );

CREATE POLICY "activity_log_insert_authenticated" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
    )
  );


-- 7. HARDEN TEACHER_INITIALS (ELIMINATE USER_METADATA DEPENDENCY)
DROP POLICY IF EXISTS "Admins can manage teacher_initials" ON public.teacher_initials;
DROP POLICY IF EXISTS "Everyone can read teacher_initials" ON public.teacher_initials;
DROP POLICY IF EXISTS "teacher_initials_select_authenticated" ON public.teacher_initials;
DROP POLICY IF EXISTS "teacher_initials_manage_admin" ON public.teacher_initials;

ALTER TABLE public.teacher_initials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_initials_select_authenticated" ON public.teacher_initials
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "teacher_initials_manage_admin" ON public.teacher_initials
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN (
          'Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher',
          'DOS', 'DOS Secular', 'DOS Theology'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN (
          'Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher',
          'DOS', 'DOS Secular', 'DOS Theology'
        )
    )
  );


-- 8. FIX GRADING_CRITERIA (REPAIR BUG: teachers.id vs auth.uid())
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.grading_criteria;
DROP POLICY IF EXISTS "Allow full access to authorized roles" ON public.grading_criteria;
DROP POLICY IF EXISTS "grading_criteria_select_authenticated" ON public.grading_criteria;
DROP POLICY IF EXISTS "grading_criteria_manage_admin" ON public.grading_criteria;

ALTER TABLE public.grading_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grading_criteria_select_authenticated" ON public.grading_criteria
  FOR SELECT TO authenticated
  USING (true);

-- Fixed to check t.auth_user_id = auth.uid() instead of teachers.id = auth.uid()
CREATE POLICY "grading_criteria_manage_admin" ON public.grading_criteria
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN (
          'Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher',
          'DOS', 'DOS Secular', 'DOS Theology'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN (
          'Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher',
          'DOS', 'DOS Secular', 'DOS Theology'
        )
    )
  );


-- 9. ADD MISSING TEACHER_CLASS_ASSIGNMENTS POLICIES (SOLVES THEOLOGY_MARKS 42501)
DROP POLICY IF EXISTS "teacher_class_assignments_select" ON public.teacher_class_assignments;
DROP POLICY IF EXISTS "teacher_class_assignments_manage_admin" ON public.teacher_class_assignments;

ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own assignments; Admins and DOS can view all
CREATE POLICY "teacher_class_assignments_select" ON public.teacher_class_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_class_assignments.teacher_id
        AND (
          t.auth_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.teachers viewer
            WHERE viewer.auth_user_id = auth.uid()
              AND viewer.role IN (
                'Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher',
                'DOS', 'DOS Secular', 'DOS Theology'
              )
          )
        )
    )
  );

-- Only Admin & DOS roles can assign teachers to classes
CREATE POLICY "teacher_class_assignments_manage_admin" ON public.teacher_class_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN (
          'Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher',
          'DOS', 'DOS Secular', 'DOS Theology'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.auth_user_id = auth.uid()
        AND t.role IN (
          'Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher',
          'DOS', 'DOS Secular', 'DOS Theology'
        )
    )
  );


-- 10. CLEAN UP OLD PUBLIC / DEV POLICIES FROM EARLIER PHASES
DROP POLICY IF EXISTS "Allow insert marks (dev)" ON public.marks;
DROP POLICY IF EXISTS "Allow update marks (dev)" ON public.marks;
DROP POLICY IF EXISTS "Allow read marks (dev)" ON public.marks;
DROP POLICY IF EXISTS "Allow read all marks" ON public.marks;
DROP POLICY IF EXISTS "Allow insert marks" ON public.marks;

DROP POLICY IF EXISTS "Allow public read academic_terms" ON public.academic_terms;
DROP POLICY IF EXISTS "Allow public insert academic_terms" ON public.academic_terms;
DROP POLICY IF EXISTS "Allow read all" ON public.academic_terms;
DROP POLICY IF EXISTS "Allow insert terms" ON public.academic_terms;

DROP POLICY IF EXISTS "Allow read all classes" ON public.classes;
DROP POLICY IF EXISTS "Allow insert classes" ON public.classes;

DROP POLICY IF EXISTS "Allow read all subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow insert subjects" ON public.subjects;

DROP POLICY IF EXISTS "Allow read all students" ON public.students;
DROP POLICY IF EXISTS "Allow insert students" ON public.students;

COMMIT;

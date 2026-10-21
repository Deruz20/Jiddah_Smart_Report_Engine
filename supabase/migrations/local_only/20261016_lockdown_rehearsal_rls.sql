-- ============================================================================
-- LOCAL-ONLY REHEARSAL MIGRATION: RLS Lockdown & Least-Privilege Grants
-- DO NOT APPLY TO PRODUCTION WITHOUT PRIOR BACKUP & SCHEDULED WINDOW
-- ============================================================================

-- 1. REVOKE DEFAULT OVER-PERMISSIVE GRANTS FROM ANON
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Grant minimal necessary read access for unauthenticated registration / branding
GRANT SELECT ON public.theology_classes TO anon;
GRANT SELECT ON public.circular_classes TO anon;
GRANT SELECT ON public.school_settings TO anon;

-- 2. RESET AUTHENTICATED GRANTS (Controlled by RLS Policies)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Explicitly revoke DELETE privileges on tables that regular authenticated users must never delete
REVOKE DELETE ON public.school_settings FROM authenticated;
REVOKE DELETE ON public.academic_terms FROM authenticated;
REVOKE DELETE ON public.circular_classes FROM authenticated;
REVOKE DELETE ON public.theology_classes FROM authenticated;
REVOKE DELETE ON public.notifications FROM authenticated;
REVOKE DELETE ON public.activity_logs FROM authenticated;
REVOKE DELETE ON public.notification_reads FROM authenticated;
REVOKE DELETE ON public.teachers FROM authenticated;

-- Ensure sequences are usable for inserts
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 3. ENABLE AND FORCE ROW LEVEL SECURITY ON ALL PUBLIC TABLES
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms FORCE ROW LEVEL SECURITY;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.circular_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circular_classes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.circular_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circular_marks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings FORCE ROW LEVEL SECURITY;

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students FORCE ROW LEVEL SECURITY;

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers FORCE ROW LEVEL SECURITY;

ALTER TABLE public.theology_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theology_classes FORCE ROW LEVEL SECURITY;

ALTER TABLE public.theology_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theology_marks FORCE ROW LEVEL SECURITY;

-- 4. CLEAN UP LEGACY BROKEN & EXISTING POLICIES (IDEMPOTENT)
DROP POLICY IF EXISTS "circular_marks_access_policy" ON public.circular_marks;
DROP POLICY IF EXISTS "theology_marks_access_policy" ON public.theology_marks;
DROP POLICY IF EXISTS "circular_marks_staff_access" ON public.circular_marks;
DROP POLICY IF EXISTS "theology_marks_staff_access" ON public.theology_marks;
DROP POLICY IF EXISTS "school_settings_read" ON public.school_settings;
DROP POLICY IF EXISTS "school_settings_update" ON public.school_settings;
DROP POLICY IF EXISTS "school_settings_public_read" ON public.school_settings;
DROP POLICY IF EXISTS "school_settings_admin_update" ON public.school_settings;
DROP POLICY IF EXISTS "teachers_read_active" ON public.teachers;
DROP POLICY IF EXISTS "teachers_update_own" ON public.teachers;
DROP POLICY IF EXISTS "teachers_staff_read" ON public.teachers;
DROP POLICY IF EXISTS "teachers_self_update" ON public.teachers;
DROP POLICY IF EXISTS "teachers_admin_insert" ON public.teachers;
DROP POLICY IF EXISTS "students_staff_read" ON public.students;
DROP POLICY IF EXISTS "students_staff_modify" ON public.students;
DROP POLICY IF EXISTS "students_staff_access" ON public.students;
DROP POLICY IF EXISTS "enrollments_staff_access" ON public.enrollments;
DROP POLICY IF EXISTS "classes_public_read" ON public.circular_classes;
DROP POLICY IF EXISTS "circular_classes_read" ON public.circular_classes;
DROP POLICY IF EXISTS "theology_classes_public_read" ON public.theology_classes;
DROP POLICY IF EXISTS "theology_classes_read" ON public.theology_classes;
DROP POLICY IF EXISTS "terms_read" ON public.academic_terms;
DROP POLICY IF EXISTS "academic_terms_read" ON public.academic_terms;
DROP POLICY IF EXISTS "notifications_read" ON public.notifications;
DROP POLICY IF EXISTS "notifications_authenticated_read" ON public.notifications;
DROP POLICY IF EXISTS "activity_logs_read" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_authenticated_read" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_authenticated_insert" ON public.activity_logs;

-- 5. MINIMUM POLICIES FOR REAL CLIENT PATHS

-- (a) School Settings
CREATE POLICY "school_settings_public_read" ON public.school_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "school_settings_admin_update" ON public.school_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.teachers WHERE auth_user_id = auth.uid() AND role IN ('Administrator', 'Head Teacher', 'admin'))
  );

-- (b) Classes & Academic Terms (Read for all, managed by Admin/DOS)
CREATE POLICY "circular_classes_read" ON public.circular_classes
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "theology_classes_read" ON public.theology_classes
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "academic_terms_read" ON public.academic_terms
  FOR SELECT TO anon, authenticated USING (true);

-- (c) Teachers Profile Helper & Policies (Non-recursive)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.teachers 
  WHERE auth_user_id = auth.uid() 
     OR email = (auth.jwt() ->> 'email') 
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

CREATE POLICY "teachers_staff_read" ON public.teachers
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid() OR
    email = (auth.jwt() ->> 'email') OR
    public.get_my_role() IN ('Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher', 'DOS')
  );

CREATE POLICY "teachers_self_update" ON public.teachers
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = auth.uid() OR
    email = (auth.jwt() ->> 'email') OR
    public.get_my_role() IN ('Administrator', 'admin')
  )
  WITH CHECK (
    auth_user_id = auth.uid() OR
    email = (auth.jwt() ->> 'email') OR
    public.get_my_role() IN ('Administrator', 'admin')
  );

CREATE POLICY "teachers_admin_insert" ON public.teachers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid() OR
    email = (auth.jwt() ->> 'email') OR
    public.get_my_role() IN ('Administrator', 'admin')
  );

-- (d) Students & Enrollments (Accessible by active faculty)
CREATE POLICY "students_staff_access" ON public.students
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.teachers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "enrollments_staff_access" ON public.enrollments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.teachers WHERE auth_user_id = auth.uid())
  );

-- (e) Marks (Circular & Theology - Accessible by active faculty)
CREATE POLICY "circular_marks_staff_access" ON public.circular_marks
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.teachers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "theology_marks_staff_access" ON public.theology_marks
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.teachers WHERE auth_user_id = auth.uid())
  );

-- (f) Notifications & Activity Logs
CREATE POLICY "notifications_authenticated_read" ON public.notifications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "activity_logs_authenticated_read" ON public.activity_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "activity_logs_authenticated_insert" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

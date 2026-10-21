-- ============================================================================
-- ROLLBACK MIGRATION: Revert RLS Lockdown & Restore Default Grants
-- FOR REHEARSAL & DISASTER RECOVERY ONLY
-- ============================================================================

-- 1. DROP ALL LOCKDOWN POLICIES
DROP POLICY IF EXISTS "school_settings_public_read" ON public.school_settings;
DROP POLICY IF EXISTS "school_settings_admin_update" ON public.school_settings;
DROP POLICY IF EXISTS "circular_classes_read" ON public.circular_classes;
DROP POLICY IF EXISTS "theology_classes_read" ON public.theology_classes;
DROP POLICY IF EXISTS "academic_terms_read" ON public.academic_terms;
DROP POLICY IF EXISTS "teachers_staff_read" ON public.teachers;
DROP POLICY IF EXISTS "teachers_self_update" ON public.teachers;
DROP POLICY IF EXISTS "teachers_admin_insert" ON public.teachers;
DROP POLICY IF EXISTS "students_staff_access" ON public.students;
DROP POLICY IF EXISTS "enrollments_staff_access" ON public.enrollments;
DROP POLICY IF EXISTS "circular_marks_staff_access" ON public.circular_marks;
DROP POLICY IF EXISTS "theology_marks_staff_access" ON public.theology_marks;
DROP POLICY IF EXISTS "notifications_authenticated_read" ON public.notifications;
DROP POLICY IF EXISTS "activity_logs_authenticated_read" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_authenticated_insert" ON public.activity_logs;

-- 2. DISABLE ROW LEVEL SECURITY ON ALL PUBLIC TABLES
ALTER TABLE IF EXISTS public.academic_terms NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.academic_terms DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.activity_logs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.activity_logs DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.circular_classes NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.circular_classes DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.circular_marks NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.circular_marks DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.enrollments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollments DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.notification_reads NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_reads DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.notifications NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.school_settings NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.school_settings DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.students NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.students DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.teachers NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.teachers DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.terms NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.terms DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.theology_classes NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.theology_classes DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.theology_marks NO FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.theology_marks DISABLE ROW LEVEL SECURITY;

-- 3. RESTORE BROAD GRANTS TO AUTHENTICATED AND ANON
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, anon;

-- 4. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

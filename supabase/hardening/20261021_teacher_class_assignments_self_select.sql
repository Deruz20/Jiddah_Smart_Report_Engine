-- DRAFT — DO NOT APPLY TO PRODUCTION
-- Allows authenticated users to read assignment rows for exactly one active
-- teacher profile resolved by the same auth_user_id-or-legacy-id rule as the app.
-- This changes no grants, roles, tables, or policies other than the single
-- teacher_class_assignments SELECT policy. Requires owner review and Gate 1.
BEGIN;

CREATE OR REPLACE FUNCTION public.tca_current_verified_teacher_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (array_agg(t.id))[1]
  FROM public.teachers AS t
  WHERE t.auth_user_id = auth.uid()
     OR t.id = auth.uid()
  HAVING count(*) = 1
     AND bool_and(
       lower(coalesce(t.status, 'active')) NOT IN
         ('inactive', 'suspended', 'deactivated', 'banned')
     )
$$;

REVOKE ALL ON FUNCTION public.tca_current_verified_teacher_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tca_current_verified_teacher_id() TO authenticated;

DROP POLICY IF EXISTS teacher_class_assignments_verified_self_select
  ON public.teacher_class_assignments;
CREATE POLICY teacher_class_assignments_verified_self_select
  ON public.teacher_class_assignments
  FOR SELECT
  TO authenticated
  USING (teacher_id = public.tca_current_verified_teacher_id());

COMMIT;

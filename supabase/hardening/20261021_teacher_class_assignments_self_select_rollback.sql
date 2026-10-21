-- DRAFT — DO NOT APPLY TO PRODUCTION
-- Rollback for 20261021_teacher_class_assignments_self_select.sql.
-- Removes only that draft SELECT policy and its identity helper.
BEGIN;

DROP POLICY IF EXISTS teacher_class_assignments_verified_self_select
  ON public.teacher_class_assignments;
DROP FUNCTION IF EXISTS public.tca_current_verified_teacher_id();

COMMIT;

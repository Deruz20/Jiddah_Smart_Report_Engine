-- Rollback: 20261120_secular_theology_rls_policies_rollback.sql

DROP POLICY IF EXISTS "secular_marks_select_isolated" ON public.marks;
DROP POLICY IF EXISTS "secular_marks_modify_isolated" ON public.marks;
DROP POLICY IF EXISTS "theology_marks_select_isolated" ON public.theology_marks;
DROP POLICY IF EXISTS "theology_marks_modify_isolated" ON public.theology_marks;

DROP FUNCTION IF EXISTS public.is_secular_authorized(UUID);
DROP FUNCTION IF EXISTS public.is_theology_authorized(UUID);
DROP FUNCTION IF EXISTS public.is_admin_or_supervisory();

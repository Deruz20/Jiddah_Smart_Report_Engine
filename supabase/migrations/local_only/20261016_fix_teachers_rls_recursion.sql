-- ============================================================================
-- Fix Infinite Recursion in public.teachers RLS Policies
-- Use SECURITY DEFINER helper function to safely inspect user role
-- ============================================================================

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

-- Drop recursive policies
DROP POLICY IF EXISTS teachers_staff_read ON public.teachers;
DROP POLICY IF EXISTS teachers_self_update ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_insert ON public.teachers;
DROP POLICY IF EXISTS teachers_admin_all ON public.teachers;

-- 1. Read Policy: users can read their own profile, or admins/staff leadership can read all
CREATE POLICY teachers_staff_read ON public.teachers
  FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR email = (auth.jwt() ->> 'email')
    OR public.get_my_role() IN ('Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher', 'DOS')
  );

-- 2. Update Policy: users can update own profile, admins can update any
CREATE POLICY teachers_self_update ON public.teachers
  FOR UPDATE TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR email = (auth.jwt() ->> 'email')
    OR public.get_my_role() IN ('Administrator', 'admin')
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR email = (auth.jwt() ->> 'email')
    OR public.get_my_role() IN ('Administrator', 'admin')
  );

-- 3. Insert Policy: Admins or self-onboarding
CREATE POLICY teachers_admin_insert ON public.teachers
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    OR email = (auth.jwt() ->> 'email')
    OR public.get_my_role() IN ('Administrator', 'admin')
  );

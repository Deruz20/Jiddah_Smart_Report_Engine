-- Grant INSERT, UPDATE on school_settings to authenticated and add write policy with get_my_role()
GRANT INSERT, UPDATE ON public.school_settings TO authenticated;

DROP POLICY IF EXISTS "school_settings_admin_update" ON public.school_settings;
DROP POLICY IF EXISTS "school_settings_admin_insert" ON public.school_settings;
DROP POLICY IF EXISTS "school_settings_admin_all" ON public.school_settings;
DROP POLICY IF EXISTS "school_settings_admin_write" ON public.school_settings;

CREATE POLICY "school_settings_admin_write" ON public.school_settings
  FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('Administrator', 'Head Teacher', 'admin'))
  WITH CHECK (public.get_my_role() IN ('Administrator', 'Head Teacher', 'admin'));

NOTIFY pgrst, 'reload schema';

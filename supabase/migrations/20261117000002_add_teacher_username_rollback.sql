BEGIN;

-- ============================================================================
-- ROLLBACK: Remove teachers.username column & restore trigger cleanly
-- ============================================================================

DROP INDEX IF EXISTS public.teachers_username_lower_unique;
ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_username_no_at;
ALTER TABLE public.teachers DROP COLUMN IF EXISTS username;

CREATE OR REPLACE FUNCTION public.prevent_teacher_self_role_elevation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
BEGIN
  IF current_setting('role', true) = 'service_role' OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
      AND COALESCE(t.status, 'active') = 'active'
      AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Unauthorized: Only an Administrator can change a staff role.' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Unauthorized: Only an Administrator can change account status.' USING ERRCODE = '42501';
    END IF;
    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
      RAISE EXCEPTION 'Unauthorized: Only an Administrator can relink auth_user_id.' USING ERRCODE = '42501';
    END IF;
    IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
      RAISE EXCEPTION 'Unauthorized: Only an Administrator can modify user permissions.' USING ERRCODE = '42501';
    END IF;
    IF NEW.classes IS DISTINCT FROM OLD.classes THEN
      RAISE EXCEPTION 'Unauthorized: Only an Administrator can modify assigned classes.' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;

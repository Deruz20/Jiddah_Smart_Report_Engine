BEGIN;

-- ============================================================================
-- ADD-ON MIGRATION: Case-Insensitive Unique Username on public.teachers
-- Purpose: Allow teachers & staff to sign in with username OR email + password.
-- Seeded cleanly from the email prefix before '@' with deterministic deduplication.
-- Do NOT run automatically on production — review & execute via SQL Editor after backup.
-- ============================================================================

-- 1. Add nullable username column first so existing rows can be backfilled safely
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS username text;

-- 2. Backfill existing staff usernames deterministically from prefix before '@'
WITH base_candidates AS (
  SELECT
    t.id,
    t.created_at,
    COALESCE(
      NULLIF(
        regexp_replace(split_part(lower(trim(COALESCE(t.email, ''))), '@', 1), '[^a-z0-9._-]+', '', 'g'),
        ''
      ),
      'staff_' || substr(replace(t.id::text, '-', ''), 1, 6)
    ) AS raw_base
  FROM public.teachers t
  WHERE t.username IS NULL OR trim(t.username) = ''
),
normalized_bases AS (
  SELECT
    id,
    created_at,
    CASE
      WHEN length(raw_base) < 2 THEN raw_base || '_' || substr(replace(id::text, '-', ''), 1, 4)
      ELSE left(raw_base, 56)
    END AS base_username
  FROM base_candidates
),
ranked AS (
  SELECT
    id,
    base_username,
    ROW_NUMBER() OVER (PARTITION BY base_username ORDER BY created_at NULLS LAST, id) AS rn
  FROM normalized_bases
)
UPDATE public.teachers t
SET username = CASE
  WHEN r.rn = 1 AND NOT EXISTS (
    SELECT 1 FROM public.teachers existing
    WHERE existing.id <> t.id
      AND existing.username IS NOT NULL
      AND lower(trim(existing.username)) = r.base_username
  )
    THEN r.base_username
  ELSE r.base_username || '_' || substr(replace(t.id::text, '-', ''), 1, 4)
END
FROM ranked r
WHERE t.id = r.id;

-- 3. Disallow '@' in username so email vs username resolution is unambiguous
ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_username_no_at;
ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_username_no_at
  CHECK (username IS NULL OR (length(trim(username)) >= 2 AND username !~ '@'));

-- 4. Enforce case-insensitive uniqueness on non-null usernames
CREATE UNIQUE INDEX IF NOT EXISTS teachers_username_lower_unique
  ON public.teachers (lower(trim(username)))
  WHERE username IS NOT NULL;

-- 5. Protect teachers.username from self-modification by non-Administrators
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
    IF NEW.username IS DISTINCT FROM OLD.username THEN
      RAISE EXCEPTION 'Unauthorized: Only an Administrator can modify a staff username.' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;

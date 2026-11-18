BEGIN;

-- ============================================================================
-- ROLLBACK FOR 20261117000001_phase1_rbac_principal_and_permissions.sql
-- ============================================================================

DROP POLICY IF EXISTS "user_avatars_own_delete" ON storage.objects;
DROP POLICY IF EXISTS "user_avatars_own_update" ON storage.objects;
DROP POLICY IF EXISTS "user_avatars_own_write" ON storage.objects;
DROP POLICY IF EXISTS "user_avatars_public_read" ON storage.objects;

DROP TABLE IF EXISTS public.role_permissions CASCADE;

ALTER TABLE public.teachers DROP COLUMN IF EXISTS permissions;
ALTER TABLE public.teachers DROP COLUMN IF EXISTS pending_email;

-- Reassign any 'Principal' rows to 'Head Teacher' before restoring constraint if needed
UPDATE public.teachers SET role = 'Head Teacher' WHERE role = 'Principal';
UPDATE public.teacher_invites SET role = 'Head Teacher' WHERE role = 'Principal';

ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_role_check;
ALTER TABLE public.teachers ADD CONSTRAINT teachers_role_check CHECK (
  role::text = ANY (ARRAY[
    'Administrator'::text,
    'admin'::text,
    'Head Teacher'::text,
    'Deputy Head Teacher'::text,
    'DOS'::text,
    'DOS Secular'::text,
    'DOS Theology'::text,
    'Class Teacher'::text,
    'Theology Instructor'::text,
    'Teacher'::text,
    'Support Staff'::text
  ])
);

ALTER TABLE public.teacher_invites DROP CONSTRAINT IF EXISTS teacher_invites_role_check;
ALTER TABLE public.teacher_invites ADD CONSTRAINT teacher_invites_role_check CHECK (
  role::text = ANY (ARRAY[
    'Administrator'::text,
    'admin'::text,
    'Head Teacher'::text,
    'Deputy Head Teacher'::text,
    'DOS'::text,
    'DOS Secular'::text,
    'DOS Theology'::text,
    'Class Teacher'::text,
    'Theology Instructor'::text,
    'Teacher'::text,
    'teacher'::text,
    'Support Staff'::text
  ])
);

COMMIT;

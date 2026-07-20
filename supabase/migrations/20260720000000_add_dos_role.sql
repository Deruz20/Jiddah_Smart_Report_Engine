-- Constraint Before:
-- CHECK (role in ('Head Teacher', 'Class Teacher', 'Theology Instructor', 'Administrator', 'Support Staff'))

-- Constraint After:
-- CHECK (role in ('Head Teacher', 'Class Teacher', 'Theology Instructor', 'Administrator', 'Support Staff', 'DOS'))

ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_role_check;
ALTER TABLE public.teachers ADD CONSTRAINT teachers_role_check CHECK (role IN ('Head Teacher', 'Class Teacher', 'Theology Instructor', 'Administrator', 'Support Staff', 'DOS'));

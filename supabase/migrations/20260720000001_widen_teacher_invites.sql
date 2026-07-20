ALTER TABLE public.teacher_invites DROP CONSTRAINT IF EXISTS teacher_invites_role_check;
ALTER TABLE public.teacher_invites ADD CONSTRAINT teacher_invites_role_check CHECK (role IN ('teacher', 'DOS Secular', 'DOS Theology', 'Class Teacher', 'Head Teacher', 'Theology Instructor', 'Deputy Head Teacher', 'Support Staff', 'Administrator'));

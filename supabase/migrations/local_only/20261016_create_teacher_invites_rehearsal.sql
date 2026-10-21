-- Create teacher_invites table with RLS on rehearsal DB
CREATE TABLE IF NOT EXISTS public.teacher_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID,
  role TEXT NOT NULL DEFAULT 'teacher',
  subject TEXT DEFAULT '',
  name TEXT,
  phone TEXT,
  classes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.teacher_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_invites FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.teacher_invites FROM anon;
REVOKE ALL ON public.teacher_invites FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_invites TO authenticated;

DROP POLICY IF EXISTS "teacher_invites_admin_all" ON public.teacher_invites;
CREATE POLICY "teacher_invites_admin_all" ON public.teacher_invites
  FOR ALL
  TO authenticated
  USING (public.get_my_role() IN ('Administrator', 'Head Teacher', 'admin'))
  WITH CHECK (public.get_my_role() IN ('Administrator', 'Head Teacher', 'admin'));

NOTIFY pgrst, 'reload schema';

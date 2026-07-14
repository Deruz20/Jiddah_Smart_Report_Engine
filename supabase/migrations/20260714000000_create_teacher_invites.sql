CREATE TABLE public.teacher_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'claimed')) DEFAULT 'pending',
  invited_by UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'DOS Secular', 'DOS Theology')),
  subject TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  classes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

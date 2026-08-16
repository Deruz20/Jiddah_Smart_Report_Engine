-- 20260816000000_admin_dos_read_access.sql

-- Ensure RLS is enabled on these tables
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circular_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theology_classes ENABLE ROW LEVEL SECURITY;

-- Grant SELECT access to any authenticated user (teachers, dos, admin)
-- Since data is insensitive and needed by all roles.
CREATE POLICY "Allow read all enrollments" ON public.enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read all circular classes" ON public.circular_classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read all theology classes" ON public.theology_classes FOR SELECT TO authenticated USING (true);

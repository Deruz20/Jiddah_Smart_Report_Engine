-- Enable RLS on both tables
ALTER TABLE public.circular_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theology_marks ENABLE ROW LEVEL SECURITY;

-- Drop old policies if any
DROP POLICY IF EXISTS "circular_marks_select_authenticated" ON public.circular_marks;
DROP POLICY IF EXISTS "circular_marks_insert_authenticated" ON public.circular_marks;
DROP POLICY IF EXISTS "circular_marks_update_authenticated" ON public.circular_marks;
DROP POLICY IF EXISTS "circular_marks_delete_authenticated" ON public.circular_marks;

DROP POLICY IF EXISTS "theology_marks_select_authenticated" ON public.theology_marks;
DROP POLICY IF EXISTS "theology_marks_insert_authenticated" ON public.theology_marks;
DROP POLICY IF EXISTS "theology_marks_update_authenticated" ON public.theology_marks;
DROP POLICY IF EXISTS "theology_marks_delete_authenticated" ON public.theology_marks;

-- circular_marks policies
CREATE POLICY "circular_marks_select_authenticated" ON public.circular_marks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "circular_marks_insert_authenticated" ON public.circular_marks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "circular_marks_update_authenticated" ON public.circular_marks
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "circular_marks_delete_authenticated" ON public.circular_marks
  FOR DELETE TO authenticated USING (true);

-- theology_marks policies
CREATE POLICY "theology_marks_select_authenticated" ON public.theology_marks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "theology_marks_insert_authenticated" ON public.theology_marks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "theology_marks_update_authenticated" ON public.theology_marks
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "theology_marks_delete_authenticated" ON public.theology_marks
  FOR DELETE TO authenticated USING (true);

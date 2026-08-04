-- Drop the overly permissive policies from 20260706000000
DROP POLICY IF EXISTS "circular_marks_select_authenticated" ON public.circular_marks;
DROP POLICY IF EXISTS "circular_marks_insert_authenticated" ON public.circular_marks;
DROP POLICY IF EXISTS "circular_marks_update_authenticated" ON public.circular_marks;
DROP POLICY IF EXISTS "circular_marks_delete_authenticated" ON public.circular_marks;

DROP POLICY IF EXISTS "theology_marks_select_authenticated" ON public.theology_marks;
DROP POLICY IF EXISTS "theology_marks_insert_authenticated" ON public.theology_marks;
DROP POLICY IF EXISTS "theology_marks_update_authenticated" ON public.theology_marks;
DROP POLICY IF EXISTS "theology_marks_delete_authenticated" ON public.theology_marks;

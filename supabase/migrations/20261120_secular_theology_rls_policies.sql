-- Migration: 20261120_secular_theology_rls_policies.sql
-- Description: Isolated Row-Level Security (RLS) policies for Secular and Theology departments
-- Authority: Operation Architect - Phase 1 Backend Security Hardening
-- Status: STAGED FOR EXPLICIT HUMAN APPROVAL (DO NOT RUN DESTRUCTIVE ALTER TABLE WITHOUT PERMISSION)

-- ==============================================================================
-- 1. Helper Security Functions (SECURITY DEFINER, STABLE)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_admin_or_supervisory()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teachers
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'head_teacher', 'headteacher', 'Administrator')
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_secular_authorized(target_circular_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teachers t
    LEFT JOIN public.teacher_class_assignments tca ON tca.teacher_id = t.id
    WHERE t.auth_user_id = auth.uid()
      AND t.status = 'active'
      AND (
        t.role IN ('admin', 'head_teacher', 'headteacher', 'Administrator', 'dos_secular', 'DOS (Secular)')
        OR (tca.circular_class_id = target_circular_class_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_theology_authorized(target_theology_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teachers t
    LEFT JOIN public.teacher_class_assignments tca ON tca.teacher_id = t.id
    WHERE t.auth_user_id = auth.uid()
      AND t.status = 'active'
      AND (
        t.role IN ('admin', 'head_teacher', 'headteacher', 'Administrator', 'dos_theology', 'DOS (Theology)')
        OR (tca.theology_class_id = target_theology_class_id)
      )
  );
$$;

-- ==============================================================================
-- 2. Secular Marks Isolation Policies (marks table)
-- ==============================================================================

ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "secular_marks_select_isolated" ON public.marks;
CREATE POLICY "secular_marks_select_isolated"
ON public.marks
FOR SELECT
USING (
  public.is_admin_or_supervisory()
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = marks.enrollment_id
      AND public.is_secular_authorized(e.circular_class_id)
  )
);

DROP POLICY IF EXISTS "secular_marks_modify_isolated" ON public.marks;
CREATE POLICY "secular_marks_modify_isolated"
ON public.marks
FOR ALL
USING (
  public.is_admin_or_supervisory()
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = marks.enrollment_id
      AND public.is_secular_authorized(e.circular_class_id)
  )
)
WITH CHECK (
  public.is_admin_or_supervisory()
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = marks.enrollment_id
      AND public.is_secular_authorized(e.circular_class_id)
  )
);

-- ==============================================================================
-- 3. Theology Marks Isolation Policies (theology_marks table)
-- ==============================================================================

ALTER TABLE public.theology_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "theology_marks_select_isolated" ON public.theology_marks;
CREATE POLICY "theology_marks_select_isolated"
ON public.theology_marks
FOR SELECT
USING (
  public.is_admin_or_supervisory()
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = theology_marks.enrollment_id
      AND public.is_theology_authorized(e.theology_class_id)
  )
);

DROP POLICY IF EXISTS "theology_marks_modify_isolated" ON public.theology_marks;
CREATE POLICY "theology_marks_modify_isolated"
ON public.theology_marks
FOR ALL
USING (
  public.is_admin_or_supervisory()
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = theology_marks.enrollment_id
      AND public.is_theology_authorized(e.theology_class_id)
  )
)
WITH CHECK (
  public.is_admin_or_supervisory()
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.id = theology_marks.enrollment_id
      AND public.is_theology_authorized(e.theology_class_id)
  )
);

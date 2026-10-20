-- DRAFT
-- DO NOT APPLY TO PRODUCTION
-- Rehearsal-only policy proposal; requires owner approval at Gate 1.
BEGIN;

CREATE OR REPLACE FUNCTION public.current_teacher_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT t.id
  FROM public.teachers AS t
  WHERE t.auth_user_id = auth.uid() OR t.id = auth.uid()
  ORDER BY CASE WHEN t.auth_user_id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_teacher_ok()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teachers AS t
    WHERE t.id = public.current_teacher_id()
      AND lower(t.status) NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
  )
$$;

CREATE OR REPLACE FUNCTION public.teacher_assigned(class_id uuid, class_type text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teacher_class_assignments AS tca
    WHERE tca.teacher_id = public.current_teacher_id()
      AND tca.class_id = $1
      AND tca.class_type = $2
  )
$$;

REVOKE ALL ON FUNCTION public.current_teacher_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_teacher_ok() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.teacher_assigned(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_teacher_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_teacher_ok() TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_assigned(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "theology_marks_access_policy" ON public.theology_marks;
CREATE POLICY "theology_marks_access_policy"
ON public.theology_marks
FOR ALL
TO authenticated
USING (
  public.current_teacher_ok()
  AND EXISTS (
    SELECT 1
    FROM public.enrollments AS e
    LEFT JOIN public.circular_classes AS cc ON cc.id = e.circular_class_id
    LEFT JOIN public.theology_classes AS tc ON tc.id = e.theology_class_id
    JOIN public.teachers AS t ON t.id = public.current_teacher_id()
    WHERE e.id = theology_marks.enrollment_id
      AND (
        t.role IN ('Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher', 'DOS Theology')
        OR (t.role = 'DOS' AND lower(coalesce(t.subject, '')) = 'theology')
        OR cc.class_teacher_id = t.id
        OR public.teacher_assigned(tc.id, 'theology')
      )
  )
)
WITH CHECK (
  public.current_teacher_ok()
  AND EXISTS (
    SELECT 1
    FROM public.enrollments AS e
    LEFT JOIN public.circular_classes AS cc ON cc.id = e.circular_class_id
    LEFT JOIN public.theology_classes AS tc ON tc.id = e.theology_class_id
    JOIN public.teachers AS t ON t.id = public.current_teacher_id()
    WHERE e.id = theology_marks.enrollment_id
      AND (
        t.role IN ('Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher', 'DOS Theology')
        OR (t.role = 'DOS' AND lower(coalesce(t.subject, '')) = 'theology')
        OR cc.class_teacher_id = t.id
        OR public.teacher_assigned(tc.id, 'theology')
      )
  )
);

DROP POLICY IF EXISTS "circular_marks_access_policy" ON public.circular_marks;
CREATE POLICY "circular_marks_access_policy"
ON public.circular_marks
FOR ALL
TO authenticated
USING (
  public.current_teacher_ok()
  AND EXISTS (
    SELECT 1
    FROM public.enrollments AS e
    LEFT JOIN public.circular_classes AS cc ON cc.id = e.circular_class_id
    LEFT JOIN public.theology_classes AS tc ON tc.id = e.theology_class_id
    JOIN public.teachers AS t ON t.id = public.current_teacher_id()
    WHERE e.id = circular_marks.enrollment_id
      AND (
        t.role IN ('Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher', 'DOS Secular')
        OR (t.role = 'DOS' AND lower(coalesce(t.subject, '')) = 'secular')
        OR cc.class_teacher_id = t.id
        OR public.teacher_assigned(cc.id, 'circular')
      )
  )
)
WITH CHECK (
  public.current_teacher_ok()
  AND EXISTS (
    SELECT 1
    FROM public.enrollments AS e
    LEFT JOIN public.circular_classes AS cc ON cc.id = e.circular_class_id
    LEFT JOIN public.theology_classes AS tc ON tc.id = e.theology_class_id
    JOIN public.teachers AS t ON t.id = public.current_teacher_id()
    WHERE e.id = circular_marks.enrollment_id
      AND (
        t.role IN ('Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher', 'DOS Secular')
        OR (t.role = 'DOS' AND lower(coalesce(t.subject, '')) = 'secular')
        OR cc.class_teacher_id = t.id
        OR public.teacher_assigned(cc.id, 'circular')
      )
  )
);

DROP POLICY IF EXISTS "teacher_class_assignments_self_select" ON public.teacher_class_assignments;
CREATE POLICY "teacher_class_assignments_self_select"
ON public.teacher_class_assignments
FOR SELECT
TO authenticated
USING (teacher_id = public.current_teacher_id());

COMMIT;

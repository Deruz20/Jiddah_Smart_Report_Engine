-- REHEARSAL-DERIVED ROLLBACK BASELINE
-- DRAFT: Final production rollback must be generated via scripts/generate-rollback-from-probe.mjs using production probe v3 output.
-- Purpose: Revert theology marks policy to rehearsal baseline state.

BEGIN;

DROP POLICY IF EXISTS "theology_marks_manage_authorized_staff" ON public.theology_marks;
DROP POLICY IF EXISTS "theology_marks_access_policy" ON public.theology_marks;

CREATE POLICY "theology_marks_access_policy"
ON public.theology_marks
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.theology_classes tc ON tc.id = e.theology_class_id
    JOIN public.teachers t ON t.auth_user_id = auth.uid()
    WHERE e.id = theology_marks.enrollment_id
      AND (
        -- Subject teacher assigned to this class
        EXISTS (
          SELECT 1 FROM public.teacher_class_assignments tca 
          WHERE tca.teacher_id = t.id 
            AND tca.class_id = tc.id 
            AND tca.class_type = 'theology'
        )
        -- Theology does not have a class_teacher_id on its table, but circular homeroom teachers need access
        OR EXISTS (
          SELECT 1 FROM public.circular_classes cc
          WHERE cc.id = e.circular_class_id
            AND cc.class_teacher_id = t.id
        )
        -- Admin / DOS Theology role
        OR t.role IN ('DOS Theology', 'Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.theology_classes tc ON tc.id = e.theology_class_id
    JOIN public.teachers t ON t.auth_user_id = auth.uid()
    WHERE e.id = theology_marks.enrollment_id
      AND (
        EXISTS (
          SELECT 1 FROM public.teacher_class_assignments tca 
          WHERE tca.teacher_id = t.id 
            AND tca.class_id = tc.id 
            AND tca.class_type = 'theology'
        )
        OR EXISTS (
          SELECT 1 FROM public.circular_classes cc
          WHERE cc.id = e.circular_class_id
            AND cc.class_teacher_id = t.id
        )
        OR t.role IN ('DOS Theology', 'Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher')
      )
  )
);

COMMIT;

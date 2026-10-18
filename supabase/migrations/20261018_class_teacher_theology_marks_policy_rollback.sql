-- Rollback Migration: 20261018_class_teacher_theology_marks_policy_rollback.sql
-- Purpose: Revert theology_marks_access_policy to previous baseline state (20260804000001_rls_policies.sql).

BEGIN;

DROP POLICY IF EXISTS "theology_marks_access_policy" ON public.theology_marks;

CREATE POLICY "theology_marks_access_policy"
ON public.theology_marks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM enrollments e
    JOIN theology_classes tc ON tc.id = e.theology_class_id
    JOIN teachers t ON t.auth_user_id = auth.uid()
    WHERE e.id = theology_marks.enrollment_id
      AND (
        EXISTS (
          SELECT 1 FROM teacher_class_assignments tca 
          WHERE tca.teacher_id = t.id 
            AND tca.class_id = tc.id 
            AND tca.class_type = 'theology'
        )
        OR EXISTS (
          SELECT 1 FROM circular_classes cc
          WHERE cc.id = e.circular_class_id
            AND cc.class_teacher_id = t.id
        )
        OR t.role in ('DOS Theology','Administrator','admin','Head Teacher','Deputy Head Teacher')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM enrollments e
    JOIN theology_classes tc ON tc.id = e.theology_class_id
    JOIN teachers t ON t.auth_user_id = auth.uid()
    WHERE e.id = theology_marks.enrollment_id
      AND (
        EXISTS (
          SELECT 1 FROM teacher_class_assignments tca 
          WHERE tca.teacher_id = t.id 
            AND tca.class_id = tc.id 
            AND tca.class_type = 'theology'
        )
        OR EXISTS (
          SELECT 1 FROM circular_classes cc
          WHERE cc.id = e.circular_class_id
            AND cc.class_teacher_id = t.id
        )
        OR t.role in ('DOS Theology','Administrator','admin','Head Teacher','Deputy Head Teacher')
      )
  )
);

COMMIT;

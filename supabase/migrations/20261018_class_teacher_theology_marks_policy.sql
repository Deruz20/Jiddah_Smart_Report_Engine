-- Migration: 20261018_class_teacher_theology_marks_policy.sql
-- Purpose: Allow Class Teachers to read/write theology marks strictly for students enrolled in their assigned classes.
-- Security Boundary: Strictly minimal — teachers access only assigned cohorts. Unassigned classes remain blocked (RLS 42501).
-- Idempotent transaction: DROP POLICY IF EXISTS + CREATE POLICY. No table/grant modifications.

BEGIN;

DROP POLICY IF EXISTS "theology_marks_access_policy" ON public.theology_marks;

CREATE POLICY "theology_marks_access_policy"
ON public.theology_marks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.theology_classes tc ON tc.id = e.theology_class_id
    JOIN public.teachers t ON t.auth_user_id = auth.uid()
    WHERE e.id = theology_marks.enrollment_id
      AND (
        -- 1. Subject/theology teacher assigned to student's theology class
        EXISTS (
          SELECT 1 FROM public.teacher_class_assignments tca 
          WHERE tca.teacher_id = t.id 
            AND tca.class_id = tc.id 
            AND tca.class_type = 'theology'
        )
        -- 2. Class Teacher assigned to student's circular class via junction table
        OR EXISTS (
          SELECT 1 FROM public.teacher_class_assignments tca
          WHERE tca.teacher_id = t.id
            AND tca.class_id = e.circular_class_id
            AND tca.class_type = 'circular'
        )
        -- 3. Class Teacher assigned via circular_classes.class_teacher_id reference
        OR EXISTS (
          SELECT 1 FROM public.circular_classes cc
          WHERE cc.id = e.circular_class_id
            AND cc.class_teacher_id = t.id
        )
        -- 4. Executive administrative oversight roles
        OR t.role = ANY (ARRAY['DOS Theology'::text, 'Administrator'::text, 'admin'::text, 'Head Teacher'::text, 'Deputy Head Teacher'::text])
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
          SELECT 1 FROM public.teacher_class_assignments tca
          WHERE tca.teacher_id = t.id
            AND tca.class_id = e.circular_class_id
            AND tca.class_type = 'circular'
        )
        OR EXISTS (
          SELECT 1 FROM public.circular_classes cc
          WHERE cc.id = e.circular_class_id
            AND cc.class_teacher_id = t.id
        )
        OR t.role = ANY (ARRAY['DOS Theology'::text, 'Administrator'::text, 'admin'::text, 'Head Teacher'::text, 'Deputy Head Teacher'::text])
      )
  )
);

COMMIT;

-- DRAFT: finalize against production probe output
-- Phase 1 Item D: Enable assigned Class Teachers to manage theology marks
--
-- IDENTITY KEY NOTE:
-- The `t.id = auth.uid()` branch supports legacy records where `auth_user_id` was not populated.
-- ACTION: Remove `t.id = auth.uid()` branch if probe `identity_keys` shows no rows with auth_user_id NULL.
--
-- ROLE PERMISSIONS NOTE:
-- Branch 1 allows ('Theology Instructor', 'Teacher', 'Class Teacher') assigned to theology classes.
-- Branches 2 & 3 allow ('Class Teacher') assigned to student's circular class.
-- Branch 4 allows leadership roles ('Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher', 'DOS', 'DOS Secular', 'DOS Theology', 'Theology Instructor').
-- Role-list reasoning: needs owner confirmation (Gate 1).
--
BEGIN;

DROP POLICY IF EXISTS "theology_marks_access_policy" ON public.theology_marks;
DROP POLICY IF EXISTS "theology_marks_manage_authorized_staff" ON public.theology_marks;

CREATE POLICY "theology_marks_manage_authorized_staff"
ON public.theology_marks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.enrollments e
    LEFT JOIN public.circular_classes cc ON cc.id = e.circular_class_id
    LEFT JOIN public.theology_classes tc ON tc.id = e.theology_class_id
    JOIN public.teachers t ON (t.auth_user_id = auth.uid() OR t.id = auth.uid())
    WHERE e.id = theology_marks.enrollment_id
      AND COALESCE(t.status, 'active') NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
      AND (
        -- 1. Subject/theology teacher explicitly assigned to student's theology class
        (
          t.role IN ('Theology Instructor', 'Teacher', 'Class Teacher')
          AND EXISTS (
            SELECT 1 FROM public.teacher_class_assignments tca
            WHERE tca.teacher_id = t.id
              AND tc.id IS NOT NULL
              AND tca.class_id = tc.id
          )
        )

        OR
        -- 3. Class teacher assigned to student's circular class via direct circular_classes reference
        (
          t.role = 'Class Teacher'
          AND cc.id IS NOT NULL 
          AND cc.class_teacher_id = t.id
        )
        OR
        -- 4. Leadership roles: Administrator, admin, Head Teacher, Deputy Head Teacher, DOS Theology, Theology Instructor (DOS Secular excluded from theology marks)
        (
          t.role IN ('Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher', 'DOS Theology', 'Theology Instructor')
          OR (t.role = 'DOS' AND lower(coalesce(t.subject, '')) <> 'secular')
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.enrollments e
    LEFT JOIN public.circular_classes cc ON cc.id = e.circular_class_id
    LEFT JOIN public.theology_classes tc ON tc.id = e.theology_class_id
    JOIN public.teachers t ON (t.auth_user_id = auth.uid() OR t.id = auth.uid())
    WHERE e.id = theology_marks.enrollment_id
      AND COALESCE(t.status, 'active') NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
      AND (
        -- 1. Subject/theology teacher explicitly assigned to student's theology class
        (
          t.role IN ('Theology Instructor', 'Teacher', 'Class Teacher')
          AND EXISTS (
            SELECT 1 FROM public.teacher_class_assignments tca
            WHERE tca.teacher_id = t.id
              AND tc.id IS NOT NULL
              AND tca.class_id = tc.id
          )
        )

        OR
        -- 3. Class teacher assigned to student's circular class via direct circular_classes reference
        (
          t.role = 'Class Teacher'
          AND cc.id IS NOT NULL 
          AND cc.class_teacher_id = t.id
        )
        OR
        -- 4. Leadership roles: Administrator, admin, Head Teacher, Deputy Head Teacher, DOS Theology, Theology Instructor (DOS Secular excluded from theology marks)
        (
          t.role IN ('Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher', 'DOS Theology', 'Theology Instructor')
          OR (t.role = 'DOS' AND lower(coalesce(t.subject, '')) <> 'secular')
        )
      )
  )
);

COMMIT;

-- DRAFT: finalize against production probe output
-- Phase 1 Item D: Enable assigned Class Teachers to manage theology marks
-- Authorizes:
-- 1. Subject/theology teachers explicitly assigned to student's theology class
-- 2. Class teachers assigned to student's circular class (via teacher_class_assignments or circular_classes)
-- 3. Leadership roles: Administrator, admin, Head Teacher, Deputy Head Teacher, DOS, DOS Secular, DOS Theology, Theology Instructor

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
    JOIN public.teachers t ON t.auth_user_id = auth.uid()
    WHERE e.id = theology_marks.enrollment_id
      AND COALESCE(t.status, 'active') NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
      AND (
        -- 1. Subject/theology teacher assigned to student's theology class
        EXISTS (
          SELECT 1 FROM public.teacher_class_assignments tca
          WHERE tca.teacher_id = t.id
            AND tc.id IS NOT NULL
            AND tca.class_id = tc.id
        )
        OR
        -- 2. Class teacher assigned to student's circular class via assignments table
        EXISTS (
          SELECT 1 FROM public.teacher_class_assignments tca
          WHERE tca.teacher_id = t.id
            AND cc.id IS NOT NULL
            AND tca.class_id = cc.id
        )
        OR
        -- 3. Class teacher assigned to student's circular class via direct circular_classes reference
        (cc.id IS NOT NULL AND cc.class_teacher_id = t.id)
        OR
        -- 4. Leadership roles: Administrator, admin, Head Teacher, Deputy Head Teacher, DOS, DOS Secular, DOS Theology, Theology Instructor
        t.role IN (
          'Administrator',
          'admin',
          'Head Teacher',
          'Deputy Head Teacher',
          'DOS',
          'DOS Secular',
          'DOS Theology',
          'Theology Instructor'
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
    JOIN public.teachers t ON t.auth_user_id = auth.uid()
    WHERE e.id = theology_marks.enrollment_id
      AND COALESCE(t.status, 'active') NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
      AND (
        EXISTS (
          SELECT 1 FROM public.teacher_class_assignments tca
          WHERE tca.teacher_id = t.id
            AND tc.id IS NOT NULL
            AND tca.class_id = tc.id
        )
        OR
        EXISTS (
          SELECT 1 FROM public.teacher_class_assignments tca
          WHERE tca.teacher_id = t.id
            AND cc.id IS NOT NULL
            AND tca.class_id = cc.id
        )
        OR
        (cc.id IS NOT NULL AND cc.class_teacher_id = t.id)
        OR
        t.role IN (
          'Administrator',
          'admin',
          'Head Teacher',
          'Deputy Head Teacher',
          'DOS',
          'DOS Secular',
          'DOS Theology',
          'Theology Instructor'
        )
      )
  )
);

COMMIT;

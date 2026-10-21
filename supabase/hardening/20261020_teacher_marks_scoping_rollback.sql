-- Generated from scratch/evidence/prod_probe_v3.3.0.txt.
-- DRAFT
-- DO NOT APPLY TO PRODUCTION
-- Rehearsal-only rollback. Restores both production mark policies verbatim.
BEGIN;

DROP POLICY IF EXISTS "teacher_class_assignments_self_select" ON public.teacher_class_assignments;
DROP POLICY IF EXISTS "theology_marks_access_policy" ON public.theology_marks;
DROP POLICY IF EXISTS "circular_marks_access_policy" ON public.circular_marks;

CREATE POLICY "circular_marks_access_policy"
ON public."circular_marks"
AS PERMISSIVE
FOR ALL
TO PUBLIC
USING ((EXISTS ( SELECT 1
   FROM ((enrollments e
     JOIN circular_classes cc ON ((cc.id = e.circular_class_id)))
     JOIN teachers t ON ((t.auth_user_id = auth.uid())))
  WHERE ((e.id = circular_marks.enrollment_id) AND ((EXISTS ( SELECT 1
           FROM teacher_class_assignments tca
          WHERE ((tca.teacher_id = t.id) AND (tca.class_id = cc.id) AND (tca.class_type = 'circular'::text)))) OR (cc.class_teacher_id = t.id) OR ((t.role)::text = ANY ((ARRAY['DOS Secular'::character varying, 'Administrator'::character varying, 'admin'::character varying, 'Head Teacher'::character varying, 'Deputy Head Teacher'::character varying])::text[])))))))
WITH CHECK ((EXISTS ( SELECT 1
   FROM ((enrollments e
     JOIN circular_classes cc ON ((cc.id = e.circular_class_id)))
     JOIN teachers t ON ((t.auth_user_id = auth.uid())))
  WHERE ((e.id = circular_marks.enrollment_id) AND ((EXISTS ( SELECT 1
           FROM teacher_class_assignments tca
          WHERE ((tca.teacher_id = t.id) AND (tca.class_id = cc.id) AND (tca.class_type = 'circular'::text)))) OR (cc.class_teacher_id = t.id) OR ((t.role)::text = ANY ((ARRAY['DOS Secular'::character varying, 'Administrator'::character varying, 'admin'::character varying, 'Head Teacher'::character varying, 'Deputy Head Teacher'::character varying])::text[])))))));

CREATE POLICY "theology_marks_access_policy"
ON public."theology_marks"
AS PERMISSIVE
FOR ALL
TO PUBLIC
USING ((EXISTS ( SELECT 1
   FROM ((enrollments e
     JOIN theology_classes tc ON ((tc.id = e.theology_class_id)))
     JOIN teachers t ON ((t.auth_user_id = auth.uid())))
  WHERE ((e.id = theology_marks.enrollment_id) AND ((EXISTS ( SELECT 1
           FROM teacher_class_assignments tca
          WHERE ((tca.teacher_id = t.id) AND (tca.class_id = tc.id) AND (tca.class_type = 'theology'::text)))) OR (EXISTS ( SELECT 1
           FROM circular_classes cc
          WHERE ((cc.id = e.circular_class_id) AND (cc.class_teacher_id = t.id)))) OR ((t.role)::text = ANY ((ARRAY['DOS Theology'::character varying, 'Administrator'::character varying, 'admin'::character varying, 'Head Teacher'::character varying, 'Deputy Head Teacher'::character varying])::text[])))))))
WITH CHECK ((EXISTS ( SELECT 1
   FROM ((enrollments e
     JOIN theology_classes tc ON ((tc.id = e.theology_class_id)))
     JOIN teachers t ON ((t.auth_user_id = auth.uid())))
  WHERE ((e.id = theology_marks.enrollment_id) AND ((EXISTS ( SELECT 1
           FROM teacher_class_assignments tca
          WHERE ((tca.teacher_id = t.id) AND (tca.class_id = tc.id) AND (tca.class_type = 'theology'::text)))) OR (EXISTS ( SELECT 1
           FROM circular_classes cc
          WHERE ((cc.id = e.circular_class_id) AND (cc.class_teacher_id = t.id)))) OR ((t.role)::text = ANY ((ARRAY['DOS Theology'::character varying, 'Administrator'::character varying, 'admin'::character varying, 'Head Teacher'::character varying, 'Deputy Head Teacher'::character varying])::text[])))))));

DROP FUNCTION IF EXISTS public.teacher_assigned(uuid, text);
DROP FUNCTION IF EXISTS public.current_teacher_ok();
DROP FUNCTION IF EXISTS public.current_teacher_id();

COMMIT;

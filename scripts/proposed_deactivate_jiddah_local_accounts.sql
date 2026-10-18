-- PROPOSED MIGRATION / CLEANUP SCRIPT
-- TARGET: 16 @jiddah.local Class Teacher synthetic accounts created 22-23 Sep
-- STATUS: PROPOSED DRAFT ONLY - DO NOT EXECUTE WITHOUT PRIOR CSV BACKUP AND OWNER SIGN-OFF
-- RATIONALE: Soft deactivation + Auth ban preserves foreign key historical integrity (marks, remarks).
--            Hard deletion (DROP/DELETE) risks cascading loss of marks authored during testing.

BEGIN;

-- 1. Identify target accounts into a temporary table for transaction isolation
CREATE TEMPORARY TABLE target_synthetic_teachers AS
SELECT id, auth_user_id, email, role, status
FROM public.teachers
WHERE email LIKE '%@jiddah.local';

-- 2. Soft deactivate profile in teachers table
UPDATE public.teachers
SET status = 'inactive',
    updated_at = NOW()
WHERE id IN (SELECT id FROM target_synthetic_teachers);

-- 3. Revoke active class teacher assignments so active class rosters are clean
-- (Preserves marks and remarks records untouched)
DELETE FROM public.teacher_class_assignments
WHERE teacher_id IN (SELECT id FROM target_synthetic_teachers);

-- Clear circular_classes.class_teacher_id if any target account was set as primary class teacher
UPDATE public.circular_classes
SET class_teacher_id = NULL
WHERE class_teacher_id IN (SELECT id FROM target_synthetic_teachers);

-- 4. Ban corresponding Supabase Auth accounts to immediately terminate active and future sessions
UPDATE auth.users
SET banned_until = '2999-01-01 00:00:00+00'
WHERE id IN (
  SELECT auth_user_id 
  FROM target_synthetic_teachers 
  WHERE auth_user_id IS NOT NULL
);

-- 5. Record deactivation event in audit log
INSERT INTO public.activity_logs (
  user_id,
  action,
  metadata,
  created_at
)
SELECT 
  auth.uid(),
  'batch_deactivate_synthetic_accounts',
  jsonb_build_object(
    'target_count', (SELECT count(*) FROM target_synthetic_teachers),
    'target_pattern', '%@jiddah.local',
    'deactivated_at', NOW()
  ),
  NOW()
WHERE auth.uid() IS NOT NULL;

-- Safety output verification
SELECT id, email, status FROM public.teachers WHERE id IN (SELECT id FROM target_synthetic_teachers);

COMMIT;

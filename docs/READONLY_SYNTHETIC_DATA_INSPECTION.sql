-- ============================================================================
-- READ-ONLY SYNTHETIC & TEST DATA INSPECTION (SAFE TO RUN IN PRODUCTION)
-- Target: Supabase Production SQL Editor
-- Governing Hard Limit: ZERO mutations. PURE SELECT QUERIES ONLY.
-- ============================================================================

-- 1. Identify Test Auth Users
SELECT 
  id, email, created_at, last_sign_in_at, raw_user_meta_data->>'role' as meta_role
FROM auth.users
WHERE email ILIKE '%teacher_a_%'
   OR email ILIKE '%teacher_b_%'
   OR email ILIKE '%audit_tr_%'
   OR email ILIKE '%tr.visual.%'
   OR email ILIKE '%@jiddah.local%'
   OR email ILIKE '%test.local%'
   OR email ILIKE '%test%'
ORDER BY created_at DESC;

-- 2. Identify Test Teachers
SELECT 
  id, auth_user_id, name, email, role, status, created_at
FROM public.teachers
WHERE email ILIKE '%teacher_a_%'
   OR email ILIKE '%teacher_b_%'
   OR email ILIKE '%audit_tr_%'
   OR email ILIKE '%tr.visual.%'
   OR email ILIKE '%@jiddah.local%'
   OR email ILIKE '%test%'
   OR name ILIKE '%Test%'
   OR name ILIKE '%Audit%'
ORDER BY created_at DESC;

-- 3. Identify Synthetic Students
SELECT 
  id, name, admission_number, gender, status, created_at
FROM public.students
WHERE name ILIKE '%test%'
   OR name ILIKE '%synthetic%'
   OR name ILIKE '%sample%'
   OR name ILIKE '%dummy%'
   OR admission_number ILIKE '%test%'
   OR created_at >= '2026-09-22 00:00:00+00' AND created_at <= '2026-09-24 23:59:59+00'
ORDER BY created_at DESC;

-- 4. Count Associated Marks for Synthetic Students or Test Teachers
SELECT 
  'circular_marks' as table_name, count(*) as count
FROM public.circular_marks cm
WHERE cm.enrollment_id IN (
  SELECT e.id FROM public.enrollments e
  JOIN public.students s ON s.id = e.student_id
  WHERE s.name ILIKE '%test%' OR s.name ILIKE '%sample%' OR s.admission_number ILIKE '%test%'
) OR cm.updated_by IN (
  SELECT t.id FROM public.teachers t
  WHERE t.email ILIKE '%@jiddah.local%' OR t.email ILIKE '%test%'
)
UNION ALL
SELECT 
  'theology_marks' as table_name, count(*) as count
FROM public.theology_marks tm
WHERE tm.enrollment_id IN (
  SELECT e.id FROM public.enrollments e
  JOIN public.students s ON s.id = e.student_id
  WHERE s.name ILIKE '%test%' OR s.name ILIKE '%sample%' OR s.admission_number ILIKE '%test%'
) OR tm.updated_by IN (
  SELECT t.id FROM public.teachers t
  WHERE t.email ILIKE '%@jiddah.local%' OR t.email ILIKE '%test%'
);

-- 5. Identify Test Teacher Invites
SELECT 
  id, email, name, role, status, created_at
FROM public.teacher_invites
WHERE email ILIKE '%@jiddah.local%'
   OR email ILIKE '%test%'
ORDER BY created_at DESC;

-- 6. Identify Test Signatures
SELECT 
  s.id, s.teacher_id, s.title, s.type, s.created_at, t.name as teacher_name
FROM public.signatures s
LEFT JOIN public.teachers t ON t.id = s.teacher_id
WHERE s.title ILIKE '%test%'
   OR t.email ILIKE '%@jiddah.local%'
   OR t.email ILIKE '%test%';

-- 7. Identify Test Notifications and Activity Logs
SELECT 
  'notifications' as entity, count(*) as count
FROM public.notifications
WHERE title ILIKE '%test%'
   OR message ILIKE '%test%'
   OR recipient_id IN (SELECT id FROM auth.users WHERE email ILIKE '%@jiddah.local%' OR email ILIKE '%test%')
UNION ALL
SELECT 
  'activity_log' as entity, count(*) as count
FROM public.activity_log
WHERE description ILIKE '%test%'
   OR teacher_id IN (SELECT id FROM public.teachers WHERE email ILIKE '%@jiddah.local%' OR email ILIKE '%test%');

-- 8. Identify Test Storage Objects in Buckets
SELECT 
  id, bucket_id, name, owner, created_at
FROM storage.objects
WHERE name ILIKE '%test%'
   OR owner IN (SELECT id FROM auth.users WHERE email ILIKE '%@jiddah.local%' OR email ILIKE '%test%')
ORDER BY created_at DESC;

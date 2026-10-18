-- Production Pre-Migration Inspection Probe
-- 100% Read-Only Queries (SELECT ONLY)
-- Covers: RLS flags, policies, grants, constraints, schema columns, views, status distribution, orphan IDs, @jiddah.local accounts, and table row counts

-- 1. Table row counts per public base table
SELECT 
  table_name, 
  (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint AS exact_row_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. RLS flag per public table
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- 3. All pg_policies for theology_marks and related tables
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. Grants for anon and authenticated on public tables
SELECT 
  table_name, 
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;

-- 5. Foreign key constraints on teachers and theology_marks
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name, 
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name 
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name 
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('teachers', 'theology_marks')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- 6. Column definitions for key core tables (F3 audit: theology_subjects, subjects, enrollments, teachers, theology_marks, circular_marks)
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('theology_subjects', 'subjects', 'enrollments', 'teachers', 'theology_marks', 'circular_marks')
ORDER BY table_name, ordinal_position;

-- 7. View definitions if any key tables are views (F3 view audit)
SELECT 
  c.relname AS view_name, 
  pg_get_viewdef(c.oid, true) AS view_definition 
FROM pg_class c 
JOIN pg_namespace n ON n.oid = c.relnamespace 
WHERE n.nspname = 'public' 
  AND c.relkind IN ('v', 'm')
  AND c.relname IN ('theology_subjects', 'subjects', 'enrollments', 'teachers', 'theology_marks', 'circular_marks');

-- 8. Status and Role distribution across teachers table (F2 production safety gate)
SELECT 
  status, 
  role, 
  count(*) AS total_count 
FROM public.teachers 
GROUP BY 1, 2 
ORDER BY 1 NULLS FIRST, 2;

-- 9. Orphaned teachers rows whose auth_user_id does not exist in auth.users (IDs and counts only, no emails/names)
SELECT 
  t.id AS orphaned_teacher_id, 
  t.auth_user_id,
  t.role, 
  t.status
FROM public.teachers t
LEFT JOIN auth.users u ON u.id = t.auth_user_id
WHERE t.auth_user_id IS NOT NULL 
  AND u.id IS NULL;

-- 10. Orphaned auth.users rows with no corresponding teachers row (IDs and counts only, no emails/names)
SELECT 
  u.id AS orphaned_auth_user_id, 
  u.created_at, 
  u.last_sign_in_at
FROM auth.users u
LEFT JOIN public.teachers t ON t.auth_user_id = u.id OR t.email = u.email
WHERE t.id IS NULL;

-- 11. Teachers with email LIKE '%@jiddah.local' with dependent row counts in marks and assignments (Part 2.i, IDs only, no names)
SELECT 
  t.id AS teacher_id, 
  t.role, 
  t.status, 
  t.created_at,
  (SELECT count(*) FROM public.circular_marks cm WHERE cm.updated_by = t.id) AS circular_marks_count,
  (SELECT count(*) FROM public.theology_marks tm WHERE tm.updated_by = t.id) AS theology_marks_count,
  (SELECT count(*) FROM public.teacher_class_assignments tca WHERE tca.teacher_id = t.id) AS assignments_count,
  (SELECT count(*) FROM public.grading_remarks gr WHERE gr.teacher_id = t.id) AS remarks_count
FROM public.teachers t
WHERE t.email LIKE '%@jiddah.local'
ORDER BY t.created_at;

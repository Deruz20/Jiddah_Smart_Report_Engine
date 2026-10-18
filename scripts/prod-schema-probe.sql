-- scripts/prod-schema-probe.sql
-- SELECT-ONLY Production Database Schema & Security State Probe
-- INSTRUCTIONS FOR OWNER: Run once in the Supabase Production SQL Editor and paste results.
-- Zero mutations. Zero side effects. Pure SELECT.

-- 1. Table RLS status across public schema
SELECT 
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relkind = 'r'
ORDER BY c.relname;

-- 2. Active Row Level Security policies
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

-- 3. Table-level role permissions / grants (authenticated, anon, service_role)
SELECT 
  table_schema,
  table_name,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('authenticated', 'anon', 'service_role')
  AND table_name IN ('teachers', 'theology_marks', 'circular_marks', 'enrollments', 'circular_classes', 'theology_classes')
ORDER BY table_name, grantee, privilege_type;

-- 4. Constraints and Foreign Keys on teachers and theology_marks
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('teachers', 'theology_marks')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- 5. Orphaned teachers rows whose auth_user_id does not exist in auth.users
SELECT 
  t.id AS teacher_id, 
  t.name, 
  t.email, 
  t.role, 
  t.status, 
  t.auth_user_id
FROM public.teachers t
LEFT JOIN auth.users u ON u.id = t.auth_user_id
WHERE t.auth_user_id IS NOT NULL 
  AND u.id IS NULL;

-- 6. Orphaned auth.users rows with no corresponding teachers row
SELECT 
  u.id AS auth_user_id, 
  u.email, 
  u.created_at, 
  u.last_sign_in_at
FROM auth.users u
LEFT JOIN public.teachers t ON t.auth_user_id = u.id OR t.email = u.email
WHERE t.id IS NULL;

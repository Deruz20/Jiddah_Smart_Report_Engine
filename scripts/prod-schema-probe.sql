-- PROD-SCHEMA-PROBE V3 (Single-Document Read-Only Inspection)
-- STRICT VERIFICATION:
-- 1. Executed inside BEGIN READ ONLY ... ROLLBACK block (zero writes guaranteed).
-- 2. Returns EXACTLY ONE JSON document containing all 12 audit sections.
-- 3. Zero names, emails, password hashes, or secret tokens are projected.

BEGIN READ ONLY;

SELECT json_build_object(
  'probe_version', 'v3.0.0',
  'executed_at', now(),

  -- 1. RLS Status per table
  'rls_status', (
    SELECT json_agg(json_build_object(
      'table_name', c.relname,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity
    ) ORDER BY c.relname)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ),

  -- 2. All pg_policies with expression text for all tables
  'policies', (
    SELECT json_agg(json_build_object(
      'schemaname', p.schemaname,
      'tablename', p.tablename,
      'policyname', p.policyname,
      'permissive', p.permissive,
      'roles', p.roles,
      'cmd', p.cmd,
      'qual', p.qual,
      'with_check', p.with_check
    ) ORDER BY p.tablename, p.policyname)
    FROM pg_policies p
    WHERE p.schemaname = 'public'
  ),

  -- 3. Grants for anon and authenticated
  'grants', (
    SELECT json_agg(json_build_object(
      'table_name', table_name,
      'grantee', grantee,
      'privilege_type', privilege_type,
      'is_grantable', is_grantable
    ) ORDER BY table_name, grantee, privilege_type)
    FROM information_schema.table_privileges
    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
  ),

  -- 4. Target table column definitions
  'columns', (
    SELECT json_agg(json_build_object(
      'table_name', table_name,
      'column_name', column_name,
      'data_type', data_type,
      'is_nullable', is_nullable,
      'column_default', column_default,
      'ordinal_position', ordinal_position
    ) ORDER BY table_name, ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'theology_subjects', 'subjects', 'enrollments', 'teachers',
        'theology_marks', 'circular_marks', 'theology_classes', 'circular_classes'
      )
  ),

  -- 5. Public view definitions
  'views', (
    SELECT coalesce(json_agg(json_build_object(
      'table_name', table_name,
      'view_definition', view_definition
    ) ORDER BY table_name), '[]'::json)
    FROM information_schema.views
    WHERE table_schema = 'public'
  ),

  -- 6. Check constraints on teachers
  'check_constraints', (
    SELECT coalesce(json_agg(json_build_object(
      'constraint_name', con.conname,
      'constraint_definition', pg_get_constraintdef(con.oid)
    ) ORDER BY con.conname), '[]'::json)
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'teachers' AND con.contype = 'c'
  ),

  -- 7. Foreign keys on teachers and theology_marks
  'foreign_keys', (
    SELECT json_agg(json_build_object(
      'table_name', c.relname,
      'constraint_name', con.conname,
      'definition', pg_get_constraintdef(con.oid)
    ) ORDER BY c.relname, con.conname)
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname IN ('teachers', 'theology_marks') AND con.contype = 'f'
  ),

  -- 8. Teachers status and role distribution (including NULL)
  'teacher_status_roles', (
    SELECT json_agg(json_build_object(
      'status', status,
      'role', role,
      'count', count
    ) ORDER BY status NULLS LAST, role NULLS LAST)
    FROM (
      SELECT status, role, count(*)::int AS count
      FROM public.teachers
      GROUP BY status, role
    ) s
  ),

  -- 9. Identity key distribution (id vs auth_user_id)
  'identity_keys', (
    SELECT json_build_object(
      'id_equals_auth_user_id', count(*) FILTER (WHERE id = auth_user_id)::int,
      'id_differs_auth_user_id', count(*) FILTER (WHERE id <> auth_user_id)::int,
      'auth_user_id_is_null', count(*) FILTER (WHERE auth_user_id IS NULL)::int,
      'total_teachers', count(*)::int
    )
    FROM public.teachers
  ),

  -- 10. Account orphans in both directions (IDs and counts only)
  'orphans', json_build_object(
    'teachers_without_auth_users', json_build_object(
      'count', (SELECT count(*)::int FROM public.teachers t WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.auth_user_id)),
      'ids', (SELECT coalesce(json_agg(t.id), '[]'::json) FROM public.teachers t WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.auth_user_id))
    ),
    'auth_users_without_teachers', json_build_object(
      'count', (SELECT count(*)::int FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.teachers t WHERE t.auth_user_id = u.id)),
      'ids', (SELECT coalesce(json_agg(u.id), '[]'::json) FROM auth.users u WHERE NOT EXISTS (SELECT 1 FROM public.teachers t WHERE t.auth_user_id = u.id))
    )
  ),

  -- 11. Synthetic @jiddah.local accounts dependent records (IDs and counts only)
  'jiddah_local_accounts', (
    SELECT coalesce(json_agg(json_build_object(
      'id', t.id,
      'role', t.role,
      'status', t.status,
      'created_at', t.created_at,
      'theology_marks_count', (SELECT count(*)::int FROM public.theology_marks tm WHERE tm.updated_by = t.id),
      'circular_marks_count', (SELECT count(*)::int FROM public.circular_marks cm WHERE cm.updated_by = t.id),
      'class_assignments_count', (SELECT count(*)::int FROM public.teacher_class_assignments tca WHERE tca.teacher_id = t.id)
    ) ORDER BY t.created_at ASC), '[]'::json)
    FROM public.teachers t
    WHERE t.email LIKE '%@jiddah.local'
  ),

  -- 12. Table row counts across public schema
  'table_row_counts', (
    SELECT json_object_agg(table_name, row_count)
    FROM (
      SELECT 
        c.relname AS table_name,
        c.reltuples::bigint AS row_count
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname
    ) rc
  )
) AS probe_v3_document;

ROLLBACK;

-- PROD-SCHEMA-PROBE V3.3.0 (Multi-Row Read-Only Inspection)
-- FORMAT: Result set of rows with columns (section text, payload jsonb).
-- EXPORTABLE AS CSV: No single cell truncates; entire audit is exportable in Supabase SQL Editor.
-- STRICT VERIFICATION:
-- 1. Returns one row per audit section (17 sections total).
-- 2. Zero names, emails, password hashes, or secret tokens are projected.
-- 3. Exact row counts computed dynamically via query_to_xml.
-- 4. Full exposure, bucket visibility, and teacher_classes_shape audit included.

SELECT
  'metadata'::text AS section,
  jsonb_build_object(
    'probe_version', 'v3.3.0',
    'executed_at', now()
  ) AS payload

UNION ALL

SELECT
  'rls_status'::text AS section,
  COALESCE(jsonb_agg(jsonb_build_object(
    'table_name', c.relname,
    'rls_enabled', c.relrowsecurity,
    'rls_forced', c.relforcerowsecurity
  ) ORDER BY c.relname), '[]'::jsonb) AS payload
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'

UNION ALL

SELECT
  'policies'::text AS section,
  COALESCE(jsonb_agg(jsonb_build_object(
    'schemaname', p.schemaname,
    'tablename', p.tablename,
    'policyname', p.policyname,
    'permissive', p.permissive,
    'roles', p.roles,
    'cmd', p.cmd,
    'qual', p.qual,
    'with_check', p.with_check
  ) ORDER BY p.tablename, p.policyname), '[]'::jsonb) AS payload
FROM pg_policies p
WHERE p.schemaname = 'public'

UNION ALL

SELECT
  'grants'::text AS section,
  COALESCE(jsonb_agg(jsonb_build_object(
    'table_name', table_name,
    'grantee', grantee,
    'privilege_type', privilege_type,
    'is_grantable', is_grantable
  ) ORDER BY table_name, grantee, privilege_type), '[]'::jsonb) AS payload
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')

UNION ALL

SELECT
  'columns'::text AS section,
  COALESCE(jsonb_agg(jsonb_build_object(
    'table_name', table_name,
    'column_name', column_name,
    'data_type', data_type,
    'is_nullable', is_nullable,
    'column_default', column_default,
    'ordinal_position', ordinal_position
  ) ORDER BY table_name, ordinal_position), '[]'::jsonb) AS payload
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'theology_subjects', 'subjects', 'enrollments', 'teachers',
    'theology_marks', 'circular_marks', 'theology_classes', 'circular_classes'
  )

UNION ALL

SELECT
  'fks'::text AS section,
  COALESCE(jsonb_agg(jsonb_build_object(
    'constraint_name', tc.constraint_name,
    'table_name', tc.table_name,
    'column_name', kcu.column_name,
    'foreign_table_name', ccu.table_name,
    'foreign_column_name', ccu.column_name
  ) ORDER BY tc.table_name, tc.constraint_name), '[]'::jsonb) AS payload
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'

UNION ALL

SELECT
  'indexes'::text AS section,
  COALESCE(jsonb_agg(jsonb_build_object(
    'tablename', tablename,
    'indexname', indexname,
    'indexdef', indexdef
  ) ORDER BY tablename, indexname), '[]'::jsonb) AS payload
FROM pg_indexes
WHERE schemaname = 'public'

UNION ALL

SELECT
  'triggers'::text AS section,
  COALESCE(jsonb_agg(jsonb_build_object(
    'trigger_name', trigger_name,
    'event_manipulation', event_manipulation,
    'event_object_table', event_object_table,
    'action_statement', action_statement,
    'action_timing', action_timing
  ) ORDER BY event_object_table, trigger_name), '[]'::jsonb) AS payload
FROM information_schema.triggers
WHERE trigger_schema = 'public'

UNION ALL

SELECT
  'row_counts'::text AS section,
  COALESCE(jsonb_object_agg(table_name, row_count), '{}'::jsonb) AS payload
FROM (
  SELECT
    table_name,
    xpath(
      '/row/c/text()',
      query_to_xml(format('SELECT count(*) AS c FROM %I', table_name), false, true, '')
    )::text[]::int[] as count_arr,
    (xpath(
      '/row/c/text()',
      query_to_xml(format('SELECT count(*) AS c FROM %I', table_name), false, true, '')
    )::text[]::int[])[1] as row_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
) sub

UNION ALL

SELECT
  'identity_keys'::text AS section,
  jsonb_build_object(
    'total_teachers', count(*),
    'auth_user_id_populated', count(auth_user_id),
    'auth_user_id_null', count(*) - count(auth_user_id),
    'id_equals_auth_uid_pattern', count(*) FILTER (WHERE auth_user_id IS NULL)
  ) AS payload
FROM public.teachers

UNION ALL

SELECT
  'orphan_users'::text AS section,
  jsonb_build_object(
    'teachers_without_auth_user', (
      SELECT count(*)
      FROM public.teachers t
      WHERE t.auth_user_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.auth_user_id)
    ),
    'auth_users_without_teacher_row', (
      SELECT count(*)
      FROM auth.users u
      WHERE NOT EXISTS (SELECT 1 FROM public.teachers t WHERE t.auth_user_id = u.id)
    )
  ) AS payload

UNION ALL

SELECT
  'theology_marks_policies'::text AS section,
  COALESCE(jsonb_agg(jsonb_build_object(
    'policyname', policyname,
    'cmd', cmd,
    'roles', roles,
    'qual', qual,
    'with_check', with_check
  ) ORDER BY policyname), '[]'::jsonb) AS payload
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'theology_marks'

UNION ALL

SELECT
  'authenticated_exposure'::text AS section,
  COALESCE(jsonb_agg(jsonb_build_object(
    'table_name', p.tablename,
    'policy_name', p.policyname,
    'roles', p.roles,
    'command', p.cmd,
    'using_expression', p.qual,
    'check_expression', p.with_check
  ) ORDER BY p.tablename, p.policyname), '[]'::jsonb) AS payload
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND (
    p.roles && ARRAY['authenticated'::name, 'public'::name]
    OR cardinality(p.roles) = 0
  )
  AND (
    p.qual IS NULL
    OR lower(btrim(p.qual)) = 'true'
    OR (COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, '')) !~* '\mteachers\M'
  )

UNION ALL

SELECT
  'user_notification_reads_policies'::text AS section,
  COALESCE(jsonb_agg(jsonb_build_object(
    'policyname', policyname,
    'cmd', cmd,
    'roles', roles,
    'qual', qual,
    'with_check', with_check
  ) ORDER BY policyname), '[]'::jsonb) AS payload
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_notification_reads'

UNION ALL

SELECT
  'exposure'::text AS section,
  COALESCE(jsonb_agg(jsonb_build_object(
    'table_name', t.table_name,
    'rls_enabled', COALESCE(c.relrowsecurity, false),
    'policy_count', (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.table_name),
    'anon_privileges', (
      SELECT COALESCE(jsonb_agg(privilege_type ORDER BY privilege_type), '[]'::jsonb)
      FROM information_schema.table_privileges tp
      WHERE tp.table_schema = 'public' AND tp.table_name = t.table_name AND tp.grantee = 'anon'
    ),
    'authenticated_privileges', (
      SELECT COALESCE(jsonb_agg(privilege_type ORDER BY privilege_type), '[]'::jsonb)
      FROM information_schema.table_privileges tp
      WHERE tp.table_schema = 'public' AND tp.table_name = t.table_name AND tp.grantee = 'authenticated'
    )
  ) ORDER BY t.table_name), '[]'::jsonb) AS payload
FROM information_schema.tables t
LEFT JOIN pg_class c ON c.relname = t.table_name
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'

UNION ALL

SELECT
  'storage_buckets'::text AS section,
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'public', b.public,
      'file_size_limit', b.file_size_limit,
      'allowed_mime_types', b.allowed_mime_types
    ) ORDER BY b.name)
    FROM storage.buckets b
  ), '[]'::jsonb) AS payload

UNION ALL

SELECT
  'teacher_classes_shape'::text AS section,
  jsonb_build_object(
    'teachers_with_non_empty_classes', count(*) FILTER (WHERE classes IS NOT NULL AND array_length(classes, 1) > 0),
    'teachers_with_empty_or_null_classes', count(*) FILTER (WHERE classes IS NULL OR array_length(classes, 1) IS NULL OR array_length(classes, 1) = 0),
    'elements_uuid_shaped', (
      SELECT count(*)
      FROM public.teachers t, unnest(t.classes) AS elem
      WHERE elem ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ),
    'elements_non_uuid_shaped', (
      SELECT count(*)
      FROM public.teachers t, unnest(t.classes) AS elem
      WHERE elem !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
  ) AS payload
FROM public.teachers;

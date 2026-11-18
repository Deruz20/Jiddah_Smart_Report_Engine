-- ============================================================================
-- PHASE 1 AMENDMENT 2 (P6) & AMENDMENT 3 (A5)
-- READ-ONLY PRODUCTION DIAGNOSTIC SQL (SELECT ONLY — ZERO MUTATIONS)
-- Run this in Supabase Dashboard -> SQL Editor and paste the JSON output back.
-- ============================================================================

WITH
-- 1. Role & Status summary across public.teachers
role_summary AS (
  SELECT
    role,
    status,
    count(*)::int AS count
  FROM public.teachers
  GROUP BY role, status
  ORDER BY role, status
),

-- 2. Auth vs Staff row alignment issues (missing auth_user_id, email mismatch, role mismatch, orphans)
auth_staff_mismatches AS (
  SELECT
    t.id AS teacher_id,
    t.name AS teacher_name,
    t.email AS teacher_email,
    t.role AS teacher_role,
    t.subject AS teacher_department,
    t.status AS teacher_status,
    t.auth_user_id,
    u.id AS matched_auth_uid,
    u.email AS auth_email,
    u.raw_user_meta_data->>'role' AS auth_meta_role,
    CASE
      WHEN t.auth_user_id IS NULL AND u.id IS NOT NULL THEN 'auth_user_id_is_null_but_id_or_email_matches'
      WHEN u.id IS NULL THEN 'teacher_row_has_no_auth_user'
      WHEN lower(coalesce(t.email, '')) <> lower(coalesce(u.email, '')) THEN 'email_mismatch_between_teachers_and_auth'
      WHEN coalesce(t.role, '') <> coalesce(u.raw_user_meta_data->>'role', '') THEN 'role_differs_from_auth_user_metadata'
      ELSE 'ok'
    END AS issue
  FROM public.teachers t
  LEFT JOIN auth.users u
    ON u.id = COALESCE(t.auth_user_id, t.id)
    OR (t.auth_user_id IS NULL AND lower(u.email) = lower(t.email))
  WHERE t.auth_user_id IS NULL
     OR u.id IS NULL
     OR lower(coalesce(t.email, '')) <> lower(coalesce(u.email, ''))
     OR coalesce(t.role, '') <> coalesce(u.raw_user_meta_data->>'role', '')
),

-- 3. Auth users that have no corresponding row in public.teachers
orphan_auth_users AS (
  SELECT
    u.id AS auth_uid,
    u.email,
    u.raw_user_meta_data->>'role' AS meta_role,
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  LEFT JOIN public.teachers t
    ON t.auth_user_id = u.id
    OR t.id = u.id
    OR lower(t.email) = lower(u.email)
  WHERE t.id IS NULL
),

-- 4. Assignment alignment & raw UUID resolution (specifically checking Administrator & all teachers)
assignment_audit AS (
  SELECT
    t.id AS teacher_id,
    t.name,
    t.email,
    t.role,
    t.subject,
    t.classes AS raw_teachers_classes_column,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'raw_token', tok,
            'resolved_circular_class', cc.class_name,
            'resolved_theology_class', COALESCE(tc.class_name_english, tc.class_name_arabic)
          )
        )
        FROM unnest(COALESCE(t.classes, ARRAY[]::text[])) AS tok
        LEFT JOIN public.circular_classes cc ON cc.id::text = tok
        LEFT JOIN public.theology_classes tc ON tc.id::text = tok
      ),
      '[]'::jsonb
    ) AS resolved_classes_column_tokens,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'class_id', tca.class_id,
            'class_type', tca.class_type,
            'class_name', COALESCE(cc2.class_name, tc2.class_name_english, tc2.class_name_arabic)
          )
        )
        FROM public.teacher_class_assignments tca
        LEFT JOIN public.circular_classes cc2 ON cc2.id = tca.class_id
        LEFT JOIN public.theology_classes tc2 ON tc2.id = tca.class_id
        WHERE tca.teacher_id = t.id
      ),
      '[]'::jsonb
    ) AS teacher_class_assignments_rows,
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object('class_id', cc3.id, 'class_name', cc3.class_name))
        FROM public.circular_classes cc3
        WHERE cc3.class_teacher_id = t.id
      ),
      '[]'::jsonb
    ) AS homeroom_class_teacher_rows
  FROM public.teachers t
  WHERE t.role IN ('Administrator', 'admin')
     OR COALESCE(array_length(t.classes, 1), 0) > 0
     OR EXISTS (SELECT 1 FROM public.teacher_class_assignments tca WHERE tca.teacher_id = t.id)
     OR EXISTS (SELECT 1 FROM public.circular_classes cc WHERE cc.class_teacher_id = t.id)
),

-- 5. Leftover synthetic / test / seed accounts in public.teachers or auth.users
synthetic_accounts AS (
  SELECT
    'teachers' AS source_table,
    t.id::text AS record_id,
    t.email,
    t.name,
    t.role,
    t.status
  FROM public.teachers t
  WHERE t.email ILIKE '%@jiddah.local%'
     OR t.email ILIKE '%@test.local%'
     OR t.email ILIKE 'teacher_a_%'
     OR t.email ILIKE 'teacher_b_%'
     OR t.email ILIKE 'audit_tr_%'
     OR t.name ILIKE '%Synthetic%'
     OR t.name ILIKE '%Test%'
  UNION ALL
  SELECT
    'auth.users' AS source_table,
    u.id::text AS record_id,
    u.email,
    u.raw_user_meta_data->>'name' AS name,
    u.raw_user_meta_data->>'role' AS role,
    CASE WHEN u.banned_until IS NOT NULL AND u.banned_until > now() THEN 'banned' ELSE 'active' END AS status
  FROM auth.users u
  WHERE u.email ILIKE '%@jiddah.local%'
     OR u.email ILIKE '%@test.local%'
     OR u.email ILIKE 'teacher_a_%'
     OR u.email ILIKE 'teacher_b_%'
     OR u.email ILIKE 'audit_tr_%'
)

SELECT jsonb_pretty(
  jsonb_build_object(
    'generated_at', now(),
    '1_role_summary', COALESCE((SELECT jsonb_agg(row_to_json(role_summary)) FROM role_summary), '[]'::jsonb),
    '2_auth_staff_mismatches', COALESCE((SELECT jsonb_agg(row_to_json(auth_staff_mismatches)) FROM auth_staff_mismatches), '[]'::jsonb),
    '3_orphan_auth_users', COALESCE((SELECT jsonb_agg(row_to_json(orphan_auth_users)) FROM orphan_auth_users), '[]'::jsonb),
    '4_assignment_and_uuid_audit', COALESCE((SELECT jsonb_agg(row_to_json(assignment_audit)) FROM assignment_audit), '[]'::jsonb),
    '5_leftover_synthetic_accounts', COALESCE((SELECT jsonb_agg(row_to_json(synthetic_accounts)) FROM synthetic_accounts), '[]'::jsonb)
  )
) AS diagnostic_report;

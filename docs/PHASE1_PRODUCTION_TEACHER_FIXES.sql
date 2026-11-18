-- ============================================================================
-- PHASE 1 PRODUCTION DATA REMEDIATION & SYNTHETIC ACCOUNT CLEANUP
-- Target: Supabase Production SQL Editor (MANUAL EXECUTION ONLY — NOT AUTO-APPLIED)
--
-- Schema naming reference (confirmed from migrations & diagnostic):
--   - Secular classes & marks live in: public.circular_classes, public.circular_marks
--   - Theology classes & marks live in: public.theology_classes, public.theology_marks
--
-- PRE-FLIGHT SAFETY CHECKLIST BEFORE RUNNING ON PRODUCTION:
--   1. Export CSV backups of: teachers, teacher_class_assignments, teacher_invites,
--      circular_classes, circular_marks, theology_marks (see docs/PROD_BACKUP_CSV_PROCEDURE.md).
--   2. Apply supabase/migrations/20261117000001_phase1_rbac_principal_and_permissions.sql first
--      so teachers.role and role_permissions support all canonical roles.
--   3. This script runs in a single atomic transaction (BEGIN ... COMMIT) and ends with a
--      read-only verification snapshot.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Align System Admin (hassanhatima20@gmail.com) Auth Metadata & Teacher Role
--    Fixes: auth_meta_role = 'admin' while public.teachers.role = 'Administrator'
-- ============================================================================
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"Administrator"'::jsonb,
  true
)
WHERE lower(email) = 'hassanhatima20@gmail.com';

UPDATE public.teachers t
SET
  role = 'Administrator',
  status = COALESCE(NULLIF(trim(t.status), ''), 'active'),
  auth_user_id = COALESCE(
    t.auth_user_id,
    (SELECT u.id FROM auth.users u WHERE lower(u.email) = 'hassanhatima20@gmail.com' LIMIT 1)
  )
WHERE lower(t.email) = 'hassanhatima20@gmail.com';

-- ============================================================================
-- 2. Fix Swapped Theology -> Secular Class UUIDs for Secular Class Teachers
--    - Mum. Nafula Maureen (moureen@gmail.com):
--        e16b9c2c-ead3-45d6-94c6-98cd3285254c (P.6 Theology)
--        -> beff121c-3189-404e-a187-4d945a2fcab1 (P.6 Secular / circular_classes)
--    - Biryamalaki Anatoli (anatoli@gmail.com):
--        a0d05ac7-a631-4c17-a07d-e0049fb6cd35 (P.7 Theology)
--        -> b86fa625-3636-4d46-ae2f-ea5b7a628fa7 (P.7 Secular / circular_classes)
-- ============================================================================
DO $$
DECLARE
  v_maureen_id uuid;
  v_anatoli_id uuid;
  v_p6_theo uuid := 'e16b9c2c-ead3-45d6-94c6-98cd3285254c';
  v_p6_sec  uuid := 'beff121c-3189-404e-a187-4d945a2fcab1';
  v_p7_theo uuid := 'a0d05ac7-a631-4c17-a07d-e0049fb6cd35';
  v_p7_sec  uuid := 'b86fa625-3636-4d46-ae2f-ea5b7a628fa7';
BEGIN
  -- 2A. Mum. Nafula Maureen
  SELECT id INTO v_maureen_id FROM public.teachers WHERE lower(email) = 'moureen@gmail.com' LIMIT 1;
  IF v_maureen_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.circular_classes WHERE id = v_p6_sec) THEN
    UPDATE public.teachers t
    SET classes = (
      SELECT COALESCE(array_agg(DISTINCT tok), ARRAY[]::text[])
      FROM (
        SELECT CASE WHEN trim(x) = v_p6_theo::text THEN v_p6_sec::text ELSE trim(x) END AS tok
        FROM unnest(COALESCE(t.classes, ARRAY[]::text[]) || ARRAY[v_p6_sec::text]) AS x
        WHERE x IS NOT NULL AND trim(x) <> '' AND trim(x) <> v_p6_theo::text
      ) s
    )
    WHERE t.id = v_maureen_id;

    DELETE FROM public.teacher_class_assignments
    WHERE teacher_id = v_maureen_id
      AND class_id = v_p6_theo;

    INSERT INTO public.teacher_class_assignments (teacher_id, class_id, class_type)
    VALUES (v_maureen_id, v_p6_sec, 'circular')
    ON CONFLICT (teacher_id, class_id) DO UPDATE SET class_type = 'circular';
  END IF;

  -- 2B. Biryamalaki Anatoli
  SELECT id INTO v_anatoli_id FROM public.teachers WHERE lower(email) = 'anatoli@gmail.com' LIMIT 1;
  IF v_anatoli_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.circular_classes WHERE id = v_p7_sec) THEN
    UPDATE public.teachers t
    SET classes = (
      SELECT COALESCE(array_agg(DISTINCT tok), ARRAY[]::text[])
      FROM (
        SELECT CASE WHEN trim(x) = v_p7_theo::text THEN v_p7_sec::text ELSE trim(x) END AS tok
        FROM unnest(COALESCE(t.classes, ARRAY[]::text[]) || ARRAY[v_p7_sec::text]) AS x
        WHERE x IS NOT NULL AND trim(x) <> '' AND trim(x) <> v_p7_theo::text
      ) s
    )
    WHERE t.id = v_anatoli_id;

    DELETE FROM public.teacher_class_assignments
    WHERE teacher_id = v_anatoli_id
      AND class_id = v_p7_theo;

    INSERT INTO public.teacher_class_assignments (teacher_id, class_id, class_type)
    VALUES (v_anatoli_id, v_p7_sec, 'circular')
    ON CONFLICT (teacher_id, class_id) DO UPDATE SET class_type = 'circular';
  END IF;
END $$;

-- ============================================================================
-- 3. Backfill Zulfa Abdul (zulfa@gmail.com) teacher_class_assignments
--    Resolves Baby / Middle / Top tokens (either UUID strings OR class names)
--    into canonical public.circular_classes UUIDs and populates join table rows.
-- ============================================================================
DO $$
DECLARE
  v_zulfa_id uuid;
BEGIN
  SELECT id INTO v_zulfa_id FROM public.teachers WHERE lower(email) = 'zulfa@gmail.com' LIMIT 1;
  IF v_zulfa_id IS NOT NULL THEN
    INSERT INTO public.teacher_class_assignments (teacher_id, class_id, class_type)
    SELECT DISTINCT v_zulfa_id, cc.id, 'circular'
    FROM public.teachers t
    CROSS JOIN LATERAL unnest(COALESCE(t.classes, ARRAY[]::text[])) AS tok
    JOIN public.circular_classes cc
      ON cc.id::text = trim(tok)
      OR lower(trim(cc.class_name)) = lower(trim(tok))
    WHERE t.id = v_zulfa_id
    ON CONFLICT (teacher_id, class_id) DO UPDATE SET class_type = 'circular';

    -- Normalize Zulfa's teachers.classes array to canonical circular_classes UUID strings
    UPDATE public.teachers t
    SET classes = COALESCE(
      (
        SELECT array_agg(DISTINCT cc.id::text ORDER BY cc.id::text)
        FROM public.teacher_class_assignments tca
        JOIN public.circular_classes cc ON cc.id = tca.class_id
        WHERE tca.teacher_id = t.id
          AND tca.class_type = 'circular'
      ),
      t.classes
    )
    WHERE t.id = v_zulfa_id;
  END IF;
END $$;

-- ============================================================================
-- 4. Split Legacy 'DOS' Roles & Clean Mixed Class UUIDs
--    - Shk. Woira Ibrahim (ibrahimwoira8@gmail.com, Theology) -> 'DOS Theology'
--    - BBAALE HERBERT (bbaale@gmail.com, Secular) -> 'DOS Secular' + purge Theology UUIDs
-- ============================================================================
-- 4A. Shk. Woira Ibrahim -> DOS Theology
UPDATE public.teachers t
SET
  role = 'DOS Theology',
  subject = 'Theology',
  auth_user_id = COALESCE(
    t.auth_user_id,
    (SELECT u.id FROM auth.users u WHERE lower(u.email) = 'ibrahimwoira8@gmail.com' LIMIT 1)
  )
WHERE lower(t.email) = 'ibrahimwoira8@gmail.com';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"DOS Theology"'::jsonb,
  true
)
WHERE lower(email) = 'ibrahimwoira8@gmail.com';

INSERT INTO public.teacher_class_assignments (teacher_id, class_id, class_type)
SELECT DISTINCT t.id, tc.id, 'theology'
FROM public.teachers t
CROSS JOIN LATERAL unnest(COALESCE(t.classes, ARRAY[]::text[])) AS tok
JOIN public.theology_classes tc ON tc.id::text = trim(tok)
WHERE lower(t.email) = 'ibrahimwoira8@gmail.com'
ON CONFLICT (teacher_id, class_id) DO NOTHING;

-- 4B. BBAALE HERBERT -> DOS Secular (remove Theology class UUIDs & assignments)
UPDATE public.teachers t
SET
  role = 'DOS Secular',
  subject = 'Secular',
  auth_user_id = COALESCE(
    t.auth_user_id,
    (SELECT u.id FROM auth.users u WHERE lower(u.email) = 'bbaale@gmail.com' LIMIT 1)
  ),
  classes = COALESCE(
    (
      SELECT array_agg(DISTINCT cc.id::text ORDER BY cc.id::text)
      FROM unnest(COALESCE(t.classes, ARRAY[]::text[])) AS tok
      JOIN public.circular_classes cc
        ON cc.id::text = trim(tok)
        OR lower(trim(cc.class_name)) = lower(trim(tok))
      WHERE NOT EXISTS (
        SELECT 1 FROM public.theology_classes tc WHERE tc.id::text = trim(tok)
      )
    ),
    ARRAY[]::text[]
  )
WHERE lower(t.email) = 'bbaale@gmail.com';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"DOS Secular"'::jsonb,
  true
)
WHERE lower(email) = 'bbaale@gmail.com';

DELETE FROM public.teacher_class_assignments tca
USING public.teachers t
WHERE tca.teacher_id = t.id
  AND lower(t.email) = 'bbaale@gmail.com'
  AND (
    tca.class_type = 'theology'
    OR EXISTS (SELECT 1 FROM public.theology_classes tc WHERE tc.id = tca.class_id)
  );

INSERT INTO public.teacher_class_assignments (teacher_id, class_id, class_type)
SELECT DISTINCT t.id, cc.id, 'circular'
FROM public.teachers t
CROSS JOIN LATERAL unnest(COALESCE(t.classes, ARRAY[]::text[])) AS tok
JOIN public.circular_classes cc ON cc.id::text = trim(tok)
WHERE lower(t.email) = 'bbaale@gmail.com'
ON CONFLICT (teacher_id, class_id) DO UPDATE SET class_type = 'circular';

-- ============================================================================
-- 5. Clean Up Banned Synthetic / Local-Test Staff Accounts
--    Uses pg_constraint FK discovery + information_schema.columns verification
--    so NO table or column name is ever assumed or hardcoded blindly.
-- ============================================================================
DO $$
DECLARE
  v_synthetic_teacher_ids uuid[] := ARRAY[]::uuid[];
  v_synthetic_auth_ids uuid[] := ARRAY[]::uuid[];
  v_fk record;
  v_col record;
  v_cleanup_candidates text[][] := ARRAY[
    ARRAY['activity_log', 'teacher_id', 'delete'],
    ARRAY['activity_log', 'user_id', 'delete'],
    ARRAY['activity_log', 'actor_id', 'delete'],
    ARRAY['activity_logs', 'user_id', 'delete'],
    ARRAY['activity_logs', 'teacher_id', 'delete'],
    ARRAY['activity_logs', 'actor_id', 'delete'],
    ARRAY['audit_logs', 'actor_id', 'null'],
    ARRAY['signatures', 'teacher_id', 'delete'],
    ARRAY['signatures', 'user_id', 'delete'],
    ARRAY['notifications', 'recipient_id', 'delete'],
    ARRAY['notifications', 'user_id', 'delete'],
    ARRAY['notification_reads', 'user_id', 'delete'],
    ARRAY['teacher_classes', 'teacher_id', 'delete'],
    ARRAY['user_profiles', 'id', 'delete'],
    ARRAY['user_profiles', 'user_id', 'delete'],
    ARRAY['marks_audit_log', 'changed_by', 'null'],
    ARRAY['attendance', 'recorded_by', 'null'],
    ARRAY['school_settings', 'updated_by', 'null']
  ];
  v_item text[];
  v_is_nullable text;
BEGIN
  SELECT COALESCE(array_agg(t.id), ARRAY[]::uuid[])
  INTO v_synthetic_teacher_ids
  FROM public.teachers t
  WHERE (
    t.email ILIKE '%@jiddah.local%'
    OR t.email ILIKE '%@jiddahschool.local%'
    OR t.email ILIKE '%@test.local%'
    OR t.email ILIKE 'teacher_a_%'
    OR t.email ILIKE 'teacher_b_%'
    OR t.email ILIKE 'audit_tr_%'
  )
  AND t.email NOT ILIKE '%@gmail.com%'
  AND t.email NOT ILIKE '%@jiddahislamic.ac.ug%';

  SELECT COALESCE(array_agg(DISTINCT uid), ARRAY[]::uuid[])
  INTO v_synthetic_auth_ids
  FROM (
    SELECT u.id AS uid
    FROM auth.users u
    WHERE (
      u.email ILIKE '%@jiddah.local%'
      OR u.email ILIKE '%@jiddahschool.local%'
      OR u.email ILIKE '%@test.local%'
      OR u.email ILIKE 'teacher_a_%'
      OR u.email ILIKE 'teacher_b_%'
      OR u.email ILIKE 'audit_tr_%'
    )
    AND u.email NOT ILIKE '%@gmail.com%'
    AND u.email NOT ILIKE '%@jiddahislamic.ac.ug%'
    UNION
    SELECT t.auth_user_id AS uid
    FROM public.teachers t
    WHERE t.id = ANY(v_synthetic_teacher_ids)
      AND t.auth_user_id IS NOT NULL
  ) q;

  -- 5A. Dynamically discover and detach/delete EVERY FK referencing public.teachers(id)
  IF array_length(v_synthetic_teacher_ids, 1) > 0 THEN
    FOR v_fk IN
      SELECT DISTINCT
        ns.nspname AS schema_name,
        cls.relname AS table_name,
        att.attname AS column_name,
        att.attnotnull AS is_not_null
      FROM pg_constraint con
      JOIN pg_class cls ON cls.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = cls.relnamespace
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
      WHERE con.contype = 'f'
        AND con.confrelid = 'public.teachers'::regclass
        AND ns.nspname = 'public'
        AND cls.relname <> 'teachers'
      ORDER BY ns.nspname, cls.relname, att.attname
    LOOP
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = v_fk.schema_name
          AND c.table_name = v_fk.table_name
          AND c.column_name = v_fk.column_name
      ) THEN
        IF v_fk.is_not_null OR v_fk.table_name IN ('teacher_class_assignments', 'signatures', 'teacher_classes') THEN
          EXECUTE format('DELETE FROM %I.%I WHERE %I = ANY($1)', v_fk.schema_name, v_fk.table_name, v_fk.column_name)
          USING v_synthetic_teacher_ids;
        ELSE
          EXECUTE format('UPDATE %I.%I SET %I = NULL WHERE %I = ANY($1)', v_fk.schema_name, v_fk.table_name, v_fk.column_name, v_fk.column_name)
          USING v_synthetic_teacher_ids;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- 5B. Candidate auxiliary tables without declared FKs — ALWAYS verify table + column + type via information_schema.columns
  IF COALESCE(array_length(v_synthetic_teacher_ids, 1), 0) > 0
     OR COALESCE(array_length(v_synthetic_auth_ids, 1), 0) > 0 THEN
    FOREACH v_item SLICE 1 IN ARRAY v_cleanup_candidates
    LOOP
      SELECT c.is_nullable
      INTO v_is_nullable
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = v_item[1]
        AND c.column_name = v_item[2]
        AND c.data_type IN ('uuid', 'text', 'character varying')
      LIMIT 1;

      IF v_is_nullable IS NOT NULL THEN
        IF v_item[3] = 'delete' OR v_is_nullable = 'NO' THEN
          EXECUTE format(
            'DELETE FROM public.%I WHERE %I::text = ANY($1) OR %I::text = ANY($2)',
            v_item[1], v_item[2], v_item[2]
          )
          USING COALESCE(v_synthetic_teacher_ids::text[], ARRAY[]::text[]),
                COALESCE(v_synthetic_auth_ids::text[], ARRAY[]::text[]);
        ELSE
          EXECUTE format(
            'UPDATE public.%I SET %I = NULL WHERE %I::text = ANY($1) OR %I::text = ANY($2)',
            v_item[1], v_item[2], v_item[2], v_item[2]
          )
          USING COALESCE(v_synthetic_teacher_ids::text[], ARRAY[]::text[]),
                COALESCE(v_synthetic_auth_ids::text[], ARRAY[]::text[]);
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- 5C. Clean up synthetic invites (if table/email column exist) and delete synthetic teacher rows
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_invites' AND column_name = 'email'
  ) THEN
    DELETE FROM public.teacher_invites
    WHERE (
      email ILIKE '%@jiddah.local%'
      OR email ILIKE '%@jiddahschool.local%'
      OR email ILIKE '%@test.local%'
      OR email ILIKE 'teacher_a_%'
      OR email ILIKE 'teacher_b_%'
      OR email ILIKE 'audit_tr_%'
    )
    AND email NOT ILIKE '%@gmail.com%'
    AND email NOT ILIKE '%@jiddahislamic.ac.ug%';
  END IF;

  IF array_length(v_synthetic_teacher_ids, 1) > 0 THEN
    DELETE FROM public.teachers
    WHERE id = ANY(v_synthetic_teacher_ids);
  END IF;

  -- 5D. Detach any remaining non-synthetic teachers.auth_user_id pointing to synthetic auth.users
  IF array_length(v_synthetic_auth_ids, 1) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'teachers' AND column_name = 'auth_user_id'
    ) THEN
      UPDATE public.teachers
      SET auth_user_id = NULL
      WHERE auth_user_id = ANY(v_synthetic_auth_ids);
    END IF;

    -- 5E. Dynamically discover EVERY non-auth FK referencing auth.users(id)
    FOR v_fk IN
      SELECT DISTINCT
        ns.nspname AS schema_name,
        cls.relname AS table_name,
        att.attname AS column_name,
        att.attnotnull AS is_not_null
      FROM pg_constraint con
      JOIN pg_class cls ON cls.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = cls.relnamespace
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
      WHERE con.contype = 'f'
        AND con.confrelid = 'auth.users'::regclass
        AND ns.nspname = 'public'
      ORDER BY ns.nspname, cls.relname, att.attname
    LOOP
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = v_fk.schema_name
          AND c.table_name = v_fk.table_name
          AND c.column_name = v_fk.column_name
      ) THEN
        IF v_fk.is_not_null OR v_fk.table_name IN ('notification_reads', 'notifications', 'signatures', 'activity_log', 'activity_logs') THEN
          EXECUTE format('DELETE FROM %I.%I WHERE %I = ANY($1)', v_fk.schema_name, v_fk.table_name, v_fk.column_name)
          USING v_synthetic_auth_ids;
        ELSE
          EXECUTE format('UPDATE %I.%I SET %I = NULL WHERE %I = ANY($1)', v_fk.schema_name, v_fk.table_name, v_fk.column_name, v_fk.column_name)
          USING v_synthetic_auth_ids;
        END IF;
      END IF;
    END LOOP;

    -- 5F. Detach storage.objects ownership if present & nullable before deleting auth.users
    FOR v_col IN
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_schema = 'storage'
        AND table_name = 'objects'
        AND column_name IN ('owner', 'owner_id')
        AND data_type IN ('uuid', 'text')
    LOOP
      IF v_col.is_nullable = 'YES' THEN
        IF v_col.data_type = 'uuid' THEN
          EXECUTE format('UPDATE storage.objects SET %I = NULL WHERE %I = ANY($1)', v_col.column_name, v_col.column_name)
          USING v_synthetic_auth_ids;
        ELSE
          EXECUTE format('UPDATE storage.objects SET %I = NULL WHERE %I = ANY($1)', v_col.column_name, v_col.column_name)
          USING v_synthetic_auth_ids::text[];
        END IF;
      END IF;
    END LOOP;

    -- 5G. Finally delete synthetic auth.users rows cleanly
    DELETE FROM auth.users
    WHERE id = ANY(v_synthetic_auth_ids);
  END IF;
END $$;

-- ============================================================================
-- 6. Post-Fix Verification Snapshot
-- ============================================================================
SELECT
  t.name,
  t.email,
  t.role AS teacher_role,
  u.raw_user_meta_data->>'role' AS auth_meta_role,
  t.subject,
  t.status,
  t.classes,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'class_id', tca.class_id,
          'class_type', tca.class_type,
          'class_name', COALESCE(cc.class_name, tc.class_name_english, tc.class_name_arabic)
        )
      )
      FROM public.teacher_class_assignments tca
      LEFT JOIN public.circular_classes cc ON cc.id = tca.class_id
      LEFT JOIN public.theology_classes tc ON tc.id = tca.class_id
      WHERE tca.teacher_id = t.id
    ),
    '[]'::jsonb
  ) AS synced_assignments
FROM public.teachers t
LEFT JOIN auth.users u ON u.id = COALESCE(t.auth_user_id, t.id)
WHERE lower(t.email) IN (
  'hassanhatima20@gmail.com',
  'moureen@gmail.com',
  'anatoli@gmail.com',
  'zulfa@gmail.com',
  'ibrahimwoira8@gmail.com',
  'bbaale@gmail.com'
)
ORDER BY t.email;

SELECT count(*)::int AS remaining_synthetic_accounts
FROM (
  SELECT id FROM public.teachers
  WHERE email ILIKE '%@jiddah.local%' OR email ILIKE '%@jiddahschool.local%' OR email ILIKE '%@test.local%'
     OR email ILIKE 'teacher_a_%' OR email ILIKE 'teacher_b_%' OR email ILIKE 'audit_tr_%'
  UNION ALL
  SELECT id FROM auth.users
  WHERE email ILIKE '%@jiddah.local%' OR email ILIKE '%@jiddahschool.local%' OR email ILIKE '%@test.local%'
     OR email ILIKE 'teacher_a_%' OR email ILIKE 'teacher_b_%' OR email ILIKE 'audit_tr_%'
) leftovers;

COMMIT;

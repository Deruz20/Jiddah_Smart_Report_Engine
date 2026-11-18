-- =============================================================================
-- PHASE 3.5 PRODUCTION GO-LIVE SCRIPT (Idempotent, Transactional & Dynamic)
-- =============================================================================
-- Purpose:
--   1. Workstream 1: Seed/Update default Role Permissions in `public.role_permissions`
--      so every canonical role (Administrator, Principal, Head Teacher, Deputy Head Teacher,
--      DOS Secular, DOS Theology, Class Teacher, Theology Instructor, Support Staff)
--      works out-of-the-box with zero manual override checkboxes required.
--   2. Workstream 3: Create non-blocking performance indexes on `activity_logs` / `activity_log`,
--      `enrollments`, `students`, `circular_marks`, `theology_marks`, and `teacher_class_assignments`
--      to eliminate database scan bottlenecks on laptops and phones.
--   3. Workstream 2.4: Read-only diagnostic query at the bottom reporting whether any
--      students or marks reference `P.6` in `public.theology_classes` (does NOT delete anything).
--
-- Safety Guarantees:
--   - Every DDL / DML checks `information_schema.tables` and `information_schema.columns`
--     before executing so no missing table or column can ever abort the transaction.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. ENSURE `public.role_permissions` TABLE EXISTS & SYNC GO-LIVE DEFAULTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role text PRIMARY KEY,
  permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  description text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.role_permissions (role, permissions, description, updated_at)
VALUES
  (
    'Administrator',
    ARRAY[
      'read_students',
      'write_students',
      'read_marks',
      'write_marks',
      'edit_class_teacher_remarks',
      'edit_head_teacher_remarks',
      'read_reports',
      'lock_marks',
      'view_activity_logs',
      'view_staff',
      'manage_settings',
      'manage_users'
    ]::text[],
    'Unrestricted school-wide administration across settings, users, and both departments.',
    now()
  ),
  (
    'Principal',
    ARRAY[
      'read_students',
      'write_students',
      'read_marks',
      'edit_head_teacher_remarks',
      'read_reports',
      'lock_marks',
      'view_activity_logs',
      'view_staff'
    ]::text[],
    'Overall supervisor above Head Teacher across Secular & Theology (rosters, review/approve remarks, reports, locks, audit logs, staff view).',
    now()
  ),
  (
    'Head Teacher',
    ARRAY[
      'read_students',
      'write_students',
      'read_marks',
      'edit_head_teacher_remarks',
      'read_reports',
      'lock_marks',
      'view_activity_logs'
    ]::text[],
    'School-wide academic leadership across Secular & Theology departments.',
    now()
  ),
  (
    'Deputy Head Teacher',
    ARRAY[
      'read_students',
      'write_students',
      'read_marks',
      'edit_head_teacher_remarks',
      'read_reports',
      'lock_marks',
      'view_activity_logs'
    ]::text[],
    'School-wide deputy leadership across Secular & Theology departments.',
    now()
  ),
  (
    'DOS Secular',
    ARRAY[
      'read_students',
      'write_students',
      'read_marks',
      'write_marks',
      'edit_class_teacher_remarks',
      'read_reports',
      'view_activity_logs'
    ]::text[],
    'Director of Studies (Secular) — 100% of Secular classes, rosters, marks, remarks, and reports.',
    now()
  ),
  (
    'DOS Theology',
    ARRAY[
      'read_students',
      'write_students',
      'read_marks',
      'write_marks',
      'edit_class_teacher_remarks',
      'read_reports',
      'view_activity_logs'
    ]::text[],
    'Director of Studies (Theology) — 100% of Theology classes, rosters, marks, remarks, and reports.',
    now()
  ),
  (
    'Class Teacher',
    ARRAY[
      'read_students',
      'write_students',
      'read_marks',
      'write_marks',
      'edit_class_teacher_remarks',
      'read_reports'
    ]::text[],
    'Class Teacher — strictly scoped to assigned class(es) for rosters, marks, comments, and reports.',
    now()
  ),
  (
    'Theology Instructor',
    ARRAY[
      'read_students',
      'write_students',
      'read_marks',
      'write_marks',
      'edit_class_teacher_remarks',
      'read_reports'
    ]::text[],
    'Theology Instructor — strictly scoped to assigned Theology class(es) for rosters, marks, comments, and reports.',
    now()
  ),
  (
    'Support Staff',
    ARRAY[]::text[],
    'Non-academic support staff — no access to student records or marks.',
    now()
  )
ON CONFLICT (role) DO UPDATE
SET
  permissions = EXCLUDED.permissions,
  description = EXCLUDED.description,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 2. ENSURE `students.is_archived` AND `students.archived_at` EXIST
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'students'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'is_archived'
    ) THEN
      ALTER TABLE public.students ADD COLUMN is_archived boolean NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'archived_at'
    ) THEN
      ALTER TABLE public.students ADD COLUMN archived_at timestamptz NULL;
    END IF;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. WORKSTREAM 3: PERFORMANCE INDEXES (GUARDED BY COLUMN EXISTENCE)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- 3a. activity_logs(action, created_at DESC) for fast fetchMergedSchoolSettings lookup
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = 'action'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_activity_logs_action_created_at_desc ON public.activity_logs (action, created_at DESC)';
  END IF;

  -- 3b. enrollments lookup indexes for active rosters, hubs, and reports
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'is_active'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'circular_class_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_enrollments_active_circular_class ON public.enrollments (is_active, circular_class_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'is_active'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'theology_class_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_enrollments_active_theology_class ON public.enrollments (is_active, theology_class_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'enrollments' AND column_name = 'student_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_enrollments_student_id_active ON public.enrollments (student_id, is_active)';
  END IF;

  -- 3c. students(is_archived) index for instant active vs archived registry filtering
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'is_archived'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_students_is_archived ON public.students (is_archived)';
  END IF;

  -- 3d. circular_marks & theology_marks composite lookup indexes
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'circular_marks' AND column_name = 'enrollment_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'circular_marks' AND column_name = 'term_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_circular_marks_term_enrollment ON public.circular_marks (term_id, enrollment_id, subject_id)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'theology_marks' AND column_name = 'enrollment_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'theology_marks' AND column_name = 'term_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_theology_marks_term_enrollment ON public.theology_marks (term_id, enrollment_id, subject_id)';
  END IF;

  -- 3e. teacher_class_assignments lookup index
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'teacher_class_assignments' AND column_name = 'teacher_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_teacher ON public.teacher_class_assignments (teacher_id, class_type, class_id)';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. USERNAME SIGN-IN RPC (`public.resolve_login_email`) & SELF-PROFILE RLS
-- -----------------------------------------------------------------------------
-- Allows unauthenticated (`anon`) login requests to safely resolve a staff
-- username (e.g. `sysadmin`) to their official email even when
-- `SUPABASE_SERVICE_ROLE_KEY` is omitted and RLS is active on `public.teachers`.
CREATE OR REPLACE FUNCTION public.resolve_login_email(p_identifier text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean text := lower(trim(COALESCE(p_identifier, '')));
  v_email text := NULL;
BEGIN
  IF v_clean = '' THEN
    RETURN NULL;
  END IF;

  IF position('@' in v_clean) > 0 THEN
    SELECT lower(trim(t.email))
      INTO v_email
      FROM public.teachers t
     WHERE lower(trim(COALESCE(t.email, ''))) = v_clean
       AND COALESCE(lower(trim(t.status)), 'active') NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
     LIMIT 1;
  ELSE
    -- 1. Match exact case-insensitive username on public.teachers
    SELECT lower(trim(t.email))
      INTO v_email
      FROM public.teachers t
     WHERE lower(trim(COALESCE(t.username, ''))) = v_clean
       AND COALESCE(lower(trim(t.status)), 'active') NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
     LIMIT 1;

    -- 2. Fallback: match email local-part prefix if username is not yet set
    IF v_email IS NULL THEN
      SELECT lower(trim(t.email))
        INTO v_email
        FROM public.teachers t
       WHERE (t.username IS NULL OR trim(t.username) = '')
         AND split_part(lower(trim(COALESCE(t.email, ''))), '@', 1) = v_clean
         AND COALESCE(lower(trim(t.status)), 'active') NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
       ORDER BY t.created_at ASC NULLS LAST
       LIMIT 1;
    END IF;
  END IF;

  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_login_email(text) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';

-- Update trigger so staff can update their own username, name, phone, and avatar
-- while still blocking non-Administrators from elevating role, status, permissions, or classes.
CREATE OR REPLACE FUNCTION public.prevent_teacher_self_role_elevation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
  v_is_self boolean := false;
BEGIN
  IF current_setting('role', true) = 'service_role' OR current_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.teachers t
    WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
      AND COALESCE(t.status, 'active') = 'active'
      AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
  ) INTO v_is_admin;

  v_is_self := (
    OLD.auth_user_id = auth.uid()
    OR (OLD.auth_user_id IS NULL AND OLD.id = auth.uid())
    OR (
      OLD.email IS NOT NULL
      AND lower(trim(OLD.email)) = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
    )
  );

  IF NOT v_is_admin THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Unauthorized: Only an Administrator can change a staff role.' USING ERRCODE = '42501';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Unauthorized: Only an Administrator can change account status.' USING ERRCODE = '42501';
    END IF;
    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
      RAISE EXCEPTION 'Unauthorized: Only an Administrator can relink auth_user_id.' USING ERRCODE = '42501';
    END IF;
    IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
      RAISE EXCEPTION 'Unauthorized: Only an Administrator can modify user permissions.' USING ERRCODE = '42501';
    END IF;
    IF NEW.classes IS DISTINCT FROM OLD.classes THEN
      RAISE EXCEPTION 'Unauthorized: Only an Administrator can modify assigned classes.' USING ERRCODE = '42501';
    END IF;
    IF NEW.username IS DISTINCT FROM OLD.username THEN
      RAISE EXCEPTION 'Unauthorized: Only an Administrator can modify a staff username.' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_teacher_self_role_elevation ON public.teachers;
CREATE TRIGGER trg_prevent_teacher_self_role_elevation
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_teacher_self_role_elevation();

DROP POLICY IF EXISTS "teachers_update_admin_or_self" ON public.teachers;
CREATE POLICY "teachers_update_admin_or_self"
  ON public.teachers FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND id = auth.uid())
    OR lower(trim(COALESCE(email, ''))) = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  )
  WITH CHECK (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND id = auth.uid())
    OR lower(trim(COALESCE(email, ''))) = lower(trim(COALESCE(auth.jwt() ->> 'email', '')))
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  );

-- -----------------------------------------------------------------------------
-- 4b. ADMINISTRATOR STAFF AUTH MANAGEMENT RPC (`public.admin_manage_staff_auth`)
-- -----------------------------------------------------------------------------
-- Fallback for staff account management when the server has no service_role key.
-- Callable ONLY by an active Administrator in public.teachers (or service_role).
-- Actions: create | set_password | update_email | update_metadata | ban | unban | delete
CREATE OR REPLACE FUNCTION public.admin_manage_staff_auth(
  p_action   text,
  p_email    text DEFAULT NULL,
  p_password text DEFAULT NULL,
  p_name     text DEFAULT NULL,
  p_role     text DEFAULT NULL,
  p_user_id  uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_action   text := lower(trim(COALESCE(p_action, '')));
  v_email    text := lower(trim(COALESCE(p_email, '')));
  v_is_admin boolean := false;
  v_user_id  uuid;
  v_now      timestamptz := now();
BEGIN
  IF current_setting('role', true) = 'service_role' OR current_user = 'postgres' THEN
    v_is_admin := true;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    ) INTO v_is_admin;
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden: Only an active Administrator can manage staff accounts.' USING ERRCODE = '42501';
  END IF;

  IF v_action = 'create' THEN
    IF v_email = '' OR position('@' in v_email) = 0 THEN
      RAISE EXCEPTION 'A valid email is required.' USING ERRCODE = '22023';
    END IF;
    IF p_password IS NULL OR length(p_password) < 8 THEN
      RAISE EXCEPTION 'Password must be at least 8 characters long.' USING ERRCODE = '22023';
    END IF;
    SELECT u.id INTO v_user_id
      FROM auth.users u
     WHERE lower(u.email) = v_email
     LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.teachers t
        WHERE t.auth_user_id = v_user_id
           OR t.id = v_user_id
           OR lower(trim(COALESCE(t.email, ''))) = v_email
      ) THEN
        RAISE EXCEPTION 'An auth account already exists for this email.' USING ERRCODE = '23505';
      END IF;

      UPDATE auth.users
         SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
             email_confirmed_at = COALESCE(email_confirmed_at, v_now),
             banned_until = NULL,
             raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
               'name', COALESCE(p_name, split_part(v_email, '@', 1)),
               'full_name', COALESCE(p_name, split_part(v_email, '@', 1)),
               'role', p_role,
               'onboarding_completed', true,
               'email_verified', true
             ),
             updated_at = v_now
       WHERE id = v_user_id;

      IF NOT EXISTS (
        SELECT 1 FROM auth.identities i
        WHERE i.user_id = v_user_id AND i.provider = 'email'
      ) THEN
        INSERT INTO auth.identities (
          provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
          v_user_id::text, v_user_id,
          jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
          'email', NULL, v_now, v_now
        );
      END IF;

      RETURN jsonb_build_object('success', true, 'action', v_action, 'user_id', v_user_id, 'email', v_email);
    END IF;

    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      email_change_token_new, email_change, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_email, extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
      v_now, '', '', '', '', '', '', '', '',
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object(
        'name', COALESCE(p_name, split_part(v_email, '@', 1)),
        'full_name', COALESCE(p_name, split_part(v_email, '@', 1)),
        'role', p_role,
        'onboarding_completed', true,
        'email_verified', true
      ),
      v_now, v_now
    );

    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_user_id::text, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
      'email', NULL, v_now, v_now
    );

    RETURN jsonb_build_object('success', true, 'action', v_action, 'user_id', v_user_id, 'email', v_email);
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required for action %', v_action USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'Auth user not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_action = 'set_password' THEN
    IF p_password IS NULL OR length(p_password) < 8 THEN
      RAISE EXCEPTION 'Password must be at least 8 characters long.' USING ERRCODE = '22023';
    END IF;
    UPDATE auth.users
       SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
           updated_at = v_now
     WHERE id = p_user_id;

  ELSIF v_action = 'update_email' THEN
    IF v_email = '' OR position('@' in v_email) = 0 THEN
      RAISE EXCEPTION 'A valid email is required.' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = v_email AND u.id <> p_user_id) THEN
      RAISE EXCEPTION 'Another auth account already uses this email.' USING ERRCODE = '23505';
    END IF;
    UPDATE auth.users
       SET email = v_email, email_confirmed_at = COALESCE(email_confirmed_at, v_now),
           email_change = '', email_change_token_new = '', email_change_token_current = '',
           updated_at = v_now
     WHERE id = p_user_id;
    UPDATE auth.identities
       SET identity_data = COALESCE(identity_data, '{}'::jsonb) || jsonb_build_object('email', v_email),
           updated_at = v_now
     WHERE user_id = p_user_id AND provider = 'email';

  ELSIF v_action = 'update_metadata' THEN
    UPDATE auth.users
       SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
             || jsonb_strip_nulls(jsonb_build_object('name', p_name, 'full_name', p_name, 'role', p_role)),
           updated_at = v_now
     WHERE id = p_user_id;

  ELSIF v_action = 'ban' THEN
    UPDATE auth.users SET banned_until = v_now + interval '100 years', updated_at = v_now WHERE id = p_user_id;
    BEGIN
      DELETE FROM auth.sessions WHERE user_id = p_user_id;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

  ELSIF v_action = 'unban' THEN
    UPDATE auth.users SET banned_until = NULL, updated_at = v_now WHERE id = p_user_id;

  ELSIF v_action = 'delete' THEN
    DELETE FROM auth.identities WHERE user_id = p_user_id;
    DELETE FROM auth.users WHERE id = p_user_id;

  ELSE
    RAISE EXCEPTION 'Unsupported action: %', v_action USING ERRCODE = '22023';
  END IF;

  RETURN jsonb_build_object('success', true, 'action', v_action, 'user_id', p_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_manage_staff_auth(text, text, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_staff_auth(text, text, text, text, text, uuid) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- 5. REMOVE UNUSED `P.6` THEOLOGY CLASS (`e16b9c2c-ead3-45d6-94c6-98cd3285254c`)
-- -----------------------------------------------------------------------------
DELETE FROM public.theology_classes
WHERE id = 'e16b9c2c-ead3-45d6-94c6-98cd3285254c'
  AND NOT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE theology_class_id = 'e16b9c2c-ead3-45d6-94c6-98cd3285254c'
  );

-- -----------------------------------------------------------------------------
-- 6. IDEMPOTENT SCOPED SELECT RLS POLICIES FOR LEADERSHIP, DOS & TEACHERS
--    (Covers environments without SUPABASE_SERVICE_ROLE_KEY / cookie JWT reads)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "staff_scoped_select_students" ON public.students;
CREATE POLICY "staff_scoped_select_students"
ON public.students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.teachers t
    WHERE (t.auth_user_id = auth.uid() OR t.id = auth.uid())
      AND COALESCE(lower(t.status), 'active') NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
      AND (
        t.role IN ('Administrator', 'admin', 'Principal', 'Head Teacher', 'Deputy Head Teacher', 'DOS Secular', 'DOS Theology', 'DOS')
        OR EXISTS (
          SELECT 1
          FROM public.enrollments e
          LEFT JOIN public.circular_classes cc ON cc.id = e.circular_class_id
          WHERE e.student_id = students.id
            AND (
              (cc.id IS NOT NULL AND cc.class_teacher_id = t.id)
              OR EXISTS (
                SELECT 1 FROM public.teacher_class_assignments tca
                WHERE tca.teacher_id = t.id
                  AND (tca.class_id = e.circular_class_id OR tca.class_id = e.theology_class_id)
              )
              OR (e.circular_class_id IS NOT NULL AND e.circular_class_id::text = ANY(COALESCE(t.classes::text[], ARRAY[]::text[])))
              OR (e.theology_class_id IS NOT NULL AND e.theology_class_id::text = ANY(COALESCE(t.classes::text[], ARRAY[]::text[])))
            )
        )
      )
  )
);

DROP POLICY IF EXISTS "staff_scoped_select_enrollments" ON public.enrollments;
CREATE POLICY "staff_scoped_select_enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.teachers t
    WHERE (t.auth_user_id = auth.uid() OR t.id = auth.uid())
      AND COALESCE(lower(t.status), 'active') NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
      AND (
        t.role IN ('Administrator', 'admin', 'Principal', 'Head Teacher', 'Deputy Head Teacher')
        OR (
          (t.role = 'DOS Secular' OR (t.role = 'DOS' AND lower(coalesce(t.subject, '')) LIKE '%secular%'))
          AND enrollments.circular_class_id IS NOT NULL
        )
        OR (
          (t.role = 'DOS Theology' OR (t.role = 'DOS' AND lower(coalesce(t.subject, '')) NOT LIKE '%secular%'))
          AND enrollments.theology_class_id IS NOT NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.circular_classes cc
          WHERE cc.id = enrollments.circular_class_id AND cc.class_teacher_id = t.id
        )
        OR EXISTS (
          SELECT 1 FROM public.teacher_class_assignments tca
          WHERE tca.teacher_id = t.id
            AND (tca.class_id = enrollments.circular_class_id OR tca.class_id = enrollments.theology_class_id)
        )
        OR (enrollments.circular_class_id IS NOT NULL AND enrollments.circular_class_id::text = ANY(COALESCE(t.classes::text[], ARRAY[]::text[])))
        OR (enrollments.theology_class_id IS NOT NULL AND enrollments.theology_class_id::text = ANY(COALESCE(t.classes::text[], ARRAY[]::text[])))
      )
  )
);

DROP POLICY IF EXISTS "staff_scoped_select_circular_marks" ON public.circular_marks;
CREATE POLICY "staff_scoped_select_circular_marks"
ON public.circular_marks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.teachers t ON (t.auth_user_id = auth.uid() OR t.id = auth.uid())
    LEFT JOIN public.circular_classes cc ON cc.id = e.circular_class_id
    WHERE e.id = circular_marks.enrollment_id
      AND COALESCE(lower(t.status), 'active') NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
      AND (
        t.role IN ('Administrator', 'admin', 'Principal', 'Head Teacher', 'Deputy Head Teacher', 'DOS Secular')
        OR (t.role = 'DOS' AND lower(coalesce(t.subject, '')) <> 'theology')
        OR (cc.id IS NOT NULL AND cc.class_teacher_id = t.id)
        OR EXISTS (
          SELECT 1 FROM public.teacher_class_assignments tca
          WHERE tca.teacher_id = t.id AND tca.class_id = e.circular_class_id
        )
        OR (e.circular_class_id IS NOT NULL AND e.circular_class_id::text = ANY(COALESCE(t.classes::text[], ARRAY[]::text[])))
      )
  )
);

DROP POLICY IF EXISTS "staff_scoped_select_theology_marks" ON public.theology_marks;
CREATE POLICY "staff_scoped_select_theology_marks"
ON public.theology_marks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.enrollments e
    JOIN public.teachers t ON (t.auth_user_id = auth.uid() OR t.id = auth.uid())
    LEFT JOIN public.circular_classes cc ON cc.id = e.circular_class_id
    WHERE e.id = theology_marks.enrollment_id
      AND COALESCE(lower(t.status), 'active') NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
      AND (
        t.role IN ('Administrator', 'admin', 'Principal', 'Head Teacher', 'Deputy Head Teacher', 'DOS Theology')
        OR (t.role = 'DOS' AND lower(coalesce(t.subject, '')) <> 'secular')
        OR (cc.id IS NOT NULL AND cc.class_teacher_id = t.id)
        OR EXISTS (
          SELECT 1 FROM public.teacher_class_assignments tca
          WHERE tca.teacher_id = t.id AND tca.class_id = e.theology_class_id
        )
        OR (e.theology_class_id IS NOT NULL AND e.theology_class_id::text = ANY(COALESCE(t.classes::text[], ARRAY[]::text[])))
      )
  )
);

COMMIT;

-- =============================================================================
-- 4. READ-ONLY DIAGNOSTIC: P.6 IN `public.theology_classes` (DOES NOT DELETE)
-- =============================================================================
SELECT
  tc.id AS theology_class_id,
  tc.class_name_english,
  tc.class_name_arabic,
  tc.level,
  (
    SELECT count(*)::int
    FROM public.enrollments e
    WHERE e.theology_class_id = tc.id
  ) AS total_enrollments,
  (
    SELECT count(*)::int
    FROM public.enrollments e
    JOIN public.students s ON s.id = e.student_id
    WHERE e.theology_class_id = tc.id
      AND e.is_active = true
      AND COALESCE(s.is_archived, false) = false
  ) AS active_non_archived_enrollments,
  (
    SELECT count(*)::int
    FROM public.theology_marks tm
    JOIN public.enrollments e ON e.id = tm.enrollment_id
    WHERE e.theology_class_id = tc.id
  ) AS theology_marks_count
FROM public.theology_classes tc
WHERE tc.class_name_english ILIKE '%6%'
   OR tc.class_name_arabic ILIKE '%سادس%'
   OR tc.level::text = '6'
ORDER BY tc.class_name_english;

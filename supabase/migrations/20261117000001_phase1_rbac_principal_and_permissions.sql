BEGIN;

-- ============================================================================
-- PHASE 1 RBAC / ACL MIGRATION (2026-11-17)
-- 1. Adds distinct 'Principal' role to teachers & teacher_invites constraints
-- 2. Aligns teacher_invites columns & role constraints with teachers
-- 3. Adds teachers.permissions (per-user overrides) & teachers.pending_email
-- 4. Creates & seeds public.role_permissions (editable role defaults)
-- 5. Hardens self-elevation trigger & RLS policies (status = 'active' + Principal)
-- 6. Enforces storage policies for user-avatars (2MB, PNG/JPG/WEBP, own path)
-- ============================================================================

-- 1. Widen public.teachers role check constraint to include 'Principal' and all canonical roles
ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_role_check;
ALTER TABLE public.teachers ADD CONSTRAINT teachers_role_check CHECK (
  role::text = ANY (ARRAY[
    'Administrator'::text,
    'admin'::text,
    'Principal'::text,
    'Head Teacher'::text,
    'Deputy Head Teacher'::text,
    'DOS'::text,
    'DOS Secular'::text,
    'DOS Theology'::text,
    'Class Teacher'::text,
    'Theology Instructor'::text,
    'Teacher'::text,
    'Support Staff'::text
  ])
);

-- 2. Add per-user permission overrides & pending_email columns to public.teachers
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT NULL;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS pending_email text DEFAULT NULL;

-- 3. Ensure public.teacher_invites has subject, name, phone columns and matching role constraint
ALTER TABLE public.teacher_invites ADD COLUMN IF NOT EXISTS subject text DEFAULT 'Secular';
ALTER TABLE public.teacher_invites ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.teacher_invites ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE public.teacher_invites DROP CONSTRAINT IF EXISTS teacher_invites_role_check;
ALTER TABLE public.teacher_invites ADD CONSTRAINT teacher_invites_role_check CHECK (
  role::text = ANY (ARRAY[
    'Administrator'::text,
    'admin'::text,
    'Principal'::text,
    'Head Teacher'::text,
    'Deputy Head Teacher'::text,
    'DOS'::text,
    'DOS Secular'::text,
    'DOS Theology'::text,
    'Class Teacher'::text,
    'Theology Instructor'::text,
    'Teacher'::text,
    'teacher'::text,
    'Support Staff'::text
  ])
);

-- 4. Create & seed public.role_permissions table (Administrator-editable defaults)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role text PRIMARY KEY,
  permissions text[] NOT NULL DEFAULT ARRAY[]::text[],
  description text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_permissions_select_authenticated" ON public.role_permissions;
CREATE POLICY "role_permissions_select_authenticated"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "role_permissions_manage_admin" ON public.role_permissions;
CREATE POLICY "role_permissions_manage_admin"
  ON public.role_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  );

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

INSERT INTO public.role_permissions (role, permissions, description)
VALUES
  (
    'Administrator',
    ARRAY[
      'read_students', 'write_students', 'read_marks', 'write_marks',
      'edit_class_teacher_remarks', 'edit_head_teacher_remarks', 'read_reports',
      'lock_marks', 'view_activity_logs', 'view_staff', 'manage_settings', 'manage_users'
    ],
    'Full operational and system authority across all departments, users, permissions, and settings.'
  ),
  (
    'Principal',
    ARRAY[
      'read_students', 'write_students', 'read_marks',
      'edit_head_teacher_remarks', 'read_reports',
      'lock_marks', 'view_activity_logs', 'view_staff'
    ],
    'Overall school supervisor above Head Teacher. School-wide read across both departments, review/approve/lock actions, staff & activity visibility.'
  ),
  (
    'Head Teacher',
    ARRAY[
      'read_students', 'write_students', 'read_marks',
      'edit_head_teacher_remarks', 'read_reports',
      'lock_marks', 'view_activity_logs'
    ],
    'Senior academic executive. School-wide read across both departments plus review, approval, and exam-set lock actions.'
  ),
  (
    'Deputy Head Teacher',
    ARRAY[
      'read_students', 'write_students', 'read_marks',
      'edit_head_teacher_remarks', 'read_reports',
      'lock_marks', 'view_activity_logs'
    ],
    'Deputy academic executive. School-wide read across both departments plus review, approval, and exam-set lock actions.'
  ),
  (
    'DOS Secular',
    ARRAY[
      'read_students', 'write_students', 'read_marks', 'write_marks',
      'edit_class_teacher_remarks', 'edit_head_teacher_remarks',
      'read_reports', 'view_activity_logs'
    ],
    'Director of Studies (Secular). Full academic moderation across all Secular classes.'
  ),
  (
    'DOS Theology',
    ARRAY[
      'read_students', 'write_students', 'read_marks', 'write_marks',
      'edit_class_teacher_remarks', 'edit_head_teacher_remarks',
      'read_reports', 'view_activity_logs'
    ],
    'Director of Studies (Theology). Full academic moderation across all Theology classes.'
  ),
  (
    'Class Teacher',
    ARRAY[
      'read_students', 'read_marks', 'write_marks',
      'edit_class_teacher_remarks', 'read_reports'
    ],
    'Classroom educator. Scoped strictly to assigned classes for marks entry, remarks, and report generation.'
  ),
  (
    'Theology Instructor',
    ARRAY[
      'read_students', 'read_marks', 'write_marks'
    ],
    'Specialized religious studies instructor. Scoped strictly to assigned Theology classes.'
  ),
  (
    'Support Staff',
    ARRAY[]::text[],
    'Non-academic support staff. No access to student marks, reports, or settings.'
  )
ON CONFLICT (role) DO UPDATE
SET permissions = EXCLUDED.permissions,
    description = EXCLUDED.description,
    updated_at = now();

-- 5. Update self-role-elevation defense trigger to also guard permissions column
CREATE OR REPLACE FUNCTION public.prevent_teacher_self_role_elevation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
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
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_teacher_self_role_elevation ON public.teachers;
CREATE TRIGGER trg_prevent_teacher_self_role_elevation
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_teacher_self_role_elevation();

-- 6. Harden core RLS policies with COALESCE(t.status, 'active') = 'active', legacy id fallback, and Principal support
DROP POLICY IF EXISTS "teachers_insert_admin" ON public.teachers;
CREATE POLICY "teachers_insert_admin"
  ON public.teachers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "teachers_update_admin_or_self" ON public.teachers;
CREATE POLICY "teachers_update_admin_or_self"
  ON public.teachers FOR UPDATE
  TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR (auth_user_id IS NULL AND id = auth.uid())
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
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "teachers_delete_admin" ON public.teachers;
CREATE POLICY "teachers_delete_admin"
  ON public.teachers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "teacher_class_assignments_select" ON public.teacher_class_assignments;
CREATE POLICY "teacher_class_assignments_select"
  ON public.teacher_class_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.id = teacher_class_assignments.teacher_id
        AND COALESCE(t.status, 'active') = 'active'
        AND (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM public.teachers viewer
      WHERE (viewer.auth_user_id = auth.uid() OR (viewer.auth_user_id IS NULL AND viewer.id = auth.uid()))
        AND COALESCE(viewer.status, 'active') = 'active'
        AND viewer.role::text = ANY (ARRAY[
          'Administrator'::text, 'admin'::text, 'Principal'::text,
          'Head Teacher'::text, 'Deputy Head Teacher'::text,
          'DOS'::text, 'DOS Secular'::text, 'DOS Theology'::text
        ])
    )
  );

DROP POLICY IF EXISTS "teacher_class_assignments_manage_admin" ON public.teacher_class_assignments;
CREATE POLICY "teacher_class_assignments_manage_admin"
  ON public.teacher_class_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "circular_marks_access_policy" ON public.circular_marks;
DROP POLICY IF EXISTS "circular_marks_staff_access" ON public.circular_marks;
CREATE POLICY "circular_marks_access_policy"
  ON public.circular_marks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.teachers t
        ON (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
      WHERE e.id = circular_marks.enrollment_id
        AND COALESCE(t.status, 'active') = 'active'
        AND (
          t.role::text = ANY (ARRAY[
            'Administrator'::text, 'admin'::text, 'Principal'::text,
            'Head Teacher'::text, 'Deputy Head Teacher'::text,
            'DOS Secular'::text
          ])
          OR (t.role::text = 'DOS'::text AND lower(coalesce(t.subject, '')) <> 'theology')
          OR EXISTS (
            SELECT 1 FROM public.circular_classes cc
            WHERE cc.id = e.circular_class_id
              AND cc.class_teacher_id = t.id
          )
          OR EXISTS (
            SELECT 1 FROM public.teacher_class_assignments tca
            WHERE tca.teacher_id = t.id
              AND tca.class_id = e.circular_class_id
              AND tca.class_type = 'circular'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.teachers t
        ON (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
      WHERE e.id = circular_marks.enrollment_id
        AND COALESCE(t.status, 'active') = 'active'
        AND (
          t.role::text = ANY (ARRAY[
            'Administrator'::text, 'admin'::text,
            'DOS Secular'::text
          ])
          OR (t.role::text = 'DOS'::text AND lower(coalesce(t.subject, '')) <> 'theology')
          OR EXISTS (
            SELECT 1 FROM public.circular_classes cc
            WHERE cc.id = e.circular_class_id
              AND cc.class_teacher_id = t.id
          )
          OR EXISTS (
            SELECT 1 FROM public.teacher_class_assignments tca
            WHERE tca.teacher_id = t.id
              AND tca.class_id = e.circular_class_id
              AND tca.class_type = 'circular'
          )
        )
    )
  );

DROP POLICY IF EXISTS "school_settings_manage_admin" ON public.school_settings;
CREATE POLICY "school_settings_manage_admin"
  ON public.school_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "signatures_manage_admin" ON public.signatures;
CREATE POLICY "signatures_manage_admin"
  ON public.signatures FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  );

-- 6B. Ensure catalog & scoped academic tables have authenticated RLS policies
DROP POLICY IF EXISTS "terms_select_authenticated" ON public.terms;
CREATE POLICY "terms_select_authenticated"
  ON public.terms FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "circular_subjects_select_authenticated" ON public.circular_subjects;
CREATE POLICY "circular_subjects_select_authenticated"
  ON public.circular_subjects FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "theology_subjects_select_authenticated" ON public.theology_subjects;
CREATE POLICY "theology_subjects_select_authenticated"
  ON public.theology_subjects FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "subjects_select_authenticated" ON public.subjects;
CREATE POLICY "subjects_select_authenticated"
  ON public.subjects FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "students_select_scoped" ON public.students;
CREATE POLICY "students_select_scoped"
  ON public.students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text <> 'Support Staff'
    )
  );

DROP POLICY IF EXISTS "students_write_authorized" ON public.students;
CREATE POLICY "students_write_authorized"
  ON public.students FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY[
          'Administrator'::text, 'admin'::text, 'Principal'::text,
          'Head Teacher'::text, 'Deputy Head Teacher'::text,
          'DOS'::text, 'DOS Secular'::text, 'DOS Theology'::text
        ])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY[
          'Administrator'::text, 'admin'::text, 'Principal'::text,
          'Head Teacher'::text, 'Deputy Head Teacher'::text,
          'DOS'::text, 'DOS Secular'::text, 'DOS Theology'::text
        ])
    )
  );

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text, 'Principal'::text])
    )
  );

DROP POLICY IF EXISTS "profiles_modify_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_modify_own_or_admin"
  ON public.profiles FOR ALL
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY['Administrator'::text, 'admin'::text])
    )
  );

DROP POLICY IF EXISTS "activity_log_select_admin" ON public.activity_log;
CREATE POLICY "activity_log_select_admin"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY[
          'Administrator'::text, 'admin'::text, 'Principal'::text,
          'Head Teacher'::text, 'Deputy Head Teacher'::text,
          'DOS'::text, 'DOS Secular'::text, 'DOS Theology'::text
        ])
    )
  );

DROP POLICY IF EXISTS "activity_logs_select_authorized" ON public.activity_logs;
CREATE POLICY "activity_logs_select_authorized"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR (t.auth_user_id IS NULL AND t.id = auth.uid()))
        AND COALESCE(t.status, 'active') = 'active'
        AND t.role::text = ANY (ARRAY[
          'Administrator'::text, 'admin'::text, 'Principal'::text,
          'Head Teacher'::text, 'Deputy Head Teacher'::text,
          'DOS'::text, 'DOS Secular'::text, 'DOS Theology'::text
        ])
    )
  );

DROP POLICY IF EXISTS "activity_logs_insert_authenticated" ON public.activity_logs;
CREATE POLICY "activity_logs_insert_authenticated"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "theology_marks_manage_authorized_staff" ON public.theology_marks;
CREATE POLICY "theology_marks_manage_authorized_staff"
  ON public.theology_marks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      LEFT JOIN public.circular_classes cc ON cc.id = e.circular_class_id
      LEFT JOIN public.theology_classes tc ON tc.id = e.theology_class_id
      JOIN public.teachers t ON (t.auth_user_id = auth.uid() OR t.id = auth.uid())
      WHERE e.id = theology_marks.enrollment_id
        AND COALESCE(t.status, 'active') NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
        AND (
          (
            t.role IN ('Theology Instructor', 'Teacher', 'Class Teacher')
            AND EXISTS (
              SELECT 1 FROM public.teacher_class_assignments tca
              WHERE tca.teacher_id = t.id
                AND tc.id IS NOT NULL
                AND tca.class_id = tc.id
            )
          )
          OR (
            t.role = 'Class Teacher'
            AND cc.id IS NOT NULL
            AND cc.class_teacher_id = t.id
          )
          OR (
            t.role IN ('Administrator', 'admin', 'Principal', 'Head Teacher', 'Deputy Head Teacher', 'DOS Theology', 'Theology Instructor')
            OR (t.role = 'DOS' AND lower(coalesce(t.subject, '')) <> 'secular')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.enrollments e
      LEFT JOIN public.circular_classes cc ON cc.id = e.circular_class_id
      LEFT JOIN public.theology_classes tc ON tc.id = e.theology_class_id
      JOIN public.teachers t ON (t.auth_user_id = auth.uid() OR t.id = auth.uid())
      WHERE e.id = theology_marks.enrollment_id
        AND COALESCE(t.status, 'active') NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
        AND (
          (
            t.role IN ('Theology Instructor', 'Teacher', 'Class Teacher')
            AND EXISTS (
              SELECT 1 FROM public.teacher_class_assignments tca
              WHERE tca.teacher_id = t.id
                AND tc.id IS NOT NULL
                AND tca.class_id = tc.id
            )
          )
          OR (
            t.role = 'Class Teacher'
            AND cc.id IS NOT NULL
            AND cc.class_teacher_id = t.id
          )
          OR (
            t.role IN ('Administrator', 'admin', 'Head Teacher', 'Deputy Head Teacher', 'DOS Theology', 'Theology Instructor')
            OR (t.role = 'DOS' AND lower(coalesce(t.subject, '')) <> 'secular')
          )
        )
    )
  );

-- 7. Storage bucket hardening for user-avatars (2MB, PNG/JPG/WEBP only, own-path writes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

DROP POLICY IF EXISTS "user_avatars_public_read" ON storage.objects;
CREATE POLICY "user_avatars_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'user-avatars');

DROP POLICY IF EXISTS "user_avatars_own_write" ON storage.objects;
CREATE POLICY "user_avatars_own_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND name LIKE ('avatars/' || auth.uid()::text || '.%')
  );

DROP POLICY IF EXISTS "user_avatars_own_update" ON storage.objects;
CREATE POLICY "user_avatars_own_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND name LIKE ('avatars/' || auth.uid()::text || '.%')
  )
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND name LIKE ('avatars/' || auth.uid()::text || '.%')
  );

DROP POLICY IF EXISTS "user_avatars_own_delete" ON storage.objects;
CREATE POLICY "user_avatars_own_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-avatars'
    AND name LIKE ('avatars/' || auth.uid()::text || '.%')
  );

COMMIT;

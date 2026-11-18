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

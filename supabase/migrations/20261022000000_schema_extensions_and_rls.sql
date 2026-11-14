-- Migration: 20261022000000_schema_extensions_and_rls.sql
-- Step 1 Database Schema Extensions & RLS for Jiddah Smart Report Engine (Hardened)

-- 1. Helper Functions for Role Resolution
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text;
  v_status text;
BEGIN
  -- 1. Check teachers table first (canonical authority on role and status)
  SELECT lower(trim(role)), lower(coalesce(status, 'active'))
  INTO v_role, v_status
  FROM public.teachers
  WHERE auth_user_id = auth.uid() OR id = auth.uid()
  ORDER BY CASE WHEN auth_user_id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_status IN ('inactive', 'suspended', 'deactivated', 'banned') THEN
    RETURN 'suspended';
  END IF;

  IF v_role IS NOT NULL AND v_role <> '' THEN
    RETURN v_role;
  END IF;

  -- 2. Fallback to app_metadata (server-only, cannot be forged by user)
  SELECT lower(trim(auth.jwt() -> 'app_metadata' ->> 'role')) INTO v_role;
  IF v_role IS NOT NULL AND v_role <> '' THEN
    RETURN v_role;
  END IF;

  -- 3. Fallback for bootstrap accounts if not found in teachers table
  SELECT lower(trim(auth.jwt() -> 'user_metadata' ->> 'role')) INTO v_role;
  IF v_role IS NOT NULL AND v_role <> '' THEN
    RETURN v_role;
  END IF;

  RETURN 'authenticated';
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_dos()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  r text;
BEGIN
  r := public.current_user_role();
  IF r = 'suspended' THEN
    RETURN false;
  END IF;
  RETURN r IN (
    'admin', 'administrator', 'superadmin',
    'dos', 'dos secular', 'dos theology',
    'head teacher', 'head_teacher', 'headteacher',
    'deputy head teacher', 'deputy_head_teacher'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin_or_dos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_dos() TO authenticated;

-- 2. Signatures Table Extension
CREATE TABLE IF NOT EXISTS public.signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text,
  data_url text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'signatures') THEN
    ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS data_url text;
    ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS image_url text;
    ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS role text;
    ALTER TABLE public.signatures ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
    -- Backfill if legacy columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'signatures' AND column_name = 'uploaded_by') THEN
      UPDATE public.signatures SET user_id = uploaded_by WHERE user_id IS NULL AND uploaded_by IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'signatures' AND column_name = 'image_url') THEN
      UPDATE public.signatures SET data_url = image_url WHERE data_url IS NULL AND image_url IS NOT NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'signatures' AND column_name = 'data_url') THEN
      UPDATE public.signatures SET image_url = data_url WHERE image_url IS NULL AND data_url IS NOT NULL;
    END IF;
  END IF;
END $$;

-- 3. Watermark Configuration Table
CREATE TABLE IF NOT EXISTS public.watermark_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text DEFAULT 'current' UNIQUE,
  enabled boolean DEFAULT false,
  use_badge boolean DEFAULT true,
  custom_text text,
  opacity numeric(3,2) DEFAULT 0.08,
  scale numeric(4,2) DEFAULT 1.0,
  rotation integer DEFAULT -45,
  layout text DEFAULT 'center' CHECK (layout IN ('center', 'tiled')),
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'watermark_configs') THEN
    ALTER TABLE public.watermark_configs ADD COLUMN IF NOT EXISTS config_key text DEFAULT 'current';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'watermark_configs_config_key_key'
    ) THEN
      ALTER TABLE public.watermark_configs ADD CONSTRAINT watermark_configs_config_key_key UNIQUE (config_key);
    END IF;
  END IF;
END $$;

-- 4. Electronic Stamp Configuration Table
CREATE TABLE IF NOT EXISTS public.stamp_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text DEFAULT 'current' UNIQUE,
  shape text DEFAULT 'rectangle',
  school_name text NOT NULL,
  title text NOT NULL,
  po_box text,
  phone text,
  ink_color text DEFAULT '#1a3a2a',
  size_scale numeric(3,2) DEFAULT 1.0,
  rotation integer DEFAULT 0,
  opacity numeric(3,2) DEFAULT 0.92,
  grain_realism boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stamp_configs') THEN
    ALTER TABLE public.stamp_configs ADD COLUMN IF NOT EXISTS config_key text DEFAULT 'current';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'stamp_configs_config_key_key'
    ) THEN
      ALTER TABLE public.stamp_configs ADD CONSTRAINT stamp_configs_config_key_key UNIQUE (config_key);
    END IF;
    -- Drop old restrictive check constraint and apply flexible one
    ALTER TABLE public.stamp_configs DROP CONSTRAINT IF EXISTS stamp_configs_shape_check;
    ALTER TABLE public.stamp_configs ADD CONSTRAINT stamp_configs_shape_check
      CHECK (shape IN ('rectangle', 'rectangular', 'oval', 'circle', 'circular'));
  END IF;
END $$;

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  actor_name text,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- 6. Daily Roll Call / Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  class_id uuid NOT NULL,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  recorded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance') THEN
    ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 7. Notifications Extension
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body text;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'message') THEN
      UPDATE public.notifications SET body = message WHERE body IS NULL AND message IS NOT NULL;
    END IF;
  ELSE
    CREATE TABLE public.notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      title text NOT NULL,
      body text,
      read boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- 8. Report Template Field Overrides
CREATE TABLE IF NOT EXISTS public.report_template_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text NOT NULL,
  field_key text NOT NULL,
  label text,
  font_family text,
  font_size text,
  font_weight text,
  color text,
  background text,
  alignment text,
  border text,
  spacing jsonb,
  visible boolean DEFAULT true,
  sort_order integer,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(template_type, field_key)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'report_template_overrides') THEN
    ALTER TABLE public.report_template_overrides ALTER COLUMN font_size TYPE text USING font_size::text;
  END IF;
END $$;

-- 9. Row Level Security Policies
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watermark_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_template_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_class_assignments ENABLE ROW LEVEL SECURITY;

-- Drop legacy permissive signature policy
DROP POLICY IF EXISTS "Authenticated users can manage signatures" ON public.signatures;

-- Signatures Policies
DROP POLICY IF EXISTS "signatures_select_policy" ON public.signatures;
CREATE POLICY "signatures_select_policy" ON public.signatures
  FOR SELECT TO authenticated
  USING (is_admin_or_dos() OR user_id = auth.uid());

DROP POLICY IF EXISTS "signatures_modify_policy" ON public.signatures;
CREATE POLICY "signatures_modify_policy" ON public.signatures
  FOR ALL TO authenticated
  USING (is_admin_or_dos() OR user_id = auth.uid())
  WITH CHECK (is_admin_or_dos() OR user_id = auth.uid());

-- Watermark Configs Policies
DROP POLICY IF EXISTS "watermark_configs_select" ON public.watermark_configs;
CREATE POLICY "watermark_configs_select" ON public.watermark_configs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "watermark_configs_modify" ON public.watermark_configs;
CREATE POLICY "watermark_configs_modify" ON public.watermark_configs
  FOR ALL TO authenticated
  USING (is_admin_or_dos())
  WITH CHECK (is_admin_or_dos());

-- Stamp Configs Policies
DROP POLICY IF EXISTS "stamp_configs_select" ON public.stamp_configs;
CREATE POLICY "stamp_configs_select" ON public.stamp_configs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "stamp_configs_modify" ON public.stamp_configs;
CREATE POLICY "stamp_configs_modify" ON public.stamp_configs
  FOR ALL TO authenticated
  USING (is_admin_or_dos())
  WITH CHECK (is_admin_or_dos());

-- Report Template Overrides Policies
DROP POLICY IF EXISTS "report_template_overrides_select" ON public.report_template_overrides;
CREATE POLICY "report_template_overrides_select" ON public.report_template_overrides
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "report_template_overrides_modify" ON public.report_template_overrides;
CREATE POLICY "report_template_overrides_modify" ON public.report_template_overrides
  FOR ALL TO authenticated
  USING (is_admin_or_dos())
  WITH CHECK (is_admin_or_dos());

-- Audit Logs Policies
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (is_admin_or_dos() OR actor_id = auth.uid());

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL OR is_admin_or_dos());

-- Attendance Policies
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select" ON public.attendance
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "attendance_modify" ON public.attendance;
CREATE POLICY "attendance_modify" ON public.attendance
  FOR ALL TO authenticated
  USING (
    is_admin_or_dos()
    OR recorded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR t.id = auth.uid())
        AND lower(coalesce(t.status, 'active')) NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
    )
  )
  WITH CHECK (
    is_admin_or_dos()
    OR recorded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE (t.auth_user_id = auth.uid() OR t.id = auth.uid())
        AND lower(coalesce(t.status, 'active')) NOT IN ('inactive', 'suspended', 'deactivated', 'banned')
    )
  );

-- Notifications Policies
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR recipient_id IS NULL OR is_admin_or_dos());

DROP POLICY IF EXISTS "notifications_modify" ON public.notifications;
CREATE POLICY "notifications_modify" ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid() OR is_admin_or_dos())
  WITH CHECK (recipient_id = auth.uid() OR is_admin_or_dos());

-- Teacher Class Assignments Policies
DROP POLICY IF EXISTS "teacher_class_assignments_select" ON public.teacher_class_assignments;
CREATE POLICY "teacher_class_assignments_select" ON public.teacher_class_assignments
  FOR SELECT TO authenticated
  USING (
    is_admin_or_dos()
    OR teacher_id IN (
      SELECT t.id FROM public.teachers t
      WHERE t.auth_user_id = auth.uid() OR t.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "teacher_class_assignments_manage" ON public.teacher_class_assignments;
CREATE POLICY "teacher_class_assignments_manage" ON public.teacher_class_assignments
  FOR ALL TO authenticated
  USING (is_admin_or_dos())
  WITH CHECK (is_admin_or_dos());

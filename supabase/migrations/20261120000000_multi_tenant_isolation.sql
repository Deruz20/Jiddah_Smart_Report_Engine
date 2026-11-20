-- ==============================================================================
-- EPIC 1: MULTI-TENANT DATABASE HARDENING & ISOLATION MIGRATION
-- ==============================================================================
-- Migration: 20261120000000_multi_tenant_isolation.sql
-- Description:
--   1. Creates core public.schools tenant registry.
--   2. Seeds default tenant 'jiddah' for existing single-school records.
--   3. Adds school_id (UUID NOT NULL) foreign key to all core business tables.
--   4. Backfills existing rows to the default tenant before enforcing NOT NULL.
--   5. Scopes singleton constraints (school_settings, stamp_configs) by school_id.
--   6. Implements auth.current_school_id() session helper.
--   7. Enforces bulletproof Row Level Security (RLS) tenant isolation policies.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TENANT REGISTRY: public.schools
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  domain text UNIQUE,
  subdomain text UNIQUE,
  contact_email text,
  contact_phone text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'archived')),
  subscription_tier text DEFAULT 'enterprise' CHECK (subscription_tier IN ('trial', 'standard', 'pro', 'enterprise')),
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed default tenant record for Jiddah Islamic Nursery & Primary School
INSERT INTO public.schools (id, slug, name, subdomain, status, subscription_tier)
VALUES (
  'c0000000-0000-0000-0000-000000000001'::uuid,
  'jiddah',
  'Jiddah Islamic Nursery & Primary School',
  'jiddah',
  'active',
  'enterprise'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  subdomain = EXCLUDED.subdomain;

-- ------------------------------------------------------------------------------
-- 2. SCHOOL_ID FOREIGN KEYS & BACKFILL ACROSS ALL CORE TABLES
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  v_default_school_id uuid := 'c0000000-0000-0000-0000-000000000001'::uuid;
  tbl text;
  tables text[] := ARRAY[
    'teachers',
    'teacher_invites',
    'students',
    'enrollments',
    'circular_classes',
    'theology_classes',
    'circular_subjects',
    'theology_subjects',
    'circular_marks',
    'theology_marks',
    'attendance',
    'terms',
    'school_settings',
    'stamp_configs',
    'grading_criteria',
    'grading_standards',
    'activity_logs',
    'notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Add column if not exists
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE', tbl);
      
      -- Backfill existing single-tenant data
      EXECUTE format('UPDATE public.%I SET school_id = %L WHERE school_id IS NULL', tbl, v_default_school_id);
      
      -- Enforce NOT NULL
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN school_id SET NOT NULL', tbl);
      
      -- Index school_id for high-performance tenant filtering
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_school_id ON public.%I(school_id)', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. SCOPE SINGLETON CONSTRAINTS BY SCHOOL_ID
-- ------------------------------------------------------------------------------

-- 3A. stamp_configs: Drop global config_key uniqueness, enforce per-school uniqueness
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stamp_configs') THEN
    ALTER TABLE public.stamp_configs DROP CONSTRAINT IF EXISTS stamp_configs_config_key_key;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'stamp_configs_school_config_key_uniq'
    ) THEN
      ALTER TABLE public.stamp_configs 
        ADD CONSTRAINT stamp_configs_school_config_key_uniq UNIQUE (school_id, config_key);
    END IF;
  END IF;
END $$;

-- 3B. school_settings: Enforce 1 primary settings row per school
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_settings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'school_settings_school_unique'
    ) THEN
      ALTER TABLE public.school_settings 
        ADD CONSTRAINT school_settings_school_unique UNIQUE (school_id);
    END IF;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. CURRENT TENANT SESSION RESOLVER FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.current_school_id()
RETURNS uuid AS $$
DECLARE
  v_school_id uuid;
BEGIN
  -- 1. Check if school_id claim exists in JWT (Supabase custom claims)
  BEGIN
    SELECT nullif(current_setting('request.jwt.claims', true)::jsonb->>'school_id', '')::uuid 
    INTO v_school_id;
  EXCEPTION WHEN OTHERS THEN
    v_school_id := NULL;
  END;
  
  IF v_school_id IS NOT NULL THEN
    RETURN v_school_id;
  END IF;

  -- 2. Lookup teacher profile for authenticated user
  IF auth.uid() IS NOT NULL THEN
    SELECT school_id INTO v_school_id
    FROM public.teachers
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    IF v_school_id IS NOT NULL THEN
      RETURN v_school_id;
    END IF;
  END IF;

  -- 3. Default fallback for existing system integrity
  RETURN 'c0000000-0000-0000-0000-000000000001'::uuid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) TENANT ISOLATION POLICIES
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  tbl text;
  policy_name text;
  tables text[] := ARRAY[
    'teachers',
    'teacher_invites',
    'students',
    'enrollments',
    'circular_classes',
    'theology_classes',
    'circular_subjects',
    'theology_subjects',
    'circular_marks',
    'theology_marks',
    'attendance',
    'terms',
    'school_settings',
    'stamp_configs',
    'grading_criteria',
    'grading_standards',
    'activity_logs',
    'notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Enable and force RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
      
      -- Drop old tenant isolation policy if exists
      policy_name := format('tenant_isolation_%I', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, tbl);
      
      -- Create universal tenant isolation policy
      EXECUTE format(
        'CREATE POLICY %I ON public.%I
         FOR ALL
         TO authenticated
         USING (school_id = auth.current_school_id())
         WITH CHECK (school_id = auth.current_school_id())',
        policy_name, tbl
      );
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 6. SCHOOLS REGISTRY ACCESS POLICY
-- ------------------------------------------------------------------------------
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_schools_select" ON public.schools;
CREATE POLICY "tenant_schools_select" ON public.schools
  FOR SELECT
  TO authenticated
  USING (id = auth.current_school_id());

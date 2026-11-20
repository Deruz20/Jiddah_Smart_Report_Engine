-- ==============================================================================
-- EPIC 2: ASYNCHRONOUS DOCUMENT AUTOMATION & PDF JOBS SCHEMA
-- ==============================================================================
-- Migration: 20261120000001_pdf_jobs.sql
-- Description:
--   1. Creates public.pdf_export_jobs table for asynchronous batch report card generation.
--   2. Enforces multi-tenant foreign key referencing public.schools(id).
--   3. Adds tracking for progress_current, progress_total, status, and download file_url.
--   4. Creates performance indexes on (school_id, status) and (created_by, created_at).
--   5. Enforces Row Level Security (RLS) tenant isolation policies tied to auth.current_school_id().
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.pdf_export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid NULL,
  term_id uuid NULL,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  progress_current integer NOT NULL DEFAULT 0,
  progress_total integer NOT NULL DEFAULT 0,
  file_url text NULL,
  file_name text NULL,
  error_message text NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Comments for documentation & audit clarity
COMMENT ON TABLE public.pdf_export_jobs IS 'Asynchronous background PDF and report card batch export jobs';
COMMENT ON COLUMN public.pdf_export_jobs.status IS 'Job state: pending, processing, completed, or failed';
COMMENT ON COLUMN public.pdf_export_jobs.progress_current IS 'Number of individual student report cards generated so far';
COMMENT ON COLUMN public.pdf_export_jobs.progress_total IS 'Total number of report cards to generate in this batch';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_pdf_export_jobs_tenant_status 
  ON public.pdf_export_jobs (school_id, status);

CREATE INDEX IF NOT EXISTS idx_pdf_export_jobs_creator 
  ON public.pdf_export_jobs (created_by, created_at DESC);

-- Automatic updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_pdf_export_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pdf_export_jobs_updated_at ON public.pdf_export_jobs;
CREATE TRIGGER trg_pdf_export_jobs_updated_at
  BEFORE UPDATE ON public.pdf_export_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pdf_export_jobs_updated_at();

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.pdf_export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_export_jobs FORCE ROW LEVEL SECURITY;

-- Tenant Isolation: Authenticated users can view and create jobs within their tenant
DROP POLICY IF EXISTS tenant_isolation_pdf_export_jobs ON public.pdf_export_jobs;
CREATE POLICY tenant_isolation_pdf_export_jobs ON public.pdf_export_jobs
  FOR ALL
  TO authenticated
  USING (
    school_id = auth.current_school_id()
  )
  WITH CHECK (
    school_id = auth.current_school_id()
  );

-- Service role bypass for background worker updates
DROP POLICY IF EXISTS service_role_pdf_export_jobs ON public.pdf_export_jobs;
CREATE POLICY service_role_pdf_export_jobs ON public.pdf_export_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

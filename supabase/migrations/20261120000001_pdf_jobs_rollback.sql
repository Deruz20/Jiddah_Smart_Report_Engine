-- ==============================================================================
-- EPIC 2 ROLLBACK: ASYNCHRONOUS DOCUMENT AUTOMATION & PDF JOBS
-- ==============================================================================
-- Migration: 20261120000001_pdf_jobs_rollback.sql
-- Description:
--   Rolls back public.pdf_export_jobs table, indexes, triggers, and RLS policies.
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_pdf_export_jobs_updated_at ON public.pdf_export_jobs;
DROP FUNCTION IF EXISTS public.set_pdf_export_jobs_updated_at();
DROP POLICY IF EXISTS tenant_isolation_pdf_export_jobs ON public.pdf_export_jobs;
DROP POLICY IF EXISTS service_role_pdf_export_jobs ON public.pdf_export_jobs;
DROP TABLE IF EXISTS public.pdf_export_jobs CASCADE;

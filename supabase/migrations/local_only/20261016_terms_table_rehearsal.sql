-- ============================================================================
-- Local-Only Migration: Create terms table and seed synthetic terms
-- Rehearsal Environment Only
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  academic_year integer NOT NULL,
  term_number integer NOT NULL,
  is_current boolean DEFAULT false,
  start_date date,
  end_date date,
  next_term_start date,
  created_at timestamptz DEFAULT now()
);

-- Enable & Force RLS
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms FORCE ROW LEVEL SECURITY;

-- Grants
REVOKE ALL ON public.terms FROM anon;
REVOKE ALL ON public.terms FROM authenticated;

GRANT SELECT ON public.terms TO anon, authenticated;
GRANT ALL ON public.terms TO authenticated;

-- Policies
DROP POLICY IF EXISTS terms_read ON public.terms;
CREATE POLICY terms_read ON public.terms
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS terms_admin_all ON public.terms;
CREATE POLICY terms_admin_all ON public.terms
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers
      WHERE teachers.email = auth.jwt() ->> 'email'
        AND teachers.role IN ('Administrator', 'admin')
    )
  );

-- Seed synthetic terms if empty
INSERT INTO public.terms (id, label, academic_year, term_number, is_current, start_date, end_date, next_term_start)
VALUES 
  ('a1b2c3d4-e5f6-4a1b-8c2d-111111111111', 'Term 1, 2026', 2026, 1, true, '2026-02-01', '2026-05-01', '2026-05-25'),
  ('a1b2c3d4-e5f6-4a1b-8c2d-222222222222', 'Term 2, 2026', 2026, 2, false, '2026-05-25', '2026-08-25', '2026-09-15'),
  ('a1b2c3d4-e5f6-4a1b-8c2d-333333333333', 'Term 3, 2025', 2025, 3, false, '2025-09-01', '2025-12-01', '2026-02-01')
ON CONFLICT (id) DO NOTHING;

-- Also seed academic_terms for compatibility
INSERT INTO public.academic_terms (id, term_name, academic_year, start_date, end_date, is_active)
VALUES
  ('a1b2c3d4-e5f6-4a1b-8c2d-111111111111', 'Term 1', '2026', '2026-02-01', '2026-05-01', true),
  ('a1b2c3d4-e5f6-4a1b-8c2d-222222222222', 'Term 2', '2026', '2026-05-25', '2026-08-25', false),
  ('a1b2c3d4-e5f6-4a1b-8c2d-333333333333', 'Term 3', '2025', '2025-09-01', '2025-12-01', false)
ON CONFLICT (id) DO NOTHING;

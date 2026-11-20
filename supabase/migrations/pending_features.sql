-- ==============================================================================
-- PENDING FEATURES & TELEMETRY OPTIMIZATION MIGRATION (NON-DESTRUCTIVE REFERENCE)
-- ==============================================================================
-- IMPORTANT NOTE: In accordance with project guardrails, this migration script is
-- for pending review and must NOT be applied to production without explicit approval.
-- It contains recommended indexes and constraints to accelerate roll-call attendance,
-- teacher invitations, and multi-term academic analytics.
-- ==============================================================================

-- 1. Accelerate Daily Roll Call & Monthly Attendance Telemetry
CREATE INDEX IF NOT EXISTS idx_attendance_class_date 
  ON public.attendance(class_id, date);

CREATE INDEX IF NOT EXISTS idx_attendance_date_status 
  ON public.attendance(date, status);

CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
  ON public.attendance(student_id, date);

-- 2. Accelerate Staff Invitation Tracking & Lookup
CREATE INDEX IF NOT EXISTS idx_teacher_invites_status_created 
  ON public.teacher_invites(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_teacher_invites_email 
  ON public.teacher_invites(email);

-- 3. Accelerate Academic Analytics Marks Aggregation
CREATE INDEX IF NOT EXISTS idx_circular_marks_term_subject 
  ON public.circular_marks(term_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_theology_marks_term_subject 
  ON public.theology_marks(term_id, subject_id);

-- 4. Enable updated_at trigger for attendance table if not already active
CREATE OR REPLACE FUNCTION public.set_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.attendance;
CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.set_attendance_updated_at();

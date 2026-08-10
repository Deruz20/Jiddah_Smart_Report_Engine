-- 1. Add theology_status to enrollments
ALTER TABLE public.enrollments 
ADD COLUMN theology_status TEXT CHECK (theology_status IN ('active', 'archived', 'not_applicable')) DEFAULT 'active';

-- Backfill existing data based on the original string-matching logic (P.7 gets not_applicable, others active)
-- Assuming we don't have the string class names in enrollments directly, we would normally join to circular_classes
UPDATE public.enrollments e
SET theology_status = 'not_applicable'
FROM public.circular_classes c
WHERE e.circular_class_id = c.id AND c.class_name LIKE '%P.7%';

-- Add it to publication if necessary (PowerSync needs to know about schema changes)
-- Note: It is already in the 'enrollments' table, which is in publication 'powersync', so the column is automatically included.

-- 2. Create activity_log table for Admin monitoring (online only)
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for activity_log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Admins can read all activity logs (this table is not synced to PowerSync so RLS here is normal)
CREATE POLICY "Admins can view all activity logs" 
  ON public.activity_log 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.teachers 
      WHERE teachers.auth_user_id = auth.uid() 
      AND teachers.role IN ('Administrator', 'Head Teacher', 'DOS Secular', 'DOS Theology', 'Deputy Head Teacher')
    )
  );

-- Teachers can view their own activity logs
CREATE POLICY "Teachers can view their own activity" 
  ON public.activity_log 
  FOR SELECT 
  USING (teacher_id = auth.uid());

-- System (authenticated users) can insert activity logs for themselves
CREATE POLICY "Users can insert their own activity logs" 
  ON public.activity_log 
  FOR INSERT 
  WITH CHECK (teacher_id = auth.uid());

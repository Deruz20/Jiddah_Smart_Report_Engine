-- Add is_archived column for soft-delete functionality
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Create an index to speed up filtering out archived students
CREATE INDEX IF NOT EXISTS idx_students_is_archived ON public.students(is_archived);

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS religion TEXT DEFAULT 'Muslim';

-- Optional check constraint to ensure religion is one of the expected values
-- But leaving it open for now, defaults to Muslim.
-- We can enforce 'Muslim' and 'Non-Muslim' in the application logic.

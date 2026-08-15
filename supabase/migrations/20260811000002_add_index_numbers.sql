-- Add index numbers for P.7 students
ALTER TABLE public.students
ADD COLUMN circular_index_number TEXT,
ADD COLUMN theology_index_number TEXT;

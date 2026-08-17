-- Paste this exactly into your Supabase SQL Editor and hit Run:

-- This deletes the 16 OLD duplicate secular subjects from the `subjects` table, 
-- leaving only the correct 16 that match the IDs in `circular_subjects`.
DELETE FROM public.subjects 
WHERE curriculum = 'secular' 
AND id NOT IN (SELECT id FROM public.circular_subjects);

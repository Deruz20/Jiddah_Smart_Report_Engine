-- Add school profile columns to public.school_settings
ALTER TABLE public.school_settings
ADD COLUMN IF NOT EXISTS address text DEFAULT 'Kampala, Uganda',
ADD COLUMN IF NOT EXISTS district text DEFAULT 'Kampala',
ADD COLUMN IF NOT EXISTS email text DEFAULT 'admin@jiddahschool.ug',
ADD COLUMN IF NOT EXISTS phone_1 text DEFAULT '+256 752 123456',
ADD COLUMN IF NOT EXISTS phone_2 text DEFAULT '',
ADD COLUMN IF NOT EXISTS pay_code text DEFAULT 'JIDDAH-UG',
ADD COLUMN IF NOT EXISTS current_term text DEFAULT 'Term 1',
ADD COLUMN IF NOT EXISTS current_year integer DEFAULT 2026,
ADD COLUMN IF NOT EXISTS motto text DEFAULT 'Excellence in Islamic and Secular Education',
ADD COLUMN IF NOT EXISTS logo_url text DEFAULT '/school_budge.jpeg';

NOTIFY pgrst, 'reload schema';

-- Create teacher_initials table
CREATE TABLE IF NOT EXISTS teacher_initials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  initials TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(level, subject_id)
);

-- Enable RLS
ALTER TABLE teacher_initials ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage teacher_initials" ON teacher_initials
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Administrator' OR 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'Administrator' OR 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Everyone can read
CREATE POLICY "Everyone can read teacher_initials" ON teacher_initials
  FOR SELECT TO authenticated
  USING (true);

-- Add a trigger for updated_at
CREATE TRIGGER update_teacher_initials_updated_at
BEFORE UPDATE ON teacher_initials
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add nullable class_id column to teacher_initials
ALTER TABLE teacher_initials ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES circular_classes(id) ON DELETE CASCADE;

ALTER TABLE teacher_initials DROP CONSTRAINT IF EXISTS teacher_initials_level_subject_id_key;

ALTER TABLE teacher_initials ADD CONSTRAINT teacher_initials_level_subject_class_unique UNIQUE NULLS NOT DISTINCT (level, subject_id, class_id);

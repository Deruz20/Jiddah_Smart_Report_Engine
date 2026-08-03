ALTER TABLE circular_classes ADD COLUMN IF NOT EXISTS class_teacher_id UUID REFERENCES teachers(id);

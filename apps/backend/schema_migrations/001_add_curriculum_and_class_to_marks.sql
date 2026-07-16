-- Add curriculum and class_id columns to circular_marks
ALTER TABLE circular_marks ADD COLUMN curriculum VARCHAR(50) DEFAULT 'secular';
ALTER TABLE circular_marks ADD COLUMN class_id INTEGER;

-- Backfill circular_marks
UPDATE circular_marks cm
SET class_id = e.circular_class_id
FROM enrollments e
WHERE cm.enrollment_id = e.id;

-- Add curriculum and class_id columns to theology_marks
ALTER TABLE theology_marks ADD COLUMN curriculum VARCHAR(50) DEFAULT 'theology';
ALTER TABLE theology_marks ADD COLUMN class_id INTEGER;

-- Backfill theology_marks
UPDATE theology_marks tm
SET class_id = e.theology_class_id
FROM enrollments e
WHERE tm.enrollment_id = e.id;

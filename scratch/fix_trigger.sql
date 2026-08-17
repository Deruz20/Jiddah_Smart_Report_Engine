-- Paste this exactly into your Supabase SQL Editor and hit Run:

-- 1. Fix the Foreign Key so circular_marks points to the new "subjects" table
ALTER TABLE circular_marks 
DROP CONSTRAINT IF EXISTS circular_marks_subject_id_fkey;

ALTER TABLE circular_marks 
ADD CONSTRAINT circular_marks_subject_id_fkey 
FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;

-- 2. Fix the Trigger so it checks "subjects" instead of the old "circular_subjects" table
CREATE OR REPLACE FUNCTION enforce_circular_mark_section()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_class_section text;
    v_subject_section text;
BEGIN
    SELECT cc.section INTO v_class_section
    FROM enrollments e
    JOIN circular_classes cc ON e.circular_class_id = cc.id
    WHERE e.id = NEW.enrollment_id;

    SELECT s.section INTO v_subject_section
    FROM subjects s
    WHERE s.id = NEW.subject_id;

    IF v_class_section IS NULL THEN
        RAISE EXCEPTION 'Enrollment % is missing or has no circular class assigned.', NEW.enrollment_id;
    END IF;

    IF v_subject_section IS NULL THEN
        RAISE EXCEPTION 'Circular subject % is missing or has no section assigned.', NEW.subject_id;
    END IF;

    IF v_class_section != v_subject_section THEN
        RAISE EXCEPTION 'Section mismatch: Enrollment % is in section %, but subject % is in section %.', 
            NEW.enrollment_id, v_class_section, NEW.subject_id, v_subject_section;
    END IF;

    RETURN NEW;
END;
$$;

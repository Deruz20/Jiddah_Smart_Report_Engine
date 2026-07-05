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

    SELECT cs.section INTO v_subject_section
    FROM circular_subjects cs
    WHERE cs.id = NEW.subject_id;

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

DROP TRIGGER IF EXISTS trg_enforce_circular_mark_section ON circular_marks;
CREATE TRIGGER trg_enforce_circular_mark_section
BEFORE INSERT OR UPDATE ON circular_marks
FOR EACH ROW
EXECUTE FUNCTION enforce_circular_mark_section();

CREATE OR REPLACE FUNCTION enforce_theology_mark_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_class_level text;
    v_subject_level text;
BEGIN
    SELECT tc.level INTO v_class_level
    FROM enrollments e
    JOIN theology_classes tc ON e.theology_class_id = tc.id
    WHERE e.id = NEW.enrollment_id;

    SELECT ts.level INTO v_subject_level
    FROM theology_subjects ts
    WHERE ts.id = NEW.subject_id;

    IF v_class_level IS NULL THEN
        RAISE EXCEPTION 'Enrollment % is missing or has no theology class assigned.', NEW.enrollment_id;
    END IF;

    IF v_subject_level IS NULL THEN
        RAISE EXCEPTION 'Theology subject % is missing or has no level assigned.', NEW.subject_id;
    END IF;

    IF v_class_level != v_subject_level THEN
        RAISE EXCEPTION 'Level mismatch: Enrollment % is in theology level %, but subject % is level %.', 
            NEW.enrollment_id, v_class_level, NEW.subject_id, v_subject_level;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_theology_mark_level ON theology_marks;
CREATE TRIGGER trg_enforce_theology_mark_level
BEFORE INSERT OR UPDATE ON theology_marks
FOR EACH ROW
EXECUTE FUNCTION enforce_theology_mark_level();

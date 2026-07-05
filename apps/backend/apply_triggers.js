require('dotenv').config({ path: 'c:\\Users\\JIDDAH\\Desktop\\jiddah-smart-report-engine\\apps\\backend\\.env.production' });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

const sql = `
-- Enforce circular_marks subject section matches enrollment class section
CREATE OR REPLACE FUNCTION check_circular_subject_section()
RETURNS TRIGGER AS $$
DECLARE
    v_subject_section VARCHAR;
    v_class_section VARCHAR;
BEGIN
    SELECT section INTO v_subject_section FROM circular_subjects WHERE id = NEW.subject_id;
    SELECT c.section INTO v_class_section
    FROM enrollments e
    JOIN circular_classes c ON e.circular_class_id = c.id
    WHERE e.id = NEW.enrollment_id;

    IF v_subject_section IS NOT NULL AND v_subject_section != v_class_section THEN
        RAISE EXCEPTION 'Subject section (%) does not match class section (%)', v_subject_section, v_class_section;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_circular_subject_section ON circular_marks;
CREATE TRIGGER enforce_circular_subject_section
BEFORE INSERT OR UPDATE ON circular_marks
FOR EACH ROW
EXECUTE FUNCTION check_circular_subject_section();

-- Enforce theology_marks subject level matches enrollment class level
CREATE OR REPLACE FUNCTION check_theology_subject_level()
RETURNS TRIGGER AS $$
DECLARE
    v_subject_level VARCHAR;
    v_class_level VARCHAR;
BEGIN
    SELECT level INTO v_subject_level FROM theology_subjects WHERE id = NEW.subject_id;
    SELECT c.level INTO v_class_level
    FROM enrollments e
    JOIN theology_classes c ON e.theology_class_id = c.id
    WHERE e.id = NEW.enrollment_id;

    IF v_subject_level IS NOT NULL AND v_subject_level != v_class_level THEN
        RAISE EXCEPTION 'Subject level (%) does not match class level (%)', v_subject_level, v_class_level;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_theology_subject_level ON theology_marks;
CREATE TRIGGER enforce_theology_subject_level
BEFORE INSERT OR UPDATE ON theology_marks
FOR EACH ROW
EXECUTE FUNCTION check_theology_subject_level();
`;

async function applySql() {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('Failed to execute SQL via RPC (might not exist):', error);
  } else {
    console.log('SQL applied successfully:', data);
  }
}
applySql();

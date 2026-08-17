const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRecentMarks() {
  console.log("=== RECENT THEOLOGY MARKS IN SUPABASE ===");
  
  // Get recent theology marks
  const { data: marks, error: marksErr } = await supabase
    .from('theology_marks')
    .select(`
      id,
      mot_score,
      eot_score,
      updated_at,
      subject_id,
      enrollments (
        id,
        students (
          name
        )
      )
    `)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (marksErr) {
    console.error("Error fetching marks:", marksErr);
    return;
  }

  if (!marks || marks.length === 0) {
    console.log("No theology marks found in the database.");
    return;
  }

  // Get subject names for mapping
  const { data: subjects } = await supabase.from('theology_subjects').select('id, subject_name_arabic');
  const subjectMap = {};
  if (subjects) {
    subjects.forEach(s => subjectMap[s.id] = s.subject_name_arabic);
  }

  marks.forEach(mark => {
    const studentName = mark.enrollments?.students?.name || 'Unknown Student';
    const subjectName = subjectMap[mark.subject_id] || mark.subject_id;
    console.log(`Student: ${studentName} | Subject: ${subjectName} | MOT: ${mark.mot_score} | EOT: ${mark.eot_score} | Updated: ${mark.updated_at}`);
  });
}

checkRecentMarks();

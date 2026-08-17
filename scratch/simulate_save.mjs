import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Logging in...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@jiddah.com',
    password: 'password123'
  });
  
  if (authErr) {
    console.error("Login failed:", authErr);
    return;
  }
  console.log("Logged in as:", authData.user.id);

  // 1. Get SSEMATA IMRAN's enrollment for term 2
  const { data: student } = await supabase.from('students').select('id, name').ilike('name', '%SSEMATA IMRAN%').single();
  const { data: term } = await supabase.from('terms').select('id').eq('term_number', 2).single();
  const { data: enrollment } = await supabase.from('enrollments').select('id, theology_class_id').eq('student_id', student.id).eq('term_id', term.id).single();
  
  const enrollment_id = enrollment.id;
  const term_id = term.id;
  
  // 2. Get a theology subject (Quran)
  const { data: subject } = await supabase.from('theology_subjects').select('id, subject_name_arabic, level').ilike('subject_name_arabic', '%القرآن%').limit(1).single();
  const subject_id = subject.id;

  const payload = {
    enrollment_id,
    term_id,
    subject_id,
    mot_score: 85,
    eot_score: 90,
    updated_by: 'local_user_bypass'
  };

  console.log("\n1) **Attempt summary**");
  console.log("- tableName: theology_marks");
  console.log("- mode (insert/update): insert");
  console.log("- keys: enrollment_id=" + enrollment_id + ", term_id=" + term_id + ", subject_id=" + subject_id);
  console.log("- scores sent: mot=85, eot=90");

  const { error } = await supabase.from('theology_marks').insert(payload);

  if (error) {
    console.log("\n2) **If it failed**");
    console.log("- error.message (verbatim):", error.message);
    console.log("- error.code:", error.code);
    console.log("- error.details:", error.details);
    console.log("- error.hint:", error.hint);
    console.log("\n5) **Status:** NOT YET");
    return;
  }

  console.log("\n3) **If it succeeded**");
  const { data: check } = await supabase.from('theology_marks').select('*').eq('enrollment_id', enrollment_id).eq('subject_id', subject_id).eq('term_id', term_id);
  console.log("- returned row id(s):", check?.[0]?.id);
  console.log("- stored scores from read-after-write:", `mot=${check?.[0]?.mot_score}, eot=${check?.[0]?.eot_score}`);
  
  console.log("\n4) **Render**");
  console.log("- rows returned:", check?.length);
  console.log("- scores returned:", `mot=${check?.[0]?.mot_score}, eot=${check?.[0]?.eot_score}`);
  console.log("\n5) **Status:** GREEN LIGHT");
}

run();

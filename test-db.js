const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].trim().replace(/^"|"$/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: students } = await sb.from('students').select('id, name, enrollments(id, theology_class_id)').ilike('name', '%hayat%');
  console.log('Students:', JSON.stringify(students, null, 2));

  if (students && students.length > 0) {
    const studentId = students[0].id;
    const termId = '639f7a76-0bf8-4be6-a9f4-cf36070a7d57'; // Term 2, 2026 (guessing based on previous screenshot)
    
    // Instead of hitting the API, let's just query theology_marks for this student
    const { data: marks } = await sb.from('theology_marks').select('*').eq('enrollment_id', students[0].enrollments[0].id);
    console.log('Theology marks in DB for student:', marks);
    
    // Check theology subjects
    const { data: subjs } = await sb.from('theology_subjects').select('*').eq('level', 'ibtidaai_lower');
    console.log('Theology subjects for level ibtidaai_lower:', subjs);
  }
}
test();

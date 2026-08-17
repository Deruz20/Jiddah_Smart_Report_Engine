const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) acc[match[1]] = match[2].trim().replace(/^"|"$/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: student } = await sb.from('students').select('*').ilike('name', '%SSEMATA IMRAN%').single();
  const { data: enrollments } = await sb.from('enrollments').select('*').eq('student_id', student.id);
  
  const { data: marks, error } = await sb.from('theology_marks').select('*').eq('enrollment_id', enrollments[0].id);
  console.log('All Theology Marks for SSEMATA:', marks, error);
}
run();

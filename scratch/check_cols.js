const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data: students } = await supabase.from('students').select('*').limit(1);
  console.log('Students columns:', Object.keys(students[0]));
  
  const { data: enrollments } = await supabase.from('enrollments').select('*').limit(1);
  console.log('Enrollments columns:', Object.keys(enrollments[0]));
}

check();

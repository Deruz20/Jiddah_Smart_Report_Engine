const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/backend/.env.production' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkEnrollments() {
  const { data: classes, error: cErr } = await supabase.from('classes').select('*').limit(3);
  console.log('Classes:', classes);
  
  if (classes && classes.length > 0) {
    const classId = classes[0].id;
    console.log('\nChecking enrollments for class:', classId);
    
    // Raw enrollments query
    const { data: rawEnrollments, error: rErr } = await supabase
      .from('enrollments')
      .select('*')
      .eq('class_id', classId);
    console.log(`Raw enrollments for class ${classId}:`, rawEnrollments?.length);
    
    // Join query mimicking UI (assuming UI joins students)
    const { data: joined, error: jErr } = await supabase
      .from('enrollments')
      .select('*, students(*)')
      .eq('class_id', classId)
      .eq('status', 'ACTIVE')
      .not('students', 'is', null);
      
    console.log(`Joined active enrollments with students:`, joined?.length);
    if (jErr) console.log('Join Error:', jErr);
  }
}

checkEnrollments();

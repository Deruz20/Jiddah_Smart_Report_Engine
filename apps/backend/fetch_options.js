const fs = require('fs');
const env = fs.readFileSync('c:\\Users\\JIDDAH\\Desktop\\jiddah-smart-report-engine\\apps\\backend\\.env.production', 'utf-8');
env.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[match[1].trim()] = val;
  }
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  // Login
  await supabase.auth.signInWithPassword({
    email: 'hassanhatima20@gmail.com',
    password: 'Jiddah'
  });

  // Fetch circular classes
  const { data: circularClasses } = await supabase.from('circular_classes').select('*');
  console.log('Circular Classes:', circularClasses);

  // Fetch theology classes
  const { data: theologyClasses } = await supabase.from('theology_classes').select('*');
  console.log('Theology Classes:', theologyClasses);

  // Fetch enrollments with joined student and class details
  const { data: enrollments } = await supabase.from('enrollments').select(`
    id,
    academic_year,
    is_active,
    circular_classes ( id, class_name, section ),
    theology_classes ( id, class_name_arabic, class_name_english, level ),
    students ( id, name )
  `).eq('is_active', true);
  
  console.log('Enrollments first 5:');
  console.log(JSON.stringify(enrollments.slice(0, 5), null, 2));

  // Fetch circular subjects
  const { data: circularSubjects } = await supabase.from('circular_subjects').select('*');
  console.log('Circular Subjects:', circularSubjects);

  // Fetch theology subjects
  const { data: theologySubjects } = await supabase.from('theology_subjects').select('*');
  console.log('Theology Subjects:', theologySubjects);
}

run();

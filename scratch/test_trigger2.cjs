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
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'hassanhatima20@gmail.com',
    password: 'Jiddah'
  });
  
  if (authErr) {
    console.error('Auth error:', authErr.message);
    return;
  }

  // Find any enrollment and its class section
  const { data: enrolls } = await supabase.from('enrollments').select('id, circular_class_id').limit(1);
  if (!enrolls || enrolls.length === 0) { console.log('No enrollments'); return; }
  
  const enrollmentId = enrolls[0].id;
  const { data: cClass } = await supabase.from('circular_classes').select('section').eq('id', enrolls[0].circular_class_id).single();
  const classSection = cClass.section;
  
  // Find a subject with a DIFFERENT section
  const { data: subs } = await supabase.from('circular_subjects').select('id, section').neq('section', classSection).limit(1);
  if (!subs || subs.length === 0) { console.log('No mismatch subject'); return; }
  
  const subjectId = subs[0].id;
  const subjectSection = subs[0].section;
  
  console.log(`Mismatch found! Enrollment maps to Class section: ${classSection}. Subject section: ${subjectSection}`);
  
  // Find a valid term so foreign key constraint doesn't fail first
  const { data: terms } = await supabase.from('terms').select('id').limit(1);
  
  // Attempt INSERT
  console.log('Attempting insert into circular_marks...');
  const { error: insertError } = await supabase.from('circular_marks').insert({
    enrollment_id: enrollmentId,
    subject_id: subjectId,
    term_id: terms[0].id,
    bot_score: 85,
    mot_score: 85,
    eot_score: 85
  });
  
  if (insertError) {
    console.log('POSTGRES ERROR:');
    console.log(insertError.message);
  } else {
    console.log('INSERT SUCCEEDED! Trigger failed.');
    await supabase.from('circular_marks').delete().eq('enrollment_id', enrollmentId).eq('subject_id', subjectId);
  }
}
run();

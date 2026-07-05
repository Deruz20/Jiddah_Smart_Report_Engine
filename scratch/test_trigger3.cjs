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

  // Find any enrollment and its class level
  const { data: enrolls } = await supabase.from('enrollments').select('id, theology_class_id').not('theology_class_id', 'is', null).limit(1);
  if (!enrolls || enrolls.length === 0) { console.log('No theology enrollments'); return; }
  
  const enrollmentId = enrolls[0].id;
  const { data: cClass } = await supabase.from('theology_classes').select('level').eq('id', enrolls[0].theology_class_id).single();
  const classLevel = cClass.level;
  
  // Find a subject with a DIFFERENT level
  const { data: subs } = await supabase.from('theology_subjects').select('id, level').neq('level', classLevel).limit(1);
  if (!subs || subs.length === 0) { console.log('No mismatch subject'); return; }
  
  const subjectId = subs[0].id;
  const subjectLevel = subs[0].level;
  
  console.log(`Mismatch found! Enrollment maps to Theology Class level: ${classLevel}. Subject level: ${subjectLevel}`);
  
  const { data: terms } = await supabase.from('terms').select('id').limit(1);
  
  // Attempt INSERT
  console.log('Attempting insert into theology_marks...');
  const { error: insertError } = await supabase.from('theology_marks').insert({
    enrollment_id: enrollmentId,
    subject_id: subjectId,
    term_id: terms[0].id,
    mot_score: 85
  });
  
  if (insertError && !insertError.message.includes('schema cache')) {
    console.log('POSTGRES ERROR:');
    console.log(insertError.message);
  } else {
    console.log('INSERT SUCCEEDED! Trigger failed.');
    await supabase.from('theology_marks').delete().eq('enrollment_id', enrollmentId).eq('subject_id', subjectId);
  }
}
run();

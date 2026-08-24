const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data } = await supabase.from('subjects').select('id').limit(1);
  const subject_id = data[0].id;

  const payload = { level: 'nursery', subject_id, class_id: null, initials: 'MKA' };
  
  // Clean first
  await supabase.from('teacher_initials').delete().eq('subject_id', subject_id);
  
  console.log("Upserting with onConflict: level, subject_id, class_id");
  const { error: e3 } = await supabase.from('teacher_initials').upsert(payload, { onConflict: 'level, subject_id, class_id' });
  console.log("E3 error:", e3);
  
  const { error: e4 } = await supabase.from('teacher_initials').upsert(payload, { onConflict: 'level, subject_id, class_id' });
  console.log("E4 error (duplicate):", e4);
  
  // Clean after
  await supabase.from('teacher_initials').delete().eq('subject_id', subject_id);
}

test();

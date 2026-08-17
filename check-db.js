const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDB() {
  console.log("Checking theology_subjects...");
  const { data: subjects, error: subErr } = await supabase.from('theology_subjects').select('*').limit(5);
  console.log(subErr || subjects);

  console.log("Checking theology_marks schema (by fetching one)...");
  const { data: marks, error: markErr } = await supabase.from('theology_marks').select('*').limit(5);
  console.log(markErr || marks);
  
  console.log("Checking circular_marks schema...");
  const { data: cmarks, error: cmarkErr } = await supabase.from('circular_marks').select('*').limit(5);
  console.log(cmarkErr || cmarks);
}

checkDB();

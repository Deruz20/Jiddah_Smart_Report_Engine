require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data: enrollment } = await supabase.from('enrollments').select('id').limit(1).single();
  const { data: term } = await supabase.from('academic_terms').select('id').limit(1).single();
  console.log('ENROLLMENT_ID:', enrollment?.id);
  console.log('TERM_ID:', term?.id);
}

run();

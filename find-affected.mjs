import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const termId = '3c074233-aabf-4322-9048-130389a04792'; // From previous query
  const { data, error, count } = await supabase
    .from('theology_marks')
    .select('enrollment_id, subject_id, term_id', { count: 'exact' })
    .eq('term_id', termId)
    .not('mot_score', 'is', null)
    .is('eot_score', null);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Row count: ${count}`);
    console.log('Rows:', data);
  }
}

run();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('enrollments').select('*').in('student_id', ['566b146b-743f-4a67-b454-07fec898f140', '2bac385f-c603-4205-b298-617df0b5afbe']);
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}
main();

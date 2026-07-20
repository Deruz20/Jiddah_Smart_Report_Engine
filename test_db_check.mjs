import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('email', 'test_dos_theology@example.com')
    .single();
  console.log('Resulting Teacher Row:', data);
}
run();

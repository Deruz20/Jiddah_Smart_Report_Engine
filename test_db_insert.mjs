import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('teachers')
    .insert([{
      id: '44444444-4444-4444-4444-444444444444',
      email: 'bbaale_test@gmail.com',
      role: 'DOS',
      subject: 'Secular',
      name: 'BBAALE HERBERT',
      classes: [ 'P.4', 'P.5', 'P.6', 'P.7' ],
      phone: null,
      status: 'active'
    }]);
  console.log('Insert exact match error:', error);
}
run();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey);

async function main() {
  console.log("--- QUERY 1 ---");
  const q1 = await supabase.from('subjects').select('id, subject_name, curriculum').eq('curriculum', 'theology');
  if (q1.error) console.error(q1.error);
  else console.log(JSON.stringify(q1.data, null, 2));

  console.log("\n--- QUERY 2 ---");
  const q2 = await supabase.from('theology_subjects')
    .select('id, subject_name_arabic, level, sort_order')
    .in('id', [
      'ccd835fd-674a-4e36-bfce-62bc7b4e4e7a','ff29ec10-bc1b-42db-b7d4-c448d8222121',
      '1d0d7755-0931-4a86-a452-2c95cb602dd2','8a132aad-0573-4714-89f5-87c3972d097c',
      '657a93d9-c473-4054-9d65-bd9b9593836d','00064890-b816-4e28-82a3-143c82510c3b',
      '9778664e-3672-438f-8d41-88d8ee4eb98e','5b136890-988b-4f38-928a-c499073ef69f'
    ])
    .order('level')
    .order('sort_order');
  
  if (q2.error) console.error(q2.error);
  else console.log(JSON.stringify(q2.data, null, 2));
}

main();

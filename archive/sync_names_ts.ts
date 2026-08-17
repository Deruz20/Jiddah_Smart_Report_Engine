import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { transliterateEnglishToArabic } from './src/lib/transliterate';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  'https://vismrobdsdsaxmqegcay.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data: students, error } = await supabase.from('students').select('id, name');
  if (error) {
    console.error('Error fetching students:', error);
    return;
  }
  
  if (!students || students.length === 0) {
    console.log('No students found.');
    return;
  }

  console.log(`Found ${students.length} students. Re-transliterating all...`);
  
  let count = 0;
  for (const s of students) {
    const arabic = transliterateEnglishToArabic(s.name);
    console.log(`Setting ${s.name} to ${arabic}`);
    const { error: updateError } = await supabase.from('students').update({ arabic_name: arabic }).eq('id', s.id);
    if (updateError) {
       console.error(`Failed to update ${s.name}:`, updateError);
    } else {
       count++;
    }
  }
  
  console.log(`Successfully updated ${count} students!`);
}

run();

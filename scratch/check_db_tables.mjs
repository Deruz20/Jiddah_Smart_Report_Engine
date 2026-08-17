import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Querying information_schema.tables...');
  // Since Supabase JS client doesn't directly query information_schema easily,
  // we can just try selecting from both tables to see if they exist.
  
  const { data: theologyData, error: theologyError } = await supabase.from('theology_subjects').select('*').limit(5);
  console.log('theology_subjects existence/data:');
  if (theologyError) {
    console.error('Error fetching theology_subjects:', theologyError.message);
  } else {
    console.log(JSON.stringify(theologyData, null, 2));
  }
  
  const { data: subjectsData, error: subjectsError } = await supabase.from('subjects').select('*').limit(1);
  console.log('subjects existence:');
  if (subjectsError) {
    console.error('Error fetching subjects:', subjectsError.message);
  } else {
    console.log(subjectsData.length > 0 ? 'Exists' : 'Empty');
  }
}
main();

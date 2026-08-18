const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
  console.log('Fetching TAMUSUZA ABDUL-HAQQ...');
  const { data, error } = await supabase
    .from('students')
    .select('id, name, is_archived, created_at')
    .ilike('name', '%TAMUSUZA ABDUL-HAQQ%');

  if (error) {
    console.error(error);
    return;
  }
  
  console.log('Found:', data);
  
  // If there are duplicates, append (DELETED) to the archived ones to free up the unique constraint
  if (data && data.length > 0) {
      for (const student of data) {
          if (student.is_archived && !student.name.includes('DELETED')) {
              console.log(`Fixing archived student ${student.id}`);
              await supabase.from('students').update({
                  name: `${student.name} (DELETED_${student.id.substring(0,4)})`
              }).eq('id', student.id);
              console.log('Fixed!');
          }
      }
  }
  
  console.log('Done');
}

fix();

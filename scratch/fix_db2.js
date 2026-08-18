const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
  const duplicateId = '566b146b-743f-4a67-b454-07fec898f140';
  console.log(`Fixing duplicate student ${duplicateId}`);
  
  const { error } = await supabase.from('students').update({
      name: `TAMUSUZA ABDUL-HAQQ (DELETED_${duplicateId.substring(0,4)})`,
      is_archived: true
  }).eq('id', duplicateId);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Fixed!');
  }
}

fix();

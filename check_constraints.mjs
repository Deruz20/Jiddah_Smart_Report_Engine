import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('Testing email uniqueness...');
  const { data: d1, error: e1 } = await supabase.from('teachers').insert({
    email: 'TEST_UNIQUE_123@example.com',
    name: 'Test 1',
    role: 'Class Teacher',
    subject: 'Secular'
  }).select('id');
  
  if (e1) {
    console.error('Error inserting 1:', e1);
  } else {
    const id = d1[0].id;
    // Insert again
    const { error: e2 } = await supabase.from('teachers').insert({
      email: 'TEST_UNIQUE_123@example.com',
      name: 'Test 2',
      role: 'Class Teacher',
      subject: 'Secular'
    });
    console.log('Second insert error code:', e2?.code);
    
    // Clean up
    await supabase.from('teachers').delete().eq('id', id);
  }
}

main();

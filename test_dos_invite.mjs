import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Testing Admin inviting DOS Theology...');
  
  // Create an invite directly as the backend would do
  const payload = {
    email: 'test_dos_theology@example.com',
    invited_by: 'baab340c-5add-40d4-b16c-01f6d42ae67a', // The admin ID
    role: 'DOS Theology',
    subject: 'Theology',
    name: 'Test DOS Theo',
    phone: null,
    classes: [],
    status: 'pending'
  };

  const { data, error } = await supabase
    .from('teacher_invites')
    .insert([payload])
    .select();
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}
run();

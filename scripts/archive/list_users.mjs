import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listUsers() {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return console.error(error);
  
  const { data: teachers } = await supabaseAdmin.from('teachers').select('*');
  
  console.log('=== USERS IN SYSTEM ===');
  users.forEach(u => {
    const teacherProfile = teachers?.find(t => t.email === u.email);
    console.log(`Email: ${u.email}`);
    console.log(`Role: ${teacherProfile ? teacherProfile.role : (u.user_metadata?.role || 'No role')}`);
    console.log(`Subject/Dept: ${teacherProfile?.subject || 'N/A'}`);
    console.log('---');
  });

  // Reset all passwords to TestPassword123!
  for (const u of users) {
    await supabaseAdmin.auth.admin.updateUserById(u.id, { password: 'TestPassword123!' });
  }
  console.log('All passwords have been reset to: TestPassword123!');
}
listUsers();

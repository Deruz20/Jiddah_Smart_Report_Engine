import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const email = 'bbaale@gmail.com';
  
  console.log("Checking auth.users:");
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const u = usersData.users.find(u => u.email === email);
  console.log(u ? `Found auth user: ${u.id}` : 'No auth user');

  console.log("\nChecking teacher_invites:");
  const { data: invites } = await supabase.from('teacher_invites').select('*').eq('email', email);
  console.log(invites);

  console.log("\nChecking teachers:");
  const { data: teachers } = await supabase.from('teachers').select('*').eq('email', email);
  console.log(teachers);
}
run();

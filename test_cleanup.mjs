import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const email = 'test_dos_theology@example.com';
  await supabase.from('teachers').delete().eq('email', email);
  await supabase.from('teacher_invites').delete().eq('email', email);
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const u = usersData.users.find(u => u.email === email);
  if (u) await supabase.auth.admin.deleteUser(u.id);
  console.log('Cleanup done.');
}
run();

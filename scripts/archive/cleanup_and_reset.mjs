import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function run() {
  // 1. Reset Bbaale's password
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  
  const bbaale = usersData.users.find(u => u.email === 'bbaale@gmail.com');
  if (bbaale) {
    await supabaseAdmin.auth.admin.updateUserById(bbaale.id, { password: 'bbaale2026' });
    console.log("Reset password for bbaale@gmail.com to bbaale2026");
  } else {
    console.log("bbaale@gmail.com not found in auth.users");
  }

  // 2. Reset Ibrahim's password
  const ibrahim = usersData.users.find(u => u.email === 'ibrahimwoira8@gmail.com');
  if (ibrahim) {
    await supabaseAdmin.auth.admin.updateUserById(ibrahim.id, { password: 'ibrahimwoira2026' }); // Let's set it to ibrahimwoira2026 for now, or ibrahim2026
    console.log("Reset password for ibrahimwoira8@gmail.com to ibrahimwoira2026");
  } else {
    console.log("ibrahimwoira8@gmail.com not found in auth.users");
  }

  // 3. Check if teachers.id matches auth.users.id
  const { data: teachers } = await supabaseAdmin.from('teachers').select('id, email').limit(5);
  for (const t of teachers) {
    const user = usersData.users.find(u => u.email === t.email);
    console.log(`Teacher ${t.email}: teachers.id=${t.id}, auth.users.id=${user?.id}`);
  }
}

run().catch(console.error);

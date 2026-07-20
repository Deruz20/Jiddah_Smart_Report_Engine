import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const email = 'test_vercel@example.com';
  
  // 1. Cleanup first
  await supabaseAdmin.from('teachers').delete().eq('email', email);
  await supabaseAdmin.from('teacher_invites').delete().eq('email', email);
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const u = usersData.users.find(u => u.email === email);
  if (u) await supabaseAdmin.auth.admin.deleteUser(u.id);

  // 2. Create invite
  await supabaseAdmin.from('teacher_invites').insert([{
    email,
    status: 'pending',
    role: 'DOS Secular',
    subject: 'Secular',
    name: 'Vercel Test',
    classes: ['P.4']
  }]);

  console.log("Invite created. Calling Vercel endpoint...");

  // 3. Call Vercel endpoint
  const res = await fetch('https://jiddah-smart-report-engine-backend.vercel.app/api/teachers/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123!', phone: '+256700000000' })
  });

  const body = await res.text();
  console.log(`Vercel Response: ${res.status}`);
  console.log(body);

  // 4. Cleanup
  await supabaseAdmin.from('teachers').delete().eq('email', email);
  await supabaseAdmin.from('teacher_invites').delete().eq('email', email);
  const { data: usersData2 } = await supabaseAdmin.auth.admin.listUsers();
  const u2 = usersData2.users.find(u => u.email === email);
  if (u2) await supabaseAdmin.auth.admin.deleteUser(u2.id);
}
run();

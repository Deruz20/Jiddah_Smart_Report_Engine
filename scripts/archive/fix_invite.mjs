import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  console.log("Updating invite to role='DOS'");
  const { error: updError, data: updData } = await supabase.from('teacher_invites').update({ role: 'DOS' }).eq('email', 'ibrahimwoira8@gmail.com').select();
  if (updError) console.error("Update error:", updError);
  console.log("Updated invite:", updData);
  
  const { data: invite } = await supabase.from('teacher_invites').select('*').eq('email', 'ibrahimwoira8@gmail.com').single();
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const user = usersData?.users.find(u => u.email === 'ibrahimwoira8@gmail.com');
  
  console.log("Invite before insert:", invite);

  const { error: profileError } = await supabase
    .from('teachers')
    .insert([{
      id: user.id,
      email: invite.email,
      role: invite.role,
      subject: invite.subject,
      name: invite.name,
      classes: invite.classes || [],
      phone: invite.phone || null,
      status: 'active'
    }]);

  if (profileError) {
    console.error("Error creating profile again:", profileError);
  } else {
    console.log("Profile created successfully this time.");
  }

  const { data: newTeacher } = await supabase.from('teachers').select('*').eq('email', 'ibrahimwoira8@gmail.com').single();
  console.log(newTeacher);
}

run();

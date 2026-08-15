import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const email = 'ibrahimwoira8@gmail.com';

async function run() {
  console.log("Deleting existing teachers row just in case...");
  await supabase.from('teachers').delete().eq('email', email);

  console.log("Simulating real registration route (skipping createUser since auth.users exists)...");
  
  let { data: invite, error: inviteError } = await supabase
    .from('teacher_invites')
    .select('*')
    .eq('email', email)
    .single();

  if (inviteError || !invite) {
    console.log("No invite found.");
    return;
  }

  const { data: usersData } = await supabase.auth.admin.listUsers();
  const user = usersData?.users.find(u => u.email === email);
  
  if (!user) {
    console.log("Auth user not found.");
    return;
  }

  // Set temp password via admin API as requested
  await supabase.auth.admin.updateUserById(user.id, { password: 'TempPassword123!' });
  console.log("Temp password set.");

  // NEW ROUTE LOGIC
  let finalRole = invite.role;
  let finalSubject = invite.subject;
  if (invite.role === 'DOS Theology') {
    finalRole = 'DOS';
    finalSubject = 'Theology';
  } else if (invite.role === 'DOS Secular') {
    finalRole = 'DOS';
    finalSubject = 'Secular';
  }

  console.log("Creating teachers row with split role/subject...");
  const { error: profileError } = await supabase
    .from('teachers')
    .insert([{
      id: user.id,
      email: invite.email,
      role: finalRole,
      subject: finalSubject,
      name: invite.name,
      classes: invite.classes || [],
      phone: invite.phone || null,
      status: 'active'
    }]);

  if (profileError) {
    console.error("Error creating profile:", profileError);
    return;
  } else {
    console.log("Profile created successfully.");
  }

  console.log("Marking invite as claimed...");
  await supabase
    .from('teacher_invites')
    .update({ status: 'claimed' })
    .eq('id', invite.id);

  console.log("Fetching resulting teachers row:");
  const { data: newTeacher } = await supabase.from('teachers').select('*').eq('email', email).single();
  console.log(newTeacher);
}

run();

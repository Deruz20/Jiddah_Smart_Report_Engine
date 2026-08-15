import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const email = 'bbaale@gmail.com';
  const password = 'Password123!';
  const phone = '+256700000000';

  // 1. Look up invite
  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('teacher_invites')
    .select('*')
    .eq('email', email)
    .eq('status', 'pending')
    .single();

  if (inviteError || !invite) {
    console.error("Invite error:", inviteError);
    return;
  }

  let finalRole = invite.role;
  let finalSubject = invite.subject;
  if (invite.role === 'DOS Theology') {
    finalRole = 'DOS';
    finalSubject = 'Theology';
  } else if (invite.role === 'DOS Secular') {
    finalRole = 'DOS';
    finalSubject = 'Secular';
  }

  // 2. Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: finalRole,
      subject: finalSubject,
      name: invite.name
    }
  });

  if (authError || !authData.user) {
    console.error('Auth Creation Error:', authError);
    return;
  }

  const userId = authData.user.id;

  // 3. Create profile
  const { error: profileError } = await supabaseAdmin
    .from('teachers')
    .insert([
      {
        id: userId,
        email: invite.email,
        role: finalRole,
        subject: finalSubject,
        name: invite.name,
        classes: invite.classes || [],
        phone: invite.phone || phone || null,
        status: 'active'
      }
    ]);

  if (profileError) {
    console.error('Exact Profile Creation Error Object:', profileError);
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } else {
    console.log('Profile created successfully!');
    // cleanup
    await supabaseAdmin.from('teachers').delete().eq('email', email);
    await supabaseAdmin.auth.admin.deleteUser(userId);
  }
}
run();

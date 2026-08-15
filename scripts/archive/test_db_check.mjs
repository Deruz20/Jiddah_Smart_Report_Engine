import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Reset password
  await supabase.auth.admin.updateUserById(
    '76795f21-a57d-47fe-bd40-d9576e74ecd7',
    { password: 'password123' }
  );

  // Login as Amina
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'amina@gmail.com',
    password: 'password123'
  });
  if (authErr) {
    console.error('Login Error:', authErr);
    return;
  }
  console.log('Logged in as:', authData.user.email);

  // But we need to use a client WITH the user's token to test RLS!
  const userSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    }
  });

  // Fetch marks as teacher
  const { data: marks, error: fetchErr } = await userSupabase
    .from('circular_marks')
    .select('id, bot_score, mot_score, eot_score, enrollment_id, subject_id')
    .limit(1);

  if (fetchErr) {
    console.error('Fetch Error:', fetchErr);
    return;
  }
  console.log('Fetched marks:', marks);

  if (marks && marks.length > 0) {
    const markToEdit = marks[0];
    const newScore = (markToEdit.bot_score || 0) + 1;
    console.log(`Updating mark ${markToEdit.id} from ${markToEdit.bot_score} to ${newScore}`);

    const { error: updateErr } = await userSupabase
      .from('circular_marks')
      .update({ bot_score: newScore })
      .eq('id', markToEdit.id);

    if (updateErr) {
      console.error('Update Error:', updateErr);
    } else {
      console.log('Update Successful');
    }
  } else {
    console.log('No marks found to edit.');
  }
}
run();

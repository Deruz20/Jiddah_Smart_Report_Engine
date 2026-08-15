import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const email = 'ibrahimwoira8@gmail.com';

async function run() {
  console.log("=== 0a. Check auth.users for this email ===");
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error("Error fetching users:", usersError);
  } else {
    const user = usersData?.users.find(u => u.email === email);
    if (user) {
      console.log("User exists:");
      console.log(`  ID: ${user.id}`);
      console.log(`  Email confirmed at: ${user.email_confirmed_at}`);
      console.log(`  Last sign in: ${user.last_sign_in_at}`);
    } else {
      console.log("User does not exist in auth.users.");
    }
  }

  console.log("\n=== 0b. Check the teachers table ===");
  const { data: teachers, error: teachersError } = await supabase
    .from('teachers')
    .select('*')
    .eq('email', email);
  if (teachersError) console.error("Error fetching teachers:", teachersError);
  if (teachers && teachers.length > 0) {
    console.log(`Found ${teachers.length} record(s):`);
    console.log(teachers);
  } else {
    console.log("No record found in 'teachers' table for this email.");
  }

  console.log("\n=== 0c. Check the teacher_invites table ===");
  const { data: invites, error: invitesError } = await supabase
    .from('teacher_invites')
    .select('*')
    .eq('email', email);
  if (invitesError) console.error("Error fetching invites:", invitesError);
  if (invites && invites.length > 0) {
    console.log(`Found ${invites.length} record(s):`);
    console.log(invites);
  } else {
    console.log("No record found in 'teacher_invites' table for this email.");
  }
}

run();

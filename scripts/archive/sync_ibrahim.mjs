import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const email = 'ibrahimwoira8@gmail.com';
  
  // 1. Get user by email
  const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
  if (userError) {
    console.error("Error fetching users:", userError);
    return;
  }
  
  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`User ${email} not found.`);
    return;
  }

  console.log(`Found user ${email} with ID ${user.id}`);
  console.log('Current user_metadata:', user.user_metadata);

  // 2. Update user metadata
  const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { user_metadata: { role: 'DOS', department: 'Theology' } }
  );

  if (updateError) {
    console.error("Error updating user:", updateError);
  } else {
    console.log("Successfully updated user_metadata:", updatedUser.user.user_metadata);
  }
}

main();

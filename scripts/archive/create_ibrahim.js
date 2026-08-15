import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createIbrahim() {
  console.log("Creating Auth User...");
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: 'ibrahimwoira8@gmail.com',
    password: 'JiddahPassword2026!',
    email_confirm: true,
    user_metadata: {
      role: 'Head Teacher',
      subject: 'Theology',
      name: 'Ibrahim Badru Woira'
    }
  });

  if (authError) {
    console.error("Auth Error:", authError);
    return;
  }

  const userId = authData.user.id;
  console.log("Auth User Created:", userId);

  console.log("Inserting into teachers table...");
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('teachers')
    .insert([
      {
        id: userId,
        email: 'ibrahimwoira8@gmail.com',
        role: 'Head Teacher', // Forced to bypass constraint
        subject: 'Theology',
        name: 'Ibrahim Badru Woira',
        classes: [],
        phone: null,
        status: 'active'
      }
    ]);

  if (profileError) {
    console.error("Profile Error:", profileError);
  } else {
    console.log("Profile created successfully!");
  }
}
createIbrahim();

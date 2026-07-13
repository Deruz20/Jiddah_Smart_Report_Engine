const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables. Check .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createInitialAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const fullName = process.argv[4] || "Headteacher / Super Admin";

  if (!email || !password) {
    console.log("Usage: node scripts/create-admin.js <email> <password> [\"Full Name\"]");
    process.exit(1);
  }

  console.log(`Creating initial Super Admin account for ${email}...`);

  try {
    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: "Admin",
        full_name: fullName,
        onboarding_completed: true, // Admin doesn't need teacher onboarding
      }
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // Optional: Add to a public.users table or staff table if one exists
    // For now, Supabase Auth metadata is enough for the login routing.

    console.log(`\n✅ Success! Super Admin created.`);
    console.log(`ID: ${userId}`);
    console.log(`Email: ${email}`);
    console.log(`Role: Admin\n`);
    console.log(`The Headteacher can now log into the portal.`);

  } catch (err) {
    console.error("Failed to create admin:", err.message);
  }
}

createInitialAdmin();

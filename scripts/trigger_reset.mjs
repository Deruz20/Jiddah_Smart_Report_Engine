import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node trigger_reset.mjs <teacher-email>");
    process.exit(1);
  }

  console.log(`Generating password reset link for ${email}...`);
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: email,
  });

  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }

  console.log("Success! Recovery link generated:");
  console.log(data.properties.action_link);
  console.log("\nYou can send this link directly to the teacher, or they can use the normal 'Forgot Password' flow.");
}

main();

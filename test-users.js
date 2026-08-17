const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsers() {
  console.log("Checking for users in auth.users via admin API...");
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.log("Admin API Error:", error.message);
  } else {
    console.log("Users found:", users.length);
    if (users.length > 0) {
      console.log("First user email:", users[0].email);
    }
  }
}

checkUsers();

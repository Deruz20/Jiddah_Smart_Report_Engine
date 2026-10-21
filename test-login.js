const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testLogin() {
  const email = process.env.TEST_AUTH_EMAIL;
  const password = process.env.TEST_AUTH_PASSWORD;

  if (!email || !password) {
    console.log("No TEST_AUTH_EMAIL and TEST_AUTH_PASSWORD configured in environment. Skipping auth probe.");
    return;
  }

  console.log(`Testing login for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  console.log("Response:", error ? `Auth failed: ${error.message}` : "Auth success!");
}

testLogin();

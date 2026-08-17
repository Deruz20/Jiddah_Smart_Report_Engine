const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testLogin() {
  console.log("Testing login with a dummy credential...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@example.com', // just testing if the endpoint responds
    password: 'password123'
  });
  console.log("Error:", error?.message);
  console.log("Data:", data);
}

testLogin();

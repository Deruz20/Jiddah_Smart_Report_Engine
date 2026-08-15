import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createAdmin() {
  const email = 'admintest@test.com';
  const password = 'Password123!';
  
  console.log("Creating auth user...");
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'Administrator', name: 'Test Admin' }
  });
  
  if (authError && authError.message !== 'User already registered') {
    console.error("Auth error:", authError);
    return;
  }
  
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === email);
  
  console.log("Creating teacher profile...");
  const { error: profileError } = await supabase.from('teachers').upsert({
    id: user.id,
    email,
    role: 'Administrator',
    subject: '',
    name: 'Test Admin',
    status: 'active'
  });
  
  if (profileError) console.error("Profile error:", profileError);
  else console.log("Admin created successfully.");
}

createAdmin();

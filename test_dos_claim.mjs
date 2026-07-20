import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('Testing Admin claiming DOS Theology...');
  
  const email = 'test_dos_theology@example.com';
  const password = 'password123';

  // Make request to register endpoint directly (to mimic frontend)
  const response = await fetch('http://localhost:3000/api/teachers/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, phone: '123' })
  });

  const body = await response.json();
  console.log('Status:', response.status);
  console.log('Response body:', body);
}
run();

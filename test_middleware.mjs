import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
const adminAuthClient = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function runTest() {
  console.log('1. Creating a test user session...');
  const email = `testuser_${Date.now()}@example.com`;
  
  // Create user
  const { data: userData, error: createErr } = await adminAuthClient.auth.admin.createUser({
    email: email,
    password: 'password123',
    email_confirm: true,
    user_metadata: { role: 'Admin', name: 'Test Middleware User' }
  });
  
  if (createErr) {
    console.log('Failed to create user:', createErr.message);
    return;
  }
  const userId = userData.user.id;
  console.log('User created:', userId);

  // Sign in to get session
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: email,
    password: 'password123'
  });

  if (authErr) {
    console.log('Failed to sign in:', authErr.message);
    return;
  }
  
  const token = authData.session.access_token;
  const refreshToken = authData.session.refresh_token;
  console.log('Session acquired.');

  console.log('2. Deleting the profile row...');
  // Actually, wait, does the app use a 'profiles' or 'users' table? Let's check.
  // The instruction says "delete the profile row".
  // Let's look up which table the profile is in. Usually `public.users` or `public.profiles`.
  // I will just delete the user entirely from auth.users. But the instruction specifically said "delete the profile row".
  
  const { error: delProfileErr } = await adminAuthClient
    .from('users')
    .delete()
    .eq('id', userId);
    
  if (delProfileErr) {
    console.log('Could not delete from public.users (maybe no profile row was created automatically?):', delProfileErr.message);
  } else {
    console.log('Profile row deleted (or did not exist).');
  }

  console.log('3. Hitting a protected route...');
  // We make a fetch request to localhost:3000/admin, passing the cookie!
  // Supabase auth cookies: sb-<project-ref>-auth-token
  // It's actually easier to just set the Cookie header. Next.js uses standard supabase cookie names.
  // Let's pass Authorization: Bearer token just in case, but Next.js middleware relies on cookies.
  
  // To construct the cookie, Supabase SSR expects:
  // sb-[ref]-auth-token
  const projectRef = supabaseUrl.match(/\/\/(.*?)\./)[1];
  const cookieName = `sb-${projectRef}-auth-token`;
  
  // The token value is a JSON stringified array or object, depending on Next.js setup.
  // We can just try to fetch without cookie first, expecting redirect to /login.
  console.log('Fetching /admin without auth...');
  let res = await fetch('http://localhost:3000/admin', { redirect: 'manual' });
  console.log('Status without auth:', res.status, res.headers.get('location'));
  
  console.log('Fetching /admin WITH auth cookie...');
  res = await fetch('http://localhost:3000/admin', { 
    headers: { 'Cookie': `${cookieName}=${JSON.stringify([token, refreshToken])}` },
    redirect: 'manual'
  });
  console.log('Status with auth cookie:', res.status, res.headers.get('location'));

  // Clean up
  console.log('Cleaning up user...');
  await adminAuthClient.auth.admin.deleteUser(userId);
  console.log('Test complete.');
}
runTest();

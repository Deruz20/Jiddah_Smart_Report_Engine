import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);

function getCookieHeader(session) {
  const tokenData = [session.access_token, session.refresh_token, null, null, null];
  return 'sb-vismrobdsdsaxmqegcay-auth-token=' + encodeURIComponent(JSON.stringify(tokenData));
}

async function doFetch(url, payload, session) {
  const headers = { 'Content-Type': 'application/json' };
  if (session) {
    headers['Cookie'] = getCookieHeader(session);
  }
  const res = await fetch(`http://localhost:3000${url}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch (e) {
    return { status: res.status, data: text };
  }
}

async function run() {
  console.log("Cleaning up previous dummies...");
  await supabaseAdmin.from('teachers').delete().in('email', ['dummyadmininvite@example.com', 'dummydosinvite@example.com']);
  await supabaseAdmin.from('teacher_invites').delete().in('email', ['dummyadmininvite@example.com', 'dummydosinvite@example.com']);
  
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  for (const u of usersData.users) {
    if (['dummyadmininvite@example.com', 'dummydosinvite@example.com'].includes(u.email)) {
      await supabaseAdmin.auth.admin.deleteUser(u.id);
    }
  }

  console.log("\n--- TEST 1: Admin Invites Class Teacher ---");
  const { data: adminAuth } = await supabase.auth.signInWithPassword({ email: 'admintest@test.com', password: 'Password123!' });
  const adminSession = adminAuth.session;
  
  const adminInvitePayload = {
    name: 'Admin Dummy',
    role: 'Class Teacher',
    email: 'dummyadmininvite@example.com',
    phone: '1234567890',
    subject: 'Secular',
    classes: []
  };
  
  console.log("Calling POST /api/admin/teachers/invite as Admin...");
  const adminRes = await doFetch('/api/admin/teachers/invite', adminInvitePayload, adminSession);
  console.log("Response:", adminRes);

  const { data: invite1 } = await supabaseAdmin.from('teacher_invites').select('*').eq('email', 'dummyadmininvite@example.com').single();
  console.log("Resulting teacher_invites row:", invite1);

  console.log("\nCalling POST /api/teachers/register for Admin Dummy...");
  const reg1Payload = { email: 'dummyadmininvite@example.com', password: 'Password123!', phone: '' };
  const reg1Res = await doFetch('/api/teachers/register', reg1Payload, null);
  console.log("Response:", reg1Res);

  const { data: teacher1 } = await supabaseAdmin.from('teachers').select('*').eq('email', 'dummyadmininvite@example.com').single();
  console.log("Resulting teachers row:", teacher1);

  console.log("\n--- TEST 2: DOS Invites Class Teacher ---");
  const { data: dosAuth } = await supabase.auth.signInWithPassword({ email: 'ibrahimwoira8@gmail.com', password: 'TempPassword123!' });
  const dosSession = dosAuth.session;

  const dosInvitePayload = {
    name: 'DOS Dummy',
    role: 'Class Teacher',
    email: 'dummydosinvite@example.com',
    phone: '0987654321',
    classes: []
    // subject is intentionally omitted, simulating UI behavior
  };
  
  console.log("Calling POST /api/admin/teachers/invite as DOS...");
  const dosRes = await doFetch('/api/admin/teachers/invite', dosInvitePayload, dosSession);
  console.log("Response:", dosRes);

  const { data: invite2 } = await supabaseAdmin.from('teacher_invites').select('*').eq('email', 'dummydosinvite@example.com').single();
  console.log("Resulting teacher_invites row:", invite2);

  console.log("\nCalling POST /api/teachers/register for DOS Dummy...");
  const reg2Payload = { email: 'dummydosinvite@example.com', password: 'Password123!', phone: '' };
  const reg2Res = await doFetch('/api/teachers/register', reg2Payload, null);
  console.log("Response:", reg2Res);

  const { data: teacher2 } = await supabaseAdmin.from('teachers').select('*').eq('email', 'dummydosinvite@example.com').single();
  console.log("Resulting teachers row:", teacher2);

  console.log("\nDone.");
}

run();

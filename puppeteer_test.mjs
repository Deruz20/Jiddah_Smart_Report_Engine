import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanup() {
  console.log("Cleaning up previous dummies...");
  await supabaseAdmin.from('teachers').delete().in('email', ['dummyadmininvite@example.com', 'dummydosinvite@example.com']);
  await supabaseAdmin.from('teacher_invites').delete().in('email', ['dummyadmininvite@example.com', 'dummydosinvite@example.com']);
  
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  for (const u of usersData.users) {
    if (['dummyadmininvite@example.com', 'dummydosinvite@example.com'].includes(u.email)) {
      await supabaseAdmin.auth.admin.deleteUser(u.id);
    }
  }
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function runTest() {
  await cleanup();

  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // --- TEST 1: Admin Invites Class Teacher ---
  console.log("\n--- TEST 1: Admin Invites Class Teacher ---");
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'admintest@test.com');
  await page.type('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await delay(3000); // wait for login to redirect
  
  console.log("Navigating to /admin/teachers...");
  await page.goto('http://localhost:3000/admin/teachers', { waitUntil: 'networkidle2' });
  await delay(2000);
  
  // Click "Add Teacher"
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Add Teacher'));
    if(btn) btn.click();
  });
  
  await delay(1000); // Wait for modal
  
  console.log("Filling form...");
  await page.type('input[name="full_name"]', 'Admin Dummy');
  await page.select('select[name="role"]', 'Class Teacher');
  await page.type('input[name="email"]', 'dummyadmininvite@example.com');
  await page.type('input[name="phone"]', '1234567890');
  await page.type('input[name="subject_specialization"]', 'Secular');
  
  console.log("Submitting Admin Invite...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Save'));
    if(btn) btn.click();
  });
  
  await delay(2000); // wait for DB insert
  
  const { data: invite1 } = await supabaseAdmin.from('teacher_invites').select('*').eq('email', 'dummyadmininvite@example.com').single();
  console.log("Resulting teacher_invites row 1:", invite1);

  console.log("Logging out...");
  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCookies');
  
  console.log("Registering as dummyadmininvite@example.com...");
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.type('input[type="email"]', 'dummyadmininvite@example.com');
  await page.type('input[type="password"]', 'Password123!');
  await page.type('input[name="confirmPassword"]', 'Password123!');
  try { await page.type('input[name="phone"]', '1234567890'); } catch(e){}
  
  await page.click('button[type="submit"]');
  await delay(3000); // wait for API
  
  const finalHtml1 = await page.evaluate(() => document.body.innerText);
  console.log("What the new teacher sees 1:", finalHtml1.includes('Registration successful') ? 'Registration successful! Redirecting to login page...' : 'Failed or stuck');

  const { data: teacher1 } = await supabaseAdmin.from('teachers').select('*').eq('email', 'dummyadmininvite@example.com').single();
  console.log("Resulting teachers row 1:", teacher1);


  // --- TEST 2: DOS Invites Class Teacher ---
  console.log("\n--- TEST 2: DOS Invites Class Teacher ---");
  await client.send('Network.clearBrowserCookies');
  
  // Ensure ibrahim has this password
  const ibrahim = await supabaseAdmin.from('teachers').select('id').eq('email', 'ibrahimwoira8@gmail.com').single();
  if (ibrahim.data) {
    const authUser = await supabaseAdmin.auth.admin.listUsers();
    const user = authUser.data.users.find(u => u.email === 'ibrahimwoira8@gmail.com');
    if (user) await supabaseAdmin.auth.admin.updateUserById(user.id, { password: 'Password123!' });
  }

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.type('input[type="email"]', 'ibrahimwoira8@gmail.com');
  await page.type('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await delay(3000);
  
  console.log("Navigating to /admin/teachers as DOS...");
  await page.goto('http://localhost:3000/admin/teachers', { waitUntil: 'networkidle2' });
  await delay(2000);
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Add Teacher'));
    if(btn) btn.click();
  });
  
  await delay(1000);
  console.log("Filling form...");
  await page.type('input[name="full_name"]', 'DOS Dummy');
  await page.select('select[name="role"]', 'Class Teacher');
  await page.type('input[name="email"]', 'dummydosinvite@example.com');
  await page.type('input[name="phone"]', '0987654321');
  
  console.log("Submitting DOS Invite...");
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Save'));
    if(btn) btn.click();
  });
  
  await delay(2000);
  
  const { data: invite2 } = await supabaseAdmin.from('teacher_invites').select('*').eq('email', 'dummydosinvite@example.com').single();
  console.log("Resulting teacher_invites row 2:", invite2);

  console.log("Logging out...");
  await client.send('Network.clearBrowserCookies');
  
  console.log("Registering as dummydosinvite@example.com...");
  await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle2' });
  await delay(1000);
  await page.type('input[type="email"]', 'dummydosinvite@example.com');
  await page.type('input[type="password"]', 'Password123!');
  await page.type('input[name="confirmPassword"]', 'Password123!');
  
  await page.click('button[type="submit"]');
  await delay(3000);
  
  const finalHtml2 = await page.evaluate(() => document.body.innerText);
  console.log("What the new teacher sees 2:", finalHtml2.includes('Registration successful') ? 'Registration successful! Redirecting to login page...' : 'Failed or stuck');

  const { data: teacher2 } = await supabaseAdmin.from('teachers').select('*').eq('email', 'dummydosinvite@example.com').single();
  console.log("Resulting teachers row 2:", teacher2);

  await browser.close();
  await cleanup();
  console.log("\nDone.");
}

runTest();

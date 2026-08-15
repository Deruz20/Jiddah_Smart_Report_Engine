import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);

const delay = ms => new Promise(res => setTimeout(res, ms));

async function runTest() {
  const testEmail = 'dostheo_proof@example.com';
  console.log("Cleaning up previous test runs...");
  await supabaseAdmin.from('teachers').delete().eq('email', testEmail);
  await supabaseAdmin.from('teacher_invites').delete().eq('email', testEmail);
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const u = usersData.users.find(u => u.email === testEmail);
  if (u) await supabaseAdmin.auth.admin.deleteUser(u.id);

  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  console.log("--- 1. Admin Invites DOS Theology (without selecting subject) ---");
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.type('input[type="email"]', 'admintest@test.com');
  await page.type('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await delay(5000);
  
  await page.goto('http://localhost:3000/admin/teachers', { waitUntil: 'domcontentloaded' });
  await delay(5000);
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Add Teacher'));
    if(btn) btn.click();
  });
  
  await delay(2000);
  
  await page.type('input[name="full_name"]', 'DOS Theology Proof');
  await page.select('select[name="role"]', 'DOS Theology');
  await page.type('input[name="email"]', testEmail);
  await page.type('input[name="phone"]', '1234567890');
  
  // Intentionally omitting subject dropdown to trigger the fix!
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Save') || b.textContent.includes('Add Teacher') && b.type === 'submit');
    if(btn) btn.click();
  });
  
  await delay(3000); 
  
  const { data: invite } = await supabaseAdmin.from('teacher_invites').select('*').eq('email', testEmail).single();
  console.log("Invite created:", invite);
  if (!invite) throw new Error("Invite creation failed!");

  console.log("\n--- 2. Registering as the new DOS Theology ---");
  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCookies');
  
  await page.goto('http://localhost:3000/register', { waitUntil: 'domcontentloaded' });
  await delay(2000);
  await page.type('input[type="email"]', testEmail);
  await page.type('input[type="password"]', 'Password123!');
  await page.type('input[name="confirmPassword"]', 'Password123!');
  
  await page.click('button[type="submit"]');
  await delay(4000);
  
  console.log("\n--- 3. Verifying the teachers row ---");
  const { data: teacherRow } = await supabaseAdmin.from('teachers').select('*').eq('email', testEmail).single();
  console.log("Teacher row in DB:");
  console.log(teacherRow);
  
  console.log("\n--- 4. Cleanup ---");
  await supabaseAdmin.from('teachers').delete().eq('email', testEmail);
  await supabaseAdmin.from('teacher_invites').delete().eq('email', testEmail);
  const { data: usersData2 } = await supabaseAdmin.auth.admin.listUsers();
  const u2 = usersData2.users.find(u => u.email === testEmail);
  if (u2) await supabaseAdmin.auth.admin.deleteUser(u2.id);
  console.log("Dummy account deleted.");

  await browser.close();
  process.exit(0);
}

runTest().catch(console.error);

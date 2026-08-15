import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);

const delay = ms => new Promise(res => setTimeout(res, ms));

async function runTest() {
  console.log("Cleaning up...");
  await supabaseAdmin.from('teachers').delete().eq('email', 'dostheo_admin@example.com');
  await supabaseAdmin.from('teacher_invites').delete().eq('email', 'dostheo_admin@example.com');

  console.log("Launching browser...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('response', async response => {
    if (response.url().includes('/api/admin/teachers/invite') && response.request().method() === 'POST') {
      const status = response.status();
      const body = await response.text();
      console.log(`\nAPI STATUS: ${status}\nAPI RESPONSE: ${body}`);
    }
  });

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
  
  await page.type('input[name="full_name"]', 'DOS Theology Admin Created');
  await page.select('select[name="role"]', 'DOS Theology');
  await page.type('input[name="email"]', 'dostheo_admin@example.com');
  await page.type('input[name="phone"]', '1234567890');
  
  // NOTE: We INTENTIONALLY do not touch subject_specialization (Scope dropdown)
  // which defaults to "" (None / Unassigned)
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Save') || b.textContent.includes('Add Teacher') && b.type === 'submit');
    if(btn) btn.click();
  });
  
  await delay(2000); 
  
  const errorToast = await page.evaluate(() => {
    const el = document.querySelector('.bg-rose-50') || document.querySelector('[role="alert"]') || document.querySelector('.go3958317564');
    return el ? el.innerText : null;
  });
  
  console.log("UI ERROR TOAST:", errorToast);

  await browser.close();
  process.exit(0);
}

runTest();

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

(async () => {
  const browser = await puppeteer.launch({ headless: true, defaultViewport: { width: 1280, height: 800 } });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:3000/login');
    
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'admintest@test.com');
    await page.type('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for dashboard...');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    
    console.log('Navigating to /admin/teachers...');
    await page.goto('http://localhost:3000/admin/teachers', { waitUntil: 'networkidle0' });
    
    // Take a screenshot of the teachers page
    await page.screenshot({ path: 'C:/Users/JIDDAH/.gemini/antigravity-ide/brain/48a06da3-384b-4b0a-b249-24b5db085bd1/admin_teachers_before.png' });
    console.log('Took before screenshot');

    // Click Invite Teacher
    console.log('Clicking Invite Teacher button...');
    const buttons = await page.$$('button');
    let inviteBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Invite Teacher') || text.includes('Add Teacher')) {
        inviteBtn = btn;
        break;
      }
    }
    
    if (inviteBtn) {
      await inviteBtn.click();
      await new Promise(r => setTimeout(r, 1000)); // Wait for modal
      
      console.log('Filling form...');
      await page.type('input[name="full_name"]', 'Test UI Invitee');
      await page.type('input[name="email"]', 'test.ui.invitee@jiddahschool.ug');
      await page.type('input[name="phone"]', '0700000000');
      
      // Select role Support Staff
      await page.select('select[name="role"]', 'Support Staff').catch(() => console.log('Could not set role'));
      
      // Submit form
      console.log('Submitting form...');
      const submitBtns = await page.$$('button[type="submit"]');
      if (submitBtns.length > 0) {
        await submitBtns[0].click();
      } else {
        const dialogBtns = await page.$$('div[role="dialog"] button');
        for (const btn of dialogBtns) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.includes('Send') || text.includes('Save') || text.includes('Invite')) {
            await btn.click();
            break;
          }
        }
      }
      
      console.log('Waiting for toast/success...');
      await new Promise(r => setTimeout(r, 3000)); // Wait for API response and UI update
      
      await page.screenshot({ path: 'C:/Users/JIDDAH/.gemini/antigravity-ide/brain/48a06da3-384b-4b0a-b249-24b5db085bd1/admin_teachers_after.png' });
      console.log('Took after screenshot');
      
      // Delete the invite using the API
      const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      await supabaseAdmin.from('teacher_invites').delete().eq('email', 'test.ui.invitee@jiddahschool.ug');
      console.log('Deleted test invite via API');
      
    } else {
      console.log('Invite button not found');
    }
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
})();

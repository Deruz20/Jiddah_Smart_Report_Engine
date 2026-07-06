import { chromium } from '@playwright/test';

(async () => {
  console.log('Starting manual smoke test on deployed app...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to login...');
    await page.goto('https://jiddah-smart-report-engine-dashboard.vercel.app/login');
    
    await page.fill('input[type="email"]', 'hassanhatima20@gmail.com');
    await page.fill('input[type="password"]', 'Jiddah_eyzrtuzbjt');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for dashboard...');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('Logged in successfully.');

    // Circular Test
    console.log('Navigating to Circular Hub...');
    await page.goto('https://jiddah-smart-report-engine-dashboard.vercel.app/circular');
    await page.waitForSelector('text=Circular Hub');
    
    console.log('Clicking Add Marks...');
    await page.click('button:has-text("Add Marks")');
    await page.waitForSelector('text=Add Circular Marks');
    
    console.log('Selecting Student...');
    await page.click('[data-slot="select-trigger"] >> nth=0');
    await page.waitForSelector('[role="option"]');
    await page.click('[role="option"] >> nth=0');
    
    console.log('Waiting for subjects to load...');
    await page.waitForSelector('table th:has-text("Subject")');
    
    console.log('Filling BOT score (75)...');
    const firstBotInput = page.locator('input[placeholder="—"]').nth(0);
    await firstBotInput.fill('75');
    
    console.log('Saving Circular Marks...');
    await page.click('button:has-text("Save Marks")');
    
    console.log('Waiting for success toast...');
    await page.waitForSelector('text=Marks saved successfully', { timeout: 5000 });
    console.log('Circular Marks saved successfully and persisted.');

    // Theology Test
    console.log('Navigating to Theology Hub...');
    await page.goto('https://jiddah-smart-report-engine-dashboard.vercel.app/theology');
    await page.waitForSelector('text=Theology Hub');
    
    console.log('Clicking Add Marks...');
    await page.click('button:has-text("Add Marks")');
    await page.waitForSelector('text=Add Theology Marks');
    
    console.log('Selecting Student...');
    await page.click('[data-slot="select-trigger"] >> nth=0');
    await page.waitForSelector('[role="option"]');
    await page.click('[role="option"] >> nth=0');
    
    console.log('Waiting for subjects to load...');
    await page.waitForSelector('table th:has-text("Subject")');
    
    console.log('Filling MOT score (85)...');
    const firstMotInput = page.locator('input[placeholder="—"]').nth(0);
    await firstMotInput.fill('85');
    
    console.log('Saving Theology Marks...');
    await page.click('button:has-text("Save Marks")');
    
    console.log('Waiting for success toast...');
    await page.waitForSelector('text=Marks saved successfully', { timeout: 5000 });
    console.log('Theology Marks saved successfully and persisted.');

    console.log('SMOKE TEST PASSED!');
  } catch (err) {
    console.error('SMOKE TEST FAILED:', err.message);
  } finally {
    await browser.close();
  }
})();

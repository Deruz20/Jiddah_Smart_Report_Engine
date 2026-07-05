const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs
  page.on('console', msg => {
    console.log(`[Browser Console ${msg.type()}] ${msg.text()}`);
  });

  // Log only POST requests and responses to our endpoints
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().includes('/api/')) {
      console.log(`[Network Request] POST ${req.url()}`);
    }
  });
  page.on('response', async res => {
    if (res.request().method() === 'POST' && res.url().includes('/api/')) {
      console.log(`[Network Response] POST ${res.url()} -> Status: ${res.status()}`);
    }
  });

  try {
    // Navigate to Login
    await page.goto('http://localhost:5173/login');
    
    // Login
    await page.fill('input[type="email"]', 'hassanhatima20@gmail.com');
    await page.fill('input[type="password"]', 'Jiddah');
    await page.click('button:has-text("Sign In")');
    
    // Wait for navigation
    await page.waitForURL('**/dashboard');
    
    console.log('\n--- Testing Subjects Page ---');
    await page.click('a[href="/subjects"]');
    await page.waitForSelector('text=Subjects Management');
    
    // Click Add Subject
    await page.click('button:has-text("Add Subject")');
    await page.waitForSelector('text=Add New Subject');
    
    // Fill subject form
    const subjectName = `Test Subject ${Date.now()}`;
    await page.fill('input[placeholder="e.g., Mathematics, Quran"]', subjectName);
    await page.click('button:has-text("Create Subject")');
    
    // Wait for it to close
    await page.waitForSelector('text=Add New Subject', { state: 'hidden' });
    console.log('Subject Created Successfully');

    console.log('\n--- Testing Classes Page ---');
    await page.goto('http://localhost:5173/classes');
    await page.waitForSelector('text=Classes Management');
    
    // Click Add Class
    await page.click('button:has-text("Add Class")');
    await page.waitForSelector('text=Add New Class');
    
    // Fill class form
    const className = `Test Class ${Date.now()}`;
    await page.fill('input[placeholder="e.g., P1, Middle"]', className);
    await page.click('button:has-text("Create Class")');
    
    // Wait for it to close
    await page.waitForSelector('text=Add New Class', { state: 'hidden' });
    console.log('Class Created Successfully');

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();

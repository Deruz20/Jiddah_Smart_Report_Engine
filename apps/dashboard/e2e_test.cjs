const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log("Starting E2E Playwright test...");
  
  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Log browser console
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().toLowerCase().includes('error') || msg.text().toLowerCase().includes('mismatch')) {
      console.log(`[CONSOLE ${msg.type().toUpperCase()}]:`, msg.text());
    }
  });

  // Log specific API network requests and responses
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api/circular-marks') || url.includes('/api/theology-marks') || url.includes('/api/circular-subjects') || url.includes('/api/theology-subjects')) {
      console.log(`\n>> NETWORK REQUEST [${req.method()}] ${url}`);
      if (req.postData()) {
        console.log(`Request Body: ${req.postData()}`);
      }
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/api/circular-marks') || url.includes('/api/theology-marks') || url.includes('/api/circular-subjects') || url.includes('/api/theology-subjects')) {
      console.log(`<< NETWORK RESPONSE [${res.status()}]`);
      try {
        const body = await res.json();
        console.log(`Response Body: ${JSON.stringify(body, null, 2)}`);
      } catch (e) {
        console.log(`Response Body: (not JSON)`);
      }
    }
  });

  try {
    // 1. LOGIN
    console.log("\n--- STEP 1: Logging In ---");
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'hassanhatima20@gmail.com');
    await page.fill('input[type="password"]', 'Jiddah');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    console.log("Login successful! Redirected to dashboard.");

    // 2. CIRCULAR HUB: MISMATCH TEST
    console.log("\n--- STEP 2: Circular Hub - Mismatch Test ---");
    await page.goto('http://localhost:5173/circular');
    await page.waitForTimeout(3000);
    await page.waitForSelector('button:has-text("Add Marks")');
    await page.click('button:has-text("Add Marks")');

    // Click Student dropdown
    await page.waitForSelector('[data-slot="select-trigger"]');
    await page.click('[data-slot="select-trigger"] >> nth=0');
    await page.waitForSelector('[role="option"]:has-text("Edrisa Atima")');
    await page.click('[role="option"]:has-text("Edrisa Atima")');

    // Click Subject dropdown
    await page.click('[data-slot="select-trigger"] >> nth=1');
    await page.waitForSelector('[role="option"]:has-text("SCI (upper_primary)")');
    await page.click('[role="option"]:has-text("SCI (upper_primary)")');

    // Fill MOT score
    await page.fill('input[placeholder="0-100"] >> xpath=.. >> input', '50');
    
    // Click Save Marks
    console.log("Submitting mismatched Circular Mark...");
    await page.click('button:has-text("Save Marks")');
    
    // Wait for toast error
    await page.waitForTimeout(2000);
    const circularMismatchScreenshot = 'c:\\Users\\JIDDAH\\.gemini\\antigravity-ide\\brain\\0388e451-72a8-4edb-b6d0-cffc6ec4c496\\circular_mismatch_ui.png';
    await page.screenshot({ path: circularMismatchScreenshot });
    console.log(`Screenshot saved to: ${circularMismatchScreenshot}`);

    // Close the dialog by pressing escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 3. CIRCULAR HUB: VALID CREATE
    console.log("\n--- STEP 3: Circular Hub - Valid Create ---");
    await page.click('button:has-text("Add Marks")');

    await page.waitForSelector('[data-slot="select-trigger"]');
    await page.click('[data-slot="select-trigger"] >> nth=0');
    await page.waitForSelector('[role="option"]:has-text("Edrisa Atima")');
    await page.click('[role="option"]:has-text("Edrisa Atima")');

    await page.click('[data-slot="select-trigger"] >> nth=1');
    await page.waitForSelector('[role="option"]:has-text("LA2 English (nursery)")');
    await page.click('[role="option"]:has-text("LA2 English (nursery)")');

    await page.fill('input[placeholder="0-100"] >> xpath=.. >> input', '90'); // MOT Score
    
    console.log("Submitting valid Circular Mark...");
    await page.click('button:has-text("Save Marks")');
    await page.waitForTimeout(2000); // Wait for refresh

    // 4. CIRCULAR HUB: EDIT TEST
    console.log("\n--- STEP 4: Circular Hub - Edit Test ---");
    // Find the row for Edrisa Atima
    const editBtn = await page.locator('tr:has-text("Edrisa Atima")').locator('button').first();
    await editBtn.click();
    
    await page.waitForSelector('text=Edit Marks');
    // Fill new MOT score
    await page.fill('input[type="number"] >> nth=0', '95');
    await page.fill('input[type="number"] >> nth=1', '90'); // EOT
    
    console.log("Submitting edited Circular Mark...");
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(2000);

    // 5. CIRCULAR HUB: DELETE TEST
    console.log("\n--- STEP 5: Circular Hub - Delete Test ---");
    const deleteBtn = await page.locator('tr:has-text("Edrisa Atima")').locator('button').last();
    await deleteBtn.click();
    
    await page.waitForSelector('text=Delete Marks');
    console.log("Confirming deletion...");
    await page.click('button:has-text("Yes, delete marks")');
    await page.waitForTimeout(2000);

    // 6. THEOLOGY HUB: MISMATCH TEST
    console.log("\n--- STEP 6: Theology Hub - Mismatch Test ---");
    await page.goto('http://localhost:5173/theology');
    await page.waitForTimeout(3000);
    await page.waitForSelector('button:has-text("Add Marks")');
    await page.click('button:has-text("Add Marks")');

    // Click Student dropdown
    await page.waitForSelector('[data-slot="select-trigger"]');
    await page.click('[data-slot="select-trigger"] >> nth=0');
    await page.waitForSelector('[role="option"]:has-text("Edrisa Atima")');
    await page.click('[role="option"]:has-text("Edrisa Atima")');

    // Click Subject dropdown (select Quran for ibtidaai_upper to trigger mismatch since Edrisa is raudha)
    await page.click('[data-slot="select-trigger"] >> nth=1');
    await page.waitForSelector('[role="option"]:has-text("القرآن الكريم")');
    await page.click('[role="option"]:has-text("القرآن الكريم") >> nth=1');

    await page.fill('input[placeholder="0-100"] >> xpath=.. >> input', '60');
    
    console.log("Submitting mismatched Theology Mark...");
    await page.click('button:has-text("Save Marks")');
    
    await page.waitForTimeout(2000);
    const theologyMismatchScreenshot = 'c:\\Users\\JIDDAH\\.gemini\\antigravity-ide\\brain\\0388e451-72a8-4edb-b6d0-cffc6ec4c496\\theology_mismatch_ui.png';
    await page.screenshot({ path: theologyMismatchScreenshot });
    console.log(`Screenshot saved to: ${theologyMismatchScreenshot}`);

    // Close the dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 7. THEOLOGY HUB: VALID CREATE
    console.log("\n--- STEP 7: Theology Hub - Valid Create ---");
    await page.click('button:has-text("Add Marks")');

    await page.waitForSelector('[data-slot="select-trigger"]');
    await page.click('[data-slot="select-trigger"] >> nth=0');
    await page.waitForSelector('[role="option"]:has-text("Edrisa Atima")');
    await page.click('[role="option"]:has-text("Edrisa Atima")');

    await page.click('[data-slot="select-trigger"] >> nth=1');
    await page.waitForSelector('[role="option"]:has-text("القرآن الكريم")');
    await page.click('[role="option"]:has-text("القرآن الكريم") >> nth=0');

    await page.fill('input[placeholder="0-100"] >> xpath=.. >> input', '80');
    
    console.log("Submitting valid Theology Mark...");
    await page.click('button:has-text("Save Marks")');
    await page.waitForTimeout(2000);

    // 8. THEOLOGY HUB: EDIT TEST
    console.log("\n--- STEP 8: Theology Hub - Edit Test ---");
    const editTheologyBtn = await page.locator('tr:has-text("Edrisa Atima")').locator('button').first();
    await editTheologyBtn.click();
    
    await page.waitForSelector('text=Edit Marks');
    await page.fill('input[type="number"] >> nth=0', '85');
    await page.fill('input[type="number"] >> nth=1', '80');
    
    console.log("Submitting edited Theology Mark...");
    await page.click('button:has-text("Save Changes")');
    await page.waitForTimeout(2000);

    // 9. THEOLOGY HUB: DELETE TEST
    console.log("\n--- STEP 9: Theology Hub - Delete Test ---");
    const deleteTheologyBtn = await page.locator('tr:has-text("Edrisa Atima")').locator('button').last();
    await deleteTheologyBtn.click();
    
    await page.waitForSelector('text=Delete Marks');
    console.log("Confirming deletion...");
    await page.click('button:has-text("Yes, delete marks")');
    await page.waitForTimeout(2000);

    console.log("\n--- E2E TEST COMPLETED SUCCESSFULLY ---");

  } catch (error) {
    console.error("Test failed with error:", error);
  } finally {
    await browser.close();
  }
})();

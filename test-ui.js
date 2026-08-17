import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: "new"
  });
  const page = await browser.newPage();
  
  // 1. Go to login
  await page.goto('http://127.0.0.1:3000/login');
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'admin@example.com');
  await page.type('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  
  // 2. Go to theology hub
  await page.goto('http://127.0.0.1:3000/admin/theology');
  await page.waitForSelector('button', { text: 'Add Marks' }); // the button has an icon, maybe just button contains text?
  
  // click "Add Marks"
  const buttons = await page.$$('button');
  for (let btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Add Marks')) {
      await btn.click();
      break;
    }
  }
  
  await page.waitForSelector('select');
  
  // 3. Select the student '91a938c6-2df0-4b2e-a579-3ccbfda7cc3a'
  await page.select('select', '91a938c6-2df0-4b2e-a579-3ccbfda7cc3a');
  
  // 4. Wait for inputs to appear
  await new Promise(r => setTimeout(r, 1000));
  
  // 5. Find EOT inputs and type 95
  const inputs = await page.$$('input[placeholder="EOT"]');
  for (let input of inputs) {
    await input.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await input.type('95');
  }
  
  // 6. Click Save
  const saveButtons = await page.$$('button');
  for (let btn of saveButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Save Marks')) {
      await btn.click();
      break;
    }
  }
  
  // Wait for save to complete
  await new Promise(r => setTimeout(r, 3000));
  
  console.log("UI Test completed successfully!");
  await browser.close();
})();

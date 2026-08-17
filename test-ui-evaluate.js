import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: "new"
  });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/login', { timeout: 60000 });
  await page.waitForSelector('input[type="email"]', { timeout: 60000 });
  await page.type('input[type="email"]', 'admin@example.com');
  await page.type('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  
  await page.goto('http://127.0.0.1:3000/admin/theology');
  
  await page.waitForSelector('button');
  const buttons = await page.$$('button');
  let addMarksBtn;
  for (let btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Add Marks')) {
      addMarksBtn = btn;
      break;
    }
  }
  await addMarksBtn.click();
  
  await page.waitForSelector('select');
  await page.select('select', '91a938c6-2df0-4b2e-a579-3ccbfda7cc3a');
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Set values using evaluate to avoid typing stall
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input[placeholder="EOT"]');
    inputs.forEach(input => {
      // React requires a special way to trigger onChange if setting value directly
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      nativeInputValueSetter.call(input, "95");
      const ev2 = new Event('input', { bubbles: true});
      input.dispatchEvent(ev2);
    });
  });
  
  const saveButtons = await page.$$('button');
  for (let btn of saveButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Save Marks')) {
      await btn.click();
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 3000));
  console.log("UI save triggered successfully.");
  await browser.close();
})();

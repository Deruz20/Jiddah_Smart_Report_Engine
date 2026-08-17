const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set viewport to A4 dimensions (approx 800x1130 for 96dpi)
  await page.setViewport({ width: 1000, height: 1400 });

  await page.goto('http://127.0.0.1:3000/test-report', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000)); // wait a sec for react to render

  await page.screenshot({ path: 'theology_mot.png' });
  await page.click('#toggle-btn').catch(() => console.log('no toggle btn'));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'theology_eot.png' });
  await browser.close();
  console.log("Screenshots captured successfully.");
})();

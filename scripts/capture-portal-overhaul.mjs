import { chromium } from 'playwright';
import path from 'node:path';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const OUT_DIR = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\5e092b19-cfeb-417e-a4d3-91395a9ea9d1';

async function capture() {
  console.log('Launching browser to capture portal overhaul screenshots...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    isMobile: false,
  });

  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  console.log('Logging in as admin@test.local...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.locator('input[type="email"]').fill('admin@test.local');
  await page.locator('input[type="password"]').fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/admin**', { timeout: 60000, waitUntil: 'domcontentloaded' });
  console.log('Logged in successfully.');

  // Set tour completed before visiting anything
  await page.evaluate(() => {
    localStorage.setItem('jiddah_tour_completed', 'true');
  });

  const targets = [
    { url: `${BASE_URL}/admin`, name: 'dashboard', selector: 'h1' },
    { url: `${BASE_URL}/admin/marks`, name: 'marks', selector: 'table' },
    { url: `${BASE_URL}/admin/upload`, name: 'upload', selector: 'h1' },
  ];

  for (const target of targets) {
    console.log(`Navigating to ${target.name}...`);
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    try {
      await page.waitForSelector(target.selector, { timeout: 15000 });
    } catch (e) {
      console.log(`Note: Selector ${target.selector} wait ended early, proceeding.`);
    }
    await page.waitForTimeout(1000);

    for (const theme of ['dark', 'light']) {
      console.log(`Applying theme: ${theme} on ${target.name}...`);
      await page.evaluate((t) => {
        localStorage.setItem('jiddah_tour_completed', 'true');
        localStorage.setItem('jiddah_report_studio_theme', t);
        if (t === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
          document.documentElement.setAttribute('data-theme', 'light');
        }
      }, theme);
      await page.waitForTimeout(600);
      const outPath = path.join(OUT_DIR, `overhaul-${target.name}-${theme}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Captured ${outPath}`);
    }
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});

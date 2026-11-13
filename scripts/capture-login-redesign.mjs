import { chromium } from 'playwright';
import path from 'node:path';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const OUT_DIR = 'C:\\Users\\USER\\.gemini\\antigravity\\brain\\5e092b19-cfeb-417e-a4d3-91395a9ea9d1';

async function capture() {
  console.log('Capturing redesigned login page screenshots...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.name === 'mobile',
    });

    const page = await context.newPage();

    for (const theme of ['dark', 'light']) {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.evaluate((t) => {
        localStorage.setItem('jiddah_theme_mode', t);
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

      // Pre-fill email so the user can see input styling clearly
      await page.locator('input[type="email"]').fill('hassanhatima20@gmail.com');
      await page.locator('input[type="password"]').fill('••••••••••••');

      const outPath = path.join(OUT_DIR, `redesigned-login-${vp.name}-${theme}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Captured ${outPath}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('Done!');
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.resolve(process.cwd(), 'artifacts/visual-verification');

fs.mkdirSync(OUT_DIR, { recursive: true });

async function runVisualCapture() {
  console.log('Launching browser for visual verification...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const viewports = [
    { name: 'desktop', width: 1440, height: 900, isMobile: false },
    { name: 'mobile-iphone', width: 390, height: 844, isMobile: true },
    { name: 'mobile-android', width: 360, height: 800, isMobile: true },
  ];

  const pagesToCapture = [
    { path: '/admin', name: 'dashboard' },
    { path: '/admin/reports/studio', name: 'report-studio' },
    { path: '/teacher/roll-call', name: 'roll-call' },
  ];

  const themes = ['dark', 'light'];

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });

    const page = await context.newPage();

    // Log in once per context
    console.log(`[${vp.name}] Logging in as admin@test.local...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.locator('input[type="email"]').fill('admin@test.local');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/admin**', { timeout: 60000, waitUntil: 'domcontentloaded' });
    console.log(`[${vp.name}] Login successful.`);

    for (const theme of themes) {
      // Set theme token in localStorage and html class
      await page.evaluate((t) => {
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

      for (const target of pagesToCapture) {
        console.log(`[${vp.name} | ${theme}] Capturing ${target.path}...`);
        await page.goto(`${BASE_URL}${target.path}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1500);

        // Ensure theme class is applied after navigation
        await page.evaluate((t) => {
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

        await page.waitForTimeout(1000);

        const filename = `${target.name}-${vp.name}-${theme}.png`;
        const filepath = path.join(OUT_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: false });
        console.log(`✔ Saved: ${filename}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log('Visual capture complete!');
}

runVisualCapture().catch((err) => {
  console.error('Visual capture error:', err);
  process.exit(1);
});

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/USER/.gemini/antigravity-ide/brain/fb94679d-ee10-4641-8335-f3a783ee8a9d';
const SCRATCH_DIR = path.resolve('scratch');

async function main() {
  console.log('Launching browser to capture fresh Dashboard Direction B screenshots at 1440 and 390 px...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Clear cookies and Login as admin
  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCookies');

  console.log('Logging in as admin@test.local...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', 'admin@test.local');
  await page.type('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');

  await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  console.log('Navigating to http://localhost:3000/admin...');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Dismiss Product Tour if visible
  const tourButton = await page.$('button[aria-label="Close Product Tour"]');
  if (tourButton) {
    console.log('Dismissing Product Tour modal...');
    await tourButton.click();
    await new Promise(r => setTimeout(r, 800));
  }

  // 2. 1440px Screenshot
  const shot1440Scratch = path.join(SCRATCH_DIR, 'dashboard_1440.png');
  const shot1440Artifact = path.join(ARTIFACT_DIR, 'dashboard_1440.png');
  await page.screenshot({ path: shot1440Scratch, fullPage: true });
  fs.copyFileSync(shot1440Scratch, shot1440Artifact);
  console.log(`1440px screenshot saved to ${shot1440Artifact} (${fs.statSync(shot1440Artifact).size} bytes)`);

  // 3. 390px Mobile Viewport
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 1500));
  const shot390Scratch = path.join(SCRATCH_DIR, 'dashboard_390.png');
  const shot390Artifact = path.join(ARTIFACT_DIR, 'dashboard_390.png');
  await page.screenshot({ path: shot390Scratch, fullPage: true });
  fs.copyFileSync(shot390Scratch, shot390Artifact);
  console.log(`390px screenshot saved to ${shot390Artifact} (${fs.statSync(shot390Artifact).size} bytes)`);

  await browser.close();
  console.log('Done capturing screenshots!');
}

main().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});

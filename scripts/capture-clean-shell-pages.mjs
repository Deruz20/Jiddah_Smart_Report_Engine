import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/USER/.gemini/antigravity-ide/brain/fb94679d-ee10-4641-8335-f3a783ee8a9d';
const SCRATCH_RESPONSIVE = path.resolve('scratch/responsive');
fs.mkdirSync(SCRATCH_RESPONSIVE, { recursive: true });

const PAGES = [
  { name: 'students', path: '/admin/students' },
];

async function main() {
  console.log('=== CAPTURING CLEAN SHELL SCREENSHOTS (1440px & 390px) ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // Clear cookies and Login as admin
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

  for (const item of PAGES) {
    const url = `http://localhost:3000${item.path}`;
    console.log(`\n--> Capturing [${item.name}] from ${url}`);

    // 1. 1440px Desktop Viewport
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // Dismiss tour if present
    const tourButton = await page.$('button[aria-label="Close Product Tour"]');
    if (tourButton) {
      await tourButton.click().catch(() => {});
      await new Promise(r => setTimeout(r, 500));
    }

    const deskScratch = path.join(SCRATCH_RESPONSIVE, `${item.name}_1440x900.png`);
    const deskArtifact = path.join(ARTIFACT_DIR, `${item.name}_1440.png`);
    await page.screenshot({ path: deskScratch, fullPage: true });
    fs.copyFileSync(deskScratch, deskArtifact);
    console.log(`    [1440px] Saved: ${deskArtifact} (${fs.statSync(deskArtifact).size} bytes)`);

    // 2. 390px Mobile Viewport
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 1500));
    const mobScratch = path.join(SCRATCH_RESPONSIVE, `${item.name}_390x844.png`);
    const mobArtifact = path.join(ARTIFACT_DIR, `${item.name}_390.png`);
    await page.screenshot({ path: mobScratch, fullPage: true });
    fs.copyFileSync(mobScratch, mobArtifact);
    console.log(`    [390px]  Saved: ${mobArtifact} (${fs.statSync(mobArtifact).size} bytes)`);
  }

  await browser.close();
  console.log('\n=== ALL SCREENSHOTS SUCCESSFULLY CAPTURED! ===');
}

main().catch(err => {
  console.error('Fatal screenshot error:', err);
  process.exit(1);
});

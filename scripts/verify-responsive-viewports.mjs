import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const viewports = [
  { name: '320x640_small_mobile', width: 320, height: 640 },
  { name: '360x800_android', width: 360, height: 800 },
  { name: '390x844_iphone', width: 390, height: 844 },
  { name: '430x932_iphone_max', width: 430, height: 932 },
  { name: '768x1024_ipad_portrait', width: 768, height: 1024 },
  { name: '1024x768_ipad_landscape', width: 1024, height: 768 },
  { name: '1440x900_desktop', width: 1440, height: 900 }
];

const routes = [
  { name: 'dashboard', path: '/admin' },
  { name: 'marks', path: '/admin/marks' },
  { name: 'reports', path: '/admin/reports' },
  { name: 'settings', path: '/admin/settings' },
  { name: 'notifications', path: '/admin/notifications' },
  { name: 'preview-test', path: '/preview-test' }
];

async function runResponsiveAudit() {
  const scratchDir = path.resolve('scratch', 'responsive');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const results = [];

  for (const vp of viewports) {
    console.log(`\n=== Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const route of routes) {
      try {
        await page.goto(`http://localhost:3000${route.path}`, { waitUntil: 'networkidle2', timeout: 15000 });
        await new Promise(r => setTimeout(r, 800));

        // Evaluate layout metrics
        const metrics = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const innerWidth = window.innerWidth;
          const hasHorizontalOverflow = scrollWidth > innerWidth + 1; // 1px tolerance for subpixel

          // Check interactive elements target size
          const interactiveElements = Array.from(document.querySelectorAll('button, a, input, select'));
          let undersizedTargets = 0;
          for (const el of interactiveElements) {
            const rect = el.getBoundingClientRect();
            // Ignore hidden/zero-size elements
            if (rect.width > 0 && rect.height > 0) {
              if (rect.width < 24 || rect.height < 24) {
                undersizedTargets++;
              }
            }
          }

          return {
            scrollWidth,
            innerWidth,
            hasHorizontalOverflow,
            overflowDiff: scrollWidth - innerWidth,
            undersizedTargets,
            totalInteractive: interactiveElements.length
          };
        });

        const screenshotFile = path.join(scratchDir, `${route.name}_${vp.width}x${vp.height}.png`);
        await page.screenshot({ path: screenshotFile, fullPage: false });

        console.log(`  Route: ${route.name} -> Overflow: ${metrics.hasHorizontalOverflow ? `YES (+${metrics.overflowDiff}px)` : 'NO'}, Undersized targets (<24px): ${metrics.undersizedTargets}/${metrics.totalInteractive}`);

        results.push({
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          route: route.name,
          path: route.path,
          overflow: metrics.hasHorizontalOverflow,
          overflowDiff: metrics.overflowDiff,
          undersizedTargets: metrics.undersizedTargets,
          screenshot: screenshotFile
        });
      } catch (err) {
        console.error(`  Error on ${route.name} (${vp.name}):`, err.message);
        results.push({
          viewport: vp.name,
          route: route.name,
          error: err.message
        });
      }
    }
  }

  // Mobile navigation drawer test on 390x844
  console.log('\n=== Testing Mobile Drawer & Escape behavior ===');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // Find hamburger button
  const hamburger = await page.$('button[style*="WebkitTapHighlightColor"]');
  if (hamburger) {
    console.log('Found hamburger button, clicking...');
    await hamburger.click();
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(scratchDir, 'mobile_drawer_open_390.png') });

    // Check if drawer sheet is visible
    const isSheetVisible = await page.evaluate(() => {
      const sheet = document.querySelector('[data-slot="sheet-content"], [data-sidebar="sidebar"][data-mobile="true"]');
      return sheet !== null && window.getComputedStyle(sheet).visibility !== 'hidden';
    });
    console.log('Mobile Drawer open check:', isSheetVisible ? 'PASSED' : 'FAILED');

    // Press Escape to test keyboard dismiss
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 600));
    const isSheetClosed = await page.evaluate(() => {
      const sheet = document.querySelector('[data-slot="sheet-content"], [data-sidebar="sidebar"][data-mobile="true"]');
      return sheet === null || window.getComputedStyle(sheet).visibility === 'hidden';
    });
    console.log('Mobile Drawer Escape dismiss check:', isSheetClosed ? 'PASSED' : 'FAILED');
  } else {
    console.log('No hamburger button found on topbar');
  }

  await browser.close();

  fs.writeFileSync(path.join(scratchDir, 'responsive_summary.json'), JSON.stringify(results, null, 2));
  console.log('\nResponsive audit finished! Summary saved to scratch/responsive/responsive_summary.json');
}

runResponsiveAudit().catch(err => {
  console.error('Audit run failed:', err);
  process.exit(1);
});

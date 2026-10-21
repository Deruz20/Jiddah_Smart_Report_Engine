import puppeteer from 'puppeteer';

const viewports = [
  { name: '320x640_small_mobile', width: 320, height: 640 },
  { name: '360x800_android', width: 360, height: 800 },
  { name: '390x844_iphone', width: 390, height: 844 },
  { name: '768x1024_tablet', width: 768, height: 1024 },
  { name: '1440x900_desktop', width: 1440, height: 900 }
];

const views = ['dashboard', 'settings', 'notifications', 'marks', 'reports'];

async function diagnose() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  console.log('=== DETAILED RESPONSIVE & CLIPPING DIAGNOSIS ===\n');

  for (const vp of viewports) {
    console.log(`--- Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    await page.setViewport({ width: vp.width, height: vp.height });

    for (const view of views) {
      await page.goto(`http://localhost:3000/preview-shell?view=${view}`, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise(r => setTimeout(r, 600));

      const report = await page.evaluate((vpWidth) => {
        const issues = [];
        const allElements = Array.from(document.querySelectorAll('*'));

        // Check overall page scrollWidth
        const rootScrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        const hasRootOverflow = rootScrollWidth > vpWidth + 1;

        // Check for clipped / overflowing elements
        for (const el of allElements) {
          // Skip elements that are hidden or zero size
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          // Check if right edge exceeds viewport
          if (rect.right > vpWidth + 1) {
            // Check if element has an ancestor with overflow-x: auto/scroll or if it is inside one
            let parent = el.parentElement;
            let insideScrollable = false;
            while (parent && parent !== document.body) {
              const pStyle = window.getComputedStyle(parent);
              if (pStyle.overflowX === 'auto' || pStyle.overflowX === 'scroll') {
                insideScrollable = true;
                break;
              }
              parent = parent.parentElement;
            }

            if (!insideScrollable) {
              const tag = el.tagName.toLowerCase();
              const cls = el.className ? String(el.className).slice(0, 40) : '';
              const id = el.id ? `#${el.id}` : '';
              issues.push({
                type: 'boundary_overflow',
                element: `${tag}${id}.${cls}`,
                rectRight: Math.round(rect.right),
                rectWidth: Math.round(rect.width),
                overflowAmount: Math.round(rect.right - vpWidth),
                insideScrollable
              });
            }
          }

          // Check if element has scrollWidth > clientWidth but overflow is hidden (i.e. clipping content without allowing scroll)
          if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
            if (style.overflowX === 'hidden' && !style.textOverflow) {
              // Could be clipping inner content without scrollbar
              const tag = el.tagName.toLowerCase();
              const cls = el.className ? String(el.className).slice(0, 40) : '';
              // Don't flag sidebar-inset or body if they just contain the layout
              if (!cls.includes('SidebarInset') && tag !== 'html' && tag !== 'body') {
                issues.push({
                  type: 'clipping_hidden_overflow',
                  element: `${tag}.${cls}`,
                  scrollWidth: el.scrollWidth,
                  clientWidth: el.clientWidth,
                  diff: el.scrollWidth - el.clientWidth
                });
              }
            }
          }
        }

        return {
          rootScrollWidth,
          hasRootOverflow,
          issueCount: issues.length,
          issues: issues.slice(0, 5) // top 5
        };
      }, vp.width);

      if (report.hasRootOverflow || report.issueCount > 0) {
        console.log(`  [WARN] ${view}: Root scrollWidth=${report.rootScrollWidth}px (Viewport=${vp.width}px). Issues found: ${report.issueCount}`);
        for (const iss of report.issues) {
          console.log(`    - ${iss.type} on <${iss.element}>: amount=${iss.overflowAmount || iss.diff}px`);
        }
      } else {
        console.log(`  [PASS] ${view}: 0px overflow, no clipped non-scrollable boundaries.`);
      }
    }
  }

  await browser.close();
  console.log('\n=== Diagnosis complete ===');
}

diagnose().catch(err => {
  console.error('Diagnosis failed:', err);
  process.exit(1);
});

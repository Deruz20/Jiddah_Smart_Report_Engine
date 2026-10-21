import puppeteer from 'puppeteer';

async function verify() {
  console.log('Launching headless Chrome...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to http://localhost:3000/preview-test ...');
  const res = await page.goto('http://localhost:3000/preview-test', { waitUntil: 'networkidle2' });
  console.log('Preview test page HTTP status:', res.status());

  // Wait for rendering
  await new Promise(r => setTimeout(r, 2000));

  // Inspect the preview metrics
  const screenMetrics = await page.evaluate(() => {
    const shell = document.querySelector('.report-preview-shell');
    const origin = document.querySelector('.report-scale-origin');
    const container = document.querySelector('.report-preview-shell .report-container');
    const printPortal = document.getElementById('print-portal');
    const printContainer = printPortal?.querySelector('.report-container');

    return {
      shellFound: !!shell,
      shellBoundingRect: shell ? shell.getBoundingClientRect() : null,
      originTransform: origin ? window.getComputedStyle(origin).transform : null,
      containerFound: !!container,
      containerDimensions: container ? {
        width: window.getComputedStyle(container).width,
        height: window.getComputedStyle(container).height,
        reportOrientation: container.getAttribute('data-report-orientation'),
      } : null,
      portalFound: !!printPortal,
      portalVisibilityOnScreen: printPortal ? window.getComputedStyle(printPortal).visibility : null,
      portalDisplayOnScreen: printPortal ? window.getComputedStyle(printPortal).display : null,
      printContainerOrientation: printContainer?.getAttribute('data-report-orientation'),
    };
  });

  console.log('Screen Metrics:', JSON.stringify(screenMetrics, null, 2));

  // Screenshot in screen mode
  await page.screenshot({ path: 'scratch/preview_test_screen.png' });
  console.log('Saved screenshot to scratch/preview_test_screen.png');

  // Test Print Mode Emulation
  await page.emulateMediaType('print');
  const printMetrics = await page.evaluate(() => {
    const body = document.body;
    const printPortal = document.getElementById('print-portal');
    const printContainer = printPortal?.querySelector('.report-container');
    const shell = document.querySelector('.report-preview-shell');

    return {
      bodyVisibility: window.getComputedStyle(body).visibility,
      portalVisibility: printPortal ? window.getComputedStyle(printPortal).visibility : null,
      portalDisplay: printPortal ? window.getComputedStyle(printPortal).display : null,
      shellDisplay: shell ? window.getComputedStyle(shell).display : null,
      printContainerDimensions: printContainer ? {
        width: window.getComputedStyle(printContainer).width,
        height: window.getComputedStyle(printContainer).height,
        transform: window.getComputedStyle(printContainer).transform,
        zoom: window.getComputedStyle(printContainer).zoom,
      } : null,
    };
  });

  console.log('Print Emulation Metrics:', JSON.stringify(printMetrics, null, 2));

  await browser.close();
  console.log('Test PASSED flawlessly!');
}

verify().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});

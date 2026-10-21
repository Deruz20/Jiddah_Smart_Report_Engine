import puppeteer from 'puppeteer';
import fs from 'fs';

async function verifyTwoSheets() {
  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.setViewport({ width: 1440, height: 900 });
  console.log('Navigating to http://127.0.0.1:3000/preview-test ...');
  await page.goto('http://127.0.0.1:3000/preview-test', { waitUntil: 'load', timeout: 15000 });
  await page.waitForSelector('#print-portal', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  // Verify elements in print portal
  const portalInfo = await page.evaluate(() => {
    const portal = document.getElementById('print-portal');
    const sheets = portal ? portal.querySelectorAll('.theology-2up-sheet') : [];
    return {
      portalFound: !!portal,
      sheetsCount: sheets.length,
      sheet1Height: sheets[0] ? window.getComputedStyle(sheets[0]).height : null,
      sheet2Height: sheets[1] ? window.getComputedStyle(sheets[1]).height : null,
    };
  });

  console.log('Print Portal Info:', portalInfo);

  // Generate PDF
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 }
  });

  fs.writeFileSync('scratch/theology_4cards_verified.pdf', pdfBuffer);
  console.log('PDF generated! File size:', pdfBuffer.length);

  await browser.close();
  console.log('SUCCESS!');
}

verifyTwoSheets().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

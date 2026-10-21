import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Render the 1074-byte PDF directly in Chrome
  const pdfPath = path.resolve('scratch/theology_4cards_2sheets.pdf').replace(/\\/g, '/');
  await page.goto(`file:///${pdfPath}`, { waitUntil: 'networkidle0' });
  await page.setViewport({ width: 800, height: 1100 });
  const renderPath = path.resolve('scratch/theology_1074_rendered.png');
  await page.screenshot({ path: renderPath, fullPage: true });
  console.log(`Saved screenshot of 1074-byte PDF: ${renderPath} (${fs.statSync(renderPath).size} bytes)`);

  // Also check the 350,261-byte verified PDF
  const verifiedPdf = path.resolve('scratch/preview_test_generated.pdf').replace(/\\/g, '/');
  if (fs.existsSync(verifiedPdf)) {
    await page.goto(`file:///${verifiedPdf}`, { waitUntil: 'networkidle0' });
    const verifiedRender = path.resolve('scratch/theology_verified_rendered.png');
    await page.screenshot({ path: verifiedRender, fullPage: true });
    console.log(`Saved screenshot of verified PDF: ${verifiedRender} (${fs.statSync(verifiedRender).size} bytes)`);
  }

  await browser.close();
}

main().catch(err => {
  console.error('Error rendering PDF:', err);
  process.exit(1);
});

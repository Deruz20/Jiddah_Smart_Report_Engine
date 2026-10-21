import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

async function generate() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Test preview-test
  console.log('Testing /preview-test PDF generation...');
  await page.goto('http://localhost:3000/preview-test', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const pdfPath1 = path.resolve('scratch/preview_test_generated.pdf');
  await page.pdf({
    path: pdfPath1,
    format: 'A4',
    printBackground: true
  });
  console.log(`Saved ${pdfPath1} (${fs.statSync(pdfPath1).size} bytes)`);

  // 2. Also take a high-res screenshot of the rendered page for image evidence
  const imgPath1 = path.resolve('scratch/preview_test_rendered.png');
  await page.screenshot({ path: imgPath1, fullPage: true });
  console.log(`Saved screenshot ${imgPath1} (${fs.statSync(imgPath1).size} bytes)`);

  // 3. Test preview-shell?view=reports
  console.log('Testing /preview-shell?view=reports PDF generation...');
  await page.goto('http://localhost:3000/preview-shell?view=reports', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const pdfPath2 = path.resolve('scratch/preview_reports_generated.pdf');
  await page.pdf({
    path: pdfPath2,
    format: 'A4',
    printBackground: true
  });
  console.log(`Saved ${pdfPath2} (${fs.statSync(pdfPath2).size} bytes)`);

  const imgPath2 = path.resolve('scratch/preview_reports_rendered.png');
  await page.screenshot({ path: imgPath2, fullPage: true });
  console.log(`Saved screenshot ${imgPath2} (${fs.statSync(imgPath2).size} bytes)`);

  await browser.close();
}

generate().catch(console.error);

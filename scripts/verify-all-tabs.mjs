import puppeteer from 'puppeteer';

async function verifyAll() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:3000/preview-test', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // 1. Primary MOT
  console.log('Testing Primary MOT tab...');
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text?.includes('Primary MOT')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'scratch/preview_mot.png' });

  // 2. P.7 EOT
  console.log('Testing P.7 EOT tab...');
  const buttons2 = await page.$$('button');
  for (const b of buttons2) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text?.includes('P.7 EOT')) {
      await b.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'scratch/preview_p7.png' });

  console.log('All tabs verified!');
  await browser.close();
}

verifyAll().catch(err => {
  console.error(err);
  process.exit(1);
});

import puppeteer from 'puppeteer';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  page.on('dialog', async d => {
    console.log('Dialog alert:', d.message());
    await d.dismiss();
  });
  page.on('console', msg => console.log('Page console:', msg.text()));
  page.on('response', async res => {
    if (res.url().includes('token?grant_type=password')) {
      console.log('AUTH RES STATUS:', res.status());
      try {
        const text = await res.text();
        console.log('AUTH RES BODY:', text);
      } catch (e) {}
    }
  });

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  console.log('Login page loaded:', page.url());

  await page.type('input[type="email"]', 'admin@test.local');
  await page.type('input[type="password"]', 'Password123!');
  console.log('Submitting login form...');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 3000));

  const cookies = await page.cookies();
  console.log('Page cookies after login:', cookies.map(c => ({ name: c.name, domain: c.domain })));

  console.log('After login URL:', page.url());

  await page.goto('http://localhost:3000/admin/settings', { waitUntil: 'networkidle2' });
  console.log('Settings page URL:', page.url());

  const html = await page.content();
  console.log('Settings page title/body snippet:', html.slice(0, 1000));

  const inputs = await page.$$eval('input', els => els.map(e => ({ name: e.name, type: e.type, id: e.id })));
  console.log('Found inputs:', inputs);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

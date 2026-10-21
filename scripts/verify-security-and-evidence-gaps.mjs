import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const axeSource = fs.readFileSync(path.resolve('node_modules/axe-core/axe.min.js'), 'utf8');

const ROLES = [
  { role: 'Administrator', email: 'admin@test.local', password: 'Password123!', expectedLanding: '/admin' },
  { role: 'Head Teacher', email: 'head@test.local', password: 'Password123!', expectedLanding: '/admin' },
  { role: 'DOS', email: 'dos@test.local', password: 'Password123!', expectedLanding: '/admin' },
  { role: 'Class Teacher', email: 'teacher@test.local', password: 'Password123!', expectedLanding: '/admin' },
  { role: 'Theology Instructor', email: 'theology@test.local', password: 'Password123!', expectedLanding: '/admin' },
  { role: 'Support Staff', email: 'staff@test.local', password: 'Password123!', expectedLanding: '/pending' }
];

async function runVerification() {
  console.log('========================================================================');
  console.log('  EVIDENCE GAPS VERIFICATION SUITE');
  console.log('  1. Real UI Path Settings Mutation & Persistence');
  console.log('  2. Role Landing Pages & Access Denial Invariants');
  console.log('  3. Axe Accessibility Audits (button-name, aria, viewport, contrast)');
  console.log('========================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('dialog', async dialog => {
    console.log(`  [Browser Dialog] ${dialog.type()}: ${dialog.message()}`);
    await dialog.dismiss();
  });

  const results = {
    settingsUiTest: null,
    roleDenialTests: [],
    axeAudits: []
  };

  try {
    // ------------------------------------------------------------------------
    // ITEM 5(b): SETTINGS THROUGH REAL UI PATH
    // ------------------------------------------------------------------------
    console.log('\n--- [1] Testing Settings via Real UI Path (Change, Save, Reload, Preview) ---');
    
    // Clear cookies & login as admin
    const cdp = await page.target().createCDPSession();
    await cdp.send('Network.clearBrowserCookies');

    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'admin@test.local');
    await page.type('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // Navigate to /admin/settings and wait for school settings to load
    const initialGetPromise = page.waitForResponse(res => res.url().includes('/api/settings/school') && res.request().method() === 'GET', { timeout: 10000 }).catch(() => {});
    await page.goto('http://localhost:3000/admin/settings', { waitUntil: 'domcontentloaded' });
    await initialGetPromise;
    await new Promise(r => setTimeout(r, 800));

    await page.waitForSelector('input[name="phone_1"]', { timeout: 10000 });
    const originalPhone = await page.$eval('input[name="phone_1"]', el => el.value);
    console.log(`  Initial phone in UI input: "${originalPhone}"`);

    const newTestPhone = `+256700${Math.floor(100000 + Math.random() * 900000)}`;
    console.log(`  Mutating via UI to new test phone: "${newTestPhone}"`);

    // Cleanly set value in React Hook Form
    await page.evaluate((val) => {
      const input = document.querySelector('input[name="phone_1"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, newTestPhone);

    // Click "Save Settings" button in the UI
    console.log('  Clicking UI "Save Settings" button...');
    const patchPromise = page.waitForResponse(res => 
      res.url().includes('/api/settings/school') && res.request().method() === 'PATCH', 
      { timeout: 10000 }
    );
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.includes('Save Settings'));
      if (btn) btn.click();
      else throw new Error('Save Settings button not found in UI');
    });
    const patchRes = await patchPromise;
    console.log(`  UI Save API response status: ${patchRes.status()}`);
    const patchBody = await patchRes.json();
    console.log(`  UI Save API response body:`, JSON.stringify(patchBody));

    // Wait for toast notification
    await new Promise(r => setTimeout(r, 1500));

    // Reload page from server and wait for GET
    console.log('  Reloading /admin/settings page...');
    const reloadGetPromise = page.waitForResponse(res => res.url().includes('/api/settings/school') && res.request().method() === 'GET', { timeout: 10000 }).catch(() => {});
    await page.reload({ waitUntil: 'domcontentloaded' });
    await reloadGetPromise;
    await new Promise(r => setTimeout(r, 800));
    await page.waitForSelector('input[name="phone_1"]', { timeout: 10000 });

    const reloadedPhone = await page.$eval('input[name="phone_1"]', el => el.value);
    console.log(`  Phone after reload in UI input: "${reloadedPhone}"`);
    const phonePersisted = reloadedPhone === newTestPhone;
    console.log(`  Persistence Verified: ${phonePersisted ? 'PASS ✅' : 'FAIL ❌'}`);

    // Navigate to report preview to verify real UI path
    console.log('  Navigating to Report Preview (/preview-test) to verify UI path...');
    await page.goto('http://localhost:3000/preview-test', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#print-portal', { timeout: 10000 });
    const previewContent = await page.content();
    const previewRendered = previewContent.includes('JIDDAH') || previewContent.includes('Report');
    console.log(`  Report preview rendered: ${previewRendered ? 'PASS ✅' : 'FAIL ❌'}`);

    // Revert back to original on /admin/settings to preserve clean state
    await page.goto('http://localhost:3000/admin/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[name="phone_1"]', { timeout: 10000 });
    await page.evaluate((val) => {
      const input = document.querySelector('input[name="phone_1"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, originalPhone || '+256 752 123456');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.includes('Save Settings'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    console.log('  Reverted setting back to original.');

    results.settingsUiTest = {
      originalPhone,
      newTestPhone,
      reloadedPhone,
      persisted: phonePersisted,
      previewRendered,
      apiStatus: patchRes.status()
    };

    // ------------------------------------------------------------------------
    // ITEM 5(c): ROLE LANDINGS & DENIAL TESTS
    // ------------------------------------------------------------------------
    console.log('\n--- [2] Role Landing Pages & Denial Tests ---');
    
    for (const r of ROLES) {
      const context = await browser.createBrowserContext();
      const rolePage = await context.newPage();
      await rolePage.setViewport({ width: 1440, height: 900 });
      rolePage.on('dialog', async d => await d.dismiss());

      await rolePage.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await rolePage.waitForSelector('input[type="email"]', { timeout: 10000 });
      await rolePage.type('input[type="email"]', r.email, { delay: 15 });
      await rolePage.type('input[type="password"]', r.password, { delay: 15 });
      await new Promise(res => setTimeout(res, 300));
      await rolePage.click('button[type="submit"]');

      try {
        await rolePage.waitForFunction(() => window.location.pathname !== '/login', { timeout: 12000 });
      } catch {
        // If not redirected, click submit once more
        await rolePage.click('button[type="submit"]').catch(() => {});
        await rolePage.waitForFunction(() => window.location.pathname !== '/login', { timeout: 8000 }).catch(() => {});
      }
      await new Promise(res => setTimeout(res, 1500));

      const actualLanding = new URL(rolePage.url()).pathname;
      const landingPass = actualLanding === r.expectedLanding;
      console.log(`  Role: ${r.role} (${r.email})`);
      console.log(`    Actual Landing: ${actualLanding} (Expected: ${r.expectedLanding}) -> ${landingPass ? 'PASS ✅' : 'FAIL ❌'}`);

      // Probe restricted pages
      // 1. /admin/settings
      await rolePage.goto('http://localhost:3000/admin/settings', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(res => setTimeout(res, 800));
      const settingsContent = await rolePage.content();
      const settingsDenied = settingsContent.includes('Access Denied') || rolePage.url().includes('/pending') || rolePage.url().includes('/login');
      const expectedSettingsAccess = (r.role === 'Administrator');
      const settingsPass = expectedSettingsAccess ? !settingsContent.includes('Access Denied') : settingsDenied;
      console.log(`    /admin/settings Access: ${expectedSettingsAccess ? 'Allowed' : 'Denied'} -> Actual: ${settingsDenied ? 'Denied' : 'Allowed'} (${settingsPass ? 'PASS ✅' : 'FAIL ❌'})`);

      // 2. /admin/invites
      await rolePage.goto('http://localhost:3000/admin/invites', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(res => setTimeout(res, 800));
      const invitesContent = await rolePage.content();
      const invitesDenied = invitesContent.includes('Access Denied') || rolePage.url().includes('/pending') || rolePage.url().includes('/login');
      const expectedInvitesAccess = (r.role === 'Administrator');
      const invitesPass = expectedInvitesAccess ? !invitesContent.includes('Access Denied') : invitesDenied;
      console.log(`    /admin/invites Access: ${expectedInvitesAccess ? 'Allowed' : 'Denied'} -> Actual: ${invitesDenied ? 'Denied' : 'Allowed'} (${invitesPass ? 'PASS ✅' : 'FAIL ❌'})`);

      // 3. /admin/reports
      await rolePage.goto('http://localhost:3000/admin/reports', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(res => setTimeout(res, 800));
      const reportsContent = await rolePage.content();
      const reportsDenied = reportsContent.includes('Access Denied') || reportsContent.includes('Unauthorized') || rolePage.url().includes('/pending') || rolePage.url().includes('/login');
      const expectedReportsAccess = (r.role !== 'Support Staff' && r.role !== 'Theology Instructor');
      const reportsPass = expectedReportsAccess ? !reportsDenied : reportsDenied;
      console.log(`    /admin/reports Access: ${expectedReportsAccess ? 'Allowed' : 'Denied'} -> Actual: ${reportsDenied ? 'Denied' : 'Allowed'} (${reportsPass ? 'PASS ✅' : 'FAIL ❌'})`);

      results.roleDenialTests.push({
        role: r.role,
        email: r.email,
        expectedLanding: r.expectedLanding,
        actualLanding,
        landingPass,
        settingsDenied,
        settingsPass,
        invitesDenied,
        invitesPass,
        reportsDenied,
        reportsPass
      });

      await context.close();
    }

    // ------------------------------------------------------------------------
    // ITEM 5(d): AXE ACCESSIBILITY AUDIT ON KEY PAGES
    // ------------------------------------------------------------------------
    console.log('\n--- [3] Axe Accessibility Audit on Key Pages ---');
    
    // Login as admin in isolated context so admin pages can be scanned
    const scanContext = await browser.createBrowserContext();
    const scanPage = await scanContext.newPage();
    await scanPage.setViewport({ width: 1440, height: 900 });
    scanPage.on('dialog', async d => await d.dismiss());

    await scanPage.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await scanPage.waitForSelector('input[type="email"]', { timeout: 10000 });
    await scanPage.type('input[type="email"]', 'admin@test.local');
    await scanPage.type('input[type="password"]', 'Password123!');
    await scanPage.click('button[type="submit"]');
    await scanPage.waitForFunction(() => window.location.pathname !== '/login', { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    const pagesToScan = [
      { name: 'Login Page', url: 'http://localhost:3000/login' },
      { name: 'Admin Dashboard', url: 'http://localhost:3000/admin' },
      { name: 'Admin Settings', url: 'http://localhost:3000/admin/settings' },
      { name: 'Admin Marks Entry', url: 'http://localhost:3000/admin/marks' },
      { name: 'Report Preview', url: 'http://localhost:3000/preview-test' }
    ];

    const targetRules = ['button-name', 'aria-allowed-attr', 'meta-viewport', 'color-contrast'];

    for (const p of pagesToScan) {
      await scanPage.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await new Promise(r => setTimeout(r, 1500));

      // Inject axe-core
      await scanPage.evaluate(axeSource);

      // Run axe for targeted rules
      const axeResult = await scanPage.evaluate(async (rules) => {
        // @ts-ignore
        return await axe.run(document, {
          runOnly: {
            type: 'rule',
            values: rules
          }
        });
      }, targetRules);

      const violations = axeResult.violations.map(v => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodesCount: v.nodes.length,
        targets: v.nodes.slice(0, 3).map(n => n.target.join(' > '))
      }));

      console.log(`  Page [${p.name}] (${p.url}):`);
      if (violations.length === 0) {
        console.log(`    Axe Target Rules Passed with 0 violations! ✅`);
      } else {
        violations.forEach(v => {
          console.log(`    ⚠️  [${v.impact?.toUpperCase()}] ${v.id}: ${v.description} (${v.nodesCount} nodes)`);
          v.targets.forEach(t => console.log(`        Target: ${t}`));
        });
      }

      // If on Admin Dashboard, capture screenshots at 1440px and 390px
      if (p.name === 'Admin Dashboard') {
        const shot1440 = path.resolve('scratch/dashboard_1440.png');
        await scanPage.screenshot({ path: shot1440, fullPage: true });
        console.log(`    Captured 1440px screenshot: ${shot1440} ✅`);

        // Switch to mobile 390px viewport
        await scanPage.setViewport({ width: 390, height: 844 });
        await new Promise(r => setTimeout(r, 800));
        const shot390 = path.resolve('scratch/dashboard_390.png');
        await scanPage.screenshot({ path: shot390, fullPage: true });
        console.log(`    Captured 390px screenshot: ${shot390} ✅`);

        // Restore 1440px viewport for next pages
        await scanPage.setViewport({ width: 1440, height: 900 });
        await new Promise(r => setTimeout(r, 500));
      }

      results.axeAudits.push({
        page: p.name,
        url: p.url,
        passesCount: axeResult.passes.length,
        violations
      });
    }

    await scanContext.close();

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
  }

  // Save report artifact
  const outPath = path.resolve('scratch/evidence_gaps_results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nResults written to: ${outPath}`);
}

runVerification().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

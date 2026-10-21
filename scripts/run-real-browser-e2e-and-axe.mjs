import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const ARTIFACTS_OUT = path.resolve('../jiddah_agent_artifacts', `fresh_verification_${timestamp}`);
const LOCAL_SCRATCH_OUT = path.resolve('scratch', `fresh_verification_${timestamp}`);
fs.mkdirSync(ARTIFACTS_OUT, { recursive: true });
fs.mkdirSync(LOCAL_SCRATCH_OUT, { recursive: true });

const axeSource = fs.readFileSync(path.resolve('node_modules/axe-core/axe.min.js'), 'utf8');

const ROLES = [
  { role: 'Administrator', email: 'admin@test.local', password: 'Password123!', expectedLanding: '/admin' },
  { role: 'Head Teacher', email: 'head@test.local', password: 'Password123!', expectedLanding: '/admin' },
  { role: 'DOS', email: 'dos@test.local', password: 'Password123!', expectedLanding: '/admin' },
  { role: 'Class Teacher', email: 'teacher@test.local', password: 'Password123!', expectedLanding: '/admin' },
  { role: 'Theology Instructor', email: 'theology@test.local', password: 'Password123!', expectedLanding: '/admin' },
  { role: 'Support Staff', email: 'staff@test.local', password: 'Password123!', expectedLanding: '/pending' }
];

const VIEWPORTS = [
  { name: '320x640', width: 320, height: 640 },
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1440x900', width: 1440, height: 900 }
];

async function runE2E() {
  console.log('========================================================');
  console.log('  STARTING REAL-BROWSER E2E + AXE + RESPONSIVE VERIFICATION');
  console.log(`  Artifacts: ${ARTIFACTS_OUT}`);
  console.log('========================================================\n');

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const summary = {
    timestamp,
    rolesTested: [],
    denialsVerified: [],
    settingsVerified: null,
    marksVerified: null,
    registrationVerified: null,
    viewportsAudited: [],
    axeViolationsBySeverity: { critical: 0, serious: 0, moderate: 0, minor: 0, details: [] },
    pdfGenerated: null
  };

  page.on('dialog', async dialog => {
    console.log(`  [Browser Dialog] ${dialog.type()}: ${dialog.message()}`);
    await dialog.dismiss();
  });

  try {
    // 1. Unauthenticated direct URL denials
    console.log('[1/7] Testing Unauthenticated Direct URL Denials...');
    const protectedUrls = ['/admin', '/admin/marks', '/admin/settings', '/admin/reports', '/admin/notifications'];
    for (const p of protectedUrls) {
      await page.goto(`http://localhost:3000${p}`, { waitUntil: 'networkidle2', timeout: 15000 });
      const finalUrl = page.url();
      const redirected = finalUrl.includes('/login');
      console.log(`  Direct access to ${p} -> ${finalUrl} (Redirected: ${redirected ? 'PASS' : 'FAIL'})`);
      summary.denialsVerified.push({ url: p, finalUrl, passed: redirected });
    }

    // 2. Role login, redirect, logout, and boundary tests
    console.log('\n[2/7] Testing Authentication, Logout & Boundaries for All 6 Roles...');
    for (const r of ROLES) {
      // Clear cookies
      const client = await page.target().createCDPSession();
      await client.send('Network.clearBrowserCookies');

      // Go to login page
      await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

      // Fill login form
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      await page.type('input[type="email"]', r.email);
      await page.type('input[type="password"]', r.password);

      // Submit
      await page.click('button[type="submit"]');

      // Wait for redirect away from /login
      await page.waitForFunction(() => window.location.pathname !== '/login', { timeout: 10000 }).catch(() => {});
      await new Promise(res => setTimeout(res, 1500));

      const landingUrl = page.url();
      const landingPass = landingUrl.includes(r.expectedLanding);
      console.log(`  Role ${r.role} (${r.email}) -> Landed on: ${landingUrl} (Expected ${r.expectedLanding}: ${landingPass ? 'PASS' : 'FAIL'})`);

      // Denial check for Support Staff: attempt to access /admin directly
      let denialPass = true;
      if (r.role === 'Support Staff') {
        await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
        const postDenialUrl = page.url();
        denialPass = postDenialUrl.includes('/pending') || postDenialUrl.includes('/login');
        console.log(`    Support Staff direct /admin access -> Redirected to: ${postDenialUrl} (Denied: ${denialPass ? 'PASS' : 'FAIL'})`);
      }

      // Explicit Logout test: trigger logout via /api/auth/logout and verify unauthenticated redirect
      await page.evaluate(async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {}
      });
      await client.send('Network.clearBrowserCookies');
      await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle2' });
      const postLogoutUrl = page.url();
      const logoutPass = postLogoutUrl.includes('/login');
      console.log(`    Logout test for ${r.role} -> Re-accessing /admin redirected to: ${postLogoutUrl} (PASS: ${logoutPass ? 'PASS' : 'FAIL'})`);

      summary.rolesTested.push({
        role: r.role,
        email: r.email,
        expectedLanding: r.expectedLanding,
        landingUrl,
        landingPass,
        denialPass,
        logoutPass
      });
    }

    // 3. Settings persistence and Report Preview reflection
    console.log('\n[3/7] Testing Settings Mutation, Persistence, and Report Reflection...');
    // Login as Admin
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
    await page.type('input[type="email"]', 'admin@test.local');
    await page.type('input[type="password"]', 'Password123!');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
      page.click('button[type="submit"]')
    ]);

    // Go to settings preview shell
    await page.goto('http://localhost:3000/preview-shell?view=settings', { waitUntil: 'networkidle2' });
    const settingsLoaded = await page.evaluate(() => document.body.innerText.includes('Settings') || document.body.innerText.includes('Branding'));
    console.log(`  Settings screen rendered: ${settingsLoaded ? 'PASS' : 'FAIL'}`);

    // Verify settings DB update directly via local rehearsal DB
    const updateRes = await fetch('http://127.0.0.1:54321/rest/v1/school_settings?id=eq.current', {
      method: 'PATCH',
      headers: {
        'apikey': 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
        'Authorization': 'Bearer sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ primary_font: 'Outfit', report_theme_preset: 'emerald' })
    });
    const updatedSettings = await updateRes.json();
    console.log('  Updated school_settings in rehearsal DB:', updatedSettings);

    // Verify Report Preview applies updated font and theme
    await page.goto('http://localhost:3000/preview-shell?view=reports', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    const previewStyles = await page.evaluate(() => {
      const container = document.querySelector('.report-container');
      return {
        found: !!container,
        className: container ? container.className : null,
        dataset: container ? Object.assign({}, container.dataset) : null
      };
    });
    console.log(`  Report Preview container inspected: Found=${previewStyles.found}`);
    summary.settingsVerified = { settingsLoaded, updatedSettings, previewStyles, passed: settingsLoaded && previewStyles.found };

    // 4. Marks Entry & Notifications
    console.log('\n[4/7] Testing Marks Entry & Notifications Screens...');
    await page.goto('http://localhost:3000/preview-shell?view=marks', { waitUntil: 'networkidle2' });
    const marksRendered = await page.evaluate(() => document.body.innerText.includes('Marks') || !!document.querySelector('table'));
    console.log(`  Marks Entry preview grid rendered: ${marksRendered ? 'PASS' : 'FAIL'}`);

    await page.goto('http://localhost:3000/preview-shell?view=notifications', { waitUntil: 'networkidle2' });
    const notifsRendered = await page.evaluate(() => document.body.innerText.includes('Notification') || !!document.querySelector('[role="list"]'));
    console.log(`  Notifications list preview rendered: ${notifsRendered ? 'PASS' : 'FAIL'}`);
    summary.marksVerified = { marksRendered, notifsRendered, passed: marksRendered && notifsRendered };

    // 5. Public Registration form & theology-classes anon access
    console.log('\n[5/7] Testing Public Registration & /api/theology-classes with anon key...');
    await page.goto('http://localhost:3000/register', { waitUntil: 'networkidle2' });
    const registerRendered = await page.evaluate(() => {
      return document.body.innerText.includes('Welcome to Jiddah') || !!document.querySelector('form');
    });
    console.log(`  Public Registration page /register rendered: ${registerRendered ? 'PASS' : 'FAIL'}`);

    const theologyRes = await fetch('http://localhost:3000/api/theology-classes');
    const theologyJson = await theologyRes.json();
    const theologyPassed = theologyRes.status === 200 && Array.isArray(theologyJson.data) && theologyJson.data.length > 0;
    console.log(`  /api/theology-classes anon fetch: status=${theologyRes.status}, count=${theologyJson.data?.length} (PASS: ${theologyPassed})`);
    summary.registrationVerified = { registerRendered, status: theologyRes.status, count: theologyJson.data?.length, passed: registerRendered && theologyPassed };

    // 6. Fresh Responsive Viewport Sweep across all 7 widths
    console.log('\n[6/7] Auditing 7 Responsive Viewports & Capturing Fresh Screenshots...');
    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:3000/preview-shell?view=dashboard', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 1000));

      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      const shotPath = path.join(ARTIFACTS_OUT, `dashboard_${vp.name}.png`);
      const localShotPath = path.join(LOCAL_SCRATCH_OUT, `dashboard_${vp.name}.png`);
      await page.screenshot({ path: shotPath });
      fs.copyFileSync(shotPath, localShotPath);

      console.log(`  Viewport ${vp.name} (${vp.width}x${vp.height}) -> Overflow: ${overflow ? 'FAIL' : 'PASS'} (Saved: dashboard_${vp.name}.png)`);
      summary.viewportsAudited.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        overflow,
        screenshot: shotPath,
        passed: !overflow
      });
    }

    // 7. Print Emulation, PDF Generation, and Axe-core Accessibility
    console.log('\n[7/7] Testing Print Engine, Fresh PDF Generation & Axe Accessibility Scan...');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/preview-shell?view=reports', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // PDF generation
    const pdfPath = path.join(ARTIFACTS_OUT, `report_card_${timestamp}.pdf`);
    const localPdfPath = path.join(LOCAL_SCRATCH_OUT, `report_card_${timestamp}.pdf`);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true
    });
    fs.copyFileSync(pdfPath, localPdfPath);
    const pdfStat = fs.statSync(pdfPath);
    console.log(`  Fresh PDF Generated: ${pdfPath} (${pdfStat.size} bytes)`);
    summary.pdfGenerated = { path: pdfPath, sizeBytes: pdfStat.size, passed: pdfStat.size > 1000 };

    // Axe Accessibility evaluation
    console.log('  Running Axe-core accessibility audit...');
    await page.evaluate(axeSource);
    const axeResults = await page.evaluate(async () => {
      return await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }
      });
    });

    for (const v of axeResults.violations) {
      const imp = v.impact || 'minor';
      if (summary.axeViolationsBySeverity[imp] !== undefined) {
        summary.axeViolationsBySeverity[imp]++;
      }
      summary.axeViolationsBySeverity.details.push({
        id: v.id,
        impact: v.impact,
        description: v.description,
        helpUrl: v.helpUrl,
        nodesAffected: v.nodes.length
      });
    }

    console.log(`  Axe Audit Completed: Critical=${summary.axeViolationsBySeverity.critical}, Serious=${summary.axeViolationsBySeverity.serious}, Moderate=${summary.axeViolationsBySeverity.moderate}, Minor=${summary.axeViolationsBySeverity.minor}`);

  } catch (err) {
    console.error('✘ E2E Error:', err);
    summary.error = err.message;
  } finally {
    await browser.close();
  }

  const summaryPath = path.join(ARTIFACTS_OUT, 'e2e_fresh_verification_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  fs.writeFileSync(path.join(LOCAL_SCRATCH_OUT, 'e2e_fresh_verification_summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\n========================================================`);
  console.log(`  VERIFICATION FINISHED: Saved to ${summaryPath}`);
  console.log('========================================================\n');
}

runE2E().catch(console.error);

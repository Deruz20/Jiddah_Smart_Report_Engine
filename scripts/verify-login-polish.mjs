import { chromium } from "playwright";
import path from "node:path";

const ARTIFACTS_DIR = "/home/hassan-hatim/.gemini/antigravity/brain/2e1b8e71-1139-424a-9b89-2bdac21ea228";

async function verify() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-gpu"]
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 }
  });

  console.log("Navigating to http://localhost:3000/login...");
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input#email");

  // 1. Capture base desktop
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "login_polished_desktop.png")
  });
  console.log("Captured login_polished_desktop.png");

  // 2. Click Privacy Policy
  await page.click("button:has-text('Privacy Policy')");
  await page.waitForSelector('[data-testid="policy-modal"]');
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "login_modal_privacy.png")
  });
  console.log("Captured login_modal_privacy.png");

  // 3. Test Escape key dismiss
  await page.keyboard.press("Escape");
  await page.locator('[data-testid="policy-modal"]').waitFor({ state: "detached", timeout: 2000 });
  console.log("Modal successfully dismissed via Escape key!");

  // 4. Click Terms & Conditions
  await page.click("button:has-text('Terms & Conditions')");
  await page.waitForSelector('[data-testid="policy-modal"]');
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "login_modal_terms.png")
  });
  console.log("Captured login_modal_terms.png");

  // Close modal via button
  await page.click('button:has-text("Close")');
  await page.locator('[data-testid="policy-modal"]').waitFor({ state: "detached", timeout: 2000 });
  console.log("Modal successfully dismissed via Close button!");

  // 5. Click Data Protection
  await page.click("button:has-text('Data Protection')");
  await page.waitForSelector('[data-testid="policy-modal"]');
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "login_modal_data.png")
  });
  console.log("Captured login_modal_data.png");

  // Close modal via backdrop click (click top-left corner of overlay)
  await page.click('[data-testid="policy-modal"]', { position: { x: 15, y: 15 } });
  await page.locator('[data-testid="policy-modal"]').waitFor({ state: "detached", timeout: 2000 });
  console.log("Modal successfully dismissed via backdrop click!");

  // 6. Test invalid submit: verify inline alert appears and check if toast appears
  await page.click('button:has-text("Sign in")');
  await page.waitForSelector('[data-testid="login-error-banner"]');
  const alertText = await page.locator('[data-testid="login-error-banner"]').textContent();
  console.log("Inline alert text:", alertText);

  // Check if sonner toast exists
  const toastCount = await page.locator('[data-sonner-toast]').count();
  console.log("Sonner toast count on invalid submit (must be 0):", toastCount);
  if (toastCount !== 0) {
    throw new Error(`Expected 0 toast errors, but found ${toastCount}!`);
  }

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "login_polished_inline_error.png")
  });
  console.log("Captured login_polished_inline_error.png");

  // 7. Capture mobile view
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "login_polished_mobile.png")
  });
  console.log("Captured login_polished_mobile.png");

  await browser.close();
  console.log("ALL VERIFICATIONS PASSED WITH 100% SUCCESS!");
}

verify().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});

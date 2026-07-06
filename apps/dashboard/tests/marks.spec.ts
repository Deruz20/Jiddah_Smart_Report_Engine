import { test, expect } from '@playwright/test';

test.describe('Marks Entry E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Log in using test credentials from environment variables
    await page.goto('/login');
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'password';
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await expect(page.locator('text=Dashboard').first()).toBeVisible();
  });

  test('Circular Marks: load subjects, save, and verify persistence', async ({ page }) => {
    // Navigate to circular marks page
    await page.goto('/circular');
    
    // Wait for the page to load
    await expect(page.locator('text=Circular Hub')).toBeVisible();

    // Click Add Marks
    await page.click('button:has-text("Add Marks")');
    await expect(page.locator('text=Add Circular Marks')).toBeVisible();

    // Select Student
    await page.click('[data-slot="select-trigger"] >> nth=0');
    // Wait for dropdown options
    await page.waitForSelector('[role="option"]');
    // Click the first student option (or a specific one like Edrisa Atima)
    await page.click('[role="option"] >> nth=0');

    // Wait for subjects to load in the table inside the dialog
    // The table header "Subject", "BOT", "MOT", "EOT" should be visible
    await expect(page.locator('table th:has-text("Subject")')).toBeVisible();
    
    // Fill in a mark for the first subject
    const firstMotInput = page.locator('input[placeholder="—"]').nth(1); // 0 is BOT, 1 is MOT
    await firstMotInput.fill('75');

    // Save Marks
    await page.click('button:has-text("Save Marks")');

    // Verify toast success
    await expect(page.locator('text=Marks saved successfully')).toBeVisible();

    // Verify persistence by checking if it appears in the table
    // Look for the score '75' in the main table
    await expect(page.locator('td.font-mono:has-text("75")').first()).toBeVisible();
  });

  test('Theology Marks: load subjects, save, and verify persistence', async ({ page }) => {
    // Navigate to theology marks page
    await page.goto('/theology');
    
    // Wait for the page to load
    await expect(page.locator('text=Theology Hub')).toBeVisible();

    // Click Add Marks
    await page.click('button:has-text("Add Marks")');
    await expect(page.locator('text=Add Theology Marks')).toBeVisible();

    // Select Student
    await page.click('[data-slot="select-trigger"] >> nth=0');
    // Wait for dropdown options
    await page.waitForSelector('[role="option"]');
    // Click the first student option
    await page.click('[role="option"] >> nth=0');

    // Wait for subjects to load in the table inside the dialog
    await expect(page.locator('table th:has-text("Subject")')).toBeVisible();
    
    // Fill in a mark for the first subject
    const firstMotInput = page.locator('input[placeholder="—"]').nth(0); // 0 is MOT
    await firstMotInput.fill('85');

    // Save Marks
    await page.click('button:has-text("Save Marks")');

    // Verify toast success
    await expect(page.locator('text=Marks saved successfully')).toBeVisible();

    // Verify persistence by checking if it appears in the table
    // Look for the score '85' in the main table
    await expect(page.locator('td.font-mono:has-text("85")').first()).toBeVisible();
  });
});

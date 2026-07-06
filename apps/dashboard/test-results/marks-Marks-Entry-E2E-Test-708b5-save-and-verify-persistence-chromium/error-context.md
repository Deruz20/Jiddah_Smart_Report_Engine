# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marks.spec.ts >> Marks Entry E2E Tests >> Circular Marks: load subjects, save, and verify persistence
- Location: tests\marks.spec.ts:14:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/dashboard" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - img [ref=e5]
      - generic [ref=e7]:
        - img "Jiddah Islamic School" [ref=e8]
        - heading "Jiddah Islamic Nursery & Primary School" [level=1] [ref=e9]
        - paragraph [ref=e10]: Smart Report Engine — Enterprise Academic Management Platform
        - generic [ref=e11]:
          - generic [ref=e12]:
            - paragraph [ref=e13]: 240+
            - paragraph [ref=e14]: Students
          - generic [ref=e15]:
            - paragraph [ref=e16]: "22"
            - paragraph [ref=e17]: Teachers
          - generic [ref=e18]:
            - paragraph [ref=e19]: "8"
            - paragraph [ref=e20]: Classes
        - paragraph [ref=e21]: بسم الله الرحمن الرحيم
    - generic [ref=e24]:
      - heading "Welcome Back" [level=2] [ref=e25]
      - paragraph [ref=e26]: Sign in to your account to continue
      - generic [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e29]: Email Address
          - generic [ref=e30]:
            - img [ref=e31]
            - textbox "you@jiddahschool.edu.ng" [ref=e34]: hassanhatima20@gmail.com
        - generic [ref=e35]:
          - generic [ref=e36]: Password
          - generic [ref=e37]:
            - img [ref=e38]
            - textbox "Enter your password" [ref=e41]: Jiddah
            - button [ref=e42]:
              - img [ref=e43]
        - generic [ref=e46]:
          - generic [ref=e47] [cursor=pointer]:
            - checkbox "Remember me" [ref=e48]
            - generic [ref=e49]: Remember me
          - button "Forgot password?" [ref=e50]
        - button "Sign In" [ref=e51]:
          - generic [ref=e52]: Sign In
          - img [ref=e53]
      - paragraph [ref=e55]:
        - text: No account?
        - button "Create one" [ref=e56]
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Marks Entry E2E Tests', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // 1. Log in
  6  |     await page.goto('/login');
  7  |     await page.fill('input[type="email"]', 'hassanhatima20@gmail.com');
  8  |     await page.fill('input[type="password"]', 'Jiddah');
  9  |     await page.click('button[type="submit"]');
> 10 |     await page.waitForURL('**/dashboard');
     |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  11 |     await expect(page.locator('text=Dashboard').first()).toBeVisible();
  12 |   });
  13 | 
  14 |   test('Circular Marks: load subjects, save, and verify persistence', async ({ page }) => {
  15 |     // Navigate to circular marks page
  16 |     await page.goto('/circular');
  17 |     
  18 |     // Wait for the page to load
  19 |     await expect(page.locator('text=Circular Hub')).toBeVisible();
  20 | 
  21 |     // Click Add Marks
  22 |     await page.click('button:has-text("Add Marks")');
  23 |     await expect(page.locator('text=Add Circular Marks')).toBeVisible();
  24 | 
  25 |     // Select Student
  26 |     await page.click('[data-slot="select-trigger"] >> nth=0');
  27 |     // Wait for dropdown options
  28 |     await page.waitForSelector('[role="option"]');
  29 |     // Click the first student option (or a specific one like Edrisa Atima)
  30 |     await page.click('[role="option"] >> nth=0');
  31 | 
  32 |     // Wait for subjects to load in the table inside the dialog
  33 |     // The table header "Subject", "BOT", "MOT", "EOT" should be visible
  34 |     await expect(page.locator('table th:has-text("Subject")')).toBeVisible();
  35 |     
  36 |     // Fill in a mark for the first subject
  37 |     const firstMotInput = page.locator('input[placeholder="—"]').nth(1); // 0 is BOT, 1 is MOT
  38 |     await firstMotInput.fill('75');
  39 | 
  40 |     // Save Marks
  41 |     await page.click('button:has-text("Save Marks")');
  42 | 
  43 |     // Verify toast success
  44 |     await expect(page.locator('text=Marks saved successfully')).toBeVisible();
  45 | 
  46 |     // Verify persistence by checking if it appears in the table
  47 |     // Look for the score '75' in the main table
  48 |     await expect(page.locator('td.font-mono:has-text("75")').first()).toBeVisible();
  49 |   });
  50 | 
  51 |   test('Theology Marks: load subjects, save, and verify persistence', async ({ page }) => {
  52 |     // Navigate to theology marks page
  53 |     await page.goto('/theology');
  54 |     
  55 |     // Wait for the page to load
  56 |     await expect(page.locator('text=Theology Hub')).toBeVisible();
  57 | 
  58 |     // Click Add Marks
  59 |     await page.click('button:has-text("Add Marks")');
  60 |     await expect(page.locator('text=Add Theology Marks')).toBeVisible();
  61 | 
  62 |     // Select Student
  63 |     await page.click('[data-slot="select-trigger"] >> nth=0');
  64 |     // Wait for dropdown options
  65 |     await page.waitForSelector('[role="option"]');
  66 |     // Click the first student option
  67 |     await page.click('[role="option"] >> nth=0');
  68 | 
  69 |     // Wait for subjects to load in the table inside the dialog
  70 |     await expect(page.locator('table th:has-text("Subject")')).toBeVisible();
  71 |     
  72 |     // Fill in a mark for the first subject
  73 |     const firstMotInput = page.locator('input[placeholder="—"]').nth(0); // 0 is MOT
  74 |     await firstMotInput.fill('85');
  75 | 
  76 |     // Save Marks
  77 |     await page.click('button:has-text("Save Marks")');
  78 | 
  79 |     // Verify toast success
  80 |     await expect(page.locator('text=Marks saved successfully')).toBeVisible();
  81 | 
  82 |     // Verify persistence by checking if it appears in the table
  83 |     // Look for the score '85' in the main table
  84 |     await expect(page.locator('td.font-mono:has-text("85")').first()).toBeVisible();
  85 |   });
  86 | });
  87 | 
```
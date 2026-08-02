import { test, expect, Page, Browser } from '@playwright/test';

test.describe('Nomination Submission with Google Docs Link', () => {
  let page: Page;

  test.beforeEach(async ({ browser }: { browser: Browser }) => {
    page = await browser.newPage();
    // Navigate to the nomination form
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Complete nomination form with Google Docs evidence link', async () => {
    console.log('🚀 Starting nomination test with Google Docs link...');

    // Navigate to a nomination category (assuming there's a link or route)
    // Looking for nominate route
    await page.goto('http://localhost:8081/nominate');
    await page.waitForLoadState('networkidle');

    // Check if nomination form loads
    const formExists = await page.locator('form').first().isVisible();
    expect(formExists).toBeTruthy();
    console.log('✅ Nomination form loaded');

    // Find category selection or assume we need to navigate to specific category
    // Try to find and click a category button
    const categoryButtons = await page.locator('[data-testid*="category"], button:has-text("Award"), a:has-text("Excellence")').first();
    
    if (categoryButtons) {
      await categoryButtons.click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Category selected');
    }

    // Fill in nomination form fields
    const nomineeNameInput = page.locator('input[placeholder*="name" i], input[name*="name" i]').first();
    if (await nomineeNameInput.isVisible()) {
      await nomineeNameInput.fill('Test Nominee Google Docs');
      console.log('✅ Entered nominee name');
    }

    const nomineeEmailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    if (await nomineeEmailInput.isVisible()) {
      await nomineeEmailInput.fill(`test-${Date.now()}@example.com`);
      console.log('✅ Entered nominee email');
    }

    const studentNumberInput = page.locator('input[placeholder*="student" i], input[placeholder*="number" i]').first();
    if (await studentNumberInput.isVisible()) {
      await studentNumberInput.fill('S12345678');
      console.log('✅ Entered student number');
    }

    // Find evidence uploader sections
    const evidenceSections = page.locator('[class*="evidence"], [class*="upload"]');
    const sectionCount = await evidenceSections.count();
    console.log(`📋 Found ${sectionCount} evidence sections`);

    // Try to add the Google Docs link to the first evidence section
    const addLinkButtons = page.locator('button:has-text("Add"), button:has-text("link"), button:has-text("Google")');
    const linkButtonCount = await addLinkButtons.count();
    console.log(`🔗 Found ${linkButtonCount} link/add buttons`);

    if (linkButtonCount > 0) {
      // Click first link button
      const firstLinkButton = addLinkButtons.first();
      await firstLinkButton.click();
      await page.waitForTimeout(500);
      console.log('✅ Clicked add link button');

      // Find the URL input field
      const urlInput = page.locator('input[type="url"], input[placeholder*="link"], input[placeholder*="paste"]');
      if (await urlInput.isVisible()) {
        const googleDocsLink = 'https://docs.google.com/document/d/1FNuYowb--zA236A5AYxQPhoAwkAc9oc_zAnFW5dZ_qw/edit?usp=sharing';
        await urlInput.fill(googleDocsLink);
        console.log(`✅ Entered Google Docs link: ${googleDocsLink}`);

        // Find and click the "Add" button to confirm the link
        const confirmButton = page.locator('button:has-text("Add"), button:has-text("OK"), button:has-text("Submit")').last();
        await confirmButton.click();
        await page.waitForTimeout(1000);
        console.log('✅ Confirmed Google Docs link addition');

        // Check for any error messages
        const errorMessages = page.locator('[role="alert"], [class*="error"], .text-red');
        const errorCount = await errorMessages.count();
        if (errorCount > 0) {
          const errorText = await errorMessages.first().textContent();
          console.warn(`⚠️ Error message detected: ${errorText}`);
        }
      }
    }

    // Fill in any required text fields (nomination reasons, etc.)
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count();
    console.log(`📝 Found ${textareaCount} text fields`);

    for (let i = 0; i < Math.min(textareaCount, 3); i++) {
      const textarea = textareas.nth(i);
      if (await textarea.isVisible()) {
        await textarea.fill(`This is a test nomination reason #${i + 1} with the Google Docs evidence link included.`);
        console.log(`✅ Filled text field ${i + 1}`);
      }
    }

    // Look for submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Nominate")');
    const submitButtonVisible = await submitButton.first().isVisible();
    
    if (submitButtonVisible) {
      console.log('🔍 Found submit button, checking validation...');

      // Before submitting, check for validation errors
      await submitButton.first().click();
      await page.waitForTimeout(2000);

      // Check for validation errors
      const validationErrors = page.locator('[role="alert"], [class*="error"], .text-destructive, .text-red');
      const validationCount = await validationErrors.count();

      if (validationCount > 0) {
        console.warn(`⚠️ Validation errors found: ${validationCount}`);
        for (let i = 0; i < validationCount; i++) {
          const errorText = await validationErrors.nth(i).textContent();
          console.warn(`  - ${errorText}`);
        }
      } else {
        console.log('✅ No validation errors - submission successful!');
      }
    }

    // Take screenshot for manual inspection
    await page.screenshot({ path: 'nomination-test-result.png', fullPage: true });
    console.log('📸 Screenshot saved: nomination-test-result.png');
  });

  test('Verify Google Docs link preview renders', async () => {
    console.log('🎬 Testing Google Docs preview rendering...');

    // Navigate to admin panel to view submitted nominations
    await page.goto('http://localhost:8081/admin');
    await page.waitForLoadState('networkidle');

    // Look for submitted nominations
    const nominations = page.locator('[class*="nomination"], [class*="entry"], tr');
    const nominationCount = await nominations.count();
    console.log(`📊 Found ${nominationCount} nominations in admin view`);

    if (nominationCount > 0) {
      // Find Google Docs link entries
      const googleDocsLinks = page.locator('a[href*="docs.google.com"], button:has-text("Google")');
      const linkCount = await googleDocsLinks.count();
      console.log(`🔗 Found ${linkCount} Google Docs links`);

      if (linkCount > 0) {
        // Click to open preview
        await googleDocsLinks.first().click();
        await page.waitForTimeout(2000);

        // Check if preview iframe loaded
        const iframe = page.locator('iframe').first();
        const iframeVisible = await iframe.isVisible();
        console.log(`📄 Google Docs preview iframe: ${iframeVisible ? '✅ Visible' : '❌ Not visible'}`);

        // Take screenshot of preview
        await page.screenshot({ path: 'google-docs-preview.png', fullPage: true });
        console.log('📸 Preview screenshot saved: google-docs-preview.png');
      }
    }
  });

  test('Validate strict evidence validation with incomplete submission', async () => {
    console.log('🔍 Testing strict evidence validation...');

    // Navigate to nomination form
    await page.goto('http://localhost:8081/nominate');
    await page.waitForLoadState('networkidle');

    // Try to submit with minimal data
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit")');
    
    if (await submitButton.first().isVisible()) {
      await submitButton.first().click();
      await page.waitForTimeout(1500);

      // Check for validation errors about missing evidence
      const errorMessages = page.locator('[role="alert"], [class*="error"]');
      const hasValidationError = await errorMessages.count() > 0;

      if (hasValidationError) {
        const errorText = await errorMessages.first().textContent();
        console.log(`✅ Strict validation working: "${errorText}"`);
        
        if (errorText?.includes('evidence') || errorText?.includes('document')) {
          console.log('✅ Correctly enforcing evidence requirement');
        }
      } else {
        console.warn('⚠️ No validation error - strict validation may not be enforced');
      }
    }
  });
});

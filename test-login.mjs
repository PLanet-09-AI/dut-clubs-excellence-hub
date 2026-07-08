import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://salea2026.netlify.app';
const TEST_EMAIL = 'ndumisobuthelezi028@gmail.com';
const TEST_PASSWORD = 'TempPassword@2026';

async function testLogin() {
  console.log('\n🧪 Testing Login with Playwright\n');
  console.log(`Email: ${TEST_EMAIL}`);
  console.log(`Password: ${TEST_PASSWORD}`);
  console.log(`Site: ${SITE_URL}\n`);

  const browser = await chromium.launch();
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    // Navigate to site
    console.log('📍 Navigating to login page...');
    await page.goto(SITE_URL, { waitUntil: 'networkidle' });
    console.log('✅ Page loaded\n');

    // Take initial screenshot
    await page.screenshot({ path: path.join(__dirname, '01-initial-page.png') });
    console.log('📸 Screenshot: 01-initial-page.png');

    // Find email input
    console.log('\n📧 Looking for email input...');
    const emailInput = await page.locator('input[type="email"]').or(page.locator('input[name*="email" i]')).first();
    if (!emailInput) {
      console.log('❌ Email input not found!');
      console.log('Available inputs:', await page.locator('input').count());
    } else {
      console.log('✅ Email input found');
      await emailInput.fill(TEST_EMAIL);
      console.log(`✅ Entered email: ${TEST_EMAIL}`);
    }

    // Take screenshot after email
    await page.screenshot({ path: path.join(__dirname, '02-after-email.png') });

    // Find password input
    console.log('\n🔑 Looking for password input...');
    const passwordInput = await page.locator('input[type="password"]').first();
    if (!passwordInput) {
      console.log('❌ Password input not found!');
    } else {
      console.log('✅ Password input found');
      await passwordInput.fill(TEST_PASSWORD);
      console.log(`✅ Entered password: ${TEST_PASSWORD}`);
    }

    // Take screenshot after password
    await page.screenshot({ path: path.join(__dirname, '03-after-password.png') });

    // Find and click login button
    console.log('\n🔘 Looking for login button...');
    const loginButton = await page
      .locator('button')
      .filter({ hasText: /login|sign in|submit/i })
      .first();

    if (!loginButton) {
      console.log('❌ Login button not found!');
      console.log('Available buttons:', await page.locator('button').count());
      const buttons = await page.locator('button').allTextContents();
      console.log('Button texts:', buttons);
    } else {
      console.log('✅ Login button found');
      await loginButton.click();
      console.log('✅ Clicked login button');
    }

    // Wait for navigation or success
    console.log('\n⏳ Waiting for login response...');
    await page.waitForTimeout(3000);

    // Take screenshot after login attempt
    await page.screenshot({ path: path.join(__dirname, '04-after-login.png') });

    // Check current URL
    const currentUrl = page.url();
    console.log(`\n📍 Current URL: ${currentUrl}`);

    // Check for error messages
    const errorMessages = await page.locator('[role="alert"], .error, .text-red-600, .text-error').allTextContents();
    if (errorMessages.length > 0) {
      console.log('❌ Error messages found:');
      errorMessages.forEach(msg => console.log(`   - ${msg}`));
    }

    // Check for success indicators
    if (currentUrl.includes('admin') || currentUrl.includes('dashboard') || currentUrl !== SITE_URL) {
      console.log('✅ LOGIN SUCCESSFUL!');
      console.log('✅ Redirected to:', currentUrl);

      // Take final screenshot
      await page.screenshot({ path: path.join(__dirname, '05-dashboard.png') });
      console.log('📸 Screenshot: 05-dashboard.png');
    } else if (errorMessages.length === 0 && currentUrl === SITE_URL) {
      console.log('⚠️  Still on login page - checking for loading...');
      await page.waitForTimeout(2000);
      const newUrl = page.url();
      if (newUrl !== SITE_URL) {
        console.log('✅ LOGIN SUCCESSFUL! (after wait)');
        console.log('✅ Redirected to:', newUrl);
      } else {
        console.log('❌ LOGIN FAILED - Still on login page');
      }
    }

  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Browser closed\n');
  }
}

testLogin().catch(console.error);

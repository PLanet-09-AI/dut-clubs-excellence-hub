import { chromium } from 'playwright';

async function diagnosePageLoad() {
  console.log('\n🔍 DIAGNOSING PAGE LOAD\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    console.log('📍 Navigating to nomination form...');
    await page.goto('http://localhost:8084/nominate/dean', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✅ Page loaded (DOM ready)\n');

    // Wait a bit for React to hydrate
    await page.waitForTimeout(2000);

    // Check what's on the page
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);

    // Check for main content
    const mainContent = await page.locator('main').textContent();
    if (mainContent) {
      const preview = mainContent.substring(0, 200).replace(/\n/g, ' ');
      console.log(`\n📝 Main content (first 200 chars):\n   "${preview}..."\n`);
    }

    // Check for form elements
    const inputs = await page.locator('input').all();
    const textareas = await page.locator('textarea').all();
    const buttons = await page.locator('button').all();
    const selects = await page.locator('select').all();

    console.log(`📊 Form elements found:`);
    console.log(`   Inputs: ${inputs.length}`);
    console.log(`   Textareas: ${textareas.length}`);
    console.log(`   Buttons: ${buttons.length}`);
    console.log(`   Selects: ${selects.length}`);

    // Check for labels
    const labels = await page.locator('label').all();
    console.log(`   Labels: ${labels.length}\n`);

    // List first few button texts
    if (buttons.length > 0) {
      console.log(`🔘 First 5 button texts:`);
      for (let i = 0; i < Math.min(5, buttons.length); i++) {
        const text = await buttons[i].textContent();
        console.log(`   ${i + 1}. "${text}"`);
      }
    }

    // Check if page has error messages
    const errorElements = await page.locator('[role="alert"], .error, .text-red-500, [class*="error"]').all();
    if (errorElements.length > 0) {
      console.log(`\n⚠️  Found ${errorElements.length} error element(s):`);
      for (let i = 0; i < Math.min(3, errorElements.length); i++) {
        const text = await errorElements[i].textContent();
        console.log(`   ${i + 1}. "${text.substring(0, 100)}"`);
      }
    }

    // Check for loading indicators
    const spinners = await page.locator('[class*="spinner"], [class*="loading"], .animate-spin').all();
    console.log(`\n⏳ Loading indicators: ${spinners.length}`);

    // Take screenshot
    await page.screenshot({ path: 'page-diagnostic.png' });
    console.log('\n📸 Screenshot saved: page-diagnostic.png');

    // Wait before closing
    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await browser.close();
  }
}

diagnosePageLoad().catch(console.error);

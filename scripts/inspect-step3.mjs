import { chromium } from 'playwright';

async function testStep3() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto('http://localhost:8084/nominate/dean', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Step 1
  await page.locator('input').first().fill('Test Nominee');
  await page.locator('input[type="text"]').nth(1).fill('21234567');
  await page.locator('input[type="email"]').fill('test@example.com');
  await page.locator('button:has-text("Select faculty")').click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]').first().click();
  await page.locator('button:has-text("Select year")').click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]').first().click();
  await page.locator('button:has-text("Continue")').click();
  
  await page.waitForTimeout(2000);
  console.log('✅ Step 1 completed\n');

  // Step 2
  await page.locator('input').first().fill('Test Nominator');
  await page.locator('input[type="email"]').fill('nominator@example.com');
  await page.locator('button').filter({ hasText: /Self-nomination|Select relationship/ }).first().click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]').first().click();
  await page.locator('button:has-text("Continue")').click();
  
  await page.waitForTimeout(2000);
  console.log('✅ Step 2 completed\n');

  // Now we're at Step 3
  console.log('【 STEP 3 - QUESTIONS & EVIDENCE 】\n');
  
  // Take full page screenshot
  await page.screenshot({ path: 'step3-full.png', fullPage: true });
  console.log('📸 Screenshot saved: step3-full.png\n');

  // Get page structure
  console.log('📋 Page structure:');
  console.log(`   h1: ${await page.locator('h1').textContent()}`);
  console.log(`   h2s: ${(await page.locator('h2').allTextContents()).slice(0, 3)}`);
  console.log(`   h3s: ${(await page.locator('h3').allTextContents()).slice(0, 3)}`);
  
  // Count form elements
  const textareas = await page.locator('textarea').count();
  const inputs = await page.locator('input').count();
  const buttons = await page.locator('button').count();
  
  console.log(`\n📊 Form elements:`);
  console.log(`   Textareas: ${textareas}`);
  console.log(`   Inputs: ${inputs}`);
  console.log(`   Buttons: ${buttons}`);

  // Get all button text
  const buttonTexts = await page.locator('button').allTextContents();
  console.log(`\n🔘 Buttons on page:`);
  buttonTexts.forEach((text, i) => {
    if (text.trim()) console.log(`   ${i+1}. ${text.trim()}`);
  });

  // Search for evidence-related keywords
  const pageText = await page.textContent();
  const hasEvidence = pageText.includes('evidence') || pageText.includes('upload') || pageText.includes('document');
  const hasLink = pageText.includes('link') || pageText.includes('Google');
  
  console.log(`\n🔍 Page contains:`);
  console.log(`   "evidence" keyword: ${pageText.includes('evidence')}`);
  console.log(`   "upload" keyword: ${pageText.includes('upload')}`);
  console.log(`   "document" keyword: ${pageText.includes('document')}`);
  console.log(`   "link" keyword: ${pageText.includes('link')}`);
  console.log(`   "Google" keyword: ${pageText.includes('Google')}`);

  await page.waitForTimeout(2000);
  await browser.close();
}

testStep3().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

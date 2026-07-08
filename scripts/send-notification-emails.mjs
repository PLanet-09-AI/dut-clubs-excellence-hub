#!/usr/bin/env node

/**
 * Send Custom Notification Emails
 * 
 * Sends the group and coordinator emails to notify about account setup
 * 
 * Usage:
 *   SITE_URL=https://salea2026.netlify.app node scripts/send-notification-emails.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import emailjs from '@emailjs/nodejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get site URL
let SITE_URL = process.env.SITE_URL || 'https://salea2026.netlify.app';
SITE_URL = SITE_URL.replace(/\/$/, '');

// EmailJS config
const EMAILJS_PUBLIC_KEY = process.env.VITE_EMAILJS_PUBLIC_KEY || '';
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || '';
const EMAILJS_SERVICE_ID = process.env.VITE_EMAILJS_SERVICE_ID || '';

if (!EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY || !EMAILJS_SERVICE_ID) {
  console.error('❌ Missing EmailJS configuration');
  console.error('   Set these environment variables:');
  console.error('   - VITE_EMAILJS_PUBLIC_KEY');
  console.error('   - EMAILJS_PRIVATE_KEY');
  console.error('   - VITE_EMAILJS_SERVICE_ID\n');
  process.exit(1);
}

// Initialize EmailJS
emailjs.init({
  publicKey: EMAILJS_PUBLIC_KEY,
  privateKey: EMAILJS_PRIVATE_KEY,
});

/**
 * Email 1: Coordinator Notification
 */
async function sendCoordinatorEmail() {
  const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; background: white; }
        .header { background: #1a1a1a; color: white; padding: 20px; text-align: center; }
        .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #007bff; }
        .list { margin: 10px 0; }
        .list-item { padding: 5px 0; margin-left: 20px; }
        strong { color: #1a1a1a; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>DUT Excellence Awards System</h1>
        <p>Account Setup Complete</p>
    </div>
    
    <p>Dear Kholeka,</p>
    
    <p>The DUT Excellence Awards System user account setup has been completed successfully.</p>
    
    <div class="section">
        <strong>✓ Account Creation Summary</strong>
        <div class="list">
            <div class="list-item">✓ 11 new accounts created</div>
            <div class="list-item">✓ 4 Administrator accounts</div>
            <div class="list-item">✓ 7 Judge accounts</div>
            <div class="list-item">✓ 1 pre-existing account (Keshan Govender)</div>
        </div>
    </div>
    
    <div class="section">
        <strong>Setup Status</strong>
        <p>All administrators and judges have been sent individual account activation emails with their personalized password reset links.</p>
        
        <strong>ADMINISTRATORS:</strong>
        <div class="list">
            <div class="list-item">• Ndumiso Buthelezi (ndumisobuthelezi028@gmail.com)</div>
            <div class="list-item">• Kholeka Sengiphiwe Mfeka (KholekaM@dut.ac.za)</div>
            <div class="list-item">• Mbali Nontobeko Mncube (MbaliM6@dut.ac.za)</div>
            <div class="list-item">• Nontuthuko Gwala (NontuthukoG@dut.ac.za)</div>
        </div>
        
        <strong>JUDGES:</strong>
        <div class="list">
            <div class="list-item">• Absolom Manashe (AbsolomM@dut.ac.za)</div>
            <div class="list-item">• Bongani Paul Yengwa (bonganiy@dut.ac.za)</div>
            <div class="list-item">• Masiza Ngculu (masizan@dut.ac.za)</div>
            <div class="list-item">• Phumlani Mnyango (ReginaldM1@dut.ac.za)</div>
            <div class="list-item">• Sihle Nhlanhla Mbanjwa (sihlem1@dut.ac.za)</div>
            <div class="list-item">• S'thembile Nontobeko Mjadu (SthembileM2@dut.ac.za)</div>
            <div class="list-item">• Zwakele Baldwin Ngubane (zwakelen@dut.ac.za)</div>
        </div>
    </div>
    
    <div class="section">
        <strong>What Happens Next</strong>
        <p>Each user has received a personalized email with their password reset link. They can:</p>
        <div class="list">
            <div class="list-item">1. Click their reset link (valid for 1 hour)</div>
            <div class="list-item">2. Set their initial password</div>
            <div class="list-item">3. Log in to the system at: <strong>${SITE_URL}</strong></div>
            <div class="list-item">4. Begin using their account</div>
        </div>
    </div>
    
    <div class="section">
        <strong>Important</strong>
        <p>If any user loses their link or misses the 1-hour window, they can contact you or request a new reset link through the Firebase Console.</p>
        <p>The system is now ready for the 2026 awards cycle.</p>
    </div>
    
    <p>Best regards,<br>System Administration</p>
</div>
</body>
</html>`;

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, 'template_notification_email', {
      to_email: 'KholekaM@dut.ac.za',
      to_name: 'Kholeka Sengiphiwe Mfeka',
      subject: 'DUT Excellence Awards System - Account Setup Complete',
      html_content: html,
    });
    console.log('✅ Coordinator email sent to KholekaM@dut.ac.za');
    return { email: 'KholekaM@dut.ac.za', status: 'sent' };
  } catch (error) {
    console.error('❌ Failed to send coordinator email:', error.message);
    return { email: 'KholekaM@dut.ac.za', status: 'failed', error: error.message };
  }
}

/**
 * Email 2: Administrators Group
 */
async function sendAdministratorsEmail() {
  const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; background: white; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
        .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #dc3545; }
        .list { margin: 10px 0; }
        .list-item { padding: 5px 0; margin-left: 20px; }
        strong { color: #dc3545; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>DUT Excellence Awards System</h1>
        <p>Administrator Accounts Ready</p>
    </div>
    
    <p>Dear Mbali and Nontuthuko,</p>
    
    <p>Your administrator accounts for the DUT Excellence Awards System have been created and are ready to activate.</p>
    
    <div class="section">
        <strong>What to Expect</strong>
        <p>You should have received a separate activation email at your registered address with a personalized password reset link. If you have not received it, please check your spam folder or contact Kholeka Mfeka.</p>
    </div>
    
    <div class="section">
        <strong>To Set Up Your Account</strong>
        <div class="list">
            <div class="list-item">1. Find the account activation email you received</div>
            <div class="list-item">2. Click the password reset link in that email</div>
            <div class="list-item">3. Create a strong password (min 8 characters: uppercase, lowercase, numbers, symbols)</div>
            <div class="list-item">4. Confirm your password</div>
            <div class="list-item">5. Log in with your email and new password at: <strong>${SITE_URL}</strong></div>
        </div>
    </div>
    
    <div class="section">
        <strong>Once Logged In, You Will Have Access To:</strong>
        <div class="list">
            <div class="list-item">• User management</div>
            <div class="list-item">• System settings</div>
            <div class="list-item">• Awards coordination</div>
            <div class="list-item">• Analytics and reporting</div>
        </div>
    </div>
    
    <div class="section">
        <strong>Need Help?</strong>
        <p>Contact: Kholeka Mfeka (KholekaM@dut.ac.za)</p>
    </div>
    
    <p>Best regards,<br>System Administration</p>
</div>
</body>
</html>`;

  const adminEmails = [
    { email: 'MbaliM6@dut.ac.za', name: 'Mbali Nontobeko Mncube' },
    { email: 'NontuthukoG@dut.ac.za', name: 'Nontuthuko Gwala' },
  ];

  const results = [];

  for (const admin of adminEmails) {
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, 'template_notification_email', {
        to_email: admin.email,
        to_name: admin.name,
        subject: 'DUT Excellence Awards System - Accounts Ready',
        html_content: html,
      });
      console.log(`✅ Administrator email sent to ${admin.email}`);
      results.push({ email: admin.email, status: 'sent' });
    } catch (error) {
      console.error(`❌ Failed to send email to ${admin.email}:`, error.message);
      results.push({ email: admin.email, status: 'failed' });
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Email 3: Judges Group
 */
async function sendJudgesEmail() {
  const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; background: white; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; }
        .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #28a745; }
        .list { margin: 10px 0; }
        .list-item { padding: 5px 0; margin-left: 20px; }
        strong { color: #28a745; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>DUT Excellence Awards</h1>
        <p>Judge Portal Ready</p>
    </div>
    
    <p>Dear Judges,</p>
    
    <p>Thank you for agreeing to participate in the DUT Excellence Awards judging panel. Your judge accounts have been created and are ready for activation.</p>
    
    <div class="section">
        <strong>What to Expect</strong>
        <p>You should have received a separate activation email at your registered address with a personalized password reset link. If you have not received it, please check your spam folder or contact Kholeka Mfeka immediately.</p>
    </div>
    
    <div class="section">
        <strong>To Set Up Your Account</strong>
        <div class="list">
            <div class="list-item">1. Find the account activation email you received</div>
            <div class="list-item">2. Click the password reset link in that email</div>
            <div class="list-item">3. Create a strong password (min 8 characters: uppercase, lowercase, numbers, symbols)</div>
            <div class="list-item">4. Confirm your password</div>
            <div class="list-item">5. Log in with your email and password at: <strong>${SITE_URL}</strong></div>
        </div>
    </div>
    
    <div class="section">
        <strong>Once Logged In, You Can:</strong>
        <div class="list">
            <div class="list-item">• Review submitted nominations</div>
            <div class="list-item">• Complete evaluations</div>
            <div class="list-item">• Submit your scores and recommendations</div>
            <div class="list-item">• Access judging guidelines and criteria</div>
        </div>
    </div>
    
    <div class="warning">
        <strong>Important Reminders</strong>
        <div class="list">
            <div class="list-item">• All submissions and evaluations are confidential</div>
            <div class="list-item">• Do not discuss nominations outside the judging panel</div>
            <div class="list-item">• If you have a conflict of interest, please recuse yourself</div>
            <div class="list-item">• Meet all submission deadlines</div>
        </div>
    </div>
    
    <div class="section">
        <strong>Technical Support</strong>
        <p>Contact: Kholeka Mfeka (KholekaM@dut.ac.za)</p>
    </div>
    
    <p>Thank you for your service to DUT Excellence Awards.</p>
    <p>Best regards,<br>Awards Administration</p>
</div>
</body>
</html>`;

  const judgeEmails = [
    { email: 'AbsolomM@dut.ac.za', name: 'Absolom Manashe' },
    { email: 'bonganiy@dut.ac.za', name: 'Bongani Paul Yengwa' },
    { email: 'masizan@dut.ac.za', name: 'Masiza Ngculu' },
    { email: 'ReginaldM1@dut.ac.za', name: 'Phumlani Mnyango' },
    { email: 'sihlem1@dut.ac.za', name: 'Sihle Nhlanhla Mbanjwa' },
    { email: 'SthembileM2@dut.ac.za', name: "S'thembile Nontobeko Mjadu" },
    { email: 'zwakelen@dut.ac.za', name: 'Zwakele Baldwin Ngubane' },
  ];

  const results = [];

  for (const judge of judgeEmails) {
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, 'template_notification_email', {
        to_email: judge.email,
        to_name: judge.name,
        subject: 'DUT Excellence Awards - Judge Portal Ready',
        html_content: html,
      });
      console.log(`✅ Judge email sent to ${judge.email}`);
      results.push({ email: judge.email, status: 'sent' });
    } catch (error) {
      console.error(`❌ Failed to send email to ${judge.email}:`, error.message);
      results.push({ email: judge.email, status: 'failed' });
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Email 4: Keshan (Pre-existing)
 */
async function sendKeshanEmail() {
  const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 700px; margin: 0 auto; padding: 20px; background: white; }
        .header { background: #17a2b8; color: white; padding: 20px; text-align: center; }
        .section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #17a2b8; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>DUT Excellence Awards System</h1>
        <p>Account Access</p>
    </div>
    
    <p>Dear Keshan,</p>
    
    <p>Your account for the DUT Excellence Awards System already exists in the system and is ready for use.</p>
    
    <div class="section">
        <strong>Logging In</strong>
        <p>Use your DUT email credentials at: <strong>${SITE_URL}</strong></p>
    </div>
    
    <div class="section">
        <strong>Password Reset</strong>
        <p>If you need to reset your password, please contact:</p>
        <p><strong>Kholeka Mfeka</strong><br>Email: KholekaM@dut.ac.za</p>
    </div>
    
    <p>You are ready to begin using the system immediately.</p>
    <p>Best regards,<br>System Administration</p>
</div>
</body>
</html>`;

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, 'template_notification_email', {
      to_email: 'KeshanG@dut.ac.za',
      to_name: 'Keshan Govender',
      subject: 'DUT Excellence Awards System - Account Access',
      html_content: html,
    });
    console.log('✅ Pre-existing account email sent to KeshanG@dut.ac.za');
    return { email: 'KeshanG@dut.ac.za', status: 'sent' };
  } catch (error) {
    console.error('❌ Failed to send Keshan email:', error.message);
    return { email: 'KeshanG@dut.ac.za', status: 'failed' };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n📧 Sending Notification Emails\n');
  console.log(`🌐 Site URL: ${SITE_URL}\n`);

  const allResults = [];

  // Send coordinator email
  console.log('📤 Sending coordinator email...');
  const coordResult = await sendCoordinatorEmail();
  allResults.push(coordResult);

  // Send admin emails
  console.log('\n📤 Sending administrator emails...');
  const adminResults = await sendAdministratorsEmail();
  allResults.push(...adminResults);

  // Send judge emails
  console.log('\n📤 Sending judge emails...');
  const judgeResults = await sendJudgesEmail();
  allResults.push(...judgeResults);

  // Send Keshan email
  console.log('\n📤 Sending pre-existing account email...');
  const keshanResult = await sendKeshanEmail();
  allResults.push(keshanResult);

  // Summary
  const sent = allResults.filter(r => r.status === 'sent').length;
  const failed = allResults.filter(r => r.status === 'failed').length;

  console.log(`\n✅ Completed!\n`);
  console.log(`📊 Summary:`);
  console.log(`   ✅ Sent: ${sent}`);
  console.log(`   ❌ Failed: ${failed}\n`);

  // Save log
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const logPath = path.join(__dirname, `notification-email-log-${timestamp}.json`);
  fs.writeFileSync(
    logPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        siteUrl: SITE_URL,
        emailsSent: allResults,
      },
      null,
      2
    )
  );

  console.log(`📄 Log saved: ${logPath}\n`);

  process.exit(sent > 0 && failed === 0 ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

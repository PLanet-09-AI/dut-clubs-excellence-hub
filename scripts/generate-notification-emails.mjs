#!/usr/bin/env node

/**
 * Generate Notification Emails as HTML Files
 * 
 * Creates standalone HTML email files that can be:
 * - Sent manually via email client
 * - Opened and copied/pasted into email templates
 * - Printed or forwarded
 * 
 * Usage:
 *   node scripts/generate-notification-emails.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://salea2026.netlify.app';

const emails = [
  {
    name: 'Email 1 - Coordinator',
    recipients: ['KholekaM@dut.ac.za'],
    subject: 'DUT Excellence Awards System - Account Setup Complete',
    html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 700px; margin: 0 auto; background: white; }
        .header { background: #1a1a1a; color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0 0 5px 0; font-size: 28px; }
        .header p { margin: 5px 0; opacity: 0.9; }
        .content { padding: 30px 20px; }
        .section { margin: 20px 0; padding: 20px; background: #f9f9f9; border-left: 4px solid #007bff; border-radius: 3px; }
        .section h2 { margin: 0 0 10px 0; color: #1a1a1a; font-size: 16px; }
        .list { margin: 10px 0; padding-left: 20px; }
        .list-item { margin: 5px 0; }
        strong { color: #1a1a1a; }
        .footer { padding: 20px; text-align: center; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>DUT Excellence Awards System</h1>
        <p>Account Setup Complete</p>
    </div>
    
    <div class="content">
        <p>Dear Kholeka,</p>
        
        <p>The DUT Excellence Awards System user account setup has been completed successfully.</p>
        
        <div class="section">
            <h2>✓ Account Creation Summary</h2>
            <div class="list">
                <div class="list-item">✓ 11 new accounts created</div>
                <div class="list-item">✓ 4 Administrator accounts</div>
                <div class="list-item">✓ 7 Judge accounts</div>
                <div class="list-item">✓ 1 pre-existing account (Keshan Govender)</div>
            </div>
        </div>
        
        <div class="section">
            <h2>Setup Status</h2>
            <p>All administrators and judges have been sent individual account activation emails with their personalized password reset links.</p>
            
            <strong>ADMINISTRATORS:</strong>
            <div class="list">
                <div class="list-item">• Ndumiso Buthelezi (ndumisobuthelezi028@gmail.com)</div>
                <div class="list-item">• Mbali Nontobeko Mncube (MbaliM6@dut.ac.za)</div>
                <div class="list-item">• Nontuthuko Gwala (NontuthukoG@dut.ac.za)</div>
            </div>
            
            <strong style="margin-top: 10px; display: block;">JUDGES:</strong>
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
            <h2>What Happens Next</h2>
            <p>Each user has received a personalized email with their password reset link. They can:</p>
            <div class="list">
                <div class="list-item">1. Click their reset link (valid for 1 hour)</div>
                <div class="list-item">2. Set their initial password</div>
                <div class="list-item">3. Log in to the system at: <strong>${SITE_URL}</strong></div>
                <div class="list-item">4. Begin using their account</div>
            </div>
        </div>
        
        <div class="section">
            <h2>Important</h2>
            <p>If any user loses their link or misses the 1-hour window, they can contact you or request a new reset link through the Firebase Console.</p>
            <p>The system is now ready for the 2026 awards cycle.</p>
        </div>
        
        <p>Best regards,<br><strong>System Administration</strong></p>
    </div>
    
    <div class="footer">
        <p>DUT Excellence Awards System © 2026</p>
    </div>
</div>
</body>
</html>`
  },
  {
    name: 'Email 2 - Administrators',
    recipients: ['MbaliM6@dut.ac.za', 'NontuthukoG@dut.ac.za'],
    subject: 'DUT Excellence Awards System - Accounts Ready',
    html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 700px; margin: 0 auto; background: white; }
        .header { background: #dc3545; color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0 0 5px 0; font-size: 28px; }
        .header p { margin: 5px 0; opacity: 0.9; }
        .content { padding: 30px 20px; }
        .section { margin: 20px 0; padding: 20px; background: #f9f9f9; border-left: 4px solid #dc3545; border-radius: 3px; }
        .section h2 { margin: 0 0 10px 0; color: #dc3545; font-size: 16px; }
        .list { margin: 10px 0; padding-left: 20px; }
        .list-item { margin: 5px 0; }
        strong { color: #dc3545; }
        .footer { padding: 20px; text-align: center; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>DUT Excellence Awards System</h1>
        <p>Administrator Accounts Ready</p>
    </div>
    
    <div class="content">
        <p>Dear Mbali and Nontuthuko,</p>
        
        <p>Your administrator accounts for the DUT Excellence Awards System have been created and are ready to activate.</p>
        
        <div class="section">
            <h2>What to Expect</h2>
            <p>You should have received a separate activation email at your registered address with a personalized password reset link. If you have not received it, please check your spam folder or contact Kholeka Mfeka.</p>
        </div>
        
        <div class="section">
            <h2>To Set Up Your Account</h2>
            <div class="list">
                <div class="list-item">1. Find the account activation email you received</div>
                <div class="list-item">2. Click the password reset link in that email</div>
                <div class="list-item">3. Create a strong password (min 8 characters: uppercase, lowercase, numbers, symbols)</div>
                <div class="list-item">4. Confirm your password</div>
                <div class="list-item">5. Log in with your email and new password at: <strong>${SITE_URL}</strong></div>
            </div>
        </div>
        
        <div class="section">
            <h2>Once Logged In, You Will Have Access To:</h2>
            <div class="list">
                <div class="list-item">• User management</div>
                <div class="list-item">• System settings</div>
                <div class="list-item">• Awards coordination</div>
                <div class="list-item">• Analytics and reporting</div>
            </div>
        </div>
        
        <div class="section">
            <h2>Need Help?</h2>
            <p>Contact: <strong>Kholeka Mfeka</strong> (KholekaM@dut.ac.za)</p>
        </div>
        
        <p>Best regards,<br><strong>System Administration</strong></p>
    </div>
    
    <div class="footer">
        <p>DUT Excellence Awards System © 2026</p>
    </div>
</div>
</body>
</html>`
  },
  {
    name: 'Email 3 - Judges',
    recipients: ['AbsolomM@dut.ac.za', 'bonganiy@dut.ac.za', 'masizan@dut.ac.za', 'ReginaldM1@dut.ac.za', 'sihlem1@dut.ac.za', 'SthembileM2@dut.ac.za', 'zwakelen@dut.ac.za'],
    subject: 'DUT Excellence Awards - Judge Portal Ready',
    html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 700px; margin: 0 auto; background: white; }
        .header { background: #28a745; color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0 0 5px 0; font-size: 28px; }
        .header p { margin: 5px 0; opacity: 0.9; }
        .content { padding: 30px 20px; }
        .section { margin: 20px 0; padding: 20px; background: #f9f9f9; border-left: 4px solid #28a745; border-radius: 3px; }
        .section h2 { margin: 0 0 10px 0; color: #28a745; font-size: 16px; }
        .list { margin: 10px 0; padding-left: 20px; }
        .list-item { margin: 5px 0; }
        strong { color: #28a745; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 3px; margin: 20px 0; }
        .warning strong { color: #856404; }
        .footer { padding: 20px; text-align: center; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>DUT Excellence Awards</h1>
        <p>Judge Portal Ready</p>
    </div>
    
    <div class="content">
        <p>Dear Judges,</p>
        
        <p>Thank you for agreeing to participate in the DUT Excellence Awards judging panel. Your judge accounts have been created and are ready for activation.</p>
        
        <div class="section">
            <h2>What to Expect</h2>
            <p>You should have received a separate activation email at your registered address with a personalized password reset link. If you have not received it, please check your spam folder or contact Kholeka Mfeka immediately.</p>
        </div>
        
        <div class="section">
            <h2>To Set Up Your Account</h2>
            <div class="list">
                <div class="list-item">1. Find the account activation email you received</div>
                <div class="list-item">2. Click the password reset link in that email</div>
                <div class="list-item">3. Create a strong password (min 8 characters: uppercase, lowercase, numbers, symbols)</div>
                <div class="list-item">4. Confirm your password</div>
                <div class="list-item">5. Log in with your email and password at: <strong>${SITE_URL}</strong></div>
            </div>
        </div>
        
        <div class="section">
            <h2>Once Logged In, You Can:</h2>
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
            <h2>Technical Support</h2>
            <p>Contact: <strong>Kholeka Mfeka</strong> (KholekaM@dut.ac.za)</p>
        </div>
        
        <p>Thank you for your service to DUT Excellence Awards.</p>
        <p>Best regards,<br><strong>Awards Administration</strong></p>
    </div>
    
    <div class="footer">
        <p>DUT Excellence Awards System © 2026</p>
    </div>
</div>
</body>
</html>`
  },
  {
    name: 'Email 4 - Keshan (Pre-existing)',
    recipients: ['KeshanG@dut.ac.za'],
    subject: 'DUT Excellence Awards System - Account Access',
    html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 700px; margin: 0 auto; background: white; }
        .header { background: #17a2b8; color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0 0 5px 0; font-size: 28px; }
        .header p { margin: 5px 0; opacity: 0.9; }
        .content { padding: 30px 20px; }
        .section { margin: 20px 0; padding: 20px; background: #f9f9f9; border-left: 4px solid #17a2b8; border-radius: 3px; }
        .section h2 { margin: 0 0 10px 0; color: #17a2b8; font-size: 16px; }
        strong { color: #17a2b8; }
        .footer { padding: 20px; text-align: center; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>DUT Excellence Awards System</h1>
        <p>Account Access</p>
    </div>
    
    <div class="content">
        <p>Dear Keshan,</p>
        
        <p>Your account for the DUT Excellence Awards System already exists in the system and is ready for use.</p>
        
        <div class="section">
            <h2>Logging In</h2>
            <p>Use your DUT email credentials at: <strong>${SITE_URL}</strong></p>
        </div>
        
        <div class="section">
            <h2>Password Reset</h2>
            <p>If you need to reset your password, please contact:</p>
            <p><strong>Kholeka Mfeka</strong><br>Email: KholekaM@dut.ac.za</p>
        </div>
        
        <p>You are ready to begin using the system immediately.</p>
        <p>Best regards,<br><strong>System Administration</strong></p>
    </div>
    
    <div class="footer">
        <p>DUT Excellence Awards System © 2026</p>
    </div>
</div>
</body>
</html>`
  }
];

// Generate HTML files
console.log('\n📄 Generating Notification Email HTML Files\n');

for (const email of emails) {
  const filename = email.name.replace(/ /g, '-').toLowerCase() + '.html';
  const filepath = path.join(__dirname, filename);
  
  fs.writeFileSync(filepath, email.html);
  console.log(`✅ ${email.name}`);
  console.log(`   To: ${email.recipients.join(', ')}`);
  console.log(`   Subject: ${email.subject}`);
  console.log(`   File: ${filepath}\n`);
}

console.log('📧 Email files generated successfully!\n');
console.log('Next steps:');
console.log('1. Open each HTML file in your browser');
console.log('2. Copy the content or print as PDF');
console.log('3. Send to recipients using your email client\n');

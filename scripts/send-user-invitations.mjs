#!/usr/bin/env node

/**
 * Send Invitation Emails to All Users
 *
 * Sends personalized emails to each user with:
 * - Their password reset link
 * - The login URL
 * - Clear instructions
 *
 * Usage:
 *   SITE_URL=https://your-site.netlify.app node scripts/send-user-invitations.mjs
 *   # or
 *   npm run send:invitations -- https://your-site.netlify.app
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import emailjs from '@emailjs/nodejs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get site URL from environment or command line
let SITE_URL = process.env.SITE_URL || process.argv[2];

if (!SITE_URL) {
  console.error('❌ Missing SITE_URL');
  console.error('\nUsage:');
  console.error('  SITE_URL=https://your-site.netlify.app node scripts/send-user-invitations.mjs');
  console.error('  npm run send:invitations -- https://your-site.netlify.app\n');
  process.exit(1);
}

// Ensure URL doesn't have trailing slash
SITE_URL = SITE_URL.replace(/\/$/, '');

// EmailJS config
const EMAILJS_PUBLIC_KEY = process.env.VITE_EMAILJS_PUBLIC_KEY || '';
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY || '';
const EMAILJS_SERVICE_ID = process.env.VITE_EMAILJS_SERVICE_ID || '';

// Validate EmailJS config
if (!EMAILJS_PUBLIC_KEY || !EMAILJS_PRIVATE_KEY || !EMAILJS_SERVICE_ID) {
  console.error('❌ Missing EmailJS configuration');
  console.error('   Set these environment variables:');
  console.error('   - VITE_EMAILJS_PUBLIC_KEY');
  console.error('   - EMAILJS_PRIVATE_KEY');
  console.error('   - VITE_EMAILJS_SERVICE_ID\n');
  process.exit(1);
}

// Load results file
const resultsPath = path.join(__dirname, 'bulk-create-results-2026-07-07T17-55-30.json');

if (!fs.existsSync(resultsPath)) {
  console.error('❌ Results file not found!');
  console.error(`   Expected: ${resultsPath}`);
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
const successfulUsers = results.filter(r => r.status === 'CREATED');

/**
 * Generate HTML email body
 */
function generateEmailHtml(user, siteUrl, resetLink) {
  const roleDisplay = user.role === 'admin' ? 'Administrator' : 'Judge';

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
            color: white;
            padding: 20px;
            border-radius: 5px 5px 0 0;
            text-align: center;
            margin: -30px -30px 20px -30px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .header p {
            margin: 5px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
        }
        .greeting {
            margin: 20px 0;
            font-size: 16px;
        }
        .role-badge {
            display: inline-block;
            background-color: ${user.role === 'admin' ? '#dc3545' : '#28a745'};
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 12px;
        }
        .section {
            margin: 20px 0;
            padding: 15px;
            background-color: #f9f9f9;
            border-left: 4px solid #007bff;
            border-radius: 3px;
        }
        .section-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: #1a1a1a;
        }
        .button {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 15px 0;
            font-weight: bold;
        }
        .button:hover {
            background-color: #0056b3;
        }
        .link-box {
            background-color: #f0f0f0;
            padding: 12px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            margin: 10px 0;
            border: 1px solid #ddd;
        }
        .steps {
            list-style: none;
            padding: 0;
            margin: 10px 0;
        }
        .steps li {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .steps li:last-child {
            border-bottom: none;
        }
        .steps li strong {
            color: #007bff;
        }
        .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 12px;
            border-radius: 3px;
            margin: 15px 0;
            color: #856404;
        }
        .warning strong {
            color: #d39e00;
        }
        .footer {
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
        .footer p {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>DUT Excellence Awards System</h1>
            <p>Account Setup & Access Instructions</p>
        </div>

        <div class="greeting">
            Hi <strong>${user.displayName}</strong>,
            <br><br>
            Welcome! You have been added as a <span class="role-badge">${roleDisplay}</span> to the <strong>DUT Excellence Awards System</strong>.
        </div>

        <div class="section">
            <div class="section-title">🔑 Step 1: Set Your Password</div>
            <p>Click the button below to create your own password:</p>
            <center>
                <a href="${resetLink}" class="button">Set My Password</a>
            </center>
            <p><strong>Or copy this link:</strong></p>
            <div class="link-box">${resetLink}</div>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
                <strong>⏰ Note:</strong> This link expires in <strong>1 hour</strong>. Use it immediately!
            </p>
        </div>

        <div class="section">
            <div class="section-title">📱 Step 2: Log Into the System</div>
            <p>Once you've set your password, visit the login page:</p>
            <center>
                <div class="link-box" style="display: inline-block; margin: 10px 0;">
                    <a href="${siteUrl}" style="color: #007bff; text-decoration: none; font-weight: bold;">
                        ${siteUrl}
                    </a>
                </div>
            </center>
            <p><strong>Log in with:</strong></p>
            <ul class="steps">
                <li><strong>Email:</strong> ${user.email}</li>
                <li><strong>Password:</strong> The one you just created</li>
            </ul>
        </div>

        <div class="section">
            <div class="section-title">✅ What You Can Do</div>
            <p>As a <strong>${roleDisplay}</strong>, you can:</p>
            <ul class="steps">
                ${user.role === 'admin' ? `
                <li>✓ Manage award categories</li>
                <li>✓ Manage past winners</li>
                <li>✓ View and manage nominations</li>
                <li>✓ View judge activity and scoring</li>
                <li>✓ Export results</li>
                <li>✓ Reset all votes (if needed)</li>
                ` : `
                <li>✓ View all nominations</li>
                <li>✓ Score and rate nominations</li>
                <li>✓ View the public leaderboard</li>
                <li>✓ Access your judge dashboard</li>
                `}
            </ul>
        </div>

        <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul class="steps">
                <li>✓ Password reset link expires in <strong>1 hour</strong></li>
                <li>✓ Use the link immediately to set your password</li>
                <li>✓ Never share your password with anyone</li>
                <li>✓ If the link expires, request a new one from support</li>
            </ul>
        </div>

        <div class="section">
            <div class="section-title">❓ Need Help?</div>
            <p>If you encounter any issues:</p>
            <ul class="steps">
                <li><strong>Link expired:</strong> Request a new password reset email from support</li>
                <li><strong>Can't log in:</strong> Check your email and password are correct</li>
                <li><strong>Other issues:</strong> Contact awards@dut.ac.za</li>
            </ul>
        </div>

        <div class="footer">
            <p>© 2026 DUT Excellence Awards System</p>
            <p>This is an automated email. Do not reply to this message.</p>
            <p>Contact: awards@dut.ac.za</p>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Send email to a user
 */
async function sendInvitationEmail(user, siteUrl, resetLink) {
  try {
    const html = generateEmailHtml(user, siteUrl, resetLink);

    await emailjs.send(EMAILJS_SERVICE_ID, 'template_bulk_invite_html', {
      to_email: user.email,
      to_name: user.displayName,
      user_role: user.role === 'admin' ? 'Administrator' : 'Judge',
      reset_link: resetLink,
      site_url: siteUrl,
      support_email: 'awards@dut.ac.za',
      html_content: html,
    });

    console.log(`✅ Email sent to ${user.email}`);
    return { email: user.email, status: 'sent' };
  } catch (error) {
    console.error(`❌ Failed to send email to ${user.email}:`, error.message);
    return { email: user.email, status: 'failed', error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n📧 DUT Excellence Awards System - User Invitations\n');
  console.log(`🌐 Site URL: ${SITE_URL}`);
  console.log(`📨 Users to email: ${successfulUsers.length}\n`);

  // Initialize EmailJS
  emailjs.init({
    publicKey: EMAILJS_PUBLIC_KEY,
    privateKey: EMAILJS_PRIVATE_KEY,
  });

  console.log('📤 Sending invitation emails...\n');

  const emailResults = [];

  for (const user of successfulUsers) {
    if (!user.resetLink) {
      console.log(`⚠️  Skipping ${user.email} (no reset link)`);
      continue;
    }

    const result = await sendInvitationEmail(user, SITE_URL, user.resetLink);
    emailResults.push(result);

    // Small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  const sent = emailResults.filter(r => r.status === 'sent').length;
  const failed = emailResults.filter(r => r.status === 'failed').length;

  console.log(`\n✅ Completed!\n`);
  console.log(`📊 Summary:`);
  console.log(`   ✅ Sent: ${sent}`);
  console.log(`   ❌ Failed: ${failed}`);

  // Save email log
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const logPath = path.join(__dirname, `email-log-${timestamp}.json`);
  fs.writeFileSync(
    logPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        siteUrl: SITE_URL,
        totalUsers: successfulUsers.length,
        results: emailResults,
      },
      null,
      2
    )
  );

  console.log(`\n📄 Email log saved: ${logPath}\n`);

  if (failed === 0) {
    console.log('🎉 All emails sent successfully!\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${failed} email(s) failed to send. Check the log above.\n`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

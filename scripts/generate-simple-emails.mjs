#!/usr/bin/env node

/**
 * Generate Simple Credential Emails
 * One email template that can be customized for each user
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://salea2026.netlify.app';
const TEMP_PASSWORD = 'TempPassword@2026';

// Read credentials file
const credentialsPath = path.join(__dirname, 'create-users-simple-2026-07-07T18-22-53.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

function generateEmailHTML(user) {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0 0 5px 0; font-size: 26px; }
        .header p { margin: 5px 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 40px 20px; }
        .greeting { font-size: 18px; margin-bottom: 20px; }
        .credentials { background: #f9f9f9; padding: 20px; border-radius: 6px; border-left: 4px solid #667eea; margin: 20px 0; }
        .credentials-row { margin: 15px 0; }
        .credentials-label { font-size: 12px; color: #999; text-transform: uppercase; font-weight: 600; }
        .credentials-value { font-size: 16px; font-family: 'Courier New', monospace; background: white; padding: 10px 12px; border-radius: 4px; word-break: break-all; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .button:hover { background: #764ba2; }
        .steps { background: #e7f3ff; border-left: 4px solid #667eea; padding: 20px; border-radius: 6px; margin: 20px 0; }
        .steps h3 { margin-top: 0; color: #004085; }
        .steps ol { margin: 10px 0; padding-left: 20px; }
        .steps li { margin: 8px 0; color: #004085; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .warning strong { color: #856404; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
        a { color: #667eea; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>🎓 DUT Excellence Awards System</h1>
        <p>Your Account Access Credentials</p>
    </div>
    
    <div class="content">
        <div class="greeting">
            <p>Hello ${user.displayName},</p>
            <p>Your account for the DUT Excellence Awards System has been created and is ready to use. Here are your login credentials:</p>
        </div>
        
        <div class="credentials">
            <div class="credentials-row">
                <div class="credentials-label">📧 Email</div>
                <div class="credentials-value">${user.email}</div>
            </div>
            <div class="credentials-row">
                <div class="credentials-label">🔑 Temporary Password</div>
                <div class="credentials-value">${TEMP_PASSWORD}</div>
            </div>
        </div>
        
        <a href="${SITE_URL}" class="button">Go to Login Page</a>
        
        <div class="steps">
            <h3>📋 How to Get Started</h3>
            <ol>
                <li>Visit <strong>${SITE_URL}</strong></li>
                <li>Click <strong>"Login"</strong></li>
                <li>Enter your email and the temporary password above</li>
                <li>You'll be logged into your account</li>
                <li>Look for <strong>"Change Password"</strong> in the menu or settings</li>
                <li>Create your own secure password</li>
                <li>You're all set to use the system!</li>
            </ol>
        </div>
        
        <div class="warning">
            <strong>⚠️ Important:</strong> Please change your password immediately after your first login. The temporary password should only be used for this initial login.
        </div>
        
        <p>If you have any questions or need assistance, please contact <strong>Kholeka Mfeka</strong> at <strong>KholekaM@dut.ac.za</strong></p>
    </div>
    
    <div class="footer">
        <p>DUT Excellence Awards System © 2026</p>
        <p>This email contains sensitive information. Please keep it secure.</p>
    </div>
</div>
</body>
</html>`;
}

console.log('\n📧 Generating Simple Credential Emails\n');

// Generate individual emails
credentials.forEach(user => {
  const filename = `login-credentials-${user.email.replace(/@.*/, '').replace(/\./g, '-')}.html`;
  const filepath = path.join(__dirname, filename);
  const html = generateEmailHTML(user);
  fs.writeFileSync(filepath, html);
  console.log(`✅ ${user.displayName}`);
  console.log(`   File: ${filename}`);
  console.log(`   Email: ${user.email}`);
  console.log();
});

// Generate master email for distribution
const masterHTML = `<!DOCTYPE html>>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #667eea; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #ddd; font-family: 'Courier New', monospace; font-size: 13px; }
        tr:hover { background: #f9f9f9; }
        .email { background: #f5f5f5; }
        .password { background: #ffffcc; font-weight: bold; }
    </style>
</head>
<body>
<div class="container">
    <h1>📊 User Credentials - For Distribution</h1>
    <p>Use the individual emails generated for each user. Copy-paste the credentials from the table below if needed.</p>
    
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Temporary Password</th>
                <th>Role</th>
            </tr>
        </thead>
        <tbody>
            ${credentials.map(u => `
            <tr>
                <td>${u.displayName}</td>
                <td class="email">${u.email}</td>
                <td class="password">${TEMP_PASSWORD}</td>
                <td>${u.role}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
</div>
</body>
</html>\`;

const masterPath = path.join(__dirname, 'login-credentials-master.html');
fs.writeFileSync(masterPath, masterHTML);

console.log('✅ Master credentials file generated');
console.log(\`   File: login-credentials-master.html\n\`);
console.log('All emails ready to send! 🎉\n');

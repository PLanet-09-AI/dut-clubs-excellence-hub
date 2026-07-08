#!/usr/bin/env node

/**
 * Create Users with Simple Temporary Passwords
 * 
 * This script:
 * 1. Creates all 11 Firebase accounts
 * 2. Generates simple temporary passwords
 * 3. Outputs credentials for distribution
 * 
 * Usage:
 *   node scripts/create-users-simple.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase config
const firebaseKeyPath = path.join(__dirname, '..', 'student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json');
const serviceAccountKey = JSON.parse(fs.readFileSync(firebaseKeyPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccountKey),
  projectId: serviceAccountKey.project_id
});

const auth = getAuth();

// User data from bulk-users-data.json
const usersDataPath = path.join(__dirname, 'bulk-users-data.json');
const usersDataRaw = JSON.parse(fs.readFileSync(usersDataPath, 'utf8'));
const usersData = [...(usersDataRaw.admins || []), ...(usersDataRaw.judges || [])];

const SITE_URL = 'https://salea2026.netlify.app';
const TEMP_PASSWORD = 'TempPassword@2026';

async function createUsersSimple() {
  console.log('\n🔐 Creating Users with Temporary Passwords\n');
  console.log(`⏱️  Timestamp: ${new Date().toISOString()}\n`);
  
  const results = [];
  const errors = [];
  let successCount = 0;
  let alreadyExists = 0;

  for (const user of usersData) {
    try {
      console.log(`Processing: ${user.displayName} (${user.email})...`);
      
      let createdUser = null;
      let isNew = false;

      try {
        // Try to get existing user
        const existingUser = await auth.getUserByEmail(user.email);
        console.log(`  ℹ️  Account already exists (UID: ${existingUser.uid})`);
        createdUser = existingUser;
        alreadyExists++;
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          // Create new user
          createdUser = await auth.createUser({
            email: user.email,
            password: TEMP_PASSWORD,
            displayName: user.displayName,
            emailVerified: false
          });
          console.log(`  ✅ Account created (UID: ${createdUser.uid})`);
          isNew = true;
          successCount++;
        } else {
          throw err;
        }
      }

      // Set custom claims (role)
      await auth.setCustomUserClaims(createdUser.uid, {
        role: user.role
      });

      results.push({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        uid: createdUser.uid,
        tempPassword: TEMP_PASSWORD,
        isNew: isNew,
        status: 'success'
      });

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      errors.push({
        email: user.email,
        displayName: user.displayName,
        error: error.message
      });
    }
  }

  // Generate output files
  const timestamp = new Date().toISOString().split('T')[0] + 'T' + new Date().toISOString().split('T')[1].replace(/:/g, '-').slice(0, 8);
  
  // JSON output
  const jsonPath = path.join(__dirname, `create-users-simple-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  // HTML output - Credentials sheet (password visible for distribution)
  const htmlPath = path.join(__dirname, `create-users-simple-${timestamp}.html`);
  const htmlContent = generateCredentialsHTML(results, errors);
  fs.writeFileSync(htmlPath, htmlContent);

  // Plain text output for email
  const txtPath = path.join(__dirname, `create-users-simple-${timestamp}.txt`);
  const txtContent = generateCredentialsText(results, errors);
  fs.writeFileSync(txtPath, txtContent);

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ USER CREATION COMPLETE\n');
  console.log(`📊 Statistics:`);
  console.log(`   New accounts created: ${successCount}`);
  console.log(`   Already existed: ${alreadyExists}`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Total processed: ${results.length + errors.length}\n`);

  console.log(`📁 Output Files:`);
  console.log(`   JSON: ${jsonPath}`);
  console.log(`   HTML: ${htmlPath}`);
  console.log(`   Text: ${txtPath}\n`);

  console.log(`🔑 Temporary Password: ${TEMP_PASSWORD}`);
  console.log(`🌐 Site URL: ${SITE_URL}\n`);

  if (errors.length > 0) {
    console.log(`⚠️  Errors encountered:`);
    errors.forEach(err => {
      console.log(`   - ${err.email}: ${err.error}`);
    });
  }

  console.log(`\n📧 Next step: Send credentials to users\n`);

  process.exit(0);
}

function generateCredentialsHTML(results, errors) {
  const adminUsers = results.filter(u => u.role === 'admin');
  const judgeUsers = results.filter(u => u.role === 'judge');

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { color: #1a1a1a; margin-bottom: 10px; }
        .subtitle { color: #666; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat-box { background: #f9f9f9; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; }
        .stat-number { font-size: 32px; font-weight: bold; color: #007bff; }
        .stat-label { color: #666; font-size: 14px; margin-top: 5px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin-bottom: 30px; }
        .warning strong { color: #856404; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #1a1a1a; font-size: 20px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e0e0e0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f9f9f9; padding: 12px; text-align: left; font-weight: 600; color: #333; border-bottom: 2px solid #ddd; }
        td { padding: 12px; border-bottom: 1px solid #eee; }
        tr:hover { background: #f9f9f9; }
        .email { font-family: monospace; background: #f5f5f5; padding: 4px 8px; border-radius: 3px; }
        .password { font-family: monospace; background: #ffffcc; padding: 4px 8px; border-radius: 3px; font-weight: bold; }
        .role-admin { color: #dc3545; font-weight: 600; }
        .role-judge { color: #28a745; font-weight: 600; }
        .instructions { background: #e7f3ff; border-left: 4px solid #007bff; padding: 20px; border-radius: 6px; margin-bottom: 30px; }
        .instructions h3 { color: #004085; margin-bottom: 10px; }
        .instructions ol { margin-left: 20px; }
        .instructions li { margin: 8px 0; color: #004085; }
        .footer { text-align: center; border-top: 1px solid #ddd; padding-top: 20px; color: #999; font-size: 12px; margin-top: 40px; }
        @media print { body { background: white; } .container { box-shadow: none; } }
    </style>
</head>
<body>
<div class="container">
    <h1>🔑 DUT Excellence Awards - User Credentials</h1>
    <p class="subtitle">Generated: ${new Date().toLocaleString()}</p>

    <div class="stats">
        <div class="stat-box">
            <div class="stat-number">${results.length}</div>
            <div class="stat-label">Total Users</div>
        </div>
        <div class="stat-box">
            <div class="stat-number">${adminUsers.length}</div>
            <div class="stat-label">Administrators</div>
        </div>
        <div class="stat-box">
            <div class="stat-number">${judgeUsers.length}</div>
            <div class="stat-label">Judges</div>
        </div>
    </div>

    <div class="warning">
        <strong>⚠️ Important:</strong> This document contains temporary credentials. Handle securely. 
        Users will change their passwords immediately after first login.
    </div>

    <div class="instructions">
        <h3>📋 How to Use These Credentials</h3>
        <ol>
            <li>Send each user their email and temporary password (from table below)</li>
            <li>User visits: <strong>https://salea2026.netlify.app</strong></li>
            <li>User logs in with their email and temporary password</li>
            <li>Inside the app, user clicks "Change Password"</li>
            <li>User sets their own secure password</li>
            <li>User is back in the app with their new password</li>
        </ol>
    </div>

    <div class="section">
        <h2>👥 Administrators (${adminUsers.length})</h2>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Temporary Password</th>
                </tr>
            </thead>
            <tbody>
                ${adminUsers.map(user => `
                <tr>
                    <td>${user.displayName}</td>
                    <td><span class="email">${user.email}</span></td>
                    <td><span class="password">${user.tempPassword}</span></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>⚖️ Judges (${judgeUsers.length})</h2>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Temporary Password</th>
                </tr>
            </thead>
            <tbody>
                ${judgeUsers.map(user => `
                <tr>
                    <td>${user.displayName}</td>
                    <td><span class="email">${user.email}</span></td>
                    <td><span class="password">${user.tempPassword}</span></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>🔐 Account Access Instructions</h2>
        <div class="instructions">
            <h3>For Users:</h3>
            <ol>
                <li>Go to: <strong>https://salea2026.netlify.app</strong></li>
                <li>Click "Login"</li>
                <li>Enter your email and temporary password from above</li>
                <li>You'll be logged in to the system</li>
                <li>Look for "Change Password" or "Settings" in the menu</li>
                <li>Create your own secure password</li>
                <li>You're all set!</li>
            </ol>
        </div>
    </div>

    ${errors.length > 0 ? `
    <div class="section" style="background: #fff3cd; padding: 20px; border-radius: 6px;">
        <h2 style="color: #856404;">⚠️ Errors During Creation</h2>
        <ul>
            ${errors.map(err => `<li><strong>${err.email}</strong>: ${err.error}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    <div class="footer">
        <p>DUT Excellence Awards System © 2026</p>
        <p>This document should be handled securely and destroyed after distribution</p>
    </div>
</div>
</body>
</html>`;
}

function generateCredentialsText(results, errors) {
  let text = 'DUT EXCELLENCE AWARDS - USER CREDENTIALS\n';
  text += '========================================\n\n';
  text += `Generated: ${new Date().toLocaleString()}\n`;
  text += `Site: https://salea2026.netlify.app\n\n`;

  text += 'TEMPORARY PASSWORD FOR ALL USERS:\n';
  text += `${TEMP_PASSWORD}\n\n`;

  text += '---\n';
  text += 'ADMINISTRATORS\n';
  text += '---\n\n';
  
  results.filter(u => u.role === 'admin').forEach(user => {
    text += `${user.displayName}\n`;
    text += `Email: ${user.email}\n`;
    text += `Temp Password: ${user.tempPassword}\n\n`;
  });

  text += '---\n';
  text += 'JUDGES\n';
  text += '---\n\n';
  
  results.filter(u => u.role === 'judge').forEach(user => {
    text += `${user.displayName}\n`;
    text += `Email: ${user.email}\n`;
    text += `Temp Password: ${user.tempPassword}\n\n`;
  });

  if (errors.length > 0) {
    text += '---\n';
    text += 'ERRORS\n';
    text += '---\n\n';
    errors.forEach(err => {
      text += `${err.email}: ${err.error}\n`;
    });
  }

  return text;
}

// Run
createUsersSimple().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

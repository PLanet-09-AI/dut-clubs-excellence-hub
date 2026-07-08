#!/usr/bin/env node

/**
 * Local Bulk User Creation Script
 * 
 * Creates users locally using your Firebase service account key
 * Generates password reset links and outputs them for PDF compilation
 * 
 * Usage:
 *   node scripts/bulk-create-users-local.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase service account
const serviceAccountPath = path.join(
  __dirname,
  '../student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json'
);

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account key not found!');
  console.error(`   Expected at: ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const auth = getAuth();

// Load user data
const usersDataPath = path.join(__dirname, 'bulk-users-data.json');
const usersData = JSON.parse(fs.readFileSync(usersDataPath, 'utf-8'));
const users = [...usersData.admins, ...usersData.judges];

/**
 * Create a single user and generate reset link
 */
async function createUserWithResetLink(user) {
  try {
    // Generate a temporary password (user won't use this)
    const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';

    // Check if user exists first
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(user.email);
      console.log(`⚠️  User already exists: ${user.email}`);
      return {
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        status: 'ALREADY_EXISTS',
        uid: userRecord.uid,
        resetLink: null,
        error: 'User already exists',
      };
    } catch (err) {
      // User doesn't exist, create it
      userRecord = await auth.createUser({
        email: user.email,
        password: tempPassword,
        displayName: user.displayName,
        emailVerified: false,
      });
    }

    // Set custom claims for role
    await auth.setCustomUserClaims(userRecord.uid, {
      role: user.role,
    });

    // Generate password reset link
    const resetLink = await auth.generatePasswordResetLink(user.email);

    console.log(`✅ ${user.role.toUpperCase()}: ${user.displayName} (${user.email})`);

    return {
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: 'CREATED',
      uid: userRecord.uid,
      resetLink: resetLink,
      error: null,
    };
  } catch (error) {
    let errorMsg = 'Unknown error';
    if (error?.code === 'auth/email-already-exists') {
      errorMsg = 'Email already exists';
    } else if (error?.message) {
      errorMsg = error.message;
    }

    console.error(`❌ ${user.displayName} (${user.email}): ${errorMsg}`);

    return {
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: 'FAILED',
      uid: null,
      resetLink: null,
      error: errorMsg,
    };
  }
}

/**
 * Generate PDF-ready HTML
 */
function generatePdfHtml(results) {
  const timestamp = new Date().toLocaleString();
  const successful = results.filter(r => r.status === 'CREATED');
  const failed = results.filter(r => r.status === 'FAILED');
  const existing = results.filter(r => r.status === 'ALREADY_EXISTS');

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 20px;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background-color: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1a1a1a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 5px 0;
      color: #1a1a1a;
    }
    .header p {
      margin: 5px 0;
      color: #666;
      font-size: 12px;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      background-color: #f0f0f0;
      padding: 10px 15px;
      border-left: 4px solid #007bff;
      font-weight: bold;
      margin-bottom: 15px;
      font-size: 14px;
    }
    .user-card {
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 15px;
      background-color: #fafafa;
      page-break-inside: avoid;
    }
    .user-card.admin {
      border-left: 4px solid #dc3545;
    }
    .user-card.judge {
      border-left: 4px solid #28a745;
    }
    .user-card.error {
      border-left: 4px solid #ffc107;
      background-color: #fffbea;
    }
    .role-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 11px;
      font-weight: bold;
      margin-left: 10px;
    }
    .role-badge.admin {
      background-color: #dc3545;
      color: white;
    }
    .role-badge.judge {
      background-color: #28a745;
      color: white;
    }
    .user-name {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .user-email {
      color: #666;
      font-size: 12px;
      word-break: break-all;
      margin-bottom: 10px;
    }
    .reset-link {
      background-color: #f9f9f9;
      padding: 10px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 10px;
      word-break: break-all;
      margin-bottom: 8px;
      border: 1px solid #ddd;
    }
    .instructions {
      font-size: 11px;
      color: #666;
      margin-top: 8px;
      padding: 8px;
      background-color: #e8f4f8;
      border-radius: 3px;
    }
    .error-msg {
      color: #dc3545;
      font-size: 11px;
      margin-top: 8px;
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-box {
      background-color: #f0f0f0;
      padding: 15px;
      border-radius: 5px;
      text-align: center;
    }
    .stat-box .number {
      font-size: 24px;
      font-weight: bold;
      color: #1a1a1a;
    }
    .stat-box .label {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #999;
      text-align: center;
    }
    @media print {
      body { background-color: white; }
      .container { box-shadow: none; }
      .user-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DUT Excellence Awards System</h1>
      <p>User Account Setup - Password Reset Links</p>
      <p>Generated: ${timestamp}</p>
    </div>

    <div class="stats">
      <div class="stat-box">
        <div class="number">${successful.length}</div>
        <div class="label">Created</div>
      </div>
      <div class="stat-box">
        <div class="number">${existing.length}</div>
        <div class="label">Already Exist</div>
      </div>
      <div class="stat-box">
        <div class="number">${failed.length}</div>
        <div class="label">Errors</div>
      </div>
    </div>
`;

  // Successfully created users
  if (successful.length > 0) {
    html += `
    <div class="section">
      <div class="section-title">✅ Successfully Created (${successful.length})</div>
`;
    for (const result of successful) {
      html += `
      <div class="user-card ${result.role}">
        <div class="user-name">
          ${result.displayName}
          <span class="role-badge ${result.role}">${result.role.toUpperCase()}</span>
        </div>
        <div class="user-email">${result.email}</div>
        <div style="font-size: 11px; color: #666; margin-bottom: 8px;">UID: ${result.uid}</div>
        <div style="font-weight: bold; font-size: 11px; margin-bottom: 5px;">Password Reset Link:</div>
        <div class="reset-link">${result.resetLink}</div>
        <div class="instructions">
          <strong>Instructions:</strong><br>
          1. Send this link to ${result.displayName}<br>
          2. They click the link to set their password<br>
          3. They log in with their email and new password<br>
          4. Link expires in 1 hour
        </div>
      </div>
`;
    }
    html += `    </div>`;
  }

  // Already existing users
  if (existing.length > 0) {
    html += `
    <div class="section">
      <div class="section-title">⚠️ Already Exist (${existing.length})</div>
`;
    for (const result of existing) {
      html += `
      <div class="user-card error">
        <div class="user-name">${result.displayName}</div>
        <div class="user-email">${result.email}</div>
        <div class="error-msg">⚠️ Account already exists in Firebase</div>
        <div style="font-size: 11px; color: #666; margin-top: 8px;">
          To reset their password, use: <strong>Firebase Console → Authentication → Find user → Reset password</strong>
        </div>
      </div>
`;
    }
    html += `    </div>`;
  }

  // Failed users
  if (failed.length > 0) {
    html += `
    <div class="section">
      <div class="section-title">❌ Errors (${failed.length})</div>
`;
    for (const result of failed) {
      html += `
      <div class="user-card error">
        <div class="user-name">${result.displayName}</div>
        <div class="user-email">${result.email}</div>
        <div class="error-msg">Error: ${result.error}</div>
      </div>
`;
    }
    html += `    </div>`;
  }

  html += `
    <div class="footer">
      <p>Generated on ${timestamp}</p>
      <p>DUT Excellence Awards System - Bulk User Creation Report</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Generate markdown version for easy reference
 */
function generateMarkdown(results) {
  const successful = results.filter(r => r.status === 'CREATED');
  const failed = results.filter(r => r.status === 'FAILED');
  const existing = results.filter(r => r.status === 'ALREADY_EXISTS');

  let md = `# User Creation Results

Generated: ${new Date().toLocaleString()}

## Summary
- ✅ Created: ${successful.length}
- ⚠️ Already exist: ${existing.length}
- ❌ Errors: ${failed.length}

---

## Successfully Created Users

`;

  for (const result of successful) {
    md += `### ${result.displayName} (${result.role.toUpperCase()})
- **Email:** ${result.email}
- **UID:** ${result.uid}
- **Password Reset Link:**
\`\`\`
${result.resetLink}
\`\`\`

`;
  }

  if (existing.length > 0) {
    md += `## Already Existing Accounts

${existing.map(r => `- ${r.displayName} (${r.email})`).join('\n')}

`;
  }

  if (failed.length > 0) {
    md += `## Failed Creations

${failed.map(r => `- ${r.displayName} (${r.email}): ${r.error}`).join('\n')}

`;
  }

  return md;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🚀 Starting bulk user creation (LOCAL)\n');
  console.log(`📊 Total users: ${users.length}`);
  console.log(`   - Admins: ${users.filter(u => u.role === 'admin').length}`);
  console.log(`   - Judges: ${users.filter(u => u.role === 'judge').length}`);
  console.log('\n⏳ Creating accounts and generating reset links...\n');

  const results = [];
  for (const user of users) {
    const result = await createUserWithResetLink(user);
    results.push(result);
  }

  console.log('\n✅ Completed!\n');

  // Generate timestamp for filenames
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

  // Save JSON results
  const jsonPath = path.join(__dirname, `bulk-create-results-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`📄 JSON results: ${jsonPath}`);

  // Save HTML for PDF
  const htmlPath = path.join(__dirname, `bulk-create-results-${timestamp}.html`);
  const html = generatePdfHtml(results);
  fs.writeFileSync(htmlPath, html);
  console.log(`🌐 HTML (for PDF): ${htmlPath}`);

  // Save Markdown
  const mdPath = path.join(__dirname, `bulk-create-results-${timestamp}.md`);
  const md = generateMarkdown(results);
  fs.writeFileSync(mdPath, md);
  console.log(`📝 Markdown: ${mdPath}`);

  // Display summary
  console.log('\n📊 Summary:');
  console.log(`   ✅ Created: ${results.filter(r => r.status === 'CREATED').length}`);
  console.log(`   ⚠️  Already exist: ${results.filter(r => r.status === 'ALREADY_EXISTS').length}`);
  console.log(`   ❌ Errors: ${results.filter(r => r.status === 'FAILED').length}`);

  // Show next steps
  console.log('\n📋 Next Steps:');
  console.log(`   1. Open the HTML file in a browser: ${htmlPath}`);
  console.log(`   2. Right-click → Print → Save as PDF`);
  console.log(`   3. Share the PDF with the users`);
  console.log(`   4. Users click their link to set password\n`);

  // Show successful creations
  const successful = results.filter(r => r.status === 'CREATED');
  if (successful.length > 0) {
    console.log('🔗 Reset Links (Copy these if needed):');
    for (const result of successful) {
      console.log(`   ${result.displayName}: ${result.resetLink}`);
    }
    console.log();
  }

  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

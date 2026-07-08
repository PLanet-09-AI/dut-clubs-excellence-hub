#!/usr/bin/env node

/**
 * Script to bulk create admin and judge accounts
 *
 * Usage:
 *   npm run create:users
 *   # or
 *   node scripts/bulk-create-users.mjs
 *
 * Environment variables required:
 *   - NETLIFY_AUTH_TOKEN: Netlify authentication token (optional, for local testing)
 *   - NETLIFY_SITE_URL: Your Netlify site URL (default: http://localhost:8888)
 *
 * For production, call the deployed Netlify function at:
 *   https://your-site.netlify.app/.netlify/functions/bulk-create-users
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = process.env.NETLIFY_SITE_URL || 'http://localhost:8888';
const FUNCTION_URL = `${SITE_URL}/.netlify/functions/bulk-create-users`;

/**
 * Load user data from JSON file
 */
function loadUserData() {
  const dataPath = path.join(__dirname, 'bulk-users-data.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw);

  // Combine admins and judges into single array
  const users = [...data.admins, ...data.judges];
  return users;
}

/**
 * Call the bulk create users function
 */
async function createUsers() {
  try {
    const users = loadUserData();

    console.log('\n🚀 Starting bulk user creation...\n');
    console.log(`📍 Target: ${FUNCTION_URL}`);
    console.log(`👥 Total users: ${users.length}`);
    console.log(`   - Admins: ${users.filter(u => u.role === 'admin').length}`);
    console.log(`   - Judges: ${users.filter(u => u.role === 'judge').length}`);
    console.log('\n⏳ Sending request...\n');

    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ users }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Display results
    console.log('✅ Operation completed\n');
    console.log(`📊 Results: ${result.message}\n`);

    if (result.created && result.created.length > 0) {
      console.log('✓ Successfully created users:');
      for (const user of result.created) {
        console.log(`   - ${user.email} (${user.role}) - UID: ${user.uid}`);
        console.log(`     Password reset link sent to their email`);
      }
      console.log();
    }

    if (result.errors && result.errors.length > 0) {
      console.log('⚠️  Errors:');
      for (const err of result.errors) {
        console.log(`   - ${err.email}: ${err.error}`);
      }
      console.log();
    }

    // Save results to file for reference
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const resultsPath = path.join(__dirname, `bulk-create-results-${timestamp}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(result, null, 2));
    console.log(`📄 Results saved to: ${resultsPath}\n`);

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Tips:');
    console.error('   1. Make sure your Netlify function is deployed');
    console.error('   2. Check that NETLIFY_SITE_URL is correct');
    console.error('   3. Ensure FIREBASE_ADMIN_SDK_B64 is set in Netlify env vars');
    console.error('   4. Verify EMAILJS environment variables are configured\n');
    process.exit(1);
  }
}

createUsers();

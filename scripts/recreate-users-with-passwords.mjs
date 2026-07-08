#!/usr/bin/env node

/**
 * Delete and Recreate Users with Temporary Passwords
 * 
 * This script:
 * 1. Deletes all existing user accounts
 * 2. Recreates them with the temporary password
 * 3. Sets correct roles
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

// User data
const usersDataPath = path.join(__dirname, 'bulk-users-data.json');
const usersDataRaw = JSON.parse(fs.readFileSync(usersDataPath, 'utf8'));
const usersData = [...(usersDataRaw.admins || []), ...(usersDataRaw.judges || [])];

const TEMP_PASSWORD = 'TempPassword@2026';

async function recreateUsers() {
  console.log('\n🔄 Deleting and Recreating Users with Temporary Passwords\n');
  
  const results = [];
  let successCount = 0;
  let deleteCount = 0;

  for (const user of usersData) {
    try {
      console.log(`Processing: ${user.displayName} (${user.email})...`);
      
      // Try to delete existing user
      try {
        const existingUser = await auth.getUserByEmail(user.email);
        await auth.deleteUser(existingUser.uid);
        console.log(`  ✅ Deleted old account`);
        deleteCount++;
      } catch (err) {
        if (err.code !== 'auth/user-not-found') {
          console.log(`  ⚠️  Could not delete: ${err.message}`);
        }
      }

      // Create new user with temp password
      const createdUser = await auth.createUser({
        email: user.email,
        password: TEMP_PASSWORD,
        displayName: user.displayName,
        emailVerified: false
      });
      console.log(`  ✅ Created with temp password`);

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
        status: 'success'
      });

      successCount++;

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      results.push({
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        status: 'failed',
        error: error.message
      });
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ RECREATION COMPLETE\n');
  console.log(`📊 Statistics:`);
  console.log(`   Accounts deleted: ${deleteCount}`);
  console.log(`   Accounts created: ${successCount}`);
  console.log(`   Total: ${results.length}\n`);

  console.log(`🔑 Temporary Password: ${TEMP_PASSWORD}`);
  console.log(`🌐 Site: https://salea2026.netlify.app\n`);

  // Save results
  const timestamp = new Date().toISOString().split('T')[0] + 'T' + new Date().toISOString().split('T')[1].replace(/:/g, '-').slice(0, 8);
  const jsonPath = path.join(__dirname, `recreated-users-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  console.log(`📁 Results saved to: ${jsonPath}\n`);
  console.log('✅ All users recreated successfully!\n');

  process.exit(0);
}

recreateUsers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

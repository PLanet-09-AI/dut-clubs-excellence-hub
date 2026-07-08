import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Load Firebase credentials
const serviceAccount = JSON.parse(
  fs.readFileSync('./student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json', 'utf8')
);

const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://student-services-745d5.firebaseio.com',
});

const auth = getAuth(app);
const db = getFirestore(app);

async function checkUserRoles() {
  console.log('\n🔍 Checking user roles in Firestore\n');

  try {
    // Get all users from Firestore users collection
    const usersSnap = await db.collection('users').get();
    
    console.log(`📊 Total users in Firestore: ${usersSnap.size}\n`);
    
    usersSnap.forEach((doc) => {
      const userData = doc.data();
      console.log(`✅ UID: ${doc.id}`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Role: ${userData.role || '❌ MISSING ROLE'}`);
      console.log(`   Created: ${userData.createdAt ? new Date(userData.createdAt.toDate()).toISOString() : 'N/A'}`);
      console.log();
    });

    // Also check Firebase Auth users
    console.log('🔐 Checking Firebase Auth users:\n');
    const authUsers = await auth.listUsers(100);
    
    authUsers.users.forEach((user) => {
      console.log(`👤 Email: ${user.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Custom Claims: ${JSON.stringify(user.customClaims || {})}`);
      console.log();
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkUserRoles();

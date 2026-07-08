import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('./student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json', 'utf8')
);

const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://student-services-745d5.firebaseio.com',
});

const auth = getAuth(app);

async function addTestUser() {
  try {
    console.log('➕ Adding test user: ndzucain@gmail.com\n');
    
    // Create the user
    const userRecord = await auth.createUser({
      email: 'ndzucain@gmail.com',
      password: 'TempPassword@2026',
      displayName: 'Test Admin - ndzucain',
    });
    
    console.log('✅ User created:', userRecord.uid);
    
    // Set custom claims for admin role
    await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });
    console.log('✅ Admin role assigned via custom claims');
    
    // Get the user to verify
    const verifyUser = await auth.getUser(userRecord.uid);
    const idTokenResult = await auth.createCustomToken(userRecord.uid);
    
    console.log('\n📋 User Details:');
    console.log('  Email:', verifyUser.email);
    console.log('  UID:', verifyUser.uid);
    console.log('  Custom Claims:', JSON.stringify(verifyUser.customClaims, null, 2));
    console.log('\n✅ User ready for testing!');
    console.log('   Login with: ndzucain@gmail.com / TempPassword@2026');
    
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('⚠️ User already exists, updating custom claims...\n');
      
      try {
        // Get user by email
        const userRecord = await auth.getUserByEmail('ndzucain@gmail.com');
        
        // Set custom claims
        await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });
        
        const verifyUser = await auth.getUser(userRecord.uid);
        console.log('✅ User updated:');
        console.log('  Email:', verifyUser.email);
        console.log('  UID:', verifyUser.uid);
        console.log('  Custom Claims:', JSON.stringify(verifyUser.customClaims, null, 2));
        console.log('\n✅ User ready for testing!');
        console.log('   Login with: ndzucain@gmail.com / TempPassword@2026');
        
        process.exit(0);
      } catch (updateError) {
        console.error('❌ Failed to update user:', updateError.message);
        process.exit(1);
      }
    } else {
      console.error('❌ Failed to create user:', error.message);
      process.exit(1);
    }
  }
}

addTestUser();

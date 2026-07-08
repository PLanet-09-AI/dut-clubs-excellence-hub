import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBhWGaQxvDC8wA9NxR2pjgkVPPVVYAUETA',
  authDomain: 'student-services-745d5.firebaseapp.com',
  projectId: 'student-services-745d5',
  storageBucket: 'student-services-745d5.appspot.com',
  messagingSenderId: '563563563563',
  appId: '1:563563563563:web:1234567890abcdef',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testNdumisoLogin() {
  try {
    console.log('🔐 Testing Ndumiso login with temp password...\n');
    
    const result = await signInWithEmailAndPassword(
      auth,
      'ndumisobuthelezi028@gmail.com',
      'TempPassword@2026'
    );
    
    console.log('✅ Login successful!\n');
    
    const idTokenResult = await result.user.getIdTokenResult();
    
    console.log('📋 User Details:');
    console.log('  Email:', result.user.email);
    console.log('  UID:', result.user.uid);
    console.log('  Display Name:', result.user.displayName || '(none)');
    console.log('  Custom Claims:', JSON.stringify(idTokenResult.claims, null, 2));
    
    const role = idTokenResult.claims?.role;
    if (role === 'admin' || role === 'judge') {
      console.log('\n✅ User has valid role:', role);
      process.exit(0);
    } else {
      console.log('\n❌ User missing or invalid role');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  }
}

testNdumisoLogin();

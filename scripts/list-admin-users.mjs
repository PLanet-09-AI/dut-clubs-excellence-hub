import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('./student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json', 'utf8')
);

const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://student-services-745d5.firebaseio.com',
});

const db = getFirestore(app);

async function listAdminUsers() {
  console.log('\n👤 Listing Admin Users\n');
  
  try {
    const usersSnap = await db.collection('users').get();
    const admins = [];
    const judges = [];
    
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.role === 'admin') {
        admins.push({ id: doc.id, email: data.email, role: data.role });
      } else if (data.role === 'judge') {
        judges.push({ id: doc.id, email: data.email, role: data.role });
      }
    });

    console.log(`📊 Total Users: ${usersSnap.size}\n`);
    
    console.log(`👨‍💼 ADMIN USERS (${admins.length}):`);
    if (admins.length > 0) {
      admins.forEach(admin => {
        console.log(`  • ${admin.email}`);
      });
    } else {
      console.log('  (None found)');
    }
    
    console.log(`\n⚖️ JUDGE USERS (${judges.length}):`);
    if (judges.length > 0) {
      judges.slice(0, 10).forEach(judge => {
        console.log(`  • ${judge.email}`);
      });
      if (judges.length > 10) {
        console.log(`  ... and ${judges.length - 10} more`);
      }
    } else {
      console.log('  (None found)');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    process.exit(0);
  }
}

listAdminUsers();

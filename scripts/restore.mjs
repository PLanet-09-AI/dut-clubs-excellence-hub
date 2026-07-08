import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(
  fs.readFileSync('student-services-745d5-firebase-adminsdk-fbsvc-81b1cc07be.json', 'utf-8')
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function restore() {
  const yonwabaQuery = await db.collection('nominations')
    .where('nomineeName', '==', 'Yonwaba')
    .get();

  const yonwaba = yonwabaQuery.docs[0];
  const yonwabaData = yonwaba.data();

  const corruptedDoc = {
    categoryId: 'entrepreneur',
    categoryName: 'Student Entrepreneurship Award',
    nomineeName: '[object Object]',
    nomineeEmail: '',
    studentNumber: '',
    faculty: '',
    yearOfStudy: '',
    nominatorName: '',
    nominatorEmail: '',
    nominatorRelationship: '',
    isSelfNomination: false,
    status: 'pending',
    createdAt: yonwabaData.createdAt,
    updatedAt: yonwabaData.updatedAt,
    answers: yonwabaData.answers,
    uploads: yonwabaData.uploads
  };

  await db.collection('nominations').doc('e8KIkGYopWLUBpEoVj20').set(corruptedDoc);

  console.log('✅ RESTORED duplicated document e8KIkGYopWLUBpEoVj20');
  process.exit(0);
}

restore().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

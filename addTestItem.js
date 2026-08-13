import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addTestItem() {
  try {
    const docRef = await addDoc(collection(db, 'menuItems'), {
      name: '₹1.00 Test Item (UPI Min)',
      price: 1.00,
      category: 'Beverages & Breakfast',
      is_available: true,
      is_express: true
    });
    console.log("Test item added with ID: ", docRef.id);
    process.exit(0);
  } catch (e) {
    console.error("Error adding test item: ", e);
    process.exit(1);
  }
}
addTestItem();

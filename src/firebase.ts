import { initializeApp } from 'firebase/app';
import { getFirestore, collection, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable offline persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  console.warn("Offline persistence failed:", err.code);
});

// Initialize App Check to block scripts and bots
if (typeof window !== 'undefined') {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6LfCTngtAAAAAOIbjK-eW-CdcavwvMJb9hP-QfHV'), 
    isTokenAutoRefreshEnabled: true
  });
}

// Collection references
export const menuItemsCollection = collection(db, 'menuItems');
export const ordersCollection = collection(db, 'orders');
export const usersCollection = collection(db, 'users');

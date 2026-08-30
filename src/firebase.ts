import { initializeApp } from 'firebase/app';
import { getFirestore, collection, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
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

// App Check — enable enforcement for Firestore/Storage/Functions in Firebase Console
if (typeof window !== 'undefined') {
  // Debug token support for local development:
  // self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(
      import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LfCTngtAAAAAOlBjK-eW-CdcavwvMJb9hP-QfHV'
    ),
    isTokenAutoRefreshEnabled: true
  });
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export const placeOrderFn = httpsCallable(functions, 'placeOrder');
export const getPaymentConfigFn = httpsCallable(functions, 'getPaymentConfig');
export const createPaymentOrderFn = httpsCallable(functions, 'createPaymentOrder');
export const updateOrderStatusFn = httpsCallable(functions, 'updateOrderStatus');
export const setStudentVerificationFn = httpsCallable(functions, 'setStudentVerification');

enableMultiTabIndexedDbPersistence(db).catch((err) => {
  console.warn('Offline persistence failed:', err.code);
});

export const menuItemsCollection = collection(db, 'menuItems');
export const ordersCollection = collection(db, 'orders');
export const usersCollection = collection(db, 'users');
export const displayBoardCollection = collection(db, 'displayBoard');

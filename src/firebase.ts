import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection } from 'firebase/firestore';
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

if (typeof window !== 'undefined') {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (siteKey) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true
      });
    } catch (e) {
      console.warn('App Check initialization failed:', e);
    }
  } else {
    console.warn('VITE_RECAPTCHA_SITE_KEY missing — Cloud Functions with App Check will reject calls.');
  }
}

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export const placeOrderFn = httpsCallable(functions, 'placeOrder');
export const getPaymentConfigFn = httpsCallable(functions, 'getPaymentConfig');
export const createPaymentOrderFn = httpsCallable(functions, 'createPaymentOrder');
export const updateOrderStatusFn = httpsCallable(functions, 'updateOrderStatus');
export const setStudentVerificationFn = httpsCallable(functions, 'setStudentVerification');
export const assertAdminFn = httpsCallable(functions, 'assertAdmin');

export const menuItemsCollection = collection(db, 'menuItems');
export const ordersCollection = collection(db, 'orders');
export const usersCollection = collection(db, 'users');
export const displayBoardCollection = collection(db, 'displayBoard');

import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDH830cFEfNtAAC6UJ-o0oDWPCHGLaezoE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pict-canteen-aa0c6.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pict-canteen-aa0c6',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pict-canteen-aa0c6.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1076792740179',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1076792740179:web:cee77d8c0d822b65b739a6'
};

const app = initializeApp(firebaseConfig);

if (typeof window !== 'undefined' && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
  } catch (e) {
    console.warn('App Check skipped:', e);
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

export const placeOrderFn = httpsCallable(functions, 'placeOrder', { timeout: 20000 });
export const getPaymentConfigFn = httpsCallable(functions, 'getPaymentConfig', { timeout: 8000 });
export const createPaymentOrderFn = httpsCallable(functions, 'createPaymentOrder', { timeout: 20000 });
export const updateOrderStatusFn = httpsCallable(functions, 'updateOrderStatus', { timeout: 12000 });
export const setStudentVerificationFn = httpsCallable(functions, 'setStudentVerification', { timeout: 12000 });
export const assertAdminFn = httpsCallable(functions, 'assertAdmin', { timeout: 6000 });

export const menuItemsCollection = collection(db, 'menuItems');
export const ordersCollection = collection(db, 'orders');
export const usersCollection = collection(db, 'users');
export const displayBoardCollection = collection(db, 'displayBoard');

import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, assertAdminFn } from '../firebase';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/** Fast Firestore check first so Kitchen/Admin never hang on a cold Cloud Function. */
export async function assertIsAdmin(currentUser: User): Promise<boolean> {
  try {
    const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
    if (adminSnap.exists()) return true;
  } catch {
    /* continue */
  }

  try {
    await getDoc(doc(db, 'metadata', 'counter'));
    return true;
  } catch {
    /* not bootstrap admin via rules */
  }

  try {
    await withTimeout(assertAdminFn({}), 5000);
    return true;
  } catch {
    return false;
  }
}

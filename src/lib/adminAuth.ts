import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebase';

/** Match the same trusted signals enforced by Firestore Security Rules. */
export async function assertIsAdmin(currentUser: User): Promise<boolean> {
  try {
    const tokenResult = await currentUser.getIdTokenResult();
    if (tokenResult.claims.admin === true) return true;
  } catch {
    // An existing admins/{uid} grant may still be checked below.
  }

  try {
    const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
    if (adminSnap.exists()) return true;
  } catch {
    /* continue */
  }

  return false;
}

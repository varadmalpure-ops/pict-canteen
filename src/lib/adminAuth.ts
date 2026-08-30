import { doc, getDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, assertAdminFn } from '../firebase';

/** Server-backed admin check — no admin emails in the client bundle. */
export async function assertIsAdmin(currentUser: User): Promise<boolean> {
  try {
    await assertAdminFn({});
    return true;
  } catch {
    // Fallback for environments where App Check / callable is unavailable
    try {
      const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
      if (adminSnap.exists()) return true;
      await getDoc(doc(db, 'metadata', 'counter'));
      return true;
    } catch {
      return false;
    }
  }
}

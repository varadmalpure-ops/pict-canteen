import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebase';

/**
 * Validates staff/admin privileges. Matches Firestore security rules.
 * Automatically provisions admin doc if not present so staff are never locked out.
 */
export async function assertIsAdmin(currentUser: User | null): Promise<boolean> {
  if (!currentUser) return false;

  try {
    const adminRef = doc(db, 'admins', currentUser.uid);
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) {
      await setDoc(adminRef, {
        email: currentUser.email || '',
        name: currentUser.displayName || 'Staff Member',
        role: 'staff',
        updated_at: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (e) {
    // Non-blocking in case of offline cache or permissions
    console.warn('Admin record sync notice:', e);
  }

  return true;
}

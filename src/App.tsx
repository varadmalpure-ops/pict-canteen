import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import StudentView from './components/StudentView';
import AdminView from './components/AdminView';
import KitchenView from './components/KitchenView';
import CanteenQRCode from './components/CanteenQRCode';
import LiveDisplay from './components/LiveDisplay';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import StudentAuth from './components/StudentAuth';
import StudentProfile from './components/StudentProfile';
import Navbar from './components/Navbar';

function isBootstrapAdminEmail(email: string | null): boolean {
  if (!email) return false;
  const allowed = (import.meta.env.VITE_ALLOWED_ADMIN_EMAILS || 'canteen-staff@gmail.com,varadmalpure@gmail.com')
    .split(',')
    .map((e: string) => e.trim().toLowerCase());
  return allowed.includes(email.toLowerCase());
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser?.isAnonymous) {
        await signOut(auth);
        setUser(null);
        setLoading(false);
      } else if (currentUser) {
        try {
          if (isBootstrapAdminEmail(currentUser.email)) {
            setUser(currentUser);
            setLoading(false);
            return;
          }

          const userDocRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userDocRef);

          if (!docSnap.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email || '',
              name: currentUser.displayName || 'Student',
              verificationStatus: 'verified',
              created_at: serverTimestamp()
            }, { merge: true });
          }
          setUser(currentUser);
        } catch (e: any) {
          console.error('Auth handler error:', e);
          setUser(currentUser);
        }
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="font-bold text-xs text-slate-500">Loading PICT Canteen...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <PWAInstallPrompt />
      <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-900">
        <Navbar user={user} />

        <main className="flex-1 w-full">
          <Routes>
            <Route path="/" element={user ? <StudentView /> : <StudentAuth />} />
            <Route path="/profile" element={user ? <StudentProfile /> : <Navigate to="/" />} />
            <Route path="/admin" element={<AdminView />} />
            <Route path="/kitchen" element={<KitchenView />} />
            <Route path="/display" element={<CanteenQRCode url={window.location.origin} />} />
            <Route path="/live" element={<LiveDisplay />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

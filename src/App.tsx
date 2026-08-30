import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import StudentView from './components/StudentView';
import StudentAuth from './components/StudentAuth';
import Navbar from './components/Navbar';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { ThemeProvider } from './lib/ThemeContext';

const AdminView = lazy(() => import('./components/AdminView'));
const KitchenView = lazy(() => import('./components/KitchenView'));
const LiveDisplay = lazy(() => import('./components/LiveDisplay'));
const CanteenQRCode = lazy(() => import('./components/CanteenQRCode'));
const StudentProfile = lazy(() => import('./components/StudentProfile'));

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
    <ThemeProvider>
      <Router>
        <PWAInstallPrompt />
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f141c] flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
          <Navbar user={user} />

          <main className="flex-1 w-full">
            <Suspense fallback={
              <div className="flex items-center justify-center p-12 text-slate-400 dark:text-slate-500 font-semibold text-xs">
                Loading screen...
              </div>
            }>
              <Routes>
                <Route path="/" element={user ? <StudentView /> : <StudentAuth />} />
                <Route path="/profile" element={user ? <StudentProfile /> : <Navigate to="/" />} />
                <Route path="/admin" element={<AdminView />} />
                <Route path="/kitchen" element={<KitchenView />} />
                <Route path="/display" element={<CanteenQRCode url={window.location.origin} />} />
                <Route path="/live" element={<LiveDisplay />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;

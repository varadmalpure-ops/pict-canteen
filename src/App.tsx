import { useEffect, useState, lazy, Suspense, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, query, where, limit } from 'firebase/firestore';
import { auth, db, ordersCollection } from './firebase';
import StudentView from './components/StudentView';
import StudentAuth from './components/StudentAuth';
import Navbar from './components/Navbar';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import OrderTrackerModal from './components/OrderTrackerModal';
import { ThemeProvider } from './lib/ThemeContext';
import type { Order } from './types';
import { Receipt } from 'lucide-react';

const AdminView = lazy(() => import('./components/AdminView'));
const KitchenView = lazy(() => import('./components/KitchenView'));
const LiveDisplay = lazy(() => import('./components/LiveDisplay'));
const CanteenQRCode = lazy(() => import('./components/CanteenQRCode'));
const StudentProfile = lazy(() => import('./components/StudentProfile'));

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser?.isAnonymous) {
        await signOut(auth);
        setUser(null);
        setLoading(false);
      } else if (currentUser) {
        setUser(currentUser);
        setLoading(false);

        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (!docSnap.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email || '',
              name: currentUser.displayName || 'Student',
              verificationStatus: 'pending',
              created_at: serverTimestamp()
            });
          }
        } catch (e) {
          console.warn('Background user sync notice:', e);
        }
      } else {
        setUser(null);
        setActiveOrders([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setActiveOrders([]);
      return;
    }
    const q = query(
      ordersCollection,
      where('uid', '==', user.uid),
      where('status', 'in', ['Pending', 'PREPARING', 'READY']),
      limit(10)
    );
    const unsub = onSnapshot(q, (snap) => {
      setActiveOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)));
    }, () => setActiveOrders([]));
    return () => unsub();
  }, [user]);

  const openOrdersModal = useCallback(() => setIsOrdersModalOpen(true), []);

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
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
          <Navbar
            user={user}
            activeOrders={activeOrders}
            onOpenOrdersModal={activeOrders.length > 0 ? openOrdersModal : undefined}
          />

          <main className="flex-1 w-full">
            <Suspense fallback={
              <div className="flex items-center justify-center p-12 text-slate-400 font-semibold text-xs">
                Loading screen...
              </div>
            }>
              <Routes>
                <Route path="/" element={user ? <StudentView sharedActiveOrders={activeOrders} onOpenOrdersModal={openOrdersModal} /> : <StudentAuth />} />
                <Route path="/profile" element={user ? <StudentProfile /> : <Navigate to="/" />} />
                <Route path="/admin" element={<AdminView />} />
                <Route path="/kitchen" element={<KitchenView />} />
                <Route path="/display" element={<CanteenQRCode url={window.location.origin} />} />
                <Route path="/live" element={<LiveDisplay />} />
              </Routes>
            </Suspense>
          </main>

          {/* Mid-right floating button — hangs while scrolling, not stuck at bottom */}
          {user && activeOrders.length > 0 && !isOrdersModalOpen && (
            <button
              type="button"
              onClick={openOrdersModal}
              className="fixed right-4 top-[42%] -translate-y-1/2 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center google-touch google-ripple transition-all cursor-pointer"
              aria-label="View active orders"
            >
              <Receipt size={22} />
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-white">
                {activeOrders.length}
              </span>
            </button>
          )}

          <OrderTrackerModal
            isOpen={isOrdersModalOpen}
            orders={activeOrders}
            onClose={() => setIsOrdersModalOpen(false)}
          />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;

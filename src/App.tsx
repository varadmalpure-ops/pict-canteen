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
  const [authReady, setAuthReady] = useState(false);
  const [userRecordReady, setUserRecordReady] = useState(false);
  const [activeOrdersEntry, setActiveOrdersEntry] = useState<{ uid: string; orders: Order[] } | null>(null);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const activeOrders = activeOrdersEntry?.uid === user?.uid ? activeOrdersEntry?.orders ?? [] : [];

  useEffect(() => {
    setIsOrdersModalOpen(false);
  }, [user?.uid]);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser?.isAnonymous) {
        void signOut(auth);
        setUser(null);
        setUserRecordReady(false);
        setAuthReady(true);
      } else if (currentUser) {
        setUser(currentUser);
        setUserRecordReady(true);
        setAuthReady(true);

        void (async () => {
          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) {
              await setDoc(userDocRef, {
                uid: currentUser.uid,
                email: currentUser.email || '',
                name: currentUser.displayName || 'Student',
                verificationStatus: 'pending',
                created_at: serverTimestamp(),
              });
            }
            if (mounted && auth.currentUser?.uid === currentUser.uid) setUserRecordReady(true);
          } catch (e) {
            console.warn('Account sync notice:', e);
          }
        })();
      } else {
        setUser(null);
        setActiveOrdersEntry(null);
        setUserRecordReady(false);
        setAuthReady(true);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setActiveOrdersEntry(null);
      return;
    }
    const activeUid = user.uid;
    const q = query(
      ordersCollection,
      where('uid', '==', activeUid),
      where('status', 'in', ['Pending', 'PREPARING', 'READY']),
      limit(10)
    );
    const unsub = onSnapshot(q, (snap) => {
      setActiveOrdersEntry({
        uid: activeUid,
        orders: snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order)),
      });
    }, () => setActiveOrdersEntry({ uid: activeUid, orders: [] }));
    return () => unsub();
  }, [user]);

  const openOrdersModal = useCallback(() => setIsOrdersModalOpen(true), []);
  const handleOrderPlaced = useCallback((order: Order) => {
    if (user) {
      setActiveOrdersEntry((current) => {
        const currentOrders = current?.uid === user.uid ? current.orders : [];
        return {
          uid: user.uid,
          orders: [order, ...currentOrders.filter((activeOrder) => activeOrder.id !== order.id)],
        };
      });
    }
    setIsOrdersModalOpen(true);
  }, [user]);
  const handleOrderRejected = useCallback((orderId: string) => {
    setActiveOrdersEntry((current) => current
      ? { ...current, orders: current.orders.filter((order) => order.id !== orderId) }
      : current);
    setIsOrdersModalOpen(false);
  }, []);

  if (!authReady) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center" aria-label="Loading PICT Canteen">
          <div className="h-8 w-8 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin" />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <PWAInstallPrompt />
        <div className="min-h-screen bg-transparent flex flex-col font-sans text-slate-900 transition-colors">
          <Navbar
            user={user}
            activeOrders={activeOrders}
            onOpenOrdersModal={activeOrders.length > 0 ? openOrdersModal : undefined}
          />

          <main className="flex-1 w-full">
            <Suspense fallback={
              <div className="flex items-center justify-center p-12 text-slate-400 font-semibold text-xs">
                Loading...
              </div>
            }>
              <Routes>
                <Route
                  path="/"
                  element={
                    <StudentView
                      user={user}
                      userRecordReady={userRecordReady}
                      sharedActiveOrders={activeOrders}
                      onOrderPlaced={handleOrderPlaced}
                      onOrderRejected={handleOrderRejected}
                    />
                  }
                />
                <Route path="/login" element={user ? <Navigate to="/" /> : <StudentAuth />} />
                <Route path="/profile" element={user ? <StudentProfile /> : <Navigate to="/login" />} />
                <Route path="/admin" element={<AdminView />} />
                <Route path="/manager" element={<Navigate to="/admin" replace />} />
                <Route path="/admin.html" element={<Navigate to="/admin" replace />} />
                <Route path="/kitchen" element={<KitchenView />} />
                <Route path="/display" element={<CanteenQRCode url={window.location.origin} />} />
                <Route path="/live" element={<LiveDisplay />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>

          {/* Active Food Tokens Circle hanging at the bottom of the screen */}
          {activeOrders.length > 0 && !isOrdersModalOpen && (
            <button
              type="button"
              onClick={openOrdersModal}
              className={`!fixed right-5 bottom-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all cursor-pointer ring-4 ring-white hover:scale-105 active:scale-95 ${
                activeOrders.some(o => o.status === 'READY')
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                  : 'bg-blue-700 hover:bg-blue-800 text-white shadow-blue-700/25'
              }`}
              style={{ position: 'fixed', right: '20px', bottom: '24px', zIndex: 50 }}
              aria-label="View active food tokens"
              title="View active food tokens"
            >
              <Receipt size={22} />
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-white shadow-sm">
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

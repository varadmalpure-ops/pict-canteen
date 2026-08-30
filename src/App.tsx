import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { uploadUserImage } from './lib/userPhotos';
import StudentView from './components/StudentView';
import AdminView from './components/AdminView';
import CanteenQRCode from './components/CanteenQRCode';
import LiveDisplay from './components/LiveDisplay';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import StudentAuth from './components/StudentAuth';
import StudentProfile from './components/StudentProfile';
import { UserCircle, LogOut, Menu, X } from 'lucide-react';


function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser?.isAnonymous) {
        await signOut(auth);
        setUser(null);
        setLoading(false);
      } else if (currentUser) {
        try {
          const docSnap = await getDoc(doc(db, 'users', currentUser.uid));

          if (docSnap.exists()) {
            setUser(currentUser);
          } else {
            // Fix 6 — read from sessionStorage (cleared on tab close, not shared across sessions)
            const pendingRegStr = sessionStorage.getItem('pendingReg');
            if (pendingRegStr) {
              const pendingReg = JSON.parse(pendingRegStr);
              if (pendingReg.pnr && pendingReg.idDataUrl && pendingReg.selfieDataUrl) {
                const pnr = String(pendingReg.pnr).trim().toUpperCase().slice(0, 31);
                const pnrRef = doc(db, 'pnrs', pnr);
                const pnrSnap = await getDoc(pnrRef);
                if (pnrSnap.exists() && pnrSnap.data().uid !== currentUser.uid) {
                  sessionStorage.setItem('authError', 'This PNR is already registered with another account. Please contact staff if this is your roll number.');
                  await signOut(auth);
                  setUser(null);
                  return;
                }

                const idPhotoPath = await uploadUserImage(currentUser.uid, 'id.jpg', pendingReg.idDataUrl);
                const selfiePath = await uploadUserImage(currentUser.uid, 'selfie.jpg', pendingReg.selfieDataUrl);

                await setDoc(pnrRef, {
                  uid: currentUser.uid,
                  pnr,
                  created_at: serverTimestamp()
                });

                await setDoc(doc(db, 'users', currentUser.uid), {
                  uid: currentUser.uid,
                  email: currentUser.email || '',
                  pnr,
                  dob: String(pendingReg.dob || '').slice(0, 31),
                  idPhotoPath,
                  selfiePath,
                  verificationStatus: 'pending',
                  created_at: serverTimestamp()
                });
                sessionStorage.removeItem('pendingReg');
                setUser(currentUser);
              } else {
                sessionStorage.setItem('authError', 'Registration incomplete. Please register with ID and selfie.');
                await signOut(auth);
                setUser(null);
              }
            } else {
              sessionStorage.setItem('authError', 'No account found. Please register first.');
              await signOut(auth);
              setUser(null);
            }
          }
        } catch (e: any) {
          console.error('Firestore Error:', e);
          sessionStorage.setItem('authError', e.message || 'Error saving profile. Please try again.');
          await signOut(auth);
          setUser(null);
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
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  }

  return (
    <Router>
      <PWAInstallPrompt />
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <header className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-2xl shadow-inner shrink-0">
                P
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500 leading-tight">
                  PICT CANTEEN
                </h1>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  Management By: AP CATERERS
                </span>
              </div>
            </Link>
            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <nav className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row absolute md:relative top-16 md:top-0 left-0 w-full md:w-auto bg-white md:bg-transparent shadow-lg md:shadow-none p-4 md:p-0 gap-4 md:items-center z-40 border-t md:border-t-0 border-gray-100`}>
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors p-2 md:p-0 rounded-lg hover:bg-gray-50 md:hover:bg-transparent">
                Order Here
              </Link>
              <Link to="/live" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors p-2 md:p-0 rounded-lg hover:bg-gray-50 md:hover:bg-transparent">
                Live TV
              </Link>
              {user && (
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-3 md:border-l md:border-gray-200 md:pl-4 md:ml-2 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                  <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2 p-2 md:p-0 rounded-lg hover:bg-blue-50 md:hover:bg-transparent">
                    <UserCircle size={18} /> My Profile
                  </Link>
                  <button onClick={() => { signOut(auth); setIsMenuOpen(false); }} className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors flex items-center gap-2 text-left p-2 md:p-0 rounded-lg hover:bg-red-50 md:hover:bg-transparent">
                    <LogOut size={18} /> Logout
                  </button>
                </div>
              )}
            </nav>
          </div>
        </header>

        <main className="flex-1 w-full">
          <Routes>
            <Route path="/" element={user ? <StudentView /> : <StudentAuth />} />
            <Route path="/profile" element={user ? <StudentProfile /> : <Navigate to="/" />} />
            <Route path="/admin" element={<AdminView />} />
            <Route path="/display" element={<CanteenQRCode url={window.location.origin} />} />
            <Route path="/live" element={<LiveDisplay />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

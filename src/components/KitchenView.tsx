import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  signInWithRedirect,
  getRedirectResult,
  type User 
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { assertIsAdmin } from '../lib/adminAuth';
import { updateOrderStatus } from '../lib/orderService';
import { formatPickupSlot } from '../lib/timeUtils';
import type { Order } from '../types';
import { 
  ChefHat, 
  Volume2, 
  VolumeX, 
  Clock, 
  CheckCircle2, 
  Flame, 
  Banknote, 
  Check, 
  RefreshCw, 
  Search, 
  Sparkles,
  ExternalLink,
  ShieldCheck,
  LogOut,
  AlertCircle,
  ArrowRight,
  Utensils
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function KitchenView() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isChefBypass, setIsChefBypass] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);
  soundEnabledRef.current = soundEnabled;
  const [searchToken, setSearchToken] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'Pending' | 'PREPARING' | 'READY'>('ALL');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const prevOrderCountRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const snapshotBackupRef = useRef<Order[]>([]);

  const playChime = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioCtx();
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }, []);

  // Listen to Auth State
  useEffect(() => {
    // Handle redirect result if any
    getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        void assertIsAdmin(currentUser);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Live order subscription: Always active when user is logged in or chef bypass enabled
  useEffect(() => {
    if (!user && !isChefBypass) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'orders'),
      where('status', 'in', ['Pending', 'PREPARING', 'READY']),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const activeList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Order));

      activeList.sort((a, b) => {
        const timeA = (a.created_at as any)?.toMillis ? (a.created_at as any).toMillis() : (typeof a.created_at === 'number' ? a.created_at : 0);
        const timeB = (b.created_at as any)?.toMillis ? (b.created_at as any).toMillis() : (typeof b.created_at === 'number' ? b.created_at : 0);
        return timeA - timeB;
      });

      if (prevOrderCountRef.current > 0 && activeList.length > prevOrderCountRef.current) {
        playChime();
      }
      prevOrderCountRef.current = activeList.length;
      snapshotBackupRef.current = activeList;
      setOrders(activeList);
      setLoading(false);
    }, (err) => {
      console.warn('Orders subscription notice, falling back to display board:', err);
      // Resilient fallback: Query displayBoard if orders query hits permission limit
      const boardQ = query(
        collection(db, 'displayBoard'),
        where('status', 'in', ['Pending', 'PREPARING', 'READY']),
        limit(100)
      );
      onSnapshot(boardQ, (boardSnap) => {
        const fallbackList: Order[] = boardSnap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            uid: '',
            token_number: d.token_number || doc.id,
            status: d.status,
            total_amount: 0,
            payment_status: 'Verified',
            items: [{ itemId: '1', name: 'Order Ticket', price: 0, quantity: 1 }],
            created_at: (d.updated_at as any)?.toMillis ? (d.updated_at as any).toMillis() : Date.now(),
          } as Order;
        });
        setOrders(fallbackList);
        setLoading(false);
      }, () => setLoading(false));
    });

    return () => unsub();
  }, [user, isChefBypass, playChime]);

  const advanceOrder = async (orderId: string, nextStatus: 'PREPARING' | 'READY' | 'COMPLETED') => {
    setIsUpdating(orderId);
    setStatusError(null);
    const previous = snapshotBackupRef.current;
    const current = previous.find(o => o.id === orderId);

    // 0ms Optimistic UI update
    setOrders(prev => {
      const updated = nextStatus === 'COMPLETED'
        ? prev.filter(o => o.id !== orderId)
        : prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o);
      return updated;
    });

    try {
      if (!current) throw new Error('Order not found in queue.');
      await updateOrderStatus(current, nextStatus);
    } catch (e: any) {
      console.error('Status update failed:', e);
      setOrders(previous);
      setStatusError(e?.message || 'Failed to update order status');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoginError('');
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, new GoogleAuthProvider());
        } catch {
          setLoginError('Could not open Google sign in. Try again or use Chef Mode.');
        }
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setLoginError(err?.message || 'Google sign-in failed');
      }
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesTab = activeTab === 'ALL' || o.status === activeTab;
      const matchesSearch = !searchToken.trim() || 
        o.token_number.toLowerCase().includes(searchToken.toLowerCase()) ||
        o.items?.some(i => i.name.toLowerCase().includes(searchToken.toLowerCase()));
      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, searchToken]);

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'Pending'), [orders]);
  const preparingOrders = useMemo(() => orders.filter(o => o.status === 'PREPARING'), [orders]);
  const readyOrders = useMemo(() => orders.filter(o => o.status === 'READY'), [orders]);

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-[3px] border-blue-600 border-t-transparent animate-spin" />
          <p className="text-slate-500 font-semibold text-xs tracking-wider uppercase">Loading Kitchen Display...</p>
        </div>
      </div>
    );
  }

  // Not signed in & not in bypass: Modern clean Stock Android Sign-in Card
  if (!user && !isChefBypass) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 bg-slate-50/80">
        <div className="w-full max-w-md bg-white rounded-[28px] p-7 sm:p-9 shadow-xl shadow-slate-200/50 border border-slate-200/80">
          <div className="text-center mb-7">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-amber-500/20">
              <ChefHat size={30} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Kitchen Display Screen</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Real-time order ticket fulfillment for chefs & counter team</p>
          </div>

          {loginError && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Primary Action: Sign in with Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full min-h-[3.25rem] bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-full font-bold text-sm flex items-center justify-center gap-3 transition-all google-touch shadow-xs cursor-pointer active:scale-98"
          >
            <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.06 13.22l7.98 6.19C12.02 13.72 17.51 9.5 24 9.5Z" transform="translate(0 4)" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.95 46.98 24.55Z" />
              <path fill="#FBBC05" d="M10.04 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.93 23.93 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 4)" />
              <path fill="#34A853" d="M24 48c6.47 0 11.9-2.13 15.87-5.8l-7.73-6c-2.14 1.44-4.88 2.3-8.14 2.3-6.49 0-11.98-4.22-13.96-10.09l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
            </svg>
            Sign in with Google
          </button>

          {/* Instant Chef Terminal Access Button */}
          <button
            type="button"
            onClick={() => setIsChefBypass(true)}
            className="w-full mt-3 min-h-[3rem] bg-slate-900 hover:bg-black text-white rounded-full font-bold text-xs flex items-center justify-center gap-2 transition-all google-touch cursor-pointer shadow-md shadow-slate-900/10"
          >
            <Utensils size={15} />
            <span>Open Kitchen Screen (Chef Mode)</span>
            <ArrowRight size={14} />
          </button>

          {/* Collapsible Email form */}
          {!showEmailLogin ? (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setShowEmailLogin(true)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Sign in with Staff Email instead
              </button>
            </div>
          ) : (
            <form
              className="mt-6 space-y-3 pt-4 border-t border-slate-100"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setLoginError('');
                  await signInWithEmailAndPassword(auth, email, password);
                } catch (err: any) {
                  setLoginError(err?.message || 'Invalid staff credentials');
                }
              }}
            >
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Staff email" 
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-semibold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all" 
              />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Password" 
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-semibold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all" 
              />
              <button 
                type="submit" 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-xs transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/" className="text-xs font-bold text-blue-600 hover:underline">
              ← Return to PICT Canteen Menu
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 pb-28">
      
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <ChefHat size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Kitchen Display Screen
              </h1>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live KDS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              1-Tap live ticket workflow for chefs & counter team
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playChime();
            }}
            className={`px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
              placeholder="Search token #..."
              className="bg-white border border-slate-200 pl-9 pr-3.5 py-2 rounded-full text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono font-bold w-36 sm:w-44"
            />
          </div>

          <Link
            to="/admin"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <ShieldCheck size={14} className="text-blue-600" /> Manager
          </Link>

          <Link
            to="/live"
            target="_blank"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink size={14} /> TV Display
          </Link>

          {user && (
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut size={14} /> Sign out
            </button>
          )}
        </div>
      </div>

      {statusError && (
        <div className="max-w-7xl mx-auto mt-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-semibold flex justify-between gap-3 items-center">
          <span>{statusError}</span>
          <button type="button" onClick={() => setStatusError(null)} className="font-black text-rose-800">Dismiss</button>
        </div>
      )}

      {/* Metrics Row / Tabs */}
      <div className="max-w-7xl mx-auto grid grid-cols-4 gap-2.5 sm:gap-4 my-5">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'ALL' 
              ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
          }`}
        >
          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-75">
            All Tickets
          </div>
          <div className="text-xl sm:text-3xl font-black mt-1">
            {orders.length}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('Pending')}
          className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'Pending' 
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-sm' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
            <Clock size={13} /> New Orders
          </div>
          <div className="text-xl sm:text-3xl font-black text-slate-900 mt-1">
            {pendingOrders.length}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('PREPARING')}
          className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'PREPARING' 
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-sm' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1">
            <Flame size={13} /> Cooking
          </div>
          <div className="text-xl sm:text-3xl font-black text-slate-900 mt-1">
            {preparingOrders.length}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('READY')}
          className={`p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'READY' 
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
            <CheckCircle2 size={13} /> Ready
          </div>
          <div className="text-xl sm:text-3xl font-black text-slate-900 mt-1">
            {readyOrders.length}
          </div>
        </button>
      </div>

      {/* Ticket Cards Grid */}
      <div className="max-w-7xl mx-auto">
        {loading && orders.length === 0 ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
            <RefreshCw className="animate-spin text-blue-600" size={32} />
            <span className="font-bold text-sm">Syncing live kitchen tickets...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200/80 my-6 shadow-xs">
            <Sparkles size={40} className="mx-auto mb-3 text-amber-500" />
            <h3 className="font-bold text-slate-800 text-base">No active orders in this queue</h3>
            <p className="text-xs text-slate-400 mt-1">All tickets have been prepared and served to students!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map(order => {
              const isPaid = order.payment_status === 'Verified';

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border overflow-hidden shadow-xs transition-all hover:shadow-md flex flex-col ${
                    order.status === 'Pending'
                      ? 'border-amber-300'
                      : order.status === 'PREPARING'
                      ? 'border-blue-300'
                      : 'border-emerald-300'
                  }`}
                >
                  {/* Card Header */}
                  <div className={`p-4 sm:p-5 border-b ${
                    order.status === 'Pending'
                      ? 'bg-amber-50/70 border-amber-100'
                      : order.status === 'PREPARING'
                      ? 'bg-blue-50/70 border-blue-100'
                      : 'bg-emerald-50/70 border-emerald-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Token Number</span>
                        <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-900">
                          {order.token_number}
                        </span>
                      </div>
                      
                      {/* Status Tag */}
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border shadow-2xs ${
                        order.status === 'Pending'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : order.status === 'PREPARING'
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'bg-emerald-600 text-white border-emerald-700'
                      }`}>
                        {order.status === 'Pending' ? '⏳ Received' : order.status === 'PREPARING' ? '🍳 Cooking' : '🔔 Ready'}
                      </span>
                    </div>

                    {/* Payment & Schedule Meta */}
                    <div className="flex items-center justify-between mt-3 text-xs">
                      {isPaid ? (
                        <span className="flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <Check size={13} /> Paid ₹{order.total_amount}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 font-black text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200">
                          <Banknote size={13} /> Collect ₹{order.total_amount}
                        </span>
                      )}

                      {order.scheduled_for && (
                        <span className="text-slate-600 font-semibold bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[11px]">
                          🕒 {formatPickupSlot(order.scheduled_for)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 sm:p-5 space-y-2.5 flex-1 bg-slate-50/40">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center shrink-0 border border-slate-300">
                            {item.quantity}x
                          </span>
                          <span className="font-extrabold text-slate-900 leading-snug">
                            {item.name}
                          </span>
                        </div>
                        {item.is_express && (
                          <span className="text-[10px] uppercase font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                            ⚡ Express
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 1-Tap Action Button */}
                  <div className="p-3 sm:p-4 bg-white border-t border-slate-100 mt-auto">
                    {order.status === 'Pending' && (
                      <button
                        onClick={() => advanceOrder(order.id, 'PREPARING')}
                        disabled={isUpdating === order.id}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 google-touch cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Flame size={18} />
                        <span>Start Cooking ➔</span>
                      </button>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => advanceOrder(order.id, 'READY')}
                        disabled={isUpdating === order.id}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 google-touch cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <CheckCircle2 size={18} />
                        <span>Mark Ready for Pickup ➔</span>
                      </button>
                    )}

                    {order.status === 'READY' && (
                      <button
                        onClick={() => advanceOrder(order.id, 'COMPLETED')}
                        disabled={isUpdating === order.id}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 google-touch cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Check size={18} />
                        <span>Served & Clear Ticket ✓</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, type User } from 'firebase/auth';
import { auth, db, updateOrderStatusFn } from '../firebase';
import { assertIsAdmin } from '../lib/adminAuth';
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
  LogOut
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function KitchenView() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState('');
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setAuthLoading(false);
        return;
      }
      const ok = await assertIsAdmin(currentUser);
      if (!ok) {
        await signOut(auth);
        setLoginError('Kitchen access requires an admin account.');
        setUser(null);
      } else {
        setUser(currentUser);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Filtered orders query for admins — includes items for cooking tickets
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'orders'),
      where('status', 'in', ['Pending', 'PREPARING', 'READY'])
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const activeList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Order));

      activeList.sort((a, b) => {
        const timeA = (a.created_at as any)?.toMillis ? (a.created_at as any).toMillis() : 0;
        const timeB = (b.created_at as any)?.toMillis ? (b.created_at as any).toMillis() : 0;
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
      console.warn('Kitchen orders subscription error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [user, playChime]);

  const advanceOrder = async (orderId: string, nextStatus: 'PREPARING' | 'READY' | 'COMPLETED') => {
    setIsUpdating(orderId);
    setStatusError(null);
    const previous = snapshotBackupRef.current;

    setOrders(prev => {
      const updated = nextStatus === 'COMPLETED'
        ? prev.filter(o => o.id !== orderId)
        : prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o);
      return updated;
    });

    try {
      await updateOrderStatusFn({
        orderId,
        status: nextStatus,
        verifyPayment: nextStatus === 'PREPARING',
      });
    } catch (e: any) {
      console.error('Status update failed:', e);
      setOrders(previous);
      setStatusError(e?.message || 'Failed to update order status');
    } finally {
      setIsUpdating(null);
    }
  };

  if (authLoading) {
    return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center text-slate-500 font-bold text-sm">Checking kitchen access...</div>;
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-2">Kitchen Staff Login</h2>
          <p className="text-xs text-slate-500 mb-6">Admin credentials required. Public Live TV is at /live.</p>
          {loginError && <p className="text-rose-600 text-xs font-semibold mb-3">{loginError}</p>}
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                setLoginError('');
                await signInWithEmailAndPassword(auth, email, password);
              } catch {
                setLoginError('Invalid email or password');
              }
            }}
          >
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Staff email" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none" />
            <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm">Sign In</button>
          </form>
          <button
            type="button"
            onClick={async () => {
              try {
                setLoginError('');
                await signInWithPopup(auth, new GoogleAuthProvider());
              } catch {
                setLoginError('Google sign-in failed');
              }
            }}
            className="w-full mt-3 py-3 border border-slate-200 rounded-xl font-bold text-sm"
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 pb-28">
      
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <ChefHat size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Kitchen Display Screen
              </h1>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-emerald-200/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live KDS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              1-Tap order workflow for chefs & counter team
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
            className={`px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-2 border transition-all google-touch google-ripple cursor-pointer ${
              soundEnabled
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{soundEnabled ? 'Chime ON' : 'Chime Muted'}</span>
          </button>

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
              placeholder="Search token #..."
              className="bg-white border border-slate-200 pl-9 pr-3.5 py-2 rounded-full text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono font-semibold"
            />
          </div>

          <Link
            to="/admin"
            className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5 google-touch transition-all"
          >
            <ShieldCheck size={14} className="text-blue-600" /> Manager
          </Link>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-full text-xs font-bold flex items-center gap-1.5"
          >
            <LogOut size={14} /> Sign out
          </button>

          <Link
            to="/live"
            target="_blank"
            className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-bold flex items-center gap-1.5 google-touch transition-all"
          >
            <ExternalLink size={14} /> TV Display
          </Link>
        </div>
      </div>

      {statusError && (
        <div className="max-w-7xl mx-auto mt-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-semibold flex justify-between gap-3">
          <span>{statusError}</span>
          <button type="button" onClick={() => setStatusError(null)} className="font-black">Dismiss</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="max-w-7xl mx-auto grid grid-cols-3 gap-3 my-5">
        <button
          onClick={() => setActiveTab('Pending')}
          className={`p-3.5 sm:p-4 rounded-3xl border text-left transition-all google-touch cursor-pointer ${
            activeTab === 'Pending' 
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-sm' 
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
            <Clock size={14} /> New Orders
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {pendingOrders.length}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('PREPARING')}
          className={`p-3.5 sm:p-4 rounded-3xl border text-left transition-all google-touch cursor-pointer ${
            activeTab === 'PREPARING' 
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20 shadow-sm' 
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
            <Flame size={14} /> Cooking Now
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {preparingOrders.length}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('READY')}
          className={`p-3.5 sm:p-4 rounded-3xl border text-left transition-all google-touch cursor-pointer ${
            activeTab === 'READY' 
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm' 
              : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Ready at Counter
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {readyOrders.length}
          </div>
        </button>
      </div>

      {/* Ticket Cards Grid */}
      <div className="max-w-7xl mx-auto">
        {loading && orders.length === 0 ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
            <RefreshCw className="animate-spin text-blue-600" size={32} />
            <span className="font-bold text-sm">Loading live kitchen queue...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200/80 my-6 shadow-xs">
            <Sparkles size={40} className="mx-auto mb-3 text-amber-500" />
            <h3 className="font-bold text-slate-800 text-base">No active tickets in this view</h3>
            <p className="text-xs text-slate-400 mt-1">All tickets have been prepared and served!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map(order => {
              const isPaid = order.payment_status === 'Verified' || order.payment_method === 'Razorpay' || order.total_amount === 0;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-3xl border flex flex-col justify-between overflow-hidden transition-all shadow-md ${
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
                      <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
                        {order.token_number}
                      </span>
                      
                      {/* Status Tag */}
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                        order.status === 'Pending'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : order.status === 'PREPARING'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                          : 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
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
                        <span className="flex items-center gap-1.5 font-black text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200 animate-pulse">
                          <Banknote size={13} /> Collect ₹{order.total_amount}
                        </span>
                      )}

                      {order.scheduled_for && (
                        <span className="text-slate-600 font-semibold bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[11px]">
                          🕒 {order.scheduled_for}
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
                  <div className="p-3 sm:p-4 bg-white border-t border-slate-100">
                    {order.status === 'Pending' && (
                      <button
                        onClick={() => advanceOrder(order.id, 'PREPARING')}
                        disabled={isUpdating === order.id}
                        className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 google-touch google-ripple transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Flame size={18} />
                        <span>Start Cooking ➔</span>
                      </button>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => advanceOrder(order.id, 'READY')}
                        disabled={isUpdating === order.id}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 google-touch google-ripple transition-all cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 size={18} />
                        <span>Mark Ready for Pickup ➔</span>
                      </button>
                    )}

                    {order.status === 'READY' && (
                      <button
                        onClick={() => advanceOrder(order.id, 'COMPLETED')}
                        disabled={isUpdating === order.id}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 google-touch google-ripple transition-all cursor-pointer disabled:opacity-50"
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

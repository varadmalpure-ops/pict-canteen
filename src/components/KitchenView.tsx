import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
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
  Sparkles 
} from 'lucide-react';

const updateOrderStatusFn = httpsCallable(functions, 'updateOrderStatus');

export default function KitchenView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [searchToken, setSearchToken] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'Pending' | 'PREPARING' | 'READY'>('ALL');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const prevOrderCountRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play chime for incoming tickets
  const playChime = () => {
    if (!soundEnabled) return;
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
  };

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      const activeList = list.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
      
      if (prevOrderCountRef.current > 0 && activeList.length > prevOrderCountRef.current) {
        playChime();
      }
      prevOrderCountRef.current = activeList.length;
      setOrders(activeList);
      setLoading(false);
    }, (err) => {
      console.error('KDS subscription error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, [soundEnabled]);

  const advanceOrder = async (orderId: string, nextStatus: 'PREPARING' | 'READY' | 'COMPLETED') => {
    setIsUpdating(orderId);
    try {
      await updateOrderStatusFn({ orderId, status: nextStatus });
    } catch (e: any) {
      console.error('Status update failed:', e);
      alert(e?.message || 'Failed to update order status');
    } finally {
      setIsUpdating(null);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 pb-24">
      
      {/* Top Header Bar */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <ChefHat size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Kitchen Display Screen
              </h1>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                Live KDS
              </span>
            </div>
            <p className="text-xs text-slate-400">
              1-Tap tickets for cooks & counter staff
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
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              soundEnabled
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Chime ON' : 'Chime Muted'}</span>
          </button>

          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
              placeholder="Search token #..."
              className="bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-500 transition-all font-mono"
            />
          </div>

          <a
            href="/admin"
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-colors"
          >
            Manager Panel ➔
          </a>

          <a
            href="/live"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-bold transition-colors"
          >
            TV Display ↗
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="max-w-7xl mx-auto grid grid-cols-3 gap-3 my-5">
        <button
          onClick={() => setActiveTab('Pending')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'Pending' 
              ? 'bg-amber-500/15 border-amber-500/50 ring-1 ring-amber-500/30' 
              : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
          }`}
        >
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Clock size={14} /> New Orders
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">
            {pendingOrders.length}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('PREPARING')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'PREPARING' 
              ? 'bg-blue-500/15 border-blue-500/50 ring-1 ring-blue-500/30' 
              : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
          }`}
        >
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <Flame size={14} /> Cooking Now
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">
            {preparingOrders.length}
          </div>
        </button>

        <button
          onClick={() => setActiveTab('READY')}
          className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'READY' 
              ? 'bg-emerald-500/15 border-emerald-500/50 ring-1 ring-emerald-500/30' 
              : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900'
          }`}
        >
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Ready at Counter
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">
            {readyOrders.length}
          </div>
        </button>
      </div>

      {/* Ticket Cards Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-3">
            <RefreshCw className="animate-spin text-amber-500" size={32} />
            <span className="font-bold text-sm">Loading live kitchen queue...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center text-slate-600 bg-slate-900/40 rounded-3xl border border-slate-900 my-6">
            <Sparkles size={40} className="mx-auto mb-3 text-slate-700" />
            <h3 className="font-bold text-slate-400 text-base">No active orders in this view</h3>
            <p className="text-xs text-slate-600 mt-1">All tickets have been prepared and cleared!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map(order => {
              const isPaid = order.payment_status === 'Verified' || order.payment_method === 'Razorpay' || order.total_amount === 0;

              return (
                <div
                  key={order.id}
                  className={`bg-slate-900 rounded-3xl border flex flex-col justify-between overflow-hidden transition-all shadow-xl ${
                    order.status === 'Pending'
                      ? 'border-amber-500/40 ring-1 ring-amber-500/20'
                      : order.status === 'PREPARING'
                      ? 'border-blue-500/40 ring-1 ring-blue-500/20'
                      : 'border-emerald-500/40 ring-1 ring-emerald-500/20'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-900/90">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                        {order.token_number}
                      </span>
                      
                      {/* Status Tag */}
                      <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                        order.status === 'Pending'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : order.status === 'PREPARING'
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {order.status === 'Pending' ? '⏳ Received' : order.status === 'PREPARING' ? '🍳 Cooking' : '🔔 Ready'}
                      </span>
                    </div>

                    {/* Payment & Schedule Meta */}
                    <div className="flex items-center justify-between mt-3 text-xs">
                      {isPaid ? (
                        <span className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          <Check size={13} /> Paid ₹{order.total_amount}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 font-black text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 animate-pulse">
                          <Banknote size={13} /> Collect ₹{order.total_amount}
                        </span>
                      )}

                      {order.scheduled_for && (
                        <span className="text-slate-400 font-semibold bg-slate-800 px-2.5 py-1 rounded-lg text-[11px]">
                          🕒 {order.scheduled_for}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 sm:p-5 space-y-2.5 flex-1 bg-slate-900/50">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-black text-xs flex items-center justify-center shrink-0 border border-amber-500/30">
                            {item.quantity}x
                          </span>
                          <span className="font-extrabold text-slate-100 leading-snug">
                            {item.name}
                          </span>
                        </div>
                        {item.is_express && (
                          <span className="text-[10px] uppercase font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                            ⚡ Express
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 1-Tap Action Button */}
                  <div className="p-3 sm:p-4 bg-slate-950/80 border-t border-slate-800/80">
                    {order.status === 'Pending' && (
                      <button
                        onClick={() => advanceOrder(order.id, 'PREPARING')}
                        disabled={isUpdating === order.id}
                        className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        <Flame size={18} />
                        <span>Start Cooking ➔</span>
                      </button>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => advanceOrder(order.id, 'READY')}
                        disabled={isUpdating === order.id}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        <CheckCircle2 size={18} />
                        <span>Mark Ready for Pickup ➔</span>
                      </button>
                    )}

                    {order.status === 'READY' && (
                      <button
                        onClick={() => advanceOrder(order.id, 'COMPLETED')}
                        disabled={isUpdating === order.id}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
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

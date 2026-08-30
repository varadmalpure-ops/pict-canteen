import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, query, where, getDocs, documentId, limit } from 'firebase/firestore';
import {
  menuItemsCollection,
  ordersCollection,
  displayBoardCollection,
  auth,
  placeOrderFn,
  getPaymentConfigFn,
  createPaymentOrderFn,
} from '../firebase';
import type { MenuItem, OrderItem, Order } from '../types';
import {
  ShoppingCart,
  Plus,
  Minus,
  ChevronRight,
  X,
  Loader2,
  Users,
  Utensils,
  MapPin,
  Receipt,
  Search,
  RotateCcw,
  ChefHat,
  BellRing,
  CheckCircle2,
  Flame,
  Clock,
  Copy,
  Check,
  Zap,
  Sparkles,
} from 'lucide-react';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type PaymentProvider = 'razorpay' | 'upi_manual';

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function getFreshLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => reject(new Error('Please enable Location Access to verify you are on campus.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

export default function StudentView() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [activeOrderIds, setActiveOrderIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('activeOrderIds');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('activeOrderIds', JSON.stringify(activeOrderIds));
  }, [activeOrderIds]);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);

  const [locationReady, setLocationReady] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [splitMode, setSplitMode] = useState<'NONE' | 'EQUAL' | 'CUSTOM'>('NONE');
  const [splitCount, setSplitCount] = useState(2);
  const [remainingSplitItems, setRemainingSplitItems] = useState<OrderItem[]>([]);
  const [currentSplitSelection, setCurrentSplitSelection] = useState<Record<string, number>>({});
  const [scheduledFor, setScheduledFor] = useState<string>('now');
  const [customTime, setCustomTime] = useState<string>('');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('upi_manual');
  const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(null);

  const requestLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError('');
    try {
      const position = await getFreshLocation();
      setCoords(position);
      setLocationReady(true);
    } catch (e: any) {
      setLocationReady(false);
      setCoords(null);
      setLocationError(e.message || 'Location required');
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribeMenu = onSnapshot(menuItemsCollection, async (snapshot) => {
      const items = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as MenuItem))
        .filter(i => !i.isTest && Number(i.price) > 0);

      items.sort((a, b) => {
        const catA = (a.category || '').toLowerCase();
        const catB = (b.category || '').toLowerCase();
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      setMenu(items);
      setLoading(false);

      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        try {
          const pastOrdersQ = query(ordersCollection, where('uid', '==', auth.currentUser.uid), limit(20));
          const pastOrdersSnap = await getDocs(pastOrdersQ);
          const itemFreq: Record<string, number> = {};
          const pastList: Order[] = [];
          pastOrdersSnap.forEach(d => {
            const orderData = { id: d.id, ...d.data() } as Order;
            pastList.push(orderData);
            orderData.items?.forEach(item => {
              itemFreq[item.itemId] = (itemFreq[item.itemId] || 0) + item.quantity;
            });
          });
          const sortedIds = Object.keys(itemFreq).sort((a, b) => itemFreq[b] - itemFreq[a]).slice(0, 3);
          setRecommendations(items.filter(i => sortedIds.includes(i.id) && i.is_available));

          if (pastList.length > 0) {
            pastList.sort((a, b) => {
              const timeA = (a.created_at as any)?.toMillis ? (a.created_at as any).toMillis() : 0;
              const timeB = (b.created_at as any)?.toMillis ? (b.created_at as any).toMillis() : 0;
              return timeB - timeA;
            });
            setLastOrder(pastList[0]);
          }
        } catch (e) {
          console.error('Recommendations error:', e);
        }
      }
    }, () => setLoading(false));

    return () => unsubscribeMenu();
  }, []);

  useEffect(() => {
    const qQueue = query(displayBoardCollection, where('status', 'in', ['Pending', 'PREPARING']));
    const unsubQueue = onSnapshot(qQueue, (snap) => {
      setQueueCount(snap.size);
    }, () => {});
    return () => unsubQueue();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    getPaymentConfigFn()
      .then((res) => {
        const data = res.data as { provider: PaymentProvider; razorpayKeyId: string | null };
        setPaymentProvider(data.provider);
        setRazorpayKeyId(data.razorpayKeyId);
      })
      .catch(() => {
        setPaymentProvider('upi_manual');
      });
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    (async () => {
      try {
        const q = query(
          ordersCollection,
          where('uid', '==', auth.currentUser!.uid),
          where('status', 'in', ['Pending', 'PREPARING', 'READY'])
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const ids = snap.docs.map(d => d.id);
          setActiveOrderIds(prev => Array.from(new Set([...prev, ...ids])));
        }
      } catch (err) {
        console.error('Order recovery failed:', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeOrderIds.length === 0) {
      setActiveOrders([]);
      return;
    }

    const validIds = activeOrderIds.slice(0, 10);
    const q = query(ordersCollection, where(documentId(), 'in', validIds));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      let changed = false;
      const nextActiveIds = [...activeOrderIds];

      orders.forEach(orderData => {
        if (orderData.status === 'COMPLETED' || orderData.status === 'CANCELLED') {
          if (orderData.status === 'CANCELLED') {
            alert(`Your order ${orderData.token_number} was cancelled by the canteen. Please collect your refund from the counter.`);
          }
          const idx = nextActiveIds.indexOf(orderData.id);
          if (idx > -1) {
            nextActiveIds.splice(idx, 1);
            changed = true;
          }
        } else if (orderData.status === 'READY') {
          const notifKey = `notified_${orderData.id}`;
          if (!sessionStorage.getItem(notifKey)) {
            sessionStorage.setItem(notifKey, 'true');
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(() => {});
            } catch {}
            if ('vibrate' in navigator) {
              try { navigator.vibrate([200, 100, 200]); } catch {}
            }
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Your food is ready! 🔔', {
                body: `Token ${orderData.token_number} is ready for pickup at the counter!`,
                icon: '/pwa-192x192.png'
              });
            }
          }
        }
      });

      if (changed) {
        setActiveOrderIds(nextActiveIds);
        if (nextActiveIds.length === 0) setIsStatusModalOpen(false);
      }
      setActiveOrders(orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED'));
    });

    return () => unsubscribe();
  }, [activeOrderIds]);

  const repeatLastOrder = () => {
    if (!lastOrder || !lastOrder.items || lastOrder.items.length === 0) return;
    const itemsToAdd: OrderItem[] = [];
    lastOrder.items.forEach(orderItem => {
      const menuItem = menu.find(m => m.id === orderItem.itemId);
      if (menuItem && menuItem.is_available) {
        itemsToAdd.push({
          itemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: orderItem.quantity,
          is_express: menuItem.is_express
        });
      }
    });
    if (itemsToAdd.length > 0) {
      setCart(itemsToAdd);
    } else {
      alert('The items from your previous order are currently sold out.');
    }
  };

  const addToCart = (item: MenuItem) => {
    if (item.isTest || item.price <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.itemId === item.id);
      if (existing) {
        return prev.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { itemId: item.id, name: item.name, price: item.price, quantity: 1, is_express: item.is_express }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.map(i => i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const customSplitTotal = remainingSplitItems.reduce((sum, item) => sum + (item.price * (currentSplitSelection[item.itemId] || 0)), 0);
  const paymentAmount = splitMode === 'EQUAL'
    ? (cartTotal / splitCount)
    : splitMode === 'CUSTOM'
      ? customSplitTotal
      : cartTotal;

  const scheduleValue = scheduledFor === 'now' ? null : (scheduledFor === 'custom' ? (customTime || null) : scheduledFor);

  const submitOrder = async (paymentPayload: Record<string, unknown>) => {
    const position = coords ?? await getFreshLocation();
    setCoords(position);

    const items = cart.map(item => ({
      itemId: item.itemId,
      quantity: item.quantity,
    }));

    const result = await placeOrderFn({
      items,
      latitude: position.latitude,
      longitude: position.longitude,
      scheduled_for: scheduleValue,
      ...paymentPayload,
    });

    const data = result.data as { orderId: string; token_number: string };
    setActiveOrderIds(prev => prev.includes(data.orderId) ? prev : [...prev, data.orderId]);
    setCart([]);
    setIsStatusModalOpen(true);
    setIsPaymentModalOpen(false);
    setSplitMode('NONE');
    setSplitCount(2);
    setUtrNumber('');
  };

  const handlePaymentSubmit = async () => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    setIsProcessingPayment(true);
    try {
      const position = await getFreshLocation();
      setCoords(position);
      setLocationReady(true);

      if (paymentProvider === 'razorpay' && razorpayKeyId) {
        const created = await createPaymentOrderFn({
          items: cart.map(i => ({ itemId: i.itemId, quantity: i.quantity })),
          latitude: position.latitude,
          longitude: position.longitude,
          scheduled_for: scheduleValue,
        });
        const orderData = created.data as {
          razorpayOrderId: string;
          amount: number;
          currency: string;
          keyId: string;
        };

        const scriptOk = await loadRazorpayScript();
        if (!scriptOk || !window.Razorpay) {
          throw new Error('Could not load Razorpay checkout.');
        }

        await new Promise<void>((resolve, reject) => {
          const rzp = new window.Razorpay!({
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'PICT Canteen',
            description: 'Food order',
            order_id: orderData.razorpayOrderId,
            handler: async (response: {
              razorpay_order_id: string;
              razorpay_payment_id: string;
              razorpay_signature: string;
            }) => {
              try {
                await submitOrder({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                });
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
            prefill: { email: auth.currentUser?.email || '' },
          });
          rzp.open();
        });
      } else {
        if (utrNumber.length !== 12) {
          throw new Error('Enter a valid 12-digit UTR after paying via UPI.');
        }
        await submitOrder({ utr_number: utrNumber });
      }
    } catch (error: any) {
      console.error('Order placement failed:', error);
      const msg = error?.message || error?.code || 'Failed to place order. Please try again.';
      alert(typeof msg === 'string' ? msg : 'Failed to place order.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (!locationReady) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center p-6 text-center">
        <div className="bg-blue-50 p-6 rounded-full mb-4">
          <MapPin size={48} className="text-blue-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Location Required</h2>
        <p className="text-gray-600 font-medium max-w-sm mb-6">
          Location is checked on the server when you place an order. Please allow access so we can verify you are near PICT campus.
        </p>
        {locationError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 max-w-sm border border-red-100">
            {locationError}
          </div>
        )}
        <button
          onClick={requestLocation}
          disabled={isLocating}
          className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {isLocating ? <Loader2 className="animate-spin" size={20} /> : <MapPin size={20} />}
          {isLocating ? 'Locating...' : 'Verify My Location'}
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="animate-spin text-blue-600 mr-2" /> Loading Menu...</div>;
  }

  const rawCategories = Array.from(new Set(menu.map(item => item.category)));
  const categories = ['ALL', ...rawCategories];

  const filteredMenu = menu.filter(item => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const displayCategories = selectedCategory === 'ALL'
    ? rawCategories
    : rawCategories.filter(c => c === selectedCategory);

  return (
    <div className="max-w-3xl mx-auto p-4 pb-32">
      {/* Live Canteen Rush Meter */}
      <div className={`p-4 rounded-2xl mb-4 flex items-center justify-between border transition-all ${
        queueCount <= 5
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : queueCount <= 15
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            queueCount <= 5 ? 'bg-emerald-100 text-emerald-600' : queueCount <= 15 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
          }`}>
            <Clock size={20} />
          </div>
          <div>
            <div className="font-bold text-sm">
              {queueCount <= 5 ? '🟢 Low Rush (~3–5 min wait)' : queueCount <= 15 ? '🟡 Moderate Rush (~8–12 min wait)' : '🔴 Peak Rush (~15+ min wait)'}
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              {queueCount === 0 ? 'No queue right now — fastest pickup!' : `${queueCount} order${queueCount > 1 ? 's' : ''} currently being cooked`}
            </div>
          </div>
        </div>
      </div>

      {/* Repeat Last Order Shortcut */}
      {lastOrder && lastOrder.items && cart.length === 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl mb-6 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <RotateCcw size={20} />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider font-bold opacity-80">Repeat Last Order</div>
              <div className="font-bold text-sm line-clamp-1">
                {lastOrder.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
              </div>
            </div>
          </div>
          <button
            onClick={repeatLastOrder}
            className="bg-white text-blue-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-50 transition-colors shrink-0 shadow-sm"
          >
            Re-order ₹{lastOrder.total_amount}
          </button>
        </div>
      )}

      {/* Sticky Search & Category Filter Pills */}
      <div className="sticky top-2 z-20 bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="relative mb-3">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search samosa, cold coffee, noodles..."
            className="w-full bg-gray-50 pl-10 pr-10 py-2.5 rounded-xl text-sm outline-none border border-transparent focus:border-blue-500 focus:bg-white transition-all font-medium text-gray-900"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'ALL' ? '🌟 All Dishes' : cat}
            </button>
          ))}
        </div>
      </div>

      {recommendations.length > 0 && !searchQuery && selectedCategory === 'ALL' && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 px-1 flex items-center gap-2">
            <Sparkles size={20} className="text-amber-500" /> Recommended For You
          </h3>
          <div className="grid gap-3">
            {recommendations.map(item => {
              const cartItem = cart.find(i => i.itemId === item.id);
              return (
                <div key={`rec-${item.id}`} className="bg-gradient-to-r from-amber-50/50 via-white to-white p-4 rounded-2xl shadow-sm border border-amber-100 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {item.name}
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                        <Flame size={10} /> Popular
                      </span>
                    </div>
                    <div className="text-blue-600 font-bold mt-1">₹{item.price}</div>
                  </div>
                  {cartItem ? (
                    <div className="flex items-center gap-3 bg-white rounded-full p-1 border border-blue-200 shadow-sm">
                      <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><Minus size={18} /></button>
                      <span className="font-semibold w-4 text-center">{cartItem.quantity}</span>
                      <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"><Plus size={18} /></button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-full flex items-center gap-1 shadow-sm transition-colors text-sm">
                      <Plus size={16} /> Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filteredMenu.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-3xl border border-gray-100">
          <Utensils size={40} className="text-gray-300 mx-auto mb-3" />
          <h4 className="font-bold text-gray-700 text-lg">No dishes found</h4>
          <p className="text-xs text-gray-400 mt-1">Try searching for something else or clearing filters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {displayCategories.map(category => {
            const categoryItems = filteredMenu.filter(item => item.category === category);
            if (categoryItems.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-lg font-bold text-gray-800 mb-4 px-1 flex items-center justify-between border-b pb-2">
                  <span>{category}</span>
                  <span className="text-xs font-medium text-gray-400">{categoryItems.length} items</span>
                </h3>
                <div className="grid gap-3">
                  {categoryItems.map(item => {
                    const cartItem = cart.find(i => i.itemId === item.id);
                    return (
                      <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:border-gray-200 transition-colors">
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {item.name}
                            {item.is_express && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <Zap size={10} /> Express (&lt;3m)
                              </span>
                            )}
                            {!item.is_available && (
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Sold out</span>
                            )}
                          </div>
                          <div className="text-blue-600 font-bold mt-1 text-sm">₹{item.price}</div>
                        </div>
                        {item.is_available ? (
                          cartItem ? (
                            <div className="flex items-center gap-3 bg-gray-50 rounded-full p-1 border border-gray-200 shadow-sm">
                              <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center"><Minus size={18} /></button>
                              <span className="font-bold w-4 text-center text-sm">{cartItem.quantity}</span>
                              <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"><Plus size={18} /></button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(item)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold px-5 py-2 rounded-full flex items-center gap-1 text-sm transition-colors">
                              <Plus size={16} /> Add
                            </button>
                          )
                        ) : (
                          <div className="text-gray-400 font-medium text-xs px-3.5 py-1.5 bg-gray-50 rounded-full border">Unavailable</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-12 pb-6 z-30">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => {
                setRemainingSplitItems(cart.map(item => ({ ...item })));
                setCurrentSplitSelection({});
                setSplitMode('NONE');
                setIsPaymentModalOpen(true);
              }}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-2xl p-4 flex items-center justify-between shadow-2xl transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><ShoppingCart size={20} /></div>
                <div className="text-left">
                  <div className="font-semibold">{cart.reduce((a, b) => a + b.quantity, 0)} items in Cart</div>
                  <div className="text-gray-300 text-xs">
                    {paymentProvider === 'razorpay' ? 'Online Payment' : 'UPI Payment + UTR Verification'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-black text-xl">₹{cartTotal}</span>
                <ChevronRight size={24} className="opacity-70" />
              </div>
            </button>
          </div>
        </div>
      )}

      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4 pb-0 sm:pb-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Complete Payment</h3>
              <button onClick={() => !isProcessingPayment && setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            {paymentProvider === 'upi_manual' && (
              <div className="bg-amber-50 text-amber-900 p-3.5 rounded-xl mb-4 text-xs font-medium border border-amber-100">
                Pay to the official Canteen UPI ID, enter your 12-digit UTR below, and your food token will be generated immediately.
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-2xl mb-6 border border-gray-100">
              <div className="flex items-center gap-2 text-gray-700 mb-3">
                <Users size={20} />
                <span className="font-bold text-sm">Bill Split Calculator</span>
              </div>
              <p className="text-xs text-amber-600 mb-2 font-medium">
                ⚠️ The full order amount is always charged. This tool only shows how to split it between friends.
              </p>
              <div className="flex bg-gray-200/50 p-1 rounded-xl gap-1 mb-3">
                {(['NONE', 'EQUAL', 'CUSTOM'] as const).map(mode => (
                  <button key={mode} onClick={() => setSplitMode(mode)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${splitMode === mode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                    {mode === 'NONE' ? 'None' : mode === 'EQUAL' ? 'Equally' : 'Custom'}
                  </button>
                ))}
              </div>
              {splitMode === 'EQUAL' && (
                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Number of people:</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSplitCount(Math.max(2, splitCount - 1))} className="p-1"><Minus size={16} /></button>
                    <span className="font-bold w-4 text-center">{splitCount}</span>
                    <button onClick={() => setSplitCount(splitCount + 1)} className="p-1"><Plus size={16} /></button>
                  </div>
                </div>
              )}
              {splitMode === 'CUSTOM' && (
                <div className="bg-white p-3 rounded-xl border border-gray-100 mt-4 max-h-48 overflow-y-auto">
                  {remainingSplitItems.map(item => {
                    const selected = currentSplitSelection[item.itemId] || 0;
                    return (
                      <div key={item.itemId} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-gray-500">₹{item.price} · {item.quantity} left</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setCurrentSplitSelection(prev => ({ ...prev, [item.itemId]: Math.max(0, (prev[item.itemId] || 0) - 1) }))} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"><Minus size={14} /></button>
                          <span className="font-bold text-sm w-4 text-center">{selected}</span>
                          <button onClick={() => setCurrentSplitSelection(prev => ({ ...prev, [item.itemId]: Math.min(item.quantity, (prev[item.itemId] || 0) + 1) }))} className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Plus size={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Pickup Time</label>
              <select value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="w-full bg-white px-4 py-3 rounded-xl border border-gray-200 outline-none font-medium mb-2 text-sm">
                <option value="now">Now (Prepare Immediately)</option>
                <option value="11:00 AM">11:00 AM (Recess Break)</option>
                <option value="1:00 PM">1:00 PM (Lunch Break)</option>
                <option value="custom">Custom Time...</option>
              </select>
              {scheduledFor === 'custom' && (
                <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="w-full bg-white px-4 py-3 rounded-xl border border-gray-200 outline-none font-medium text-sm" />
              )}
            </div>

            <div className="text-center mb-6">
              <div className="text-gray-500 text-xs font-medium mb-1">Total Payable</div>
              <div className="text-4xl font-black text-gray-900">₹{paymentAmount.toFixed(2)}</div>
            </div>

            {paymentProvider === 'upi_manual' && (
              <div className="mb-6 flex flex-col items-center bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Canteen UPI ID</div>
                <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-gray-200 mb-5 w-full justify-between">
                  <span className="font-bold text-gray-900 text-base tracking-wide">Q829774745@ybl</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('Q829774745@ybl');
                      setCopiedUpi(true);
                      setTimeout(() => setCopiedUpi(false), 2000);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors ${
                      copiedUpi ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    {copiedUpi ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                  </button>
                </div>

                <div className="w-full text-left">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">Enter 12-Digit UPI Ref / UTR Number</label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="e.g. 312345678901"
                    className={`w-full bg-white px-4 py-3.5 rounded-xl border-2 outline-none font-bold tracking-[0.2em] text-center text-lg ${utrNumber.length === 12 ? 'border-green-500' : 'border-gray-200'}`}
                    maxLength={12}
                  />
                  <p className="text-[11px] text-gray-400 text-center mt-1.5">Found in your UPI payment details receipt</p>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                if (splitMode === 'CUSTOM' && remainingSplitItems.length > 0) {
                  const newRemaining = remainingSplitItems.map(item => {
                    const selected = currentSplitSelection[item.itemId] || 0;
                    return { ...item, quantity: item.quantity - selected };
                  }).filter(item => item.quantity > 0);
                  if (newRemaining.length === 0) {
                    handlePaymentSubmit();
                  } else {
                    setRemainingSplitItems(newRemaining);
                    setCurrentSplitSelection({});
                    setUtrNumber('');
                  }
                } else {
                  handlePaymentSubmit();
                }
              }}
              disabled={
                isProcessingPayment ||
                (paymentProvider === 'upi_manual' && utrNumber.length !== 12) ||
                (splitMode === 'CUSTOM' && customSplitTotal === 0 && remainingSplitItems.length > 0)
              }
              className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg transition-colors"
            >
              {isProcessingPayment ? (
                <><Loader2 size={24} className="animate-spin" /> Placing Order...</>
              ) : paymentProvider === 'razorpay' ? (
                'Pay Securely & Place Order'
              ) : (
                'Submit UTR & Place Order'
              )}
            </button>
          </div>
        </div>
      )}

      {activeOrders.length > 0 && !isStatusModalOpen && (
        <button onClick={() => setIsStatusModalOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 hover:scale-105 transition-transform">
          <Receipt size={24} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {activeOrders.length}
          </span>
        </button>
      )}

      {activeOrders.length > 0 && isStatusModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="font-bold text-lg text-gray-900">Your Active Food Tokens</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2"><X size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4">
              {activeOrders.map(order => (
                <div key={order.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-200 shadow-sm">
                  <div className="text-center mb-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Your Token Number</div>
                    <div className="text-5xl font-black text-blue-600 tracking-tight">{order.token_number}</div>
                    {order.payment_status === 'Unverified' && (
                      <div className="mt-2 text-xs font-bold text-amber-700 bg-amber-50 py-1 px-3 rounded-full inline-block">
                        Payment verification pending at counter
                      </div>
                    )}
                  </div>

                  {/* Visual 3-Step Timeline Tracker */}
                  <div className="flex items-center justify-between my-5 px-2">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        order.status ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-400'
                      }`}>
                        <CheckCircle2 size={18} />
                      </div>
                      <span className="text-[11px] font-bold text-gray-700 mt-1">Placed</span>
                    </div>

                    <div className={`h-1 flex-1 mx-1 rounded transition-all ${
                      order.status === 'PREPARING' || order.status === 'READY' ? 'bg-orange-500' : 'bg-gray-200'
                    }`} />

                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        order.status === 'PREPARING'
                          ? 'bg-orange-500 text-white ring-4 ring-orange-200 animate-pulse'
                          : order.status === 'READY'
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                      }`}>
                        <ChefHat size={18} />
                      </div>
                      <span className="text-[11px] font-bold text-gray-700 mt-1">Cooking</span>
                    </div>

                    <div className={`h-1 flex-1 mx-1 rounded transition-all ${
                      order.status === 'READY' ? 'bg-green-500' : 'bg-gray-200'
                    }`} />

                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        order.status === 'READY'
                          ? 'bg-green-500 text-white ring-4 ring-green-200 shadow-lg'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        <BellRing size={18} />
                      </div>
                      <span className="text-[11px] font-bold text-gray-700 mt-1">Pickup</span>
                    </div>
                  </div>

                  {order.status === 'READY' ? (
                    <div className="bg-green-600 text-white p-3.5 rounded-xl font-bold text-sm text-center shadow-md animate-bounce">
                      🎉 Ready for Pickup! Collect at Counter.
                    </div>
                  ) : (
                    <div className="bg-white border p-3 rounded-xl text-xs text-center text-gray-600 font-medium">
                      Estimated status: <strong className="text-gray-900">{order.status === 'Pending' ? 'Waiting in queue' : 'Being prepared'}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

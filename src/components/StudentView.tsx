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
  Search,
  RotateCcw,
  Sparkles,
  Receipt,
  X,
  Loader2,
  UtensilsCrossed,
} from 'lucide-react';
import DishCard from './DishCard';
import RushMeter from './RushMeter';
import CheckoutModal from './CheckoutModal';
import OrderTrackerModal from './OrderTrackerModal';

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

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [scheduledFor, setScheduledFor] = useState<string>('now');
  const [customTime, setCustomTime] = useState<string>('');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('razorpay');
  const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>('rzp_test_TVtehvAXj8IuPh');

  // Background geolocation prefetch
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    }
  }, []);

  // Fetch Menu and Past Orders for Repeat Order
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

  // Listen to Live Canteen Rush Queue
  useEffect(() => {
    const qQueue = query(displayBoardCollection, where('status', 'in', ['Pending', 'PREPARING']));
    const unsubQueue = onSnapshot(qQueue, (snap) => {
      setQueueCount(snap.size);
    }, () => {});
    return () => unsubQueue();
  }, []);

  // Fetch payment config
  const fetchPaymentConfig = useCallback(async () => {
    try {
      const res = await getPaymentConfigFn();
      const data = res.data as { provider: PaymentProvider; razorpayKeyId: string | null };
      if (data && data.provider) {
        setPaymentProvider(data.provider);
      }
      if (data && data.razorpayKeyId) {
        setRazorpayKeyId(data.razorpayKeyId);
      }
    } catch {
      setPaymentProvider('razorpay');
      setRazorpayKeyId('rzp_test_TVtehvAXj8IuPh');
    }
  }, []);

  useEffect(() => {
    fetchPaymentConfig();
  }, [fetchPaymentConfig]);

  // Recover active orders
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

  // Sync active orders snapshot
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
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
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
            description: 'Food Order',
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
            theme: { color: '#4F46E5' }
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

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center text-slate-500 gap-3">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <span className="font-bold text-sm">Loading canteen menu...</span>
      </div>
    );
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
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-36">
      
      {/* Live Rush Meter */}
      <RushMeter queueCount={queueCount} />

      {/* 1-Tap Repeat Order Banner */}
      {lastOrder && lastOrder.items && cart.length === 0 && (
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white p-4 rounded-2xl mb-5 flex items-center justify-between shadow-lg shadow-indigo-500/15">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <RotateCcw size={18} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-black opacity-80">
                1-Tap Repeat Order
              </div>
              <div className="font-bold text-xs line-clamp-1 mt-0.5">
                {lastOrder.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
              </div>
            </div>
          </div>
          <button
            onClick={repeatLastOrder}
            className="bg-white text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-xl text-xs font-black shrink-0 shadow-xs active:scale-95 transition-all"
          >
            Re-order ₹{lastOrder.total_amount}
          </button>
        </div>
      )}

      {/* Sticky Search Bar & Category Chips */}
      <div className="sticky top-18 z-30 bg-white/90 backdrop-blur-xl p-2.5 rounded-2xl shadow-sm border border-slate-200/80 mb-6">
        <div className="relative mb-2.5">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search samosa, cold coffee, noodles, thali..."
            className="w-full bg-slate-50 pl-10 pr-9 py-2.5 rounded-xl text-xs font-semibold text-slate-900 outline-none border border-transparent focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Horizontal Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all text-xs ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'ALL' ? '🌟 All Dishes' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Recommended For You Section */}
      {recommendations.length > 0 && !searchQuery && selectedCategory === 'ALL' && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3.5 px-1">
            <Sparkles size={16} className="text-amber-500" />
            <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
              Recommended For You
            </h3>
          </div>
          <div className="grid gap-2.5">
            {recommendations.map(item => (
              <DishCard
                key={`rec-${item.id}`}
                item={item}
                cartItem={cart.find(i => i.itemId === item.id)}
                isPopular
                onAddToCart={addToCart}
                onRemoveFromCart={removeFromCart}
              />
            ))}
          </div>
        </div>
      )}

      {/* Dishes by Category */}
      {filteredMenu.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/80 my-4">
          <UtensilsCrossed size={36} className="mx-auto mb-2 text-slate-300" />
          <h4 className="font-bold text-slate-700 text-sm">No dishes found</h4>
          <p className="text-xs text-slate-400 mt-1">Try another search keyword or select All Dishes.</p>
        </div>
      ) : (
        <div className="space-y-7">
          {displayCategories.map(category => {
            const categoryItems = filteredMenu.filter(item => item.category === category);
            if (categoryItems.length === 0) return null;

            return (
              <div key={category}>
                <div className="flex justify-between items-baseline mb-3 px-1 border-b border-slate-200/70 pb-2">
                  <h3 className="font-black text-sm text-slate-900 tracking-tight">{category}</h3>
                  <span className="text-[11px] font-bold text-slate-400">{categoryItems.length} items</span>
                </div>
                <div className="grid gap-2.5">
                  {categoryItems.map(item => (
                    <DishCard
                      key={item.id}
                      item={item}
                      cartItem={cart.find(i => i.itemId === item.id)}
                      isPopular={recommendations.some(r => r.id === item.id)}
                      onAddToCart={addToCart}
                      onRemoveFromCart={removeFromCart}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Dynamic Cart Capsule (iOS/Swiggy-style) */}
      {cart.length > 0 && (
        <div className="fixed bottom-5 left-0 right-0 px-4 z-30 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => {
                fetchPaymentConfig();
                setIsPaymentModalOpen(true);
              }}
              className="w-full bg-slate-900 hover:bg-black text-white rounded-2xl p-3.5 px-5 flex items-center justify-between shadow-2xl shadow-slate-900/30 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <ShoppingCart size={16} />
                </div>
                <div className="text-left">
                  <span className="font-bold text-xs block">{totalCartCount} item{totalCartCount > 1 ? 's' : ''} in cart</span>
                  <span className="text-[11px] text-slate-300 font-medium">
                    {paymentProvider === 'razorpay' ? '1-Click Online' : 'Manual UPI'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-black text-lg">₹{cartTotal.toFixed(2)}</span>
                <span className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
                  Pay ➔
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Floating Active Orders Badge */}
      {activeOrders.length > 0 && !isStatusModalOpen && (
        <button
          onClick={() => setIsStatusModalOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl shadow-indigo-600/30 flex items-center justify-center z-40 active:scale-95 transition-all"
          aria-label="View active orders"
        >
          <Receipt size={22} />
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-white">
            {activeOrders.length}
          </span>
        </button>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        cart={cart}
        cartTotal={cartTotal}
        paymentProvider={paymentProvider}
        onSelectPaymentProvider={setPaymentProvider}
        scheduledFor={scheduledFor}
        onSelectScheduledFor={setScheduledFor}
        customTime={customTime}
        onSelectCustomTime={setCustomTime}
        utrNumber={utrNumber}
        onChangeUtrNumber={setUtrNumber}
        isProcessing={isProcessingPayment}
        onSubmit={handlePaymentSubmit}
      />

      {/* Order Tracker Modal */}
      <OrderTrackerModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        orders={activeOrders}
      />

    </div>
  );
}

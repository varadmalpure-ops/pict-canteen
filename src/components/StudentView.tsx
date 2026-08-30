import { useState, useEffect, useCallback, useMemo } from 'react';
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
import CartReviewView from './CartReviewView';
import OrderTrackerModal from './OrderTrackerModal';
import { formatTime12h } from '../lib/timeUtils';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type PaymentProvider = 'razorpay' | 'pay_at_counter';

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
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: 18.4584975, longitude: 73.8512198 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve({ latitude: 18.4584975, longitude: 73.8512198 }),
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 }
    );
  });
}

export default function StudentView() {
  // Instant cache-first menu initialization for 0ms visual render
  const [menu, setMenu] = useState<MenuItem[]>(() => {
    try {
      const cached = localStorage.getItem('pict_canteen_menu_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
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
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('pict_canteen_menu_cache');
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);

  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string>('now');
  const [customTime, setCustomTime] = useState<string>('');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('pay_at_counter');
  const [razorpayKeyId, setRazorpayKeyId] = useState<string | null>(
    import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TVuVkuYU2i4kWc'
  );

  // Background geolocation prefetch & Razorpay script preload
  useEffect(() => {
    loadRazorpayScript();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {},
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 600000 }
      );
    }
  }, []);

  // Fetch Menu synchronously & fast with localStorage caching
  useEffect(() => {
    const unsubscribeMenu = onSnapshot(menuItemsCollection, (snapshot) => {
      const items = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as MenuItem))
        .filter(i => Number(i.price) >= 0);

      items.sort((a, b) => {
        const catA = (a.category || '').toLowerCase();
        const catB = (b.category || '').toLowerCase();
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      setMenu(items);
      setLoading(false);
      try {
        localStorage.setItem('pict_canteen_menu_cache', JSON.stringify(items));
      } catch {}
    }, () => setLoading(false));

    return () => unsubscribeMenu();
  }, []);

  // Fetch Past Orders independently once
  useEffect(() => {
    if (!auth.currentUser || auth.currentUser.isAnonymous || menu.length === 0) return;
    
    async function loadPastOrders() {
      try {
        const pastOrdersQ = query(ordersCollection, where('uid', '==', auth.currentUser!.uid), limit(15));
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
        setRecommendations(menu.filter(i => sortedIds.includes(i.id) && i.is_available));

        if (pastList.length > 0) {
          pastList.sort((a, b) => {
            const timeA = (a.created_at as any)?.toMillis ? (a.created_at as any).toMillis() : 0;
            const timeB = (b.created_at as any)?.toMillis ? (b.created_at as any).toMillis() : 0;
            return timeB - timeA;
          });
          setLastOrder(pastList[0]);
        }
      } catch (e) {
        console.error('Past orders error:', e);
      }
    }
    loadPastOrders();
  }, [menu]);

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

  const repeatLastOrder = useCallback(() => {
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
  }, [lastOrder, menu]);

  const addToCart = useCallback((item: MenuItem) => {
    if (item.price < 0) return;
    setCart(prev => {
      const existing = prev.find(i => i.itemId === item.id);
      if (existing) {
        return prev.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { itemId: item.id, name: item.name, price: item.price, quantity: 1, is_express: item.is_express }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.map(i => i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const scheduleValue = scheduledFor === 'now' ? null : (scheduledFor === 'custom' ? (customTime ? formatTime12h(customTime) : null) : scheduledFor);

  const submitOrder = async (paymentPayload: Record<string, unknown>) => {
    let position = coords;
    try {
      if (!position) position = await getFreshLocation();
    } catch {
      position = { latitude: 18.4584975, longitude: 73.8512198 };
    }
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
  };

  const handlePaymentSubmit = async () => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    setIsProcessingPayment(true);
    try {
      const position = coords || { latitude: 18.4584975, longitude: 73.8512198 };
      setCoords(position);

      // ₹0 Sample Test or Pay at Counter
      if (cartTotal === 0 || paymentProvider === 'pay_at_counter') {
        await submitOrder({
          payment_method: cartTotal === 0 ? 'FREE_SAMPLE_TEST' : 'PAY_AT_COUNTER',
        });
        return;
      }

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
            description: 'Food Order Payment',
            order_id: orderData.razorpayOrderId,
            prefill: {
              name: auth.currentUser?.displayName || 'Student',
              email: auth.currentUser?.email || '',
              contact: '9999999999'
            },
            theme: { color: '#4F46E5' },
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
                  payment_method: 'RAZORPAY',
                });
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            modal: {
              ondismiss: () => reject(new Error('Payment cancelled')),
              escape: true,
            }
          });
          rzp.open();
        });
      }
    } catch (error: any) {
      console.error('Order placement failed:', error);
      const msg = error?.message || error?.code || 'Failed to place order. Please try again.';
      alert(typeof msg === 'string' ? msg : 'Failed to place order.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const rawCategories = useMemo(() => Array.from(new Set(menu.map(item => item.category))), [menu]);
  const categories = useMemo(() => ['ALL', ...rawCategories], [rawCategories]);

  const filteredMenu = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return menu.filter(item => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        (item.category || '').toLowerCase().includes(query)
      );
    });
  }, [menu, selectedCategory, searchQuery]);

  const displayCategories = useMemo(() => {
    return selectedCategory === 'ALL'
      ? rawCategories
      : rawCategories.filter(c => c === selectedCategory);
  }, [rawCategories, selectedCategory]);

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center text-slate-500 dark:text-slate-400 gap-3">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={32} />
        <span className="font-bold text-xs">Loading PICT canteen menu...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-36 transition-colors duration-200">
      
      {/* Sticky Google-styled Search Bar & Category Chips - DOCKED FLUSH under Navbar (Zero Gap!) */}
      <div className="sticky top-16 z-30 bg-slate-50/95 dark:bg-[#0f141c]/95 backdrop-blur-xl pt-2 pb-3 mb-4 border-b border-slate-200/60 dark:border-slate-800/60 -mx-4 px-4 transition-colors">
        <div className="relative mb-2.5">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
            <Search size={17} className="text-blue-600 dark:text-blue-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search samosa, cold coffee, noodles, thali..."
            className="w-full bg-white dark:bg-slate-900 pl-11 pr-10 py-3 rounded-full text-xs font-semibold text-slate-900 dark:text-white outline-none border border-slate-200/90 dark:border-slate-800 shadow-sm focus:border-blue-500 dark:focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 google-touch cursor-pointer"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Horizontal Category Filter Pills (Google Pill Style) */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 text-xs no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full font-bold whitespace-nowrap transition-all text-xs google-touch google-ripple cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 dark:bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                  : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-700'
              }`}
            >
              {cat === 'ALL' ? '🌟 All Dishes' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Live Rush Meter */}
      <RushMeter queueCount={queueCount} />

      {/* 1-Tap Repeat Order Banner - Fixed & Stable */}
      {lastOrder && lastOrder.items && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white p-4 rounded-2xl mb-5 flex items-center justify-between shadow-lg shadow-blue-500/15">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-xl">
              <RotateCcw size={18} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-black opacity-90">
                1-Tap Repeat Order
              </div>
              <div className="font-bold text-xs line-clamp-1 mt-0.5">
                {lastOrder.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
              </div>
            </div>
          </div>
          <button
            onClick={repeatLastOrder}
            className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-xl text-xs font-black shrink-0 shadow-xs google-touch google-ripple transition-all cursor-pointer"
          >
            Re-order ₹{lastOrder.total_amount}
          </button>
        </div>
      )}

      {/* Recommended For You Section */}
      {recommendations.length > 0 && !searchQuery && selectedCategory === 'ALL' && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3.5 px-1">
            <Sparkles size={16} className="text-amber-500" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
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
        <div className="p-12 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 my-4">
          <UtensilsCrossed size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">No dishes found</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try another search keyword or select All Dishes.</p>
        </div>
      ) : (
        <div className="space-y-7">
          {displayCategories.map(category => {
            const categoryItems = filteredMenu.filter(item => item.category === category);
            if (categoryItems.length === 0) return null;

            return (
              <div key={category}>
                <div className="flex justify-between items-baseline mb-3 px-1 border-b border-slate-200/70 dark:border-slate-800/70 pb-2">
                  <h3 className="font-black text-sm text-slate-900 dark:text-white tracking-tight">{category}</h3>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{categoryItems.length} items</span>
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

      {/* Floating Dynamic Cart Capsule (Google Pill style with elevation) */}
      {cart.length > 0 && (
        <div className="fixed bottom-5 left-0 right-0 px-4 z-30 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => {
                fetchPaymentConfig();
                setIsPaymentModalOpen(true);
              }}
              className="w-full bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white rounded-full p-3.5 px-5 flex items-center justify-between shadow-2xl shadow-slate-900/30 dark:shadow-blue-600/30 google-touch google-ripple transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-white/20 text-white flex items-center justify-center">
                  <ShoppingCart size={16} />
                </div>
                <div className="text-left">
                  <span className="font-bold text-xs block">{totalCartCount} item{totalCartCount > 1 ? 's' : ''} in cart</span>
                  <span className="text-[11px] text-slate-300 dark:text-blue-100 font-medium">
                    {paymentProvider === 'pay_at_counter' ? 'Pay at Counter' : 'Online Payment'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-black text-lg">₹{cartTotal.toFixed(2)}</span>
                <span className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3.5 py-1.5 rounded-full transition-colors">
                  Review & Pay ➔
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
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl shadow-blue-600/40 flex items-center justify-center z-40 google-touch google-ripple transition-all cursor-pointer"
          aria-label="View active orders"
        >
          <Receipt size={22} />
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-white dark:border-slate-900">
            {activeOrders.length}
          </span>
        </button>
      )}

      {/* Full-Screen Blinkit/Swiggy-style Order Review & Checkout */}
      <CartReviewView
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        cart={cart}
        menu={menu}
        onAddToCart={addToCart}
        onRemoveFromCart={removeFromCart}
        onClearCart={() => setCart([])}
        cartTotal={cartTotal}
        paymentProvider={paymentProvider}
        onSelectPaymentProvider={setPaymentProvider}
        scheduledFor={scheduledFor}
        onSelectScheduledFor={setScheduledFor}
        customTime={customTime}
        onSelectCustomTime={setCustomTime}
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

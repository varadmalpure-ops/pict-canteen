import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { onSnapshot, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import {
  menuItemsCollection,
  ordersCollection,
  displayBoardCollection,
} from '../firebase';
import { createStudentOrder } from '../lib/orderService';
import type { MenuItem, OrderItem, Order } from '../types';
import {
  ShoppingCart,
  Search,
  RotateCcw,
  Sparkles,
  X,
  Loader2,
  UtensilsCrossed,
} from 'lucide-react';
import DishCard from './DishCard';
import RushMeter from './RushMeter';
import StudentAuth from './StudentAuth';
import type { User } from 'firebase/auth';

const CartReviewView = lazy(() => import('./CartReviewView'));

type StudentViewProps = {
  user: User | null;
  userRecordReady: boolean;
  sharedActiveOrders: Order[];
  onOrderPlaced: (order: Order) => void;
  onOrderRejected: (orderId: string) => void;
};

export default function StudentView({ user, userRecordReady, sharedActiveOrders, onOrderPlaced, onOrderRejected }: StudentViewProps) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const activeOrders = sharedActiveOrders;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [lastOrderEntry, setLastOrderEntry] = useState<{ uid: string; order: Order } | null>(null);
  const lastOrder = lastOrderEntry?.uid === user?.uid ? lastOrderEntry?.order ?? null : null;
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [loading, setLoading] = useState(true);
  const [recommendationEntry, setRecommendationEntry] = useState<{ uid: string; items: MenuItem[] } | null>(null);
  const recommendations = recommendationEntry?.uid === user?.uid ? recommendationEntry?.items ?? [] : [];
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string>('now');
  const [customTime, setCustomTime] = useState<string>('');
  const [orderNotice, setOrderNotice] = useState<string | null>(null);
  const currentUidRef = useRef(user?.uid ?? null);
  currentUidRef.current = user?.uid ?? null;

  // Firestore's persistent cache is the single source for hydration; stale
  // localStorage menu snapshots caused a visible correction after refresh.
  useEffect(() => {
    const unsubscribeMenu = onSnapshot(query(menuItemsCollection, limit(200)), (snapshot) => {
      const items = snapshot.docs
        .map(d => {
          const data = d.data();
          return { id: d.id, ...data, price: Number(data.price) } as MenuItem;
        })
        .filter(i => Number.isFinite(i.price) && i.price > 0 && typeof i.name === 'string' && typeof i.category === 'string');

      items.sort((a, b) => {
        const catA = (a.category || '').toLowerCase();
        const catB = (b.category || '').toLowerCase();
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
      setMenu(items);
      setCart(prevCart => prevCart.flatMap(cartItem => {
        const found = items.find(m => m.id === cartItem.itemId);
        if (!found || !found.is_available) return [];
        return [{ ...cartItem, name: found.name, price: found.price, is_express: found.is_express }];
      }));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsubscribeMenu();
  }, []);

  const lastLoadedUidRef = useRef<string | null>(null);

  // Keep the cart across sign-in, then continue when the Spark profile document is ready.
  useEffect(() => {
    if (user && userRecordReady && isAuthModalOpen) {
      setIsAuthModalOpen(false);
      if (cart.length > 0) {
        setIsPaymentModalOpen(true);
      }
    }
  }, [user, userRecordReady, isAuthModalOpen, cart.length]);

  const previouslyReadyRef = useRef(new Set<string>());
  useEffect(() => {
    if (!user) {
      previouslyReadyRef.current.clear();
      return;
    }
    for (const order of activeOrders) {
      if (order.status !== 'READY' || previouslyReadyRef.current.has(order.id)) continue;
      previouslyReadyRef.current.add(order.id);
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      } catch {}
      if ('vibrate' in navigator) {
        try { navigator.vibrate([200, 100, 200]); } catch {}
      }
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Your food is ready!', {
          body: `Token ${order.token_number} is ready for pickup at the counter!`,
          icon: '/pwa-192x192.png',
        });
      }
    }
  }, [activeOrders, user]);

  // Load past orders & recommendations when user signs in or menu is ready
  useEffect(() => {
    if (!user) {
      lastLoadedUidRef.current = null;
      return;
    }
    if (menu.length === 0 || lastLoadedUidRef.current === user.uid) return;
    const activeUid = user.uid;
    lastLoadedUidRef.current = activeUid;

    let cancelled = false;
    void (async () => {
        try {
          const pastOrdersQ = query(ordersCollection, where('uid', '==', activeUid), orderBy('created_at', 'desc'), limit(5));
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
          const recs = menu.filter(i => sortedIds.includes(i.id) && i.is_available);
          if (cancelled) return;
          setRecommendationEntry({ uid: activeUid, items: recs });

          if (pastList.length > 0) {
            pastList.sort((a, b) => {
              const timeA = (a.created_at as any)?.toMillis ? (a.created_at as any).toMillis() : 0;
              const timeB = (b.created_at as any)?.toMillis ? (b.created_at as any).toMillis() : 0;
              return timeB - timeA;
            });
            const latest = pastList[0];
            const latestTime = typeof latest.created_at === 'number'
              ? latest.created_at
              : latest.created_at?.toMillis?.() || 0;
            setLastOrderEntry((current) => {
              if (current?.uid !== activeUid) return { uid: activeUid, order: latest };
              const currentTime = typeof current.order.created_at === 'number'
                ? current.order.created_at
                : current.order.created_at?.toMillis?.() || 0;
              return currentTime > latestTime ? current : { uid: activeUid, order: latest };
            });
          } else {
            setLastOrderEntry((current) => current?.uid === activeUid && typeof current.order.created_at === 'number' ? current : null);
          }
        } catch (e) {
          console.error('Past orders error:', e);
        }
      })();
    return () => { cancelled = true; };
  }, [menu, user]);

  // Keep the public rush count current from the same lightweight board used by the TV.
  useEffect(() => {
    const qQueue = query(displayBoardCollection, where('status', 'in', ['Pending', 'PREPARING']), limit(100));
    const unsubscribe = onSnapshot(qQueue, (snapshot) => {
      setQueueCount(snapshot.size);
    }, () => setQueueCount(null));
    return () => unsubscribe();
  }, []);

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
      setOrderNotice('The items from your previous order are currently sold out.');
    }
  }, [lastOrder, menu]);

  const addToCart = useCallback((item: MenuItem) => {
    if (item.price <= 0 || !item.is_available) return;
    setCart(prev => {
      const existing = prev.find(i => i.itemId === item.id);
      if (existing) {
        if (existing.quantity >= 20) {
          setOrderNotice('You can add up to 20 of the same dish.');
          return prev;
        }
        return prev.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (prev.length >= 6) {
        setOrderNotice('Keep an order to six different dishes or fewer.');
        return prev;
      }
      return [...prev, { itemId: item.id, name: item.name, price: item.price, quantity: 1, is_express: item.is_express }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => prev.map(i => i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
  }, []);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
  const totalCartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const scheduleValue = scheduledFor === 'now' ? null : customTime || null;

  const handleOrderSubmit = async () => {
    if (!user) {
      setIsPaymentModalOpen(false);
      setIsAuthModalOpen(true);
      return;
    }
    if (!userRecordReady) {
      setOrderNotice('Your account is still syncing. Please try again in a moment.');
      return;
    }
    if (cartTotal <= 0) {
      setOrderNotice('Orders need at least one item with a listed price.');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      const { order, committed } = await createStudentOrder({ uid: user.uid, items: cart, scheduledFor: scheduleValue });
      setLastOrderEntry({ uid: user.uid, order });
      setCart([]);
      setIsPaymentModalOpen(false);
      setOrderNotice(`Order sent. Your token is ${order.token_number}. Pay at the counter.`);
      onOrderPlaced(order);
      void committed.catch((error: unknown) => {
        console.error('Order confirmation failed:', error);
        if (currentUidRef.current !== user.uid) return;
        onOrderRejected(order.id);
        setCart(cart);
        setLastOrderEntry((current) => current?.order.id === order.id ? null : current);
        setOrderNotice('The order could not be confirmed. Your cart has been restored; please try again.');
      });
    } catch (error: any) {
      console.error('Order placement failed:', error);
      const msg = error?.message || 'Could not place the order. Please try again.';
      setOrderNotice(typeof msg === 'string' ? msg : 'Failed to place order.');
    } finally {
      setIsSubmittingOrder(false);
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
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center text-slate-500 gap-3">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="font-bold text-xs">Loading PICT canteen menu...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-36">
      
      {/* Sticky Search Bar & Category Chips */}
      <div className="sticky top-16 z-30 bg-slate-50/95 backdrop-blur-xl pt-2 pb-3 mb-4 border-b border-slate-200/60 -mx-4 px-4">
        <div className="relative mb-2.5">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
            <Search size={17} className="text-blue-600" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search samosa, cold coffee, noodles, thali..."
            className="w-full bg-white pl-11 pr-10 py-3 rounded-full text-xs font-semibold text-slate-900 outline-none border border-slate-200/90 shadow-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 google-touch cursor-pointer"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Horizontal Category Filter Pills */}
        <div className="flex gap-2.5 overflow-x-auto py-1.5 px-0.5 text-xs no-scrollbar scroll-smooth items-center">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 inline-flex items-center justify-center px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap leading-none transition-all google-touch google-ripple cursor-pointer select-none ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 ring-1 ring-blue-600'
                  : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300/80'
              }`}
            >
              {cat === 'ALL' ? '🌟 All Dishes' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Live Rush Meter */}
      <RushMeter queueCount={queueCount} />

      {orderNotice && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl text-xs font-semibold flex justify-between gap-3">
          <span>{orderNotice}</span>
          <button type="button" onClick={() => setOrderNotice(null)} className="text-amber-700 font-black">Dismiss</button>
        </div>
      )}

      {/* 1-Tap Repeat Order Banner */}
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
            <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
              Recommended For You
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
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

      {/* Floating Dynamic Cart Capsule */}
      {cart.length > 0 && (
        <div className="fixed bottom-5 left-0 right-0 px-4 z-30 pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => {
                if (!user) {
                  setIsAuthModalOpen(true);
                  return;
                }
                setIsPaymentModalOpen(true);
              }}
              className="w-full bg-slate-900 hover:bg-black text-white rounded-full p-3.5 px-5 flex items-center justify-between shadow-2xl shadow-slate-900/30 google-touch google-ripple transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <ShoppingCart size={16} />
                </div>
                <div className="text-left">
                  <span className="font-bold text-xs block">{totalCartCount} item{totalCartCount > 1 ? 's' : ''} in cart</span>
                  <span className="text-[11px] text-slate-300 font-medium">
                    Pay at counter
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-semibold text-base tabular-nums">₹{cartTotal.toFixed(2)}</span>
                <span className="rounded-full bg-white/15 px-3.5 py-2 text-xs font-semibold">
                  Review order
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Sign In Modal for Unauthenticated Users */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute right-4 top-4 z-10 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer shadow-xs"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <StudentAuth mode="dialog" />
          </div>
        </div>
      )}

      {/* Floating Active Orders Badge is rendered by App (mid-right) so it hangs while scrolling */}

      {/* Full-Screen Blinkit/Swiggy-style Order Review & Checkout */}
      {isPaymentModalOpen && (
        <Suspense fallback={null}>
          <CartReviewView
            isOpen={isPaymentModalOpen}
            onClose={() => {
              setIsPaymentModalOpen(false);
              setOrderNotice(null);
            }}
            cart={cart}
            menu={menu}
            onAddToCart={addToCart}
            onRemoveFromCart={removeFromCart}
            onClearCart={() => setCart([])}
            cartTotal={cartTotal}
            scheduledFor={scheduledFor}
            onSelectScheduledFor={setScheduledFor}
            customTime={customTime}
            onSelectCustomTime={setCustomTime}
            canSubmit={userRecordReady}
            isProcessing={isSubmittingOrder}
            orderNotice={orderNotice}
            onClearNotice={() => setOrderNotice(null)}
            onSubmit={handleOrderSubmit}
          />
        </Suspense>
      )}

    </div>
  );
}

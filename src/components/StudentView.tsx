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
  Star,
  Shield,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import DishCard from './DishCard';
import FoodDetailModal from './FoodDetailModal';
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

// Canonical 8 most bought Pune canteen staples
const TOP_8_MOST_BOUGHT_PATTERNS = [
  { pattern: /samosa/i, title: 'Samosa' },
  { pattern: /vada pav|wada pav/i, title: 'Wada Pav' },
  { pattern: /misal/i, title: 'Misal Pav' },
  { pattern: /masala dosa/i, title: 'Masala Dosa' },
  { pattern: /poha|kanda poha/i, title: 'Kanda Poha' },
  { pattern: /veg.*grilled.*sandwich|veg.*sandwich|sandwich/i, title: 'Veg Grilled Sandwich' },
  { pattern: /tea|chai/i, title: 'Cutting Chai' },
  { pattern: /dal khichadi|khichadi/i, title: 'Dal Khichadi' },
];

export default function StudentView({ user, userRecordReady, sharedActiveOrders, onOrderPlaced, onOrderRejected }: StudentViewProps) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const activeOrders = sharedActiveOrders;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedFoodItem, setSelectedFoodItem] = useState<MenuItem | null>(null);
  const [lastOrderEntry, setLastOrderEntry] = useState<{ uid: string; order: Order } | null>(null);
  const lastOrder = lastOrderEntry?.uid === user?.uid ? lastOrderEntry?.order ?? null : null;
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [loading, setLoading] = useState(true);
  const [recommendationEntry, setRecommendationEntry] = useState<{ uid: string; items: MenuItem[] } | null>(null);
  const userPastRecs = useMemo(() => {
    return recommendationEntry?.uid === user?.uid ? recommendationEntry?.items ?? [] : [];
  }, [recommendationEntry, user?.uid]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [scheduledFor, setScheduledFor] = useState<string>('now');
  const [customTime, setCustomTime] = useState<string>('');
  const [orderNotice, setOrderNotice] = useState<string | null>(null);

  // Firestore menu listener with immediate hydration
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

  // Compute the 8 most bought food items synchronously (0ms delay, no lag on reload)
  const top8Bestsellers = useMemo<MenuItem[]>(() => {
    if (menu.length === 0) return [];
    const selected: MenuItem[] = [];
    const pickedIds = new Set<string>();

    for (const { pattern } of TOP_8_MOST_BOUGHT_PATTERNS) {
      const match = menu.find(i => pattern.test(i.name) && i.is_available && !pickedIds.has(i.id));
      if (match) {
        selected.push(match);
        pickedIds.add(match.id);
      }
    }

    // Fill up to 8 if some specific patterns were not found
    if (selected.length < 8) {
      for (const item of menu) {
        if (item.is_available && !pickedIds.has(item.id)) {
          selected.push(item);
          pickedIds.add(item.id);
          if (selected.length >= 8) break;
        }
      }
    }

    return selected.slice(0, 8);
  }, [menu]);

  // Combined instant recommendations: renders immediately with zero lag!
  const recommendations = useMemo<MenuItem[]>(() => {
    if (userPastRecs.length > 0) {
      const merged = [...userPastRecs];
      const ids = new Set(merged.map(m => m.id));
      for (const item of top8Bestsellers) {
        if (!ids.has(item.id)) {
          merged.push(item);
          ids.add(item.id);
        }
      }
      return merged.slice(0, 8);
    }
    return top8Bestsellers;
  }, [userPastRecs, top8Bestsellers]);

  const lastLoadedUidRef = useRef<string | null>(null);

  // Sync cart across sign-in
  useEffect(() => {
    if (user && userRecordReady && isAuthModalOpen) {
      setIsAuthModalOpen(false);
      if (cart.length > 0) {
        setIsPaymentModalOpen(true);
      }
    }
  }, [user, userRecordReady, isAuthModalOpen, cart.length]);

  // Audio / vibration alert when food is ready
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

  // Load past user orders in background to personalize recommendations without delaying render
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

        const sortedIds = Object.keys(itemFreq).sort((a, b) => itemFreq[b] - itemFreq[a]).slice(0, 4);
        const recs = menu.filter(i => sortedIds.includes(i.id) && i.is_available);
        if (cancelled) return;
        if (recs.length > 0) {
          setRecommendationEntry({ uid: activeUid, items: recs });
        }

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
        }
      } catch (e) {
        console.error('Past orders error:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [menu, user]);

  // Queue count
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
      setOrderNotice('Items from previous order are currently sold out.');
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
      const { committed } = await createStudentOrder({ uid: user.uid, items: cart, scheduledFor: scheduleValue });
      const finalOrder = await committed;
      setLastOrderEntry({ uid: user.uid, order: finalOrder });
      setCart([]);
      setIsPaymentModalOpen(false);
      setOrderNotice(`Order placed! Token #${finalOrder.token_number}. Pay when collecting.`);
      onOrderPlaced(finalOrder);
    } catch (error: any) {
      console.error('Order placement failed:', error);
      onOrderRejected('failed');
      const msg = error?.message || 'Could not place order. Please try again.';
      setOrderNotice(typeof msg === 'string' ? msg : 'Failed to place order.');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Raw categories from menu
  const rawCategories = useMemo(() => Array.from(new Set(menu.map(item => item.category))), [menu]);
  // Category list includes 'ALL' and 'TOP_8' category
  const categories = useMemo(() => ['ALL', 'TOP_8', ...rawCategories], [rawCategories]);

  // Filtered menu based on selected category & search query
  const filteredMenu = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    // If TOP_8 category is selected
    if (selectedCategory === 'TOP_8') {
      return top8Bestsellers.filter(item => {
        if (!query) return true;
        return (
          item.name.toLowerCase().includes(query) ||
          (item.category || '').toLowerCase().includes(query)
        );
      });
    }

    return menu.filter(item => {
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        (item.category || '').toLowerCase().includes(query)
      );
    });
  }, [menu, selectedCategory, searchQuery, top8Bestsellers]);

  const displayCategories = useMemo(() => {
    if (selectedCategory === 'TOP_8') return ['🔥 Top 8 Bestsellers'];
    return selectedCategory === 'ALL'
      ? rawCategories
      : rawCategories.filter(c => c === selectedCategory);
  }, [rawCategories, selectedCategory]);

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center text-slate-500 gap-3">
        <Loader2 className="animate-spin text-blue-700" size={32} />
        <span className="font-extrabold text-xs tracking-wide">Loading PICT canteen menu...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-36 font-sans">
      
      {/* Sticky Search Bar & Category Chips */}
      <div className="sticky top-16 z-30 bg-inherit backdrop-blur-xl pt-2 pb-3 mb-4 border-b border-slate-200/70 -mx-4 px-4 transition-colors">
        <div className="relative mb-2.5">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
            <Search size={17} className="text-blue-700" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search samosa, cutting chai, wada pav, misal, thali..."
            className="w-full bg-white pl-11 pr-10 py-3 rounded-full text-xs font-bold text-slate-950 outline-none border border-slate-200 shadow-xs focus:border-blue-600 focus:ring-3 focus:ring-blue-600/15 transition-all placeholder:text-slate-400 placeholder:font-normal"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Horizontal Category Filter Pills with Complementary Colors */}
        <div className="flex gap-2 overflow-x-auto py-1.5 px-0.5 text-xs no-scrollbar scroll-smooth items-center">
          {categories.map(cat => {
            const isAll = cat === 'ALL';
            const isTop8 = cat === 'TOP_8';
            const isSelected = selectedCategory === cat;

            let buttonClass = 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50';
            if (isSelected) {
              if (isTop8) {
                buttonClass = 'bg-amber-400 text-slate-950 border border-amber-500 shadow-xs ring-2 ring-amber-400/30';
              } else {
                buttonClass = 'bg-blue-700 text-white border border-blue-800 shadow-xs ring-2 ring-blue-700/20';
              }
            } else if (isTop8) {
              buttonClass = 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100';
            }

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full font-black text-xs whitespace-nowrap leading-none transition-all cursor-pointer active:scale-95 ${buttonClass}`}
              >
                {isAll ? (
                  <span>🌟 All Dishes</span>
                ) : isTop8 ? (
                  <span className="flex items-center gap-1">
                    <Star size={13} className={isSelected ? 'fill-slate-950' : 'fill-amber-500 text-amber-600'} />
                    Top 8 Bestsellers
                  </span>
                ) : (
                  <span>{cat}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Rush Meter */}
      <RushMeter queueCount={queueCount} />

      {orderNotice && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl text-xs font-bold flex justify-between items-center gap-3 shadow-2xs">
          <span>{orderNotice}</span>
          <button type="button" onClick={() => setOrderNotice(null)} className="text-amber-800 font-black p-1 hover:bg-amber-100 rounded-lg">
            Dismiss
          </button>
        </div>
      )}

      {/* 1-Tap Repeat Order Banner */}
      {lastOrder && lastOrder.items && (
        <div className="bg-slate-950 text-white p-4 rounded-2xl mb-5 flex items-center justify-between shadow-lg shadow-black/10 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white">
              <RotateCcw size={18} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-black text-amber-400">
                1-Tap Repeat Order
              </div>
              <div className="font-bold text-xs line-clamp-1 mt-0.5 text-slate-100">
                {lastOrder.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
              </div>
            </div>
          </div>
          <button
            onClick={repeatLastOrder}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-black shrink-0 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            Re-order ₹{lastOrder.total_amount}
          </button>
        </div>
      )}

      {/* ZERO-LAG Top 8 Recommended Shelf (always rendered instantly when on All Dishes) */}
      {selectedCategory === 'ALL' && !searchQuery && recommendations.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-100 text-amber-800">
                <Sparkles size={16} />
              </span>
              <h3 className="font-black text-sm text-slate-950 tracking-tight">
                Recommended For You
              </h3>
            </div>
            <button
              onClick={() => setSelectedCategory('TOP_8')}
              className="text-[11px] font-black text-blue-700 hover:text-blue-800 cursor-pointer"
            >
              View Top 8 →
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {recommendations.slice(0, 4).map(item => (
              <DishCard
                key={`rec-${item.id}`}
                item={item}
                cartItem={cart.find(i => i.itemId === item.id)}
                isPopular
                isTop8={top8Bestsellers.some(t => t.id === item.id)}
                onAddToCart={addToCart}
                onRemoveFromCart={removeFromCart}
                onOpenDetails={(dish) => setSelectedFoodItem(dish)}
              />
            ))}
          </div>
        </div>
      )}

      {/* TOP_8 Category View */}
      {selectedCategory === 'TOP_8' && !searchQuery && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-400 text-slate-950">
                <Star size={16} className="fill-slate-950" />
              </span>
              <div>
                <h3 className="font-black text-base text-slate-950 tracking-tight">
                  8 Most Bought Canteen Items
                </h3>
                <span className="text-[11px] font-bold text-slate-400">Campus favorites based on daily student orders</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {top8Bestsellers.map(item => (
              <DishCard
                key={`top8-${item.id}`}
                item={item}
                cartItem={cart.find(i => i.itemId === item.id)}
                isPopular
                isTop8
                onAddToCart={addToCart}
                onRemoveFromCart={removeFromCart}
                onOpenDetails={(dish) => setSelectedFoodItem(dish)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Category List or Search Results */}
      {selectedCategory !== 'TOP_8' && (
        filteredMenu.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/80 my-4 shadow-2xs">
            <UtensilsCrossed size={36} className="mx-auto mb-2 text-slate-300" />
            <h4 className="font-bold text-slate-800 text-sm">No dishes found</h4>
            <p className="text-xs text-slate-400 mt-1">Try another keyword or tap All Dishes.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {displayCategories.map(category => {
              const categoryItems = filteredMenu.filter(item => item.category === category);
              if (categoryItems.length === 0) return null;

              return (
                <div key={category}>
                  <div className="flex justify-between items-baseline mb-2 px-1">
                    <h3 className="font-black text-sm text-slate-950 tracking-tight">{category}</h3>
                    <span className="text-[11px] font-bold text-slate-400">{categoryItems.length} items</span>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
                    {categoryItems.map(item => (
                      <DishCard
                        key={item.id}
                        item={item}
                        cartItem={cart.find(i => i.itemId === item.id)}
                        isPopular={recommendations.some(r => r.id === item.id)}
                        isTop8={top8Bestsellers.some(t => t.id === item.id)}
                        onAddToCart={addToCart}
                        onRemoveFromCart={removeFromCart}
                        onOpenDetails={(dish) => setSelectedFoodItem(dish)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Food Detail Modal (opened via [?] symbol box or card tap) */}
      {selectedFoodItem && (
        <FoodDetailModal
          item={selectedFoodItem}
          onClose={() => setSelectedFoodItem(null)}
          cartItem={cart.find(i => i.itemId === selectedFoodItem.id)}
          onAddToCart={addToCart}
          onRemoveFromCart={removeFromCart}
        />
      )}

      {/* Floating Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-5 left-0 right-0 px-4 z-30 pointer-events-none animate-in slide-in-from-bottom-4 duration-200">
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => {
                if (!user) {
                  setIsAuthModalOpen(true);
                  return;
                }
                setIsPaymentModalOpen(true);
              }}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white rounded-2xl p-3.5 px-5 flex items-center justify-between shadow-xl shadow-blue-700/30 transition-all cursor-pointer active:scale-[0.98] border border-blue-800"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
                  <ShoppingCart size={17} />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-blue-700">
                    {totalCartCount}
                  </span>
                </div>
                <div className="text-left">
                  <span className="font-black text-xs block">{totalCartCount} item{totalCartCount > 1 ? 's' : ''} added</span>
                  <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">
                    Counter Pickup
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-black text-base tabular-nums">₹{cartTotal.toFixed(2)}</span>
                <span className="rounded-xl bg-white text-blue-800 px-3.5 py-1.5 text-xs font-black shadow-xs">
                  Review Cart →
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Sign In Modal for Unauthenticated Users */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
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

      {/* Full-Screen Order Review & Checkout */}
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

      {/* Subtle discreet footer with staff portal access */}
      <footer className="mt-16 pt-8 pb-4 border-t border-slate-200/60 text-center">
        <p className="text-[11px] font-bold text-slate-400">
          PICT Canteen · 100% Pure Vegetarian Campus Kitchen
        </p>
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-slate-400">
          <span>Pune Institute of Computer Technology</span>
          <span>·</span>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1 hover:text-slate-600 transition-colors"
            title="Canteen Staff & Manager Portal"
          >
            <Shield size={10} />
            <span>Staff Portal</span>
          </Link>
        </div>
      </footer>

    </div>
  );
}

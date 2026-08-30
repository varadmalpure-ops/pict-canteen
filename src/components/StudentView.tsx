import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, query, where, getDocs, documentId } from 'firebase/firestore';
import {
  menuItemsCollection,
  ordersCollection,
  auth,
  placeOrderFn,
  getPaymentConfigFn,
  createPaymentOrderFn,
} from '../firebase';
import type { MenuItem, OrderItem, Order } from '../types';
import { ShoppingCart, Plus, Minus, ChevronRight, X, Loader2, Users, Star, MapPin, Receipt } from 'lucide-react';

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
          const pastOrdersQ = query(ordersCollection, where('uid', '==', auth.currentUser.uid));
          const pastOrdersSnap = await getDocs(pastOrdersQ);
          const itemFreq: Record<string, number> = {};
          pastOrdersSnap.forEach(d => {
            const orderData = d.data() as Order;
            orderData.items?.forEach(item => {
              itemFreq[item.itemId] = (itemFreq[item.itemId] || 0) + item.quantity;
            });
          });
          const sortedIds = Object.keys(itemFreq).sort((a, b) => itemFreq[b] - itemFreq[a]).slice(0, 3);
          setRecommendations(items.filter(i => sortedIds.includes(i.id) && i.is_available));
        } catch (e) {
          console.error('Recommendations error:', e);
        }
      }
    }, () => setLoading(false));

    return () => unsubscribeMenu();
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
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Your food is ready!', {
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

  const categories = Array.from(new Set(menu.map(item => item.category)));

  return (
    <div className="max-w-3xl mx-auto p-4 pb-32">
      <h2 className="text-2xl font-bold mb-6 mt-4">Menu</h2>

      {recommendations.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-blue-700 mb-4 px-1 flex items-center gap-2">
            <Star size={20} className="fill-blue-600" /> Recommended for You
          </h3>
          <div className="grid gap-3">
            {recommendations.map(item => {
              const cartItem = cart.find(i => i.itemId === item.id);
              return (
                <div key={`rec-${item.id}`} className="bg-gradient-to-r from-blue-50 to-white p-4 rounded-2xl shadow-sm border border-blue-100 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-blue-600 font-semibold mt-1">₹{item.price}</div>
                  </div>
                  {cartItem ? (
                    <div className="flex items-center gap-3 bg-white rounded-full p-1 border border-blue-200">
                      <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center"><Minus size={18} /></button>
                      <span className="font-semibold w-4 text-center">{cartItem.quantity}</span>
                      <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"><Plus size={18} /></button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)} className="bg-blue-600 text-white font-medium px-5 py-2 rounded-full flex items-center gap-1">
                      <Plus size={18} /> Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {menu.length === 0 ? (
        <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border border-gray-100">
          No menu items found.
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map(category => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-gray-700 mb-4 px-1 border-b pb-2">{category}</h3>
              <div className="grid gap-3">
                {menu.filter(item => item.category === category).map(item => {
                  const cartItem = cart.find(i => i.itemId === item.id);
                  return (
                    <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {item.name}
                          {item.is_express && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">Express</span>}
                          {!item.is_available && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Sold out</span>}
                        </div>
                        <div className="text-blue-600 font-semibold mt-1">₹{item.price}</div>
                      </div>
                      {item.is_available ? (
                        cartItem ? (
                          <div className="flex items-center gap-3 bg-gray-50 rounded-full p-1 border border-gray-200">
                            <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center"><Minus size={18} /></button>
                            <span className="font-semibold w-4 text-center">{cartItem.quantity}</span>
                            <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center"><Plus size={18} /></button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(item)} className="bg-blue-50 text-blue-600 font-medium px-5 py-2 rounded-full flex items-center gap-1">
                            <Plus size={18} /> Add
                          </button>
                        )
                      ) : (
                        <div className="text-gray-400 font-medium px-4 py-2 bg-gray-50 rounded-full">Unavailable</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-12 pb-6">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => {
                setRemainingSplitItems(cart.map(item => ({ ...item })));
                setCurrentSplitSelection({});
                setSplitMode('NONE');
                setIsPaymentModalOpen(true);
              }}
              className="w-full bg-gray-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><ShoppingCart size={20} /></div>
                <div className="text-left">
                  <div className="font-semibold">{cart.reduce((a, b) => a + b.quantity, 0)} items</div>
                  <div className="text-gray-300 text-sm">
                    {paymentProvider === 'razorpay' ? 'Pay with Razorpay' : 'Pay via UPI + UTR'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-xl">₹{cartTotal}</span>
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
              <button onClick={() => !isProcessingPayment && setIsPaymentModalOpen(false)} className="text-gray-400"><X size={24} /></button>
            </div>

            {paymentProvider === 'upi_manual' && (
              <div className="bg-amber-50 text-amber-900 p-3 rounded-xl mb-4 text-sm border border-amber-100">
                Online gateway is not configured. Pay to the UPI ID, enter your UTR, and wait for staff to verify payment before food is prepared.
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-2xl mb-6 border border-gray-100">
              <div className="flex items-center gap-2 text-gray-700 mb-3">
                <Users size={20} />
                <span className="font-medium">Bill Splitting</span>
              </div>
              <div className="flex bg-gray-200/50 p-1 rounded-xl gap-1 mb-3">
                {(['NONE', 'EQUAL', 'CUSTOM'] as const).map(mode => (
                  <button key={mode} onClick={() => setSplitMode(mode)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${splitMode === mode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                    {mode === 'NONE' ? 'None' : mode === 'EQUAL' ? 'Equally' : 'Custom'}
                  </button>
                ))}
              </div>
              {splitMode === 'EQUAL' && (
                <div className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-gray-100">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Time</label>
              <select value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} className="w-full bg-white px-4 py-3 rounded-xl border border-gray-200 outline-none font-medium mb-2">
                <option value="now">Now (ASAP)</option>
                <option value="11:00 AM">11:00 AM (Recess Break)</option>
                <option value="1:00 PM">1:00 PM (Lunch Break)</option>
                <option value="custom">Custom Time...</option>
              </select>
              {scheduledFor === 'custom' && (
                <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} className="w-full bg-white px-4 py-3 rounded-xl border border-gray-200 outline-none font-medium" />
              )}
            </div>

            <div className="text-center mb-6">
              <div className="text-gray-500 text-sm mb-1">Amount</div>
              <div className="text-4xl font-black text-gray-900">₹{paymentAmount.toFixed(2)}</div>
            </div>

            {paymentProvider === 'upi_manual' && (
              <div className="mb-6 flex flex-col items-center bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="text-gray-500 font-medium mb-2">Canteen UPI ID</div>
                <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-gray-200 mb-6 w-full justify-between">
                  <span className="font-bold text-gray-900 text-lg tracking-wide">Q829774745@ybl</span>
                  <button onClick={() => navigator.clipboard.writeText('Q829774745@ybl')} className="text-blue-600 font-bold bg-blue-50 px-4 py-2 rounded-lg">Copy</button>
                </div>
                <div className="w-full text-left">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">12-Digit UTR Number</label>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="e.g. 312345678901"
                    className={`w-full bg-white px-4 py-4 rounded-xl border-2 outline-none font-bold tracking-[0.2em] text-center ${utrNumber.length === 12 ? 'border-green-500' : 'border-gray-200'}`}
                    maxLength={12}
                  />
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
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessingPayment ? (
                <><Loader2 size={24} className="animate-spin" /> Processing...</>
              ) : paymentProvider === 'razorpay' ? (
                'Pay Securely & Place Order'
              ) : (
                'Confirm UTR & Place Order'
              )}
            </button>
          </div>
        </div>
      )}

      {activeOrders.length > 0 && !isStatusModalOpen && (
        <button onClick={() => setIsStatusModalOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center z-40">
          <Receipt size={24} />
        </button>
      )}

      {activeOrders.length > 0 && isStatusModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-bold text-lg">Active Orders ({activeOrders.length})</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-gray-400 p-2"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              {activeOrders.map(order => (
                <div key={order.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div className="text-center mb-4">
                    <div className="text-gray-500 mb-1 text-sm font-medium">Token Number</div>
                    <div className="text-5xl font-black text-blue-600 tracking-tighter">{order.token_number}</div>
                    {order.payment_status === 'Unverified' && (
                      <div className="mt-2 text-xs font-semibold text-amber-700">Payment pending staff verification</div>
                    )}
                  </div>
                  {order.status === 'READY' ? (
                    <div className="bg-green-100 border border-green-200 text-green-800 p-3 rounded-xl font-medium text-sm text-center">Ready for pickup!</div>
                  ) : (
                    <div className="bg-blue-100/50 text-blue-800 p-3 rounded-xl text-xs text-center">Status: <strong>{order.status}</strong></div>
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

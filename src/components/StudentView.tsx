import { useState, useEffect } from 'react';
import { onSnapshot, addDoc, serverTimestamp, doc, runTransaction, query, where, limit, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, menuItemsCollection, ordersCollection, auth } from '../firebase';
import type { MenuItem, OrderItem, Order } from '../types';
import { ShoppingCart, Plus, Minus, CheckCircle2, ChevronRight, CreditCard, Smartphone, X, Loader2, QrCode, Users, Star, MapPin } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function StudentView() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);

  // Geofencing state
  const [isLocationVerified, setIsLocationVerified] = useState(() => {
    return localStorage.getItem('locationVerified') === 'true';
  });
  const [locationError, setLocationError] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const PICT_LAT = 18.4584975;
  const PICT_LON = 73.8512198;

  const deg2rad = (deg: number) => deg * (Math.PI / 180);
  const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const requestLocation = () => {
    setIsLocating(true);
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setIsLocating(false);
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const dist = getDistanceFromLatLonInKm(latitude, longitude, PICT_LAT, PICT_LON);
          if (dist <= 2.0) {
            setIsLocationVerified(true);
            localStorage.setItem('locationVerified', 'true');
          } else {
            setLocationError(`You are ${dist.toFixed(1)}km away. You must be within 2km of PICT campus to order.`);
          }
          setIsLocating(false);
        },
        () => {
          setLocationError("Please enable Location Access to verify you are on campus.");
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  // Payment state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD'>('UPI');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [splitMode, setSplitMode] = useState<'NONE' | 'EQUAL' | 'CUSTOM'>('NONE');
  const [splitCount, setSplitCount] = useState(2);
  const [remainingSplitItems, setRemainingSplitItems] = useState<OrderItem[]>([]);
  const [currentSplitSelection, setCurrentSplitSelection] = useState<Record<string, number>>({});
  const [scheduledFor, setScheduledFor] = useState<string>('now');
  const [customTime, setCustomTime] = useState<string>('');

  // Fallback mock data if Firebase fails
  useEffect(() => {

    try {
      const unsubscribeMenu = onSnapshot(menuItemsCollection, async (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
        items.sort((a, b) => {
          const catA = (a.category || '').toLowerCase();
          const catB = (b.category || '').toLowerCase();
          if (catA < catB) return -1;
          if (catA > catB) return 1;
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });
        setMenu(items);
        setLoading(false);

        // Fetch Recommendations
        if (auth.currentUser && !auth.currentUser.isAnonymous) {
          try {
            const pastOrdersQ = query(ordersCollection, where('uid', '==', auth.currentUser.uid));
            const pastOrdersSnap = await getDocs(pastOrdersQ);
            const itemFreq: Record<string, number> = {};
            pastOrdersSnap.forEach(doc => {
              const orderData = doc.data() as Order;
              orderData.items.forEach(item => {
                itemFreq[item.itemId] = (itemFreq[item.itemId] || 0) + item.quantity;
              });
            });
            const sortedIds = Object.keys(itemFreq).sort((a, b) => itemFreq[b] - itemFreq[a]).slice(0, 3);
            const recommended = items.filter(i => sortedIds.includes(i.id) && i.is_available);
            setRecommendations(recommended);
          } catch (e) {
            console.error("Recommendations error:", e);
          }
        }

      }, (error) => {
        console.error("Firebase menu error:", error);
        setLoading(false);
      });

      // Try to recover active order securely from database if user is anonymously logged in
      const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            const q = query(
              ordersCollection, 
              where('uid', '==', user.uid), 
              where('status', 'in', ['Pending', 'PREPARING', 'READY']),
              limit(1)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
              const orderDoc = snap.docs[0];
              listenToOrder(orderDoc.id);
            } else {
              // Fallback to session storage if not found
              const savedOrderId = sessionStorage.getItem('activeOrderId');
              if (savedOrderId) listenToOrder(savedOrderId);
            }
          } catch (err) {
            console.error("Order recovery failed:", err);
          }
        }
      });

      return () => {
        unsubscribeMenu();
        unsubscribeAuth();
      };
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, []);

  const listenToOrder = (orderId: string) => {
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (docSnap) => {
      if (docSnap.exists()) {
        const orderData = { id: docSnap.id, ...docSnap.data() } as Order;
        if (orderData.status === 'COMPLETED') {
          setActiveOrder(null);
          sessionStorage.removeItem('activeOrderId');
        } else if (orderData.status === 'CANCELLED') {
          alert(`Your order ${orderData.token_number} was cancelled by the canteen. Please collect your refund from the counter.`);
          setActiveOrder(null);
          sessionStorage.removeItem('activeOrderId');
        } else {
          // Check if it just turned ready and trigger notification
          if (orderData.status === 'READY') {
            setActiveOrder((prev) => {
              if (prev && prev.status !== 'READY') {
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Your food is ready! 🎉', {
                    body: `Token ${orderData.token_number} is ready for pickup at the counter!`,
                    icon: '/pwa-192x192.png'
                  });
                }
              }
              return orderData;
            });
          } else {
            setActiveOrder(orderData);
          }
        }
      }
    });
    return unsubscribe;
  };

  // Kiosk Auto-reset: clear the screen after 10 seconds so the next student can order
  useEffect(() => {
    if (activeOrder?.id) {
      const timer = setTimeout(() => {
        setActiveOrder(null);
        sessionStorage.removeItem('activeOrderId');
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [activeOrder?.id]);

  const addToCart = (item: MenuItem) => {
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

  // Some merchant accounts strictly forbid dynamic amounts without API signatures. We must use the exact static string.
  const upiLink = `upi://pay?pa=Q829774745@ybl&pn=PhonePe&mode=02`;

  const placeOrder = async () => {
    if (cart.length === 0) return;

    try {
      // Securely generate a sequential token number
      const tokenNumber = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'metadata', 'counter');
        const counterSnap = await transaction.get(counterRef);
        
        let nextToken = 101;
        if (counterSnap.exists()) {
          nextToken = counterSnap.data().current_token + 1;
        }
        transaction.set(counterRef, { current_token: nextToken }, { merge: true });
        return nextToken;
      });

      const tokenStr = `#A-${tokenNumber}`;

      // Automatically mark as READY if all items are express items
      const isExpressOrder = cart.every(item => item.is_express);

      const newOrder = {
        uid: auth.currentUser?.uid || 'anonymous',
        token_number: tokenStr,
        items: cart,
        total_amount: cartTotal,
        status: isExpressOrder ? 'READY' : 'Pending',
        created_at: serverTimestamp(),
        payment_status: 'Unverified',
        payment_method: paymentMethod,
        scheduled_for: scheduledFor === 'now' ? null : (scheduledFor === 'custom' ? customTime : scheduledFor)
      };

      const docRef = await addDoc(ordersCollection, newOrder);
      sessionStorage.setItem('activeOrderId', docRef.id);
      listenToOrder(docRef.id);
      setCart([]);
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Failed to place order. Please try again.");
    }
  };

  const handlePaymentSubmit = async () => {
    // Request notification permission if not yet asked
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    setIsProcessingPayment(true);
    // Simulate payment gateway delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Once payment is successful, place the order
    await placeOrder();
    
    setIsProcessingPayment(false);
    setIsPaymentModalOpen(false);
    setSplitMode('NONE');
    setSplitCount(2);
  };

  if (!isLocationVerified) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] items-center justify-center p-6 text-center">
        <div className="bg-blue-50 p-6 rounded-full mb-4">
          <MapPin size={48} className="text-blue-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Location Required</h2>
        <p className="text-gray-600 font-medium max-w-sm mb-6">
          To prevent spam, you must be within 2km of the PICT campus to order.
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
    return <div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="animate-spin text-blue-600 mr-2"/> Loading Menu...</div>;
  }

  // Active Order Tracking View
  if (activeOrder && activeOrder.status !== 'COMPLETED') {
    const statusSteps = ['Pending', 'PREPARING', 'READY'];
    const currentStepIndex = statusSteps.indexOf(activeOrder.status);

    return (
      <div className="max-w-md mx-auto p-6 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full text-center border border-gray-100">
          <div className="text-gray-500 mb-2 font-medium">Your Token Number</div>
          <div className="text-6xl font-black text-blue-600 mb-2 tracking-tighter">
            {activeOrder.token_number}
          </div>
          <div className="text-orange-500 font-bold mb-8 animate-pulse text-sm">
            Please remember this number! Screen will reset shortly.
          </div>

          <div className="space-y-6 mb-8">
            {statusSteps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isPast = index < currentStepIndex;
              return (
                <div key={step} className={`flex items-center gap-4 ${isPast ? 'opacity-50' : ''}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                    ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : isPast ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {isPast ? <CheckCircle2 size={20} /> : index + 1}
                  </div>
                  <div className={`font-semibold text-lg ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                    {step}
                  </div>
                </div>
              );
            })}
          </div>

          {activeOrder.status === 'READY' ? (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl font-medium animate-pulse">
              🎉 Your order is ready for pickup! Please proceed to the counter.
            </div>
          ) : (
            <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm">
              <span className="font-semibold block mb-1">Preventing Counter Crowding</span>
              Please stay away from the counter until your Token Number is marked <strong>READY</strong>.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Menu Categories
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
                <div key={`rec-${item.id}`} className="bg-gradient-to-r from-blue-50 to-white p-4 rounded-2xl shadow-sm border border-blue-100 flex justify-between items-center transition-all hover:shadow-md">
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {item.name}
                      {item.is_express && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-purple-200">⚡ Express</span>}
                    </div>
                    <div className="text-blue-600 font-semibold mt-1">₹{item.price}</div>
                  </div>
                  
                  {cartItem ? (
                    <div className="flex items-center gap-3 bg-white rounded-full p-1 border border-blue-200 shadow-sm">
                      <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:text-red-500 active:scale-95 transition-transform">
                        <Minus size={18} />
                      </button>
                      <span className="font-semibold w-4 text-center">{cartItem.quantity}</span>
                      <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-transform">
                        <Plus size={18} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => addToCart(item)}
                      className="bg-blue-600 text-white hover:bg-blue-700 font-medium px-5 py-2 rounded-full transition-colors active:scale-95 flex items-center gap-1 shadow-sm"
                    >
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
        <div className="p-8 text-center text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
          No menu items found. Please run the initDb script or check Firebase config.
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
                    <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center transition-all hover:shadow-md">
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {item.name}
                          {item.is_express && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-purple-200">⚡ Express</span>}
                          {!item.is_available && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Sold out</span>}
                        </div>
                        <div className="text-blue-600 font-semibold mt-1">₹{item.price}</div>
                      </div>
                      
                      {item.is_available ? (
                        cartItem ? (
                          <div className="flex items-center gap-3 bg-gray-50 rounded-full p-1 border border-gray-200">
                            <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-600 hover:text-red-500 active:scale-95 transition-transform">
                              <Minus size={18} />
                            </button>
                            <span className="font-semibold w-4 text-center">{cartItem.quantity}</span>
                            <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-full bg-blue-600 text-white shadow-sm flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-transform">
                              <Plus size={18} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => addToCart(item)}
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium px-5 py-2 rounded-full transition-colors active:scale-95 flex items-center gap-1"
                          >
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

      {/* Floating Cart Checkout */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-12 pb-6">
          <div className="max-w-3xl mx-auto">
            <button 
              onClick={() => {
                setRemainingSplitItems(cart.map(item => ({...item})));
                setCurrentSplitSelection({});
                setSplitMode('NONE');
                setIsPaymentModalOpen(true);
              }}
              className="w-full bg-gray-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-xl shadow-gray-900/20 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <ShoppingCart size={20} />
                </div>
                <div className="text-left">
                  <div className="font-semibold">{cart.reduce((a,b)=>a+b.quantity,0)} items</div>
                  <div className="text-gray-300 text-sm">Pay securely</div>
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

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4 pb-0 sm:pb-4 transition-all">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Complete Payment</h3>
              <button onClick={() => !isProcessingPayment && setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24}/>
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-2xl mb-6 border border-gray-100">
              <div className="flex items-center gap-2 text-gray-700 mb-3">
                <Users size={20} />
                <span className="font-medium">Bill Splitting</span>
              </div>
              <div className="flex bg-gray-200/50 p-1 rounded-xl gap-1 mb-3">
                <button onClick={() => setSplitMode('NONE')} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${splitMode === 'NONE' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>None</button>
                <button onClick={() => setSplitMode('EQUAL')} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${splitMode === 'EQUAL' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Equally</button>
                <button onClick={() => setSplitMode('CUSTOM')} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${splitMode === 'CUSTOM' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Custom</button>
              </div>
              
              {splitMode === 'EQUAL' && (
                <div className="flex items-center justify-between bg-white px-4 py-2 rounded-xl border border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Number of people:</span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSplitCount(Math.max(2, splitCount - 1))} className="text-gray-400 hover:text-blue-600 p-1"><Minus size={16} /></button>
                    <span className="font-bold w-4 text-center">{splitCount}</span>
                    <button onClick={() => setSplitCount(splitCount + 1)} className="text-gray-400 hover:text-blue-600 p-1"><Plus size={16} /></button>
                  </div>
                </div>
              )}
              {splitMode === 'CUSTOM' && (
                <div className="bg-white p-3 rounded-xl border border-gray-100 mt-4 max-h-48 overflow-y-auto shadow-inner text-left">
                  <h4 className="font-semibold text-sm mb-2 text-gray-700">Select items you are paying for:</h4>
                  {remainingSplitItems.length === 0 ? (
                    <div className="text-sm text-green-600 font-medium pb-2">All items paid! You can complete the order.</div>
                  ) : (
                    remainingSplitItems.map(item => {
                      const selected = currentSplitSelection[item.itemId] || 0;
                      return (
                        <div key={item.itemId} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                          <div>
                            <div className="font-medium text-sm text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500">₹{item.price} each • {item.quantity} left</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setCurrentSplitSelection(prev => ({...prev, [item.itemId]: Math.max(0, (prev[item.itemId] || 0) - 1)}))}
                              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:scale-95"
                            ><Minus size={14}/></button>
                            <span className="font-bold text-sm w-4 text-center">{selected}</span>
                            <button 
                              onClick={() => setCurrentSplitSelection(prev => ({...prev, [item.itemId]: Math.min(item.quantity, (prev[item.itemId] || 0) + 1)}))}
                              className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 active:scale-95"
                            ><Plus size={14}/></button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            <div className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Time</label>
              <select 
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full bg-white px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 mb-2"
              >
                <option value="now">Now (ASAP)</option>
                <option value="11:00 AM">11:00 AM (Recess Break)</option>
                <option value="1:00 PM">1:00 PM (Lunch Break)</option>
                <option value="custom">Custom Time...</option>
              </select>

              {scheduledFor === 'custom' && (
                <input 
                  type="time" 
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full bg-white px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 mt-2"
                  required
                />
              )}
            </div>

            <div className="text-center mb-6">
              <div className="text-gray-500 text-sm mb-1">
                {splitMode === 'EQUAL' ? 'Each Person Pays' : splitMode === 'CUSTOM' ? 'Your Share' : 'Total Bill Amount'}
              </div>
              <div className="text-4xl font-black text-gray-900">
                ₹{paymentAmount.toFixed(2)}
              </div>
              {splitMode === 'CUSTOM' && (
                <div className="text-sm text-gray-400 mt-1">Total Bill: ₹{cartTotal}</div>
              )}
              {splitMode === 'EQUAL' && (
                <div className="text-sm text-gray-400 mt-1">Total Bill: ₹{cartTotal}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                onClick={() => !isProcessingPayment && setPaymentMethod('UPI')}
                disabled={isProcessingPayment}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${paymentMethod === 'UPI' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'} ${isProcessingPayment ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <QrCode size={28} />
                <span className="font-semibold">Scan QR</span>
              </button>
              <button 
                onClick={() => !isProcessingPayment && setPaymentMethod('CARD')}
                disabled={isProcessingPayment}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border-2 transition-all ${paymentMethod === 'CARD' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'} ${isProcessingPayment ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <CreditCard size={28} />
                <span className="font-semibold">Tap Card</span>
              </button>
            </div>

            {paymentMethod === 'UPI' ? (
              <div className={`mb-6 flex flex-col items-center bg-gray-50 p-6 rounded-2xl border border-gray-100 transition-opacity ${splitMode === 'CUSTOM' && customSplitTotal === 0 && remainingSplitItems.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                <a 
                  href={upiLink}
                  className="bg-white p-4 rounded-xl shadow-sm mb-4 hover:shadow-md transition-shadow cursor-pointer block"
                >
                  <QRCodeSVG 
                    value={upiLink} 
                    size={160} 
                    level="H"
                    includeMargin={true}
                  />
                </a>
                <p className="text-gray-600 font-medium text-center mb-1">
                  {splitMode === 'CUSTOM' 
                    ? remainingSplitItems.length === 0 ? 'All items paid.' : 'Scan to pay your selected items' 
                    : splitMode === 'EQUAL' 
                      ? `Each person scan this QR to pay ₹${(cartTotal / splitCount).toFixed(2)}`
                      : 'Scan or tap the QR code to pay'
                  }
                </p>
                <a 
                  href={upiLink}
                  className="w-full bg-blue-100 text-blue-700 font-bold py-3 px-4 rounded-xl text-center active:scale-95 transition-transform sm:hidden mt-3"
                >
                  Open UPI App (GPay/PhonePe)
                </a>
                <div className="hidden sm:flex gap-2 text-sm text-gray-400 mt-2">
                  <span>GPay</span> • <span>PhonePe</span> • <span>Paytm</span>
                </div>
              </div>
            ) : (
              <div className="mb-6 flex flex-col items-center justify-center bg-gray-50 p-8 rounded-2xl border border-gray-100 min-h-[250px]">
                <div className="relative">
                  <CreditCard size={64} className="text-gray-400 animate-pulse mb-4" />
                  <div className="absolute top-0 right-0 -mr-2 -mt-2 bg-blue-100 text-blue-600 rounded-full p-1 animate-ping">
                    <Smartphone size={16} />
                  </div>
                </div>
                <p className="text-gray-600 font-medium text-center text-lg">Tap your card on the reader</p>
                <p className="text-gray-400 text-sm mt-2 text-center">Please follow instructions on the pinpad</p>
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
                  }
                } else {
                  handlePaymentSubmit();
                }
              }}
              disabled={isProcessingPayment || (splitMode === 'CUSTOM' && customSplitTotal === 0 && remainingSplitItems.length > 0)}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 size={24} className="animate-spin" /> Sending to Kitchen...
                </>
              ) : (
                splitMode === 'CUSTOM'
                  ? remainingSplitItems.length === 0
                    ? `Complete Order`
                    : (Object.keys(currentSplitSelection).length > 0 && remainingSplitItems.reduce((s, i) => s + i.quantity, 0) === Object.values(currentSplitSelection).reduce((a, b) => a + b, 0))
                      ? `I have paid ₹${paymentAmount.toFixed(2)} - Complete Order`
                      : `I have paid ₹${paymentAmount.toFixed(2)} - Next Person`
                  : `I have paid ₹${paymentAmount.toFixed(2)} - Send Order`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

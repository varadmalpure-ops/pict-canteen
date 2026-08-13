import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, addDoc, deleteDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, type User } from 'firebase/auth';
import { db, menuItemsCollection, auth } from '../firebase';
import type { MenuItem, Order, OrderStatus } from '../types';
import { Settings, CheckCircle2, Flame, Utensils, AlertCircle, LogOut, Plus, Trash2, Edit2, X } from 'lucide-react';

export default function AdminView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tab, setTab] = useState<'KITCHEN' | 'INVENTORY'>('KITCHEN');
  const prevPendingCount = useRef(0);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const allowedEmails = (import.meta.env.VITE_ALLOWED_ADMIN_EMAILS || '')
          .split(',')
          .map((e: string) => e.trim());
          
        if (currentUser.email && !allowedEmails.includes(currentUser.email)) {
          await signOut(auth);
          setLoginError('Access Denied: You do not have administrator permissions.');
          setUser(null);
        } else {
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen to active orders
    const q = query(
      collection(db, 'orders'),
      where('status', 'in', ['Pending', 'PREPARING', 'READY'])
    );
    
    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      // Manual client-side sort as fallback since compound queries need indexing in Firestore
      const activeOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      const pendingCount = activeOrders.filter(o => o.status === 'Pending').length;
      if (pendingCount > prevPendingCount.current) {
        // Play notification sound
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e => console.warn('Audio play blocked:', e));
        } catch(e) {}
      }
      prevPendingCount.current = pendingCount;

      activeOrders.sort((a, b) => {
        // Sort by status priority, then timestamp
        const p: Record<OrderStatus, number> = { Pending: 1, PREPARING: 2, READY: 3, COMPLETED: 4, CANCELLED: 5 };
        if (p[a.status] !== p[b.status]) return p[a.status] - p[b.status];
        const timeA = (a.created_at as any)?.toMillis ? (a.created_at as any).toMillis() : 0;
        const timeB = (b.created_at as any)?.toMillis ? (b.created_at as any).toMillis() : 0;
        return timeA - timeB;
      });
      setOrders(activeOrders);
    });

    const unsubscribeMenu = onSnapshot(menuItemsCollection, (snapshot) => {
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
    });

    return () => {
      unsubscribeOrders();
      unsubscribeMenu();
    };
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoginError('');
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setLoginError('Invalid email or password');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoginError('');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setLoginError('Failed to sign in with Google');
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Admin Login</h2>
            <p className="text-gray-500 mt-2">Sign in to manage orders and inventory</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button 
              type="submit"
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
            >
              Sign In
            </button>
            <div className="relative mt-6 mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors flex justify-center items-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                <path d="M1 1h22v22H1z" fill="none"/>
              </svg>
              Google
            </button>
          </form>
        </div>
      </div>
    );
  }

  const advanceOrderStatus = async (order: Order) => {
    const nextStatusMap: Record<OrderStatus, OrderStatus> = {
      'Pending': 'PREPARING',
      'PREPARING': 'READY',
      'READY': 'COMPLETED',
      'COMPLETED': 'COMPLETED',
      'CANCELLED': 'CANCELLED'
    };
    const nextStatus = nextStatusMap[order.status];
    if (nextStatus === order.status) return;

    try {
      const updateData: any = { status: nextStatus };
      if (order.status === 'Pending') {
        updateData.payment_status = 'Verified';
      }
      
      await updateDoc(doc(db, 'orders', order.id), updateData);
    } catch (e) {
      console.error(e);
      alert("Failed to update order status");
    }
  };

  const cancelOrder = async (order: Order) => {
    if (!confirm(`Are you sure you want to CANCEL Order ${order.token_number}?\nYou will need to manually refund the student ₹${order.total_amount}.`)) return;
    try {
      await updateDoc(doc(db, 'orders', order.id), { status: 'CANCELLED' });
    } catch (e) {
      console.error(e);
      alert("Failed to cancel order");
    }
  };

  const toggleInventory = async (item: MenuItem) => {
    try {
      await updateDoc(doc(db, 'menuItems', item.id), {
        is_available: !item.is_available
      });
    } catch (e) {
      console.error(e);
      alert("Failed to update inventory");
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice || !newItemCategory) return;
    
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'menuItems', editingItem.id), {
          name: newItemName,
          price: Number(newItemPrice),
          category: newItemCategory
        });
      } else {
        await addDoc(menuItemsCollection, {
          name: newItemName,
          price: Number(newItemPrice),
          category: newItemCategory,
          is_available: true
        });
      }
      setIsFormOpen(false);
      setEditingItem(null);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemCategory('');
    } catch (e) {
      console.error(e);
      alert("Failed to save item");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, 'menuItems', id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete item");
    }
  };

  const openEditForm = (item: MenuItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemPrice(item.price.toString());
    setNewItemCategory(item.category);
    setIsFormOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-start mb-8">
        <div className="flex gap-4 bg-gray-100 p-2 rounded-2xl w-fit">
          <button 
            onClick={() => setTab('KITCHEN')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-colors ${tab === 'KITCHEN' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <Utensils size={20} /> Kitchen Display
          </button>
          <button 
            onClick={() => setTab('INVENTORY')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-colors ${tab === 'INVENTORY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <Settings size={20} /> Inventory Control
          </button>
        </div>
        
        <button 
          onClick={() => signOut(auth)}
          className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-red-600 transition-colors bg-gray-100 hover:bg-red-50 rounded-xl font-medium"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>

      {tab === 'KITCHEN' ? (
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Flame className="text-orange-500" /> Active Orders
          </h2>
          
          {orders.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 flex flex-col items-center">
              <CheckCircle2 size={48} className="text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-500">All caught up!</h3>
              <p className="text-gray-400 mt-2">No active orders right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map(order => {
                const expectedTotal = order.items.reduce((sum, item) => {
                  const menuItem = menu.find(m => m.id === item.itemId);
                  if (!menuItem) return sum + (item.price * item.quantity);
                  return sum + (menuItem.price * item.quantity);
                }, 0);
                const isFraud = order.status === 'Pending' && expectedTotal !== order.total_amount;

                return (
                <div key={order.id} className={`bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow
                  ${order.status === 'READY' ? 'border-green-400' : 'border-gray-200'}
                `}>
                  <div className={`p-4 flex justify-between items-center text-white
                    ${order.status === 'Pending' ? 'bg-gray-800' : 
                      order.status === 'PREPARING' ? 'bg-orange-500' : 
                      'bg-green-500'}
                  `}>
                    <div className="text-2xl font-black">{order.token_number}</div>
                    <div className="font-semibold px-3 py-1 rounded-full bg-white/20 text-sm">
                      {order.status}
                    </div>
                  </div>
                  
                  {order.scheduled_for && (
                    <div className="px-6 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
                      <span className="font-bold text-blue-700 text-sm tracking-wide uppercase flex items-center gap-1">⏰ Pre-order for {order.scheduled_for}</span>
                    </div>
                  )}

                  <div className="p-6">
                    {order.status === 'Pending' && order.payment_status === 'Unverified' && !isFraud && (
                      <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm font-semibold flex items-center justify-center animate-pulse">
                        ⚠️ Verify ₹{order.total_amount} ({order.payment_method}) received!
                      </div>
                    )}
                    {isFraud && (
                      <div className="mb-4 bg-red-600 border border-red-800 text-white p-3 rounded-xl text-sm font-black flex flex-col items-center justify-center animate-bounce shadow-lg">
                        <span>🚨 FRAUD DETECTED! 🚨</span>
                        <span className="text-xs font-medium text-red-100">Order claims ₹{order.total_amount}, but true cost is ₹{expectedTotal}</span>
                      </div>
                    )}
                    <ul className="space-y-3 mb-6">
                      {order.items.map((item, i) => (
                        <li key={i} className="flex justify-between font-medium text-gray-700 text-lg">
                          <span><span className="text-gray-400 mr-2">{item.quantity}x</span> {item.name}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="flex gap-2 mt-4">
                      {order.status === 'Pending' && (
                        <button 
                          onClick={() => cancelOrder(order)}
                          className="px-4 py-4 rounded-2xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-transform active:scale-95"
                          title="Cancel Order & Refund"
                        >
                          <X size={24} />
                        </button>
                      )}
                      
                      <button 
                        onClick={() => advanceOrderStatus(order)}
                        className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-transform active:scale-95 flex items-center justify-center gap-2
                          ${isFraud ? 'bg-red-800 text-white hover:bg-red-900 cursor-not-allowed' :
                            order.status === 'Pending' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 
                            order.status === 'PREPARING' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 
                            'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                        `}
                        disabled={isFraud}
                      >
                        {isFraud ? 'Order Blocked (Fraud)' :
                         order.status === 'Pending' ? `Verify ₹${order.total_amount} & Start` : 
                         order.status === 'PREPARING' ? 'Mark as Ready' : 
                         'Complete Order'}
                      </button>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-3xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <AlertCircle className="text-blue-500" /> Quick Inventory
            </h2>
            <button 
              onClick={() => {
                setEditingItem(null);
                setNewItemName('');
                setNewItemPrice('');
                setNewItemCategory('');
                setIsFormOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} /> Add Item
            </button>
          </div>

          {isFormOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">{editingItem ? 'Edit Item' : 'Add Item'}</h3>
                  <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                </div>
                <form onSubmit={handleSaveItem} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input type="text" required value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                    <input type="number" required min="0" step="0.01" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input type="text" required value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors mt-6">
                    {editingItem ? 'Save Changes' : 'Add Item'}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            {menu.map((item, i) => (
              <div key={item.id} className={`flex items-center justify-between p-5 hover:bg-gray-50 transition-colors ${i !== menu.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div>
                  <div className="font-semibold text-lg text-gray-900">{item.name}</div>
                  <div className="text-gray-500 text-sm">{item.category} • ₹{item.price}</div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => openEditForm(item)} className="text-gray-400 hover:text-blue-600 p-2"><Edit2 size={18}/></button>
                  <button onClick={() => handleDeleteItem(item.id)} className="text-gray-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                  <button
                    onClick={() => toggleInventory(item)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${item.is_available ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${item.is_available ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

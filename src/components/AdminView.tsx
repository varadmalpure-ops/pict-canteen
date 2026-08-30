import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, addDoc, deleteDoc, getDoc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, type User } from 'firebase/auth';
import { db, menuItemsCollection, auth, updateOrderStatusFn } from '../firebase';
import type { MenuItem, Order, OrderStatus } from '../types';
import { 
  ShieldCheck, 
  ChefHat, 
  Utensils, 
  DollarSign, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Clock, 
  LogOut, 
  Tv, 
  Search 
} from 'lucide-react';

function isBootstrapAdminEmail(email: string | null): boolean {
  if (!email) return false;
  const allowed = (import.meta.env.VITE_ALLOWED_ADMIN_EMAILS || 'canteen-staff@gmail.com,varadmalpure@gmail.com')
    .split(',')
    .map((e: string) => e.trim().toLowerCase());
  return allowed.includes(email.toLowerCase());
}

async function assertIsAdmin(currentUser: User): Promise<boolean> {
  if (isBootstrapAdminEmail(currentUser.email)) {
    return true;
  }
  try {
    const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

export default function AdminView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tab, setTab] = useState<'INVENTORY' | 'ORDERS' | 'ANALYTICS'>('INVENTORY');
  const [searchMenu, setSearchMenu] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemIsExpress, setNewItemIsExpress] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const ok = await assertIsAdmin(currentUser);
        if (!ok) {
          await signOut(auth);
          setLoginError('Access Denied: You do not have manager/admin permissions.');
          setUser(null);
        } else {
          try {
            await setDoc(doc(db, 'admins', currentUser.uid), {
              email: currentUser.email,
              role: 'admin',
              updated_at: new Date().toISOString(),
            }, { merge: true });
          } catch (e) {
            console.warn('Could not upsert admins doc', e);
          }
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

    const q = query(collection(db, 'orders'), orderBy('created_at', 'desc'));
    const unsubOrders = onSnapshot(q, (snapshot) => {
      const allOrders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      setOrders(allOrders);
    });

    const unsubMenu = onSnapshot(menuItemsCollection, (snapshot) => {
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
      items.sort((a, b) => {
        const catCmp = (a.category || '').localeCompare(b.category || '');
        if (catCmp !== 0) return catCmp;
        return (a.name || '').localeCompare(b.name || '');
      });
      setMenu(items);
    });

    return () => {
      unsubOrders();
      unsubMenu();
    };
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoginError('');
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setLoginError('Invalid email or password');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoginError('');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch {
      setLoginError('Failed to sign in with Google');
    }
  };

  const toggleInventory = async (item: MenuItem) => {
    try {
      await updateDoc(doc(db, 'menuItems', item.id), { is_available: !item.is_available });
    } catch (e) {
      console.error(e);
      alert('Failed to update inventory');
    }
  };

  const toggleExpress = async (item: MenuItem) => {
    try {
      await updateDoc(doc(db, 'menuItems', item.id), { is_express: !item.is_express });
    } catch (e) {
      console.error(e);
      alert('Failed to toggle express mode');
    }
  };

  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!confirm(`Delete "${name}" from the canteen menu?`)) return;
    try {
      await deleteDoc(doc(db, 'menuItems', itemId));
    } catch (e) {
      console.error(e);
      alert('Failed to delete item');
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemCategory) return;
    const price = Number(newItemPrice);
    if (price < 0) {
      alert('Price must be 0 or positive');
      return;
    }

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'menuItems', editingItem.id), {
          name: newItemName,
          price,
          category: newItemCategory,
          is_express: newItemIsExpress,
        });
      } else {
        await addDoc(menuItemsCollection, {
          name: newItemName,
          price,
          category: newItemCategory,
          is_available: true,
          is_express: newItemIsExpress,
        });
      }
      setIsFormOpen(false);
      setEditingItem(null);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemCategory('');
      setNewItemIsExpress(false);
    } catch (e) {
      console.error(e);
      alert('Failed to save menu item');
    }
  };

  const advanceOrderStatus = async (order: Order, nextStatus: OrderStatus) => {
    try {
      await updateOrderStatusFn({
        orderId: order.id,
        status: nextStatus,
      });
    } catch (e) {
      console.error(e);
      alert('Failed to update order status');
    }
  };

  const filteredMenu = useMemo(() => {
    return menu.filter(item => 
      !searchMenu.trim() || 
      item.name.toLowerCase().includes(searchMenu.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(searchMenu.toLowerCase())
    );
  }, [menu, searchMenu]);

  // Analytics Metrics
  const analytics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const activeQueue = orders.filter(o => o.status === 'Pending' || o.status === 'PREPARING').length;
    const completedCount = orders.filter(o => o.status === 'COMPLETED').length;

    return { totalOrders, totalRevenue, activeQueue, completedCount };
  }, [orders]);

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading manager portal...</div>;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-slate-50 p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-indigo-500/20">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Manager Login</h2>
            <p className="text-slate-500 text-xs font-medium mt-1">Manage canteen menu, pricing, and live queue</p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-100">
              {loginError}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-3.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-xs flex items-center justify-center gap-3 shadow-xs mb-4 transition-all"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
            Sign in with Google
          </button>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Staff Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-semibold focus:bg-white focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-semibold focus:bg-white focus:border-indigo-500"
                required
              />
            </div>
            <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all">
              Sign In with Email
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-24 font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Canteen Manager Panel
            </h1>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-indigo-200">
              Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Logged in as {user.email}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/kitchen"
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
          >
            <ChefHat size={15} /> Open Kitchen KDS ➔
          </a>
          <a
            href="/live"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Tv size={15} /> TV Display
          </a>
          <button
            onClick={() => signOut(auth)}
            className="px-3.5 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl my-6 max-w-md">
        <button
          onClick={() => setTab('INVENTORY')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            tab === 'INVENTORY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Utensils size={14} /> Menu & Pricing ({menu.length})
        </button>
        <button
          onClick={() => setTab('ORDERS')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            tab === 'ORDERS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock size={14} /> All Orders ({orders.length})
        </button>
        <button
          onClick={() => setTab('ANALYTICS')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            tab === 'ANALYTICS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign size={14} /> Analytics
        </button>
      </div>

      {/* TAB 1: MENU & INVENTORY */}
      {tab === 'INVENTORY' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchMenu}
                onChange={(e) => setSearchMenu(e.target.value)}
                placeholder="Search dish or category..."
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>

            <button
              onClick={() => {
                setEditingItem(null);
                setNewItemName('');
                setNewItemPrice('');
                setNewItemCategory('');
                setNewItemIsExpress(false);
                setIsFormOpen(true);
              }}
              className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus size={15} /> Add New Dish
            </button>
          </div>

          {/* Dish List Table / Cards */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="divide-y divide-slate-100">
              {filteredMenu.map(item => (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${item.is_available ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-rose-400 ring-4 ring-rose-100'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">{item.name}</span>
                        {item.is_express && (
                          <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            ⚡ Express
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-semibold">{item.category}</span>
                        <span>•</span>
                        <span className="font-extrabold text-slate-900">₹{item.price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* In Stock Toggle */}
                    <button
                      onClick={() => toggleInventory(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        item.is_available 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                          : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      {item.is_available ? 'In Stock ✓' : 'Sold Out ✕'}
                    </button>

                    {/* Express Toggle */}
                    <button
                      onClick={() => toggleExpress(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        item.is_express 
                          ? 'bg-amber-50 border-amber-200 text-amber-700' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                      title="Express items can be prepared instantly"
                    >
                      ⚡ Express
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setNewItemName(item.name);
                        setNewItemPrice(String(item.price));
                        setNewItemCategory(item.category);
                        setNewItemIsExpress(Boolean(item.is_express));
                        setIsFormOpen(true);
                      }}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                      title="Edit Price & Details"
                    >
                      <Edit2 size={16} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS LIST */}
      {tab === 'ORDERS' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
            {orders.map(order => (
              <div key={order.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-base text-slate-900">{order.token_number}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      order.status === 'READY' ? 'bg-emerald-100 text-emerald-800' :
                      order.status === 'PREPARING' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'COMPLETED' ? 'bg-slate-100 text-slate-600' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {order.status}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      ₹{order.total_amount} ({order.payment_status || order.payment_method})
                    </span>
                    {order.scheduled_for && (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        🕒 {order.scheduled_for}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 font-medium mt-1">
                    {order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {order.status === 'Pending' && (
                    <button
                      onClick={() => advanceOrderStatus(order, 'PREPARING')}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold"
                    >
                      Cook ➔
                    </button>
                  )}
                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => advanceOrderStatus(order, 'READY')}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold"
                    >
                      Ready ➔
                    </button>
                  )}
                  {order.status === 'READY' && (
                    <button
                      onClick={() => advanceOrderStatus(order, 'COMPLETED')}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
                    >
                      Served ✓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ANALYTICS */}
      {tab === 'ANALYTICS' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-400">Total Revenue</div>
            <div className="text-3xl font-black text-slate-900 mt-2">₹{analytics.totalRevenue.toFixed(2)}</div>
            <div className="text-xs text-slate-500 mt-1">Across all valid orders</div>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-400">Total Orders Placed</div>
            <div className="text-3xl font-black text-slate-900 mt-2">{analytics.totalOrders}</div>
            <div className="text-xs text-slate-500 mt-1">{analytics.completedCount} fulfilled so far</div>
          </div>

          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs">
            <div className="text-xs font-bold uppercase text-slate-400">Active Kitchen Queue</div>
            <div className="text-3xl font-black text-amber-600 mt-2">{analytics.activeQueue}</div>
            <div className="text-xs text-slate-500 mt-1">Currently cooking / pending</div>
          </div>
        </div>
      )}

      {/* Add / Edit Dish Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-black text-lg text-slate-900">
                {editingItem ? 'Edit Dish Details' : 'Add New Dish to Menu'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="e.g. Masala Dosa"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-semibold focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={newItemPrice}
                    onChange={e => setNewItemPrice(e.target.value)}
                    placeholder="40"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-semibold focus:bg-white focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={newItemCategory}
                    onChange={e => setNewItemCategory(e.target.value)}
                    placeholder="Snacks, Breakfast..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-semibold focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200/60">
                <input
                  type="checkbox"
                  id="expressCheckbox"
                  checked={newItemIsExpress}
                  onChange={e => setNewItemIsExpress(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded"
                />
                <label htmlFor="expressCheckbox" className="text-xs font-bold text-amber-900 cursor-pointer">
                  ⚡ Express Item (Ready to serve without cooking delay)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-md"
                >
                  {editingItem ? 'Save Changes' : 'Create Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

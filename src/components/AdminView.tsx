import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, addDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, type User } from 'firebase/auth';
import { db, menuItemsCollection, auth, updateOrderStatusFn, setStudentVerificationFn } from '../firebase';
import { getUserImageUrl } from '../lib/userPhotos';
import type { MenuItem, Order, OrderStatus } from '../types';
import { Settings, CheckCircle2, Flame, Utensils, AlertCircle, LogOut, Plus, Trash2, Edit2, X, UserCheck, Volume2, VolumeX, ShieldCheck, Check, Ban } from 'lucide-react';

interface PendingStudent {
  uid: string;
  email: string;
  pnr: string;
  dob: string;
  idPhotoPath?: string;
  selfiePath?: string;
  verificationStatus: string;
  idPhotoUrl?: string;
  selfieUrl?: string;
}

async function assertIsAdmin(uid: string): Promise<boolean> {
  try {
    const adminSnap = await getDoc(doc(db, 'admins', uid));
    return adminSnap.exists();
  } catch {
    return false;
  }
}

export default function AdminView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [tab, setTab] = useState<'KITCHEN' | 'INVENTORY' | 'VERIFICATIONS'>('KITCHEN');
  const [soundEnabled, setSoundEnabled] = useState(true);
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
        const ok = await assertIsAdmin(currentUser.uid);
        if (!ok) {
          await signOut(auth);
          setLoginError('Access Denied: You do not have administrator permissions.');
          setUser(null);
        } else {
          // Ensure admins/{uid} exists for claim-less bootstrap emails
          try {
            await updateDoc(doc(db, 'admins', currentUser.uid), {
              email: currentUser.email,
              updated_at: new Date().toISOString(),
            });
          } catch {
            try {
              const { setDoc } = await import('firebase/firestore');
              await setDoc(doc(db, 'admins', currentUser.uid), {
                email: currentUser.email,
                created_at: new Date().toISOString(),
              });
            } catch (e) {
              console.warn('Could not upsert admins doc', e);
            }
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

    const q = query(
      collection(db, 'orders'),
      where('status', 'in', ['Pending', 'PREPARING', 'READY'])
    );

    const unsubscribeOrders = onSnapshot(q, (snapshot) => {
      const activeOrders = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));

      const pendingCount = activeOrders.filter(o => o.status === 'Pending').length;
      if (pendingCount > prevPendingCount.current && soundEnabled) {
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
        } catch { /* ignore */ }
      }
      prevPendingCount.current = pendingCount;

      activeOrders.sort((a, b) => {
        const p: Record<OrderStatus, number> = { Pending: 1, PREPARING: 2, READY: 3, COMPLETED: 4, CANCELLED: 5 };
        if (p[a.status] !== p[b.status]) return p[a.status] - p[b.status];
        const timeA = (a.created_at as any)?.toMillis ? (a.created_at as any).toMillis() : 0;
        const timeB = (b.created_at as any)?.toMillis ? (b.created_at as any).toMillis() : 0;
        return timeA - timeB;
      });
      setOrders(activeOrders);
    });

    const unsubscribeMenu = onSnapshot(menuItemsCollection, (snapshot) => {
      const items = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as MenuItem))
        .filter(i => !i.isTest);
      items.sort((a, b) => {
        const catCmp = (a.category || '').localeCompare(b.category || '');
        if (catCmp !== 0) return catCmp;
        return (a.name || '').localeCompare(b.name || '');
      });
      setMenu(items);
    });

    const unsubscribeUsers = onSnapshot(
      query(collection(db, 'users'), where('verificationStatus', '==', 'pending')),
      async (snapshot) => {
        const list = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as PendingStudent));
        const withUrls = await Promise.all(list.map(async (st) => {
          let idPhotoUrl = undefined;
          let selfieUrl = undefined;
          if (st.idPhotoPath) {
            try { idPhotoUrl = await getUserImageUrl(st.idPhotoPath); } catch {}
          }
          if (st.selfiePath) {
            try { selfieUrl = await getUserImageUrl(st.selfiePath); } catch {}
          }
          return { ...st, idPhotoUrl, selfieUrl };
        }));
        setPendingStudents(withUrls);
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeMenu();
      unsubscribeUsers();
    };
  }, [user, soundEnabled]);

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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                required
              />
            </div>
            {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
            <button type="submit" className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800">
              Sign In
            </button>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50"
            >
              Google
            </button>
          </form>
        </div>
      </div>
    );
  }

  const advanceOrderStatus = async (order: Order) => {
    const nextStatusMap: Record<OrderStatus, OrderStatus> = {
      Pending: 'PREPARING',
      PREPARING: 'READY',
      READY: 'COMPLETED',
      COMPLETED: 'COMPLETED',
      CANCELLED: 'CANCELLED'
    };
    const nextStatus = nextStatusMap[order.status];
    if (nextStatus === order.status) return;

    try {
      await updateOrderStatusFn({
        orderId: order.id,
        status: nextStatus,
        verifyPayment: order.status === 'Pending',
      });
    } catch (e) {
      console.error(e);
      alert('Failed to update order status');
    }
  };

  const cancelOrder = async (order: Order) => {
    if (!confirm(`Cancel Order ${order.token_number}? Refund ₹${order.total_amount} manually if needed.`)) return;
    try {
      await updateOrderStatusFn({ orderId: order.id, status: 'CANCELLED' });
    } catch (e) {
      console.error(e);
      alert('Failed to cancel order');
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

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice || !newItemCategory) return;
    const price = Number(newItemPrice);
    if (!(price > 0)) {
      alert('Price must be greater than 0');
      return;
    }

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'menuItems', editingItem.id), {
          name: newItemName,
          price,
          category: newItemCategory,
        });
      } else {
        await addDoc(menuItemsCollection, {
          name: newItemName,
          price,
          category: newItemCategory,
          is_available: true,
        });
      }
      setIsFormOpen(false);
      setEditingItem(null);
      setNewItemName('');
      setNewItemPrice('');
      setNewItemCategory('');
    } catch (e) {
      console.error(e);
      alert('Failed to save item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await deleteDoc(doc(db, 'menuItems', id));
    } catch (e) {
      console.error(e);
      alert('Failed to delete item');
    }
  };

  const openEditForm = (item: MenuItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemPrice(item.price.toString());
    setNewItemCategory(item.category);
    setIsFormOpen(true);
  };

  const handleVerifyStudent = async (studentId: string, status: 'verified' | 'rejected') => {
    try {
      await setStudentVerificationFn({ userId: studentId, verificationStatus: status });
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to update student verification');
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-wrap gap-2 sm:gap-4 bg-gray-100 p-2 rounded-2xl">
          <button
            onClick={() => setTab('KITCHEN')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base ${tab === 'KITCHEN' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            <Utensils size={18} /> Kitchen
          </button>
          <button
            onClick={() => setTab('INVENTORY')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base ${tab === 'INVENTORY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            <Settings size={18} /> Inventory
          </button>
          <button
            onClick={() => setTab('VERIFICATIONS')}
            className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-sm sm:text-base ${tab === 'VERIFICATIONS' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            <UserCheck size={18} /> Verifications
            {pendingStudents.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {pendingStudents.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleSound}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm border transition-colors ${soundEnabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
            title="Toggle Order Chime"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            <span>{soundEnabled ? 'Sound ON' : 'Sound OFF'}</span>
          </button>
          <button onClick={() => signOut(auth)} className="flex items-center gap-2 px-4 py-2.5 text-gray-500 hover:text-red-600 bg-gray-100 rounded-xl font-medium text-sm">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
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
                  <div key={order.id} className={`bg-white rounded-3xl border overflow-hidden shadow-sm ${order.status === 'READY' ? 'border-green-400' : 'border-gray-200'}`}>
                    <div className={`p-4 flex justify-between items-center text-white ${order.status === 'Pending' ? 'bg-gray-800' : order.status === 'PREPARING' ? 'bg-orange-500' : 'bg-green-500'}`}>
                      <div className="text-2xl font-black">{order.token_number}</div>
                      <div className="font-semibold px-3 py-1 rounded-full bg-white/20 text-sm">{order.status}</div>
                    </div>
                    <div className="p-6">
                      {order.status === 'Pending' && order.payment_status === 'Unverified' && !isFraud && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-semibold text-center">
                          Verify ₹{order.total_amount} received
                          {order.utr_number && <div className="mt-2 font-bold tracking-widest">UTR: {order.utr_number}</div>}
                        </div>
                      )}
                      {isFraud && (
                        <div className="mb-4 bg-red-600 text-white p-3 rounded-xl text-sm font-black text-center">
                          Price mismatch — claimed ₹{order.total_amount}, menu says ₹{expectedTotal}
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
                          <button onClick={() => cancelOrder(order)} className="px-4 py-4 rounded-2xl font-bold text-red-600 bg-red-50">
                            <X size={24} />
                          </button>
                        )}
                        <button
                          onClick={() => advanceOrderStatus(order)}
                          disabled={isFraud}
                          className={`flex-1 py-4 rounded-2xl font-bold text-lg ${isFraud ? 'bg-red-800 text-white cursor-not-allowed' : order.status === 'Pending' ? 'bg-red-100 text-red-700' : order.status === 'PREPARING' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {isFraud ? 'Blocked' : order.status === 'Pending' ? `Verify ₹${order.total_amount} & Start` : order.status === 'PREPARING' ? 'Mark as Ready' : 'Complete Order'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : tab === 'INVENTORY' ? (
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
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium"
            >
              <Plus size={18} /> Add Item
            </button>
          </div>

          {isFormOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">{editingItem ? 'Edit Item' : 'Add Item'}</h3>
                  <button onClick={() => setIsFormOpen(false)}><X size={24} /></button>
                </div>
                <form onSubmit={handleSaveItem} className="space-y-4">
                  <input type="text" required maxLength={80} value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Name" className="w-full px-4 py-2 rounded-xl border" />
                  <input type="number" required min="0.01" step="0.01" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="Price" className="w-full px-4 py-2 rounded-xl border" />
                  <input type="text" required maxLength={40} value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} placeholder="Category" className="w-full px-4 py-2 rounded-xl border" />
                  <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold">
                    {editingItem ? 'Save Changes' : 'Add Item'}
                  </button>
                </form>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
            {menu.map((item, i) => (
              <div key={item.id} className={`flex items-center justify-between p-5 ${i !== menu.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div>
                  <div className="font-semibold text-lg">{item.name}</div>
                  <div className="text-gray-500 text-sm">{item.category} · ₹{item.price}</div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => openEditForm(item)} className="text-gray-400 hover:text-blue-600 p-2"><Edit2 size={18} /></button>
                  <button onClick={() => handleDeleteItem(item.id)} className="text-gray-400 hover:text-red-600 p-2"><Trash2 size={18} /></button>
                  <button
                    onClick={() => toggleInventory(item)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full ${item.is_available ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white ${item.is_available ? 'translate-x-7' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="text-indigo-600" /> Pending Student Verifications
            </h2>
          </div>

          {pendingStudents.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 flex flex-col items-center">
              <CheckCircle2 size={48} className="text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800">No pending student verifications</h3>
              <p className="text-gray-500 mt-1">All registered students have been reviewed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingStudents.map((student) => (
                <div key={student.uid} className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                          PNR: {student.pnr}
                        </span>
                        <h3 className="font-bold text-gray-900 text-lg mt-2">{student.email}</h3>
                        {student.dob && <p className="text-xs text-gray-500">DOB: {student.dob}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-gray-50 p-2 rounded-2xl border text-center">
                        <span className="text-xs font-semibold text-gray-500 block mb-1">ID Card</span>
                        {student.idPhotoUrl ? (
                          <a href={student.idPhotoUrl} target="_blank" rel="noreferrer">
                            <img src={student.idPhotoUrl} alt="Student ID" className="w-full h-28 object-cover rounded-xl hover:opacity-90 transition-opacity" />
                          </a>
                        ) : (
                          <div className="h-28 flex items-center justify-center text-xs text-gray-400">No ID image</div>
                        )}
                      </div>
                      <div className="bg-gray-50 p-2 rounded-2xl border text-center">
                        <span className="text-xs font-semibold text-gray-500 block mb-1">Selfie</span>
                        {student.selfieUrl ? (
                          <a href={student.selfieUrl} target="_blank" rel="noreferrer">
                            <img src={student.selfieUrl} alt="Student Selfie" className="w-full h-28 object-cover rounded-xl hover:opacity-90 transition-opacity" />
                          </a>
                        ) : (
                          <div className="h-28 flex items-center justify-center text-xs text-gray-400">No selfie</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleVerifyStudent(student.uid, 'rejected')}
                      className="flex-1 py-3 px-4 bg-red-50 text-red-600 rounded-xl font-semibold flex items-center justify-center gap-1.5 hover:bg-red-100 transition-colors text-sm"
                    >
                      <Ban size={16} /> Reject
                    </button>
                    <button
                      onClick={() => handleVerifyStudent(student.uid, 'verified')}
                      className="flex-1 py-3 px-4 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 hover:bg-green-700 transition-colors text-sm shadow-sm"
                    >
                      <Check size={16} /> Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { onSnapshot, query, where, limit } from 'firebase/firestore';
import { displayBoardCollection } from '../firebase';
import { ChefHat, BellRing } from 'lucide-react';

type BoardEntry = {
  id: string;
  token_number: string;
  status: 'PREPARING' | 'READY' | string;
};

export default function LiveDisplay() {
  const [preparingOrders, setPreparingOrders] = useState<BoardEntry[]>([]);
  const [readyOrders, setReadyOrders] = useState<BoardEntry[]>([]);

  useEffect(() => {
    const q = query(
      displayBoardCollection,
      where('status', 'in', ['PREPARING', 'READY']),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as BoardEntry));
      setPreparingOrders(entries.filter(o => o.status === 'PREPARING'));
      setReadyOrders(entries.filter(o => o.status === 'READY'));
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-900 p-6 sm:p-12 overflow-hidden flex flex-col font-sans">
      <div className="mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
          LIVE ORDER STATUS
        </h1>
        <p className="text-slate-500 text-lg mt-2 font-medium">Please collect your food when your token is in the Ready column.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-amber-100">
            <div className="bg-amber-100 p-3 rounded-2xl">
              <ChefHat size={32} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-amber-900">Preparing Now</h2>
              <p className="text-xs text-amber-700 font-semibold mt-0.5">Chefs are cooking these tickets</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3.5 items-start content-start">
            {preparingOrders.length === 0 ? (
              <div className="text-slate-400 text-lg w-full text-center py-12 font-bold">No orders currently cooking</div>
            ) : (
              preparingOrders.map(order => (
                <div key={order.id} className="bg-amber-50 border-2 border-amber-300 px-6 py-4 rounded-2xl shadow-xs">
                  <span className="text-3xl font-black font-mono text-amber-900">{order.token_number}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-100">
            <div className="bg-emerald-100 p-3 rounded-2xl">
              <BellRing size={32} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-emerald-900">Ready for Pickup</h2>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">Collect now at the counter</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3.5 items-start content-start">
            {readyOrders.length === 0 ? (
              <div className="text-slate-400 text-lg w-full text-center py-12 font-bold">Waiting for orders to be ready...</div>
            ) : (
              readyOrders.map(order => (
                <div key={order.id} className="bg-emerald-600 border-2 border-emerald-700 px-6 py-4 rounded-2xl shadow-md animate-bounce">
                  <span className="text-3xl font-black font-mono text-white">{order.token_number}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

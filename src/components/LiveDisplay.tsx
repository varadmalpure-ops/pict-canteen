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
    <div className="min-h-[calc(100vh-4rem)] bg-gray-900 text-white p-6 sm:p-12 overflow-hidden flex flex-col">
      <div className="mb-8 text-center">
        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200">
          ORDER STATUS
        </h1>
        <p className="text-gray-400 text-xl mt-2">Please wait until your token is in the READY column.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
        <div className="bg-gray-800/50 rounded-3xl p-6 border border-gray-700/50 flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700">
            <div className="bg-orange-500/20 p-3 rounded-2xl">
              <ChefHat size={32} className="text-orange-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-200">Preparing</h2>
          </div>
          <div className="flex flex-wrap gap-4 items-start content-start">
            {preparingOrders.length === 0 ? (
              <div className="text-gray-500 text-xl w-full text-center py-10 font-medium">No orders in queue</div>
            ) : (
              preparingOrders.map(order => (
                <div key={order.id} className="bg-gray-800 border border-gray-700 px-6 py-4 rounded-2xl">
                  <span className="text-3xl font-bold text-gray-300">{order.token_number}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-blue-900/20 rounded-3xl p-6 border border-blue-800/30 flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-900/50">
            <div className="bg-green-500/20 p-3 rounded-2xl">
              <BellRing size={32} className="text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Ready for Pickup</h2>
          </div>
          <div className="flex flex-wrap gap-4 items-start content-start">
            {readyOrders.length === 0 ? (
              <div className="text-blue-500/50 text-xl w-full text-center py-10 font-medium">Waiting for orders to be ready...</div>
            ) : (
              readyOrders.map(order => (
                <div key={order.id} className="bg-blue-900/40 border border-blue-700 px-6 py-4 rounded-2xl">
                  <span className="text-3xl font-bold text-white">{order.token_number}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

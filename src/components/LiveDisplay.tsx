import { useState, useEffect } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import { ordersCollection } from '../firebase';
import type { Order } from '../types';
import { ChefHat, BellRing } from 'lucide-react';

export default function LiveDisplay() {
  const [preparingOrders, setPreparingOrders] = useState<Order[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Only get orders that are preparing or ready, limit to 20 to avoid screen overflow
    const q = query(
      ordersCollection,
      where('status', 'in', ['PREPARING', 'READY'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      // Sort by creation time manually since we have an 'in' query
      orders.sort((a, b) => {
        const timeA = a.created_at || 0;
        const timeB = b.created_at || 0;
        return timeA > timeB ? 1 : -1;
      });

      setPreparingOrders(orders.filter(o => o.status === 'PREPARING'));
      setReadyOrders(orders.filter(o => o.status === 'READY'));
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
        {/* Preparing Column */}
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
                <div key={order.id} className="bg-gray-800 border border-gray-700 px-6 py-4 rounded-2xl shadow-lg">
                  <span className="text-3xl font-bold text-gray-300">{order.token_number}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ready Column */}
        <div className="bg-blue-900/20 rounded-3xl p-6 border border-blue-800/30 flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-900/50">
            <div className="bg-green-500/20 p-3 rounded-2xl animate-pulse">
              <BellRing size={32} className="text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Ready for Pickup</h2>
          </div>
          
          <div className="flex flex-wrap gap-4 items-start content-start">
            {readyOrders.length === 0 ? (
              <div className="text-blue-500/50 text-xl w-full text-center py-10 font-medium">Waiting for orders to be ready...</div>
            ) : (
              readyOrders.map(order => (
                <div key={order.id} className="bg-green-500 text-white px-8 py-5 rounded-2xl shadow-xl shadow-green-500/20 transform hover:scale-105 transition-transform animate-in zoom-in duration-300 border border-green-400">
                  <span className="text-4xl font-black">{order.token_number}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

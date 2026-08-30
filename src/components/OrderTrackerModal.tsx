import type { Order } from '../types';
import { X, CheckCircle2, ChefHat, BellRing, Utensils, Clock } from 'lucide-react';

interface OrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
}

export default function OrderTrackerModal({
  isOpen,
  onClose,
  orders,
}: OrderTrackerModalProps) {
  if (!isOpen || orders.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-6 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Utensils size={16} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Active Food Tokens</h3>
              <p className="text-[11px] font-medium text-slate-400">{orders.length} order{orders.length > 1 ? 's' : ''} in progress</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors google-touch cursor-pointer"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Orders List */}
        <div className="overflow-y-auto py-4 space-y-4">
          {orders.map((order) => {
            const isReady = order.status === 'READY';
            const isCooking = order.status === 'PREPARING';

            return (
              <div
                key={order.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isReady
                    ? 'bg-gradient-to-b from-emerald-50 to-white border-emerald-300 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-50 border-slate-200/80 shadow-2xs'
                }`}
              >
                {/* Token Number Card */}
                <div className="text-center mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Your Token Number
                  </span>
                  <div className={`text-4xl font-black tracking-tight my-1 ${
                    isReady ? 'text-emerald-600' : 'text-blue-600'
                  }`}>
                    {order.token_number}
                  </div>
                  {order.scheduled_for && (
                    <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full shadow-2xs">
                      <Clock size={13} className="text-amber-600" />
                      <span>Pickup: {order.scheduled_for}</span>
                    </div>
                  )}
                  {order.payment_status === 'Unverified' && (
                    <span className="inline-block text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full mt-1">
                      Payment verification pending
                    </span>
                  )}
                </div>

                {/* 3-Step Visual Tracker */}
                <div className="flex items-center justify-between my-5 px-1">
                  {/* Step 1: Placed */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 mt-1">Placed</span>
                  </div>

                  <div className={`h-1 flex-1 mx-1 rounded-full transition-all ${
                    isCooking || isReady ? 'bg-amber-500' : 'bg-slate-200'
                  }`} />

                  {/* Step 2: Cooking */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isCooking
                        ? 'bg-amber-500 text-white ring-4 ring-amber-200 animate-pulse'
                        : isReady
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-200 text-slate-400'
                    }`}>
                      <ChefHat size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 mt-1">Cooking</span>
                  </div>

                  <div className={`h-1 flex-1 mx-1 rounded-full transition-all ${
                    isReady ? 'bg-emerald-500' : 'bg-slate-200'
                  }`} />

                  {/* Step 3: Pickup */}
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isReady
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-200 shadow-md animate-bounce'
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                      <BellRing size={16} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 mt-1">Pickup</span>
                  </div>
                </div>

                {/* Status Callout */}
                {isReady ? (
                  <div className="bg-emerald-600 text-white p-3 rounded-xl font-bold text-xs text-center shadow-sm">
                    🎉 Food is Ready! Collect at Canteen Counter.
                  </div>
                ) : (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] text-center text-slate-600 font-medium">
                    Status: <strong className="text-slate-900">{order.status === 'Pending' ? 'In Kitchen Queue' : 'Being Cooked 🍳'}</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

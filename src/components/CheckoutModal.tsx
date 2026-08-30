import type { OrderItem } from '../types';
import { X, Loader2, Zap, Banknote, Clock, ChevronRight, CheckCircle2 } from 'lucide-react';

export type PaymentMethodOption = 'razorpay' | 'pay_at_counter';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: OrderItem[];
  cartTotal: number;
  paymentProvider: PaymentMethodOption;
  onSelectPaymentProvider: (provider: PaymentMethodOption) => void;
  scheduledFor: string;
  onSelectScheduledFor: (val: string) => void;
  customTime: string;
  onSelectCustomTime: (val: string) => void;
  isProcessing: boolean;
  onSubmit: () => void;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  cart,
  cartTotal,
  paymentProvider,
  onSelectPaymentProvider,
  scheduledFor,
  onSelectScheduledFor,
  customTime,
  onSelectCustomTime,
  isProcessing,
  onSubmit,
}: CheckoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-slate-100 p-6 max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-6 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Order Checkout
            </h3>
            <p className="text-xs font-medium text-slate-400">
              Confirm your order & choose payment method
            </p>
          </div>
          <button
            onClick={() => !isProcessing && onClose()}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          
          {/* Order Summary Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-slate-200/60 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Items ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
              <span>Subtotal</span>
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 font-medium text-slate-800">
                    <span className="bg-white px-2 py-0.5 rounded-md font-bold text-indigo-600 border border-slate-200 shadow-2xs">
                      {item.quantity}x
                    </span>
                    <span className="line-clamp-1">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-slate-900">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onSelectPaymentProvider('pay_at_counter')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  paymentProvider === 'pay_at_counter'
                    ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-200 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-black text-xs flex items-center gap-1.5 text-emerald-700">
                  <Banknote size={15} /> Pay at Counter
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">
                  Cash or Counter UPI QR
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectPaymentProvider('razorpay')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  paymentProvider === 'razorpay'
                    ? 'bg-indigo-50/70 border-indigo-500 text-indigo-950 ring-2 ring-indigo-200 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-black text-xs flex items-center gap-1.5 text-indigo-600">
                  <Zap size={14} className="fill-indigo-600" /> Pay Online
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">
                  Cards & Netbanking
                </div>
              </button>
            </div>
          </div>

          {/* Pay at Counter Info Banner */}
          {paymentProvider === 'pay_at_counter' && (
            <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-emerald-900 animate-in fade-in">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
              <div className="text-xs">
                <span className="font-bold block">Instant Token Generation</span>
                <span className="text-emerald-700 mt-0.5 block">
                  Get your token immediately. Pay ₹{cartTotal.toFixed(2)} with cash or scan the canteen counter QR when your token is called.
                </span>
              </div>
            </div>
          )}

          {/* Pickup Timing */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              <Clock size={14} /> Pickup Time
            </div>
            <select
              value={scheduledFor}
              onChange={(e) => onSelectScheduledFor(e.target.value)}
              className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none font-semibold text-xs text-slate-800 mb-2 shadow-2xs"
            >
              <option value="now">Now (Prepare Immediately)</option>
              <option value="11:00 AM">11:00 AM (Recess Break)</option>
              <option value="1:00 PM">1:00 PM (Lunch Break)</option>
              <option value="custom">Custom Pickup Time...</option>
            </select>
            {scheduledFor === 'custom' && (
              <input
                type="time"
                value={customTime}
                onChange={(e) => onSelectCustomTime(e.target.value)}
                className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none font-semibold text-xs text-slate-800 shadow-2xs"
              />
            )}
          </div>
        </div>

        {/* Footer & Pay Action */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-baseline justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Payable</span>
            <span className="text-2xl font-black text-slate-900 tracking-tight">₹{cartTotal.toFixed(2)}</span>
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isProcessing}
            className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <><Loader2 size={18} className="animate-spin" /> Confirming Order...</>
            ) : paymentProvider === 'pay_at_counter' ? (
              <>Place Order & Get Token <ChevronRight size={16} /></>
            ) : (
              <>Pay ₹{cartTotal.toFixed(2)} Online <ChevronRight size={16} /></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

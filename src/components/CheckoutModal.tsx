import { useState } from 'react';
import type { OrderItem } from '../types';
import { X, Loader2, Zap, Copy, Check, Clock, ChevronRight } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: OrderItem[];
  cartTotal: number;
  paymentProvider: 'razorpay' | 'upi_manual';
  onSelectPaymentProvider: (provider: 'razorpay' | 'upi_manual') => void;
  scheduledFor: string;
  onSelectScheduledFor: (val: string) => void;
  customTime: string;
  onSelectCustomTime: (val: string) => void;
  utrNumber: string;
  onChangeUtrNumber: (val: string) => void;
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
  utrNumber,
  onChangeUtrNumber,
  isProcessing,
  onSubmit,
}: CheckoutModalProps) {
  const [copiedUpi, setCopiedUpi] = useState(false);

  if (!isOpen) return null;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('Q829774745@ybl');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

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
              Review your items and complete payment
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
                onClick={() => onSelectPaymentProvider('razorpay')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  paymentProvider === 'razorpay'
                    ? 'bg-indigo-50/70 border-indigo-500 text-indigo-950 ring-2 ring-indigo-200 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-black text-xs flex items-center gap-1.5 text-indigo-600">
                  <Zap size={14} className="fill-indigo-600" /> 1-Click Online
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">
                  GPay, PhonePe, Cards
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelectPaymentProvider('upi_manual')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  paymentProvider === 'upi_manual'
                    ? 'bg-indigo-50/70 border-indigo-500 text-indigo-950 ring-2 ring-indigo-200 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-black text-xs flex items-center gap-1.5 text-purple-600">
                  <Copy size={14} /> Manual UPI
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-1">
                  Pay to UPI ID + Ref
                </div>
              </button>
            </div>
          </div>

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

          {/* Manual UPI Details (if selected) */}
          {paymentProvider === 'upi_manual' && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Canteen UPI ID</div>
                  <div className="font-black text-sm text-slate-900">Q829774745@ybl</div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors ${
                    copiedUpi ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  }`}
                >
                  {copiedUpi ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Enter 12-Digit UPI Ref / UTR Number
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => onChangeUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  placeholder="e.g. 312345678901"
                  className={`w-full bg-white px-3.5 py-3 rounded-xl border-2 outline-none font-mono font-bold tracking-widest text-center text-sm ${
                    utrNumber.length === 12 ? 'border-emerald-500 text-emerald-950' : 'border-slate-200'
                  }`}
                  maxLength={12}
                />
              </div>
            </div>
          )}
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
            disabled={
              isProcessing ||
              (paymentProvider === 'upi_manual' && utrNumber.length !== 12)
            }
            className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <><Loader2 size={18} className="animate-spin" /> Processing Payment...</>
            ) : paymentProvider === 'razorpay' ? (
              <>Pay ₹{cartTotal.toFixed(2)} Securely <ChevronRight size={16} /></>
            ) : (
              <>Confirm UTR & Place Order <ChevronRight size={16} /></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

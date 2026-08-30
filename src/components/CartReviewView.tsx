import { useMemo } from 'react';
import type { MenuItem, OrderItem } from '../types';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  Trash2, 
  Zap, 
  Clock, 
  Banknote, 
  Sparkles, 
  ChevronRight, 
  Loader2, 
  ShieldCheck,
  UtensilsCrossed
} from 'lucide-react';

export type PaymentMethodOption = 'pay_at_counter' | 'razorpay';

interface CartReviewViewProps {
  isOpen: boolean;
  onClose: () => void;
  cart: OrderItem[];
  menu: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (itemId: string) => void;
  onClearCart: () => void;
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

export default function CartReviewView({
  isOpen,
  onClose,
  cart,
  menu,
  onAddToCart,
  onRemoveFromCart,
  onClearCart,
  cartTotal,
  paymentProvider,
  onSelectPaymentProvider,
  scheduledFor,
  onSelectScheduledFor,
  customTime,
  onSelectCustomTime,
  isProcessing,
  onSubmit,
}: CartReviewViewProps) {
  // Suggested Quick Add-ons (Items in menu not yet in cart)
  const quickAddons = useMemo(() => {
    const cartIds = new Set(cart.map(c => c.itemId));
    return menu
      .filter(item => !cartIds.has(item.id) && item.is_available && item.price > 0)
      .slice(0, 4);
  }, [cart, menu]);

  const totalItemsCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col font-sans animate-in fade-in duration-200">
      
      {/* Top Header Bar (Blinkit/Swiggy-style) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-4 py-3.5 shadow-2xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-95"
              aria-label="Back to menu"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                Review Your Order
              </h2>
              <p className="text-[11px] font-semibold text-slate-400">
                PICT Canteen • {totalItemsCount} item{totalItemsCount > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              onClick={onClearCart}
              disabled={isProcessing}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-4 py-5 pb-36">
        <div className="max-w-2xl mx-auto space-y-4">
          
          {cart.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs my-8">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <UtensilsCrossed size={28} />
              </div>
              <h3 className="font-black text-slate-800 text-base">Your cart is empty</h3>
              <p className="text-xs text-slate-400 mt-1 mb-5">Add tasty snacks or drinks to place an order</p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Browse Menu ➔
              </button>
            </div>
          ) : (
            <>
              {/* 1. Itemized List with Steppers */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <span>Selected Dishes</span>
                  <span>Amount</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {cart.map((item) => {
                    const menuItem = menu.find(m => m.id === item.itemId);
                    return (
                      <div key={item.itemId} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1">
                              {item.name}
                            </h4>
                            {item.is_express && (
                              <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200/60">
                                ⚡ Express
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-semibold mt-0.5">
                            ₹{item.price} each
                          </div>
                        </div>

                        {/* Interactive Quantity Stepper */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-slate-900 text-white rounded-xl p-1 shadow-xs">
                            <button
                              onClick={() => onRemoveFromCart(item.itemId)}
                              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white active:scale-90 transition-transform"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="font-black text-xs w-4 text-center select-none">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => menuItem && onAddToCart(menuItem)}
                              className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white active:scale-90 transition-transform"
                              aria-label="Increase quantity"
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          <div className="font-black text-sm text-slate-900 text-right min-w-14">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-dashed border-slate-200">
                  <button
                    onClick={onClose}
                    className="text-indigo-600 hover:text-indigo-700 text-xs font-extrabold flex items-center gap-1"
                  >
                    <Plus size={14} /> Add more dishes from menu
                  </button>
                </div>
              </div>

              {/* 2. Quick Add-ons Carousel (Blinkit/Zomato-style) */}
              {quickAddons.length > 0 && (
                <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
                  <div className="flex items-center gap-1.5 mb-3 text-xs font-black uppercase tracking-wider text-slate-700">
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Frequently Added Together</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {quickAddons.map(addon => (
                      <div key={addon.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col justify-between hover:bg-indigo-50/30 transition-colors">
                        <div>
                          <div className="font-bold text-xs text-slate-900 line-clamp-1">{addon.name}</div>
                          <div className="font-extrabold text-xs text-indigo-700 mt-0.5">₹{addon.price}</div>
                        </div>
                        <button
                          onClick={() => onAddToCart(addon)}
                          className="mt-2.5 w-full py-1.5 bg-white hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 text-indigo-700 hover:text-white rounded-xl text-[11px] font-bold shadow-2xs transition-all flex items-center justify-center gap-1"
                        >
                          <Plus size={12} /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Pickup Timing Selection */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                    <Clock size={15} className="text-indigo-600" />
                    <span>Pickup Time</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">Canteen Counter 1</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectScheduledFor('now')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      scheduledFor === 'now'
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 ring-2 ring-indigo-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-black text-xs">⚡ Prepare Now</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Ready in ~5-10 mins</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectScheduledFor('11:00 AM')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      scheduledFor === '11:00 AM'
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 ring-2 ring-indigo-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-black text-xs">🕒 11:00 AM</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Recess Break</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectScheduledFor('1:00 PM')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      scheduledFor === '1:00 PM'
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 ring-2 ring-indigo-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-black text-xs">🕒 1:00 PM</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Lunch Break</div>
                  </button>
                </div>

                {scheduledFor === 'custom' && (
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => onSelectCustomTime(e.target.value)}
                    className="w-full bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none font-semibold text-xs text-slate-800"
                  />
                )}
              </div>

              {/* 4. Payment Method Options */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Payment Method
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectPaymentProvider('pay_at_counter')}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                      paymentProvider === 'pay_at_counter'
                        ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-200 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Banknote size={16} />
                    </div>
                    <div>
                      <div className="font-black text-xs text-emerald-950">Pay at Counter</div>
                      <div className="text-[11px] text-emerald-800 font-medium mt-0.5">
                        Pay cash or scan canteen QR when your token is called
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectPaymentProvider('razorpay')}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                      paymentProvider === 'razorpay'
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 ring-2 ring-indigo-200 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Zap size={16} className="fill-white" />
                    </div>
                    <div>
                      <div className="font-black text-xs text-indigo-950">Pay Online</div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                        UPI, GPay, PhonePe, Cards & Netbanking
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 5. Bill Summary Card */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2.5 text-xs font-semibold text-slate-600">
                <div className="text-xs font-black uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-100">
                  Bill Summary
                </div>

                <div className="flex justify-between items-center">
                  <span>Item Total ({totalItemsCount} items)</span>
                  <span className="font-bold text-slate-900">₹{cartTotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Canteen Convenience Fee</span>
                  <span className="font-extrabold text-emerald-600">FREE</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Packaging & Token Service</span>
                  <span className="font-extrabold text-emerald-600">FREE</span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline font-black text-base text-slate-900">
                  <span>To Pay</span>
                  <span className="text-xl">₹{cartTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Safety / Verification Notice */}
              <div className="flex items-center gap-2 px-2 text-slate-400 text-[11px] font-medium justify-center">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Zero extra fees • Direct canteen fulfillment</span>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Bottom Sticky Action Bar (Zomato/Blinkit-style) */}
      {cart.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 p-4 z-40 shadow-2xl">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {paymentProvider === 'pay_at_counter' ? '💵 Pay at Counter' : '⚡ Online Payment'}
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                ₹{cartTotal.toFixed(2)}
              </div>
            </div>

            <button
              onClick={onSubmit}
              disabled={isProcessing}
              className="flex-1 max-w-xs py-4 px-6 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <><Loader2 size={18} className="animate-spin" /> Placing Order...</>
              ) : paymentProvider === 'pay_at_counter' ? (
                <>Place Order & Get Token <ChevronRight size={18} /></>
              ) : (
                <>Proceed to Pay ₹{cartTotal.toFixed(2)} <ChevronRight size={18} /></>
              )}
            </button>
          </div>
        </footer>
      )}

    </div>
  );
}

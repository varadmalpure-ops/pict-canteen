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

import { formatTime12h, isWithinOperatingHours } from '../lib/timeUtils';

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
  // Suggested Quick Add-ons (Items in menu not yet in cart) - Max 2 items
  const quickAddons = useMemo(() => {
    const cartIds = new Set(cart.map(c => c.itemId));
    return menu
      .filter(item => !cartIds.has(item.id) && item.is_available && item.price > 0)
      .slice(0, 2);
  }, [cart, menu]);

  const totalItemsCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const isCustomTimeValid = scheduledFor !== 'custom' || (Boolean(customTime) && isWithinOperatingHours(customTime));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 dark:bg-[#090d16] flex flex-col font-sans animate-in fade-in duration-200 transition-colors">
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0f141c]/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-4 py-3.5 shadow-2xs transition-colors">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors google-touch cursor-pointer"
              aria-label="Back to menu"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Review Your Order
              </h2>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                PICT Canteen • {totalItemsCount} item{totalItemsCount > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              onClick={onClearCart}
              disabled={isProcessing}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1 google-touch cursor-pointer"
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
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs my-8 transition-colors">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-500">
                <UtensilsCrossed size={28} />
              </div>
              <h3 className="font-black text-slate-800 dark:text-white text-base">Your cart is empty</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-5">Add tasty snacks or drinks to place an order</p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-sm google-touch google-ripple transition-all cursor-pointer"
              >
                Browse Menu ➔
              </button>
            </div>
          ) : (
            <>
              {/* 1. Itemized List with Steppers */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  <span>Selected Dishes</span>
                  <span>Amount</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cart.map((item) => {
                    const menuItem = menu.find(m => m.id === item.itemId);
                    return (
                      <div key={item.itemId} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">
                              {item.name}
                            </h4>
                            {item.is_express && (
                              <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-200/60 dark:border-purple-800/60">
                                ⚡ Express
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                            ₹{item.price} each
                          </div>
                        </div>

                        {/* Interactive Quantity Stepper */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-full p-1 shadow-xs border border-slate-700/50">
                            <button
                              onClick={() => onRemoveFromCart(item.itemId)}
                              className="w-7 h-7 rounded-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center text-white google-touch cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="font-black text-xs w-4 text-center select-none">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => menuItem && onAddToCart(menuItem)}
                              className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white google-touch cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          <div className="font-black text-sm text-slate-900 dark:text-white text-right min-w-14">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <button
                    onClick={onClose}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs font-extrabold flex items-center gap-1 google-touch cursor-pointer"
                  >
                    <Plus size={14} /> Add more dishes from menu
                  </button>
                </div>
              </div>

              {/* 2. Frequently Added Together (strictly 2 options) */}
              {quickAddons.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <Sparkles size={14} className="text-amber-500" />
                      <span>Frequently Added Together</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Quick Add</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {quickAddons.map(addon => (
                      <div key={addon.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between hover:bg-blue-50/30 dark:hover:bg-slate-800 transition-colors">
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">{addon.name}</div>
                          <div className="font-extrabold text-xs text-blue-600 dark:text-blue-400 mt-0.5">₹{addon.price}</div>
                        </div>
                        <button
                          onClick={() => onAddToCart(addon)}
                          className="mt-2.5 w-full py-1.5 bg-white dark:bg-slate-900 hover:bg-blue-600 dark:hover:bg-blue-600 border border-blue-200 dark:border-slate-700 hover:border-blue-600 text-blue-600 dark:text-blue-400 hover:text-white dark:hover:text-white rounded-full text-[11px] font-bold shadow-2xs transition-all flex items-center justify-center gap-1 google-touch google-ripple cursor-pointer"
                        >
                          <Plus size={12} /> Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Pickup Timing Selection (Customizable anytime 9am - 6pm) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Clock size={15} className="text-blue-600 dark:text-blue-400" />
                    <span>Pickup Time</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">9:00 AM – 6:00 PM</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectScheduledFor('now')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer google-touch ${
                      scheduledFor === 'now'
                        ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-500 text-blue-950 dark:text-blue-200 ring-2 ring-blue-200 dark:ring-blue-800'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-black text-xs">⚡ Prepare Now</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Ready in ~5-10 mins</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectScheduledFor('11:00 AM')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer google-touch ${
                      scheduledFor === '11:00 AM'
                        ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-500 text-blue-950 dark:text-blue-200 ring-2 ring-blue-200 dark:ring-blue-800'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-black text-xs">🕒 11:00 AM</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Recess Break</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectScheduledFor('1:00 PM')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer google-touch ${
                      scheduledFor === '1:00 PM'
                        ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-500 text-blue-950 dark:text-blue-200 ring-2 ring-blue-200 dark:ring-blue-800'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-black text-xs">🕒 1:00 PM</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Lunch Break</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectScheduledFor('custom');
                      if (!customTime) onSelectCustomTime('12:00');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer google-touch ${
                      scheduledFor === 'custom'
                        ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-500 text-blue-950 dark:text-blue-200 ring-2 ring-blue-200 dark:ring-blue-800'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-black text-xs">⏱️ Custom Time</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {scheduledFor === 'custom' && customTime ? formatTime12h(customTime) : 'Choose time'}
                    </div>
                  </button>
                </div>

                {scheduledFor === 'custom' && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-blue-100 dark:border-slate-700 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="custom-pickup-time" className="font-bold text-slate-700 dark:text-slate-300">
                        Select Pickup Time (9:00 AM – 6:00 PM):
                      </label>
                      {customTime && isWithinOperatingHours(customTime) && (
                        <span className="font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                          {formatTime12h(customTime)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="custom-pickup-time"
                        type="time"
                        min="09:00"
                        max="18:00"
                        step="300"
                        value={customTime}
                        onChange={(e) => onSelectCustomTime(e.target.value)}
                        className={`w-full bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border font-bold text-sm text-slate-800 dark:text-white outline-none transition-all cursor-pointer ${
                          customTime && !isWithinOperatingHours(customTime)
                            ? 'border-rose-400 ring-2 ring-rose-100 dark:ring-rose-950'
                            : 'border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-950'
                        }`}
                      />
                    </div>

                    {/* Quick popular slots between 9am-6pm */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quick Slots</div>
                      <div className="flex flex-wrap gap-1.5">
                        {['09:30', '10:30', '12:00', '14:30', '16:00', '17:30'].map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => onSelectCustomTime(slot)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer google-touch ${
                              customTime === slot
                                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:text-blue-600 dark:hover:text-blue-400'
                            }`}
                          >
                            {formatTime12h(slot)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {customTime && !isWithinOperatingHours(customTime) ? (
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                        ⚠️ Please choose a time between 09:00 AM and 06:00 PM.
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        ℹ️ Available for pickup anytime from 09:00 AM to 06:00 PM today.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Payment Method Options */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 transition-colors">
                <div className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectPaymentProvider('pay_at_counter')}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 google-touch cursor-pointer ${
                      paymentProvider === 'pay_at_counter'
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-200 ring-2 ring-emerald-200 dark:ring-emerald-800 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Banknote size={16} />
                    </div>
                    <div>
                      <div className="font-black text-xs text-emerald-950 dark:text-emerald-200">Pay at Counter</div>
                      <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium mt-0.5">
                        Pay cash or scan canteen QR when your token is called
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectPaymentProvider('razorpay')}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 google-touch cursor-pointer ${
                      paymentProvider === 'razorpay'
                        ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-500 text-blue-950 dark:text-blue-200 ring-2 ring-blue-200 dark:ring-blue-800 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Zap size={16} className="fill-white" />
                    </div>
                    <div>
                      <div className="font-black text-xs text-blue-950 dark:text-blue-200">Pay Online</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        UPI, GPay, PhonePe, Cards & Netbanking
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* 5. Bill Summary Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-colors">
                <div className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                  Bill Summary
                </div>

                <div className="flex justify-between items-center">
                  <span>Item Total ({totalItemsCount} items)</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{cartTotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Canteen Convenience Fee</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">FREE</span>
                </div>

                <div className="flex justify-between items-center">
                  <span>Packaging & Token Service</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">FREE</span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline font-black text-base text-slate-900 dark:text-white">
                  <span>To Pay</span>
                  <span className="text-xl">₹{cartTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Safety / Verification Notice */}
              <div className="flex items-center gap-2 px-2 text-slate-400 dark:text-slate-500 text-[11px] font-medium justify-center">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Zero extra fees • Direct canteen fulfillment</span>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Bottom Sticky Action Bar (Google pill button & responsive touch) */}
      {cart.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0f141c]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 p-4 z-40 shadow-2xl transition-colors">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {paymentProvider === 'pay_at_counter' ? '💵 Pay at Counter' : '⚡ Online Payment'}
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                ₹{cartTotal.toFixed(2)}
              </div>
            </div>

            <button
              onClick={onSubmit}
              disabled={isProcessing || !isCustomTimeValid}
              className="flex-1 max-w-xs py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-black text-sm shadow-xl shadow-blue-600/20 google-touch google-ripple transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isProcessing ? (
                <><Loader2 size={18} className="animate-spin" /> Placing Order...</>
              ) : !isCustomTimeValid ? (
                <>Select Valid Time (9 AM – 6 PM)</>
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

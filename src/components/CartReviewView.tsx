import { useEffect, useMemo, useState } from 'react';
import type { MenuItem, OrderItem } from '../types';
import { ArrowLeft, Banknote, ChevronRight, Clock3, Leaf, Loader2, Minus, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { getPickupSlots } from '../lib/timeUtils';

interface CartReviewViewProps {
  isOpen: boolean;
  onClose: () => void;
  cart: OrderItem[];
  menu: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (itemId: string) => void;
  onClearCart: () => void;
  cartTotal: number;
  scheduledFor: string;
  onSelectScheduledFor: (val: string) => void;
  customTime: string;
  onSelectCustomTime: (val: string) => void;
  canSubmit: boolean;
  isProcessing: boolean;
  orderNotice?: string | null;
  onClearNotice?: () => void;
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
  scheduledFor,
  onSelectScheduledFor,
  customTime,
  onSelectCustomTime,
  canSubmit,
  isProcessing,
  orderNotice,
  onClearNotice,
  onSubmit,
}: CartReviewViewProps) {
  const [slotClock, setSlotClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setSlotClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const pickupSlots = useMemo(() => getPickupSlots(new Date(slotClock)), [slotClock]);
  const quickAddons = useMemo(() => {
    const cartIds = new Set(cart.map((item) => item.itemId));
    return menu.filter((item) => !cartIds.has(item.id) && item.is_available && item.price > 0).slice(0, 2);
  }, [cart, menu]);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const customSlotValid = scheduledFor !== 'custom' || pickupSlots.some((slot) => slot.value === customTime);
  const readyToSubmit = canSubmit && customSlotValid && cartTotal > 0 && !isProcessing && cart.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f6f7fb] font-sans animate-in fade-in duration-150">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} disabled={isProcessing} className="google-touch grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-slate-100 disabled:opacity-50" aria-label="Back to menu">
              <ArrowLeft size={19} />
            </button>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">Review your order</h2>
              <p className="text-xs text-slate-500">{totalItemsCount} item{totalItemsCount === 1 ? '' : 's'} · PICT Canteen</p>
            </div>
          </div>
          {cart.length > 0 && (
            <button onClick={onClearCart} disabled={isProcessing} className="google-touch inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
              <Trash2 size={14} /> Clear
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5 pb-32">
        <div className="mx-auto max-w-2xl space-y-4">
          {cart.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <h3 className="font-semibold text-slate-900">Your cart is empty</h3>
              <p className="mt-1 text-sm text-slate-500">Add something tasty from the menu.</p>
              <button onClick={onClose} className="mt-5 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">Back to menu</button>
            </div>
          ) : (
            <>
              <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-3 text-xs font-semibold text-slate-500">
                  <span>Your items</span><span>Amount</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {cart.map((item) => {
                    const menuItem = menu.find((candidate) => candidate.id === item.itemId);
                    return (
                      <div key={item.itemId} className="flex items-center justify-between gap-3 py-4 first:pt-2 last:pb-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-900">{item.name}</div>
                          <div className="mt-0.5 text-xs text-slate-500">₹{item.price.toFixed(2)} each</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                            <button onClick={() => onRemoveFromCart(item.itemId)} aria-label={`Remove one ${item.name}`} className="grid h-8 w-8 place-items-center rounded-full text-slate-700 hover:bg-white"><Minus size={15} /></button>
                            <span className="w-5 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                            <button onClick={() => menuItem && onAddToCart(menuItem)} aria-label={`Add one ${item.name}`} className="grid h-8 w-8 place-items-center rounded-full bg-white text-blue-700 shadow-sm"><Plus size={15} /></button>
                          </div>
                          <span className="min-w-16 text-right text-sm font-semibold tabular-nums text-slate-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={onClose} className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                  <Plus size={15} /> Add more dishes
                </button>
              </section>

              {quickAddons.length > 0 && (
                <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><Sparkles size={16} className="text-amber-500" /> Add a little extra</div>
                  <div className="grid grid-cols-2 gap-2">
                    {quickAddons.map((item) => (
                      <div key={item.id} className="rounded-2xl bg-slate-50 p-3">
                        <div className="truncate text-sm font-medium text-slate-900">{item.name}</div>
                        <div className="mt-0.5 text-sm font-semibold text-slate-700">₹{item.price}</div>
                        <button onClick={() => onAddToCart(item)} className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Plus size={13} /> Add</button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Clock3 size={17} className="text-blue-700" /> Pickup time</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => onSelectScheduledFor('now')} className={`rounded-2xl border p-3 text-left transition-colors ${scheduledFor === 'now' ? 'border-blue-500 bg-blue-50 text-blue-950 ring-2 ring-blue-100' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                    <span className="block text-sm font-semibold">As soon as ready</span>
                    <span className="mt-1 block text-xs text-slate-500">We’ll prepare it next</span>
                  </button>
                  <button type="button" onClick={() => onSelectScheduledFor('custom')} className={`rounded-2xl border p-3 text-left transition-colors ${scheduledFor === 'custom' ? 'border-blue-500 bg-blue-50 text-blue-950 ring-2 ring-blue-100' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                    <span className="block text-sm font-semibold">Choose a slot</span>
                    <span className="mt-1 block text-xs text-slate-500">15-minute pickup window</span>
                  </button>
                </div>
                {scheduledFor === 'custom' && (
                  <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                    {pickupSlots.length > 0 ? (
                      <label htmlFor="pickup-slot" className="block text-xs font-medium text-slate-600">
                        Today · 9:00 AM to 6:00 PM
                        <select id="pickup-slot" value={customTime} onChange={(event) => onSelectCustomTime(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                          <option value="">Select a 15-minute window</option>
                          {pickupSlots.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}
                        </select>
                      </label>
                    ) : (
                      <p className="text-sm text-slate-600">There are no pickup slots left today. Choose “As soon as ready”.</p>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="mb-3 text-sm font-semibold text-slate-900">Payment</div>
                <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-3.5 text-emerald-950">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white"><Banknote size={18} /></div>
                  <div>
                    <div className="text-sm font-semibold">Pay at the counter</div>
                    <p className="mt-0.5 text-xs leading-relaxed text-emerald-900">Your token is issued when you place the order. Pay when you collect your food.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-2 rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-600 sm:p-5">
                <div className="mb-3 border-b border-slate-100 pb-3 font-semibold text-slate-900">Bill summary</div>
                <div className="flex justify-between"><span>Items ({totalItemsCount})</span><span className="font-medium text-slate-900">₹{cartTotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Extra fees</span><span className="font-medium text-emerald-700">None</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-slate-900"><span>Total</span><span>₹{cartTotal.toFixed(2)}</span></div>
              </section>

              <div className="flex items-center justify-center gap-2 px-2 text-xs text-slate-500"><Leaf size={14} className="text-emerald-600" /> Nutrition notes are recipe-based estimates.</div>

              {orderNotice && (
                <div role="status" className="flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <span>{orderNotice}</span>
                  {onClearNotice && <button type="button" onClick={onClearNotice} aria-label="Dismiss message" className="rounded-full p-1 text-amber-800 hover:bg-amber-100"><X size={16} /></button>}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {cart.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <div><div className="text-xs text-slate-500">Total</div><div className="text-xl font-bold tabular-nums text-slate-900">₹{cartTotal.toFixed(2)}</div></div>
            <button onClick={onSubmit} disabled={!readyToSubmit} className="google-touch flex min-h-12 flex-1 max-w-xs items-center justify-center gap-2 rounded-full bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">
              {isProcessing ? <><Loader2 size={18} className="animate-spin" /> Placing order</> : !canSubmit ? 'Setting up your account' : !customSlotValid ? 'Choose a pickup slot' : <>Place order <ChevronRight size={18} /></>}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

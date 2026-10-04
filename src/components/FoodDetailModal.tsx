import { useState } from 'react';
import type { MenuItem, OrderItem } from '../types';
import { getFoodDetails } from '../lib/foodDetails';
import { X, Plus, Minus, Zap, Sparkles, Flame, Activity, ShieldCheck, Wheat } from 'lucide-react';

interface FoodDetailModalProps {
  item: MenuItem | null;
  onClose: () => void;
  cartItem?: OrderItem;
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (itemId: string) => void;
}

export default function FoodDetailModal({
  item,
  onClose,
  cartItem,
  onAddToCart,
  onRemoveFromCart,
}: FoodDetailModalProps) {
  const [imageError, setImageError] = useState(false);

  if (!item) return null;

  const details = getFoodDetails(item);
  const quantity = cartItem?.quantity || 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="food-modal-title"
      >
        {/* Top Image Hero Banner */}
        <div className="relative h-60 sm:h-64 w-full bg-slate-900 overflow-hidden shrink-0">
          {!imageError && details.photoUrl ? (
            <img
              src={details.photoUrl}
              alt={item.name}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900">
              <span className="text-8xl select-none">{details.emoji}</span>
            </div>
          )}

          {/* Gradient Overlay for Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40 pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>

          {/* Top Floating Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none">
            {item.is_express && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-md">
                <Zap size={12} className="fill-white" /> Express
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20">
              {item.category}
            </span>
          </div>

          {/* Title & Price on Image bottom - Pure Veg without green dot */}
          <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
            <h2 id="food-modal-title" className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-md">
              {item.name}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-amber-300 font-black text-xl sm:text-2xl drop-shadow-md">
                ₹{item.price}
              </span>
              <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                100% Pure Veg
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1">
          {/* Catchy Description */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-700 mb-1">
              <Sparkles size={14} className="text-blue-600" />
              Canteen Taste Profile
            </div>
            <p className="text-xs sm:text-sm font-semibold leading-relaxed text-slate-700">
              {details.catchyLine}
            </p>
          </div>

          {/* Nutritional Facts Grid */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Activity size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">Nutrition Breakdown</h3>
                  <span className="text-[10px] text-slate-400 font-medium">Standard portion estimate</span>
                </div>
              </div>
            </div>

            {/* 4 Graphic Macro Cards */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80">
                <Flame size={14} className="mx-auto text-amber-600 mb-0.5" />
                <span className="text-base sm:text-lg font-black text-slate-900 block leading-tight">{details.nutritionalFacts.calories}</span>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">kcal</span>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/80">
                <ShieldCheck size={14} className="mx-auto text-blue-600 mb-0.5" />
                <span className="text-base sm:text-lg font-black text-slate-900 block leading-tight">{details.nutritionalFacts.protein}g</span>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Protein</span>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80">
                <Wheat size={14} className="mx-auto text-emerald-600 mb-0.5" />
                <span className="text-base sm:text-lg font-black text-slate-900 block leading-tight">{details.nutritionalFacts.carbs}g</span>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Carbs</span>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80">
                <span className="text-xs mx-auto text-rose-600 font-black block">💧</span>
                <span className="text-base sm:text-lg font-black text-slate-900 block leading-tight">{details.nutritionalFacts.fats}g</span>
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Fats</span>
              </div>
            </div>

            {/* Health Highlights */}
            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-600 leading-relaxed">
              💡 {details.nutritionalFacts.highlights}
            </div>
          </div>
        </div>

        {/* Modal Sticky Bottom Bar: Add to Cart */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Price</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900">₹{item.price}</span>
          </div>

          <div>
            {!item.is_available ? (
              <span className="inline-block px-5 py-2.5 rounded-full bg-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                Sold Out
              </span>
            ) : quantity > 0 ? (
              <div className="flex items-center gap-2 bg-blue-600 text-white rounded-full p-1.5 shadow-md shadow-blue-500/20">
                <button
                  type="button"
                  onClick={() => onRemoveFromCart(item.id)}
                  className="w-8 h-8 rounded-full bg-blue-700 hover:bg-blue-800 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all"
                  aria-label="Decrease quantity"
                >
                  <Minus size={15} />
                </button>
                <span className="font-black text-sm w-6 text-center select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onAddToCart(item)}
                  disabled={quantity >= 20}
                  className="w-8 h-8 rounded-full bg-blue-700 hover:bg-blue-800 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  aria-label="Increase quantity"
                >
                  <Plus size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onAddToCart(item)}
                className="px-6 py-3 rounded-full bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-600/25 active:scale-98 cursor-pointer transition-all"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Add to Cart</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { MenuItem, OrderItem } from '../types';
import { getFoodDetails } from '../lib/foodDetails';
import { X, Plus, Minus, Zap, Leaf, Sparkles, Activity } from 'lucide-react';

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
  if (!item) return null;

  const details = getFoodDetails(item);
  const quantity = cartItem?.quantity || 0;
  const [imageError, setImageError] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="food-modal-title"
      >
        {/* Top Image Hero Banner */}
        <div className="relative h-56 sm:h-64 w-full bg-slate-900 overflow-hidden shrink-0">
          {!imageError && details.photoUrl ? (
            <img
              src={details.photoUrl}
              alt={item.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-700">
              <span className="text-7xl select-none">{details.emoji}</span>
            </div>
          )}

          {/* Gradient Overlay for Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30 pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white hover:bg-black/70 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-md active:scale-95"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>

          {/* Top Floating Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none">
            {item.is_express && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/95 text-blue-700 shadow-md backdrop-blur-md">
                <Zap size={13} className="fill-blue-600" /> Express Kitchen
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/60 text-white/95 backdrop-blur-md">
              {item.category}
            </span>
          </div>

          {/* Title & Price on Image bottom */}
          <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              {/* Veg Indicator Badge */}
              <div className="w-4 h-4 rounded-xs border-2 border-emerald-500 flex items-center justify-center p-0.5 bg-white shrink-0">
                <div className="w-2 h-2 rounded-full bg-emerald-600" />
              </div>
              <h2 id="food-modal-title" className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-sm line-clamp-1">
                {item.name}
              </h2>
            </div>
            <div className="text-emerald-400 font-extrabold text-lg sm:text-xl drop-shadow-sm">
              ₹{item.price}
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1">
          {/* Catchy Line Highlight Card */}
          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-100 text-blue-950">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-700 mb-1">
              <Sparkles size={14} className="text-blue-600" />
              Canteen Special
            </div>
            <p className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed italic">
              "{details.catchyLine}"
            </p>
          </div>

          {/* Nutritional Facts Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Activity size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Nutritional Facts</h3>
                  <p className="text-[11px] text-slate-400">Approximate values per standard canteen portion</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                100% Vegetarian
              </span>
            </div>

            {/* 4-Item Nutrition Grid (Calories, Protein, Carbs, Fats) */}
            <div className="grid grid-cols-4 gap-2 text-center my-3">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Energy</span>
                <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5 block">{details.nutritionalFacts.calories}</span>
                <span className="text-[10px] text-slate-500 font-semibold block">kcal</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Protein</span>
                <span className="text-base sm:text-lg font-black text-blue-600 mt-0.5 block">{details.nutritionalFacts.protein}g</span>
                <span className="text-[10px] text-slate-500 font-semibold block">grams</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Carbs</span>
                <span className="text-base sm:text-lg font-black text-amber-600 mt-0.5 block">{details.nutritionalFacts.carbs}g</span>
                <span className="text-[10px] text-slate-500 font-semibold block">grams</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fats</span>
                <span className="text-base sm:text-lg font-black text-rose-600 mt-0.5 block">{details.nutritionalFacts.fats}g</span>
                <span className="text-[10px] text-slate-500 font-semibold block">grams</span>
              </div>
            </div>

            {/* Health & Dietary Note */}
            <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-950 leading-relaxed">
              <Leaf size={15} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>{details.nutritionalFacts.highlights}</span>
            </div>
          </div>
        </div>

        {/* Modal Sticky Bottom Bar: Add to Cart */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Price</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900">₹{item.price}</span>
          </div>

          <div>
            {!item.is_available ? (
              <span className="inline-block px-5 py-2.5 rounded-full bg-slate-100 text-slate-400 font-bold text-sm">
                Currently Sold Out
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
                className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-98 cursor-pointer transition-all"
              >
                <Plus size={16} />
                <span>Add to Cart</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

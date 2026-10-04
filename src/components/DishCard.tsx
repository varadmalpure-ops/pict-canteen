import React, { useState } from 'react';
import type { MenuItem, OrderItem } from '../types';
import { Plus, Minus, Zap, Flame, Star } from 'lucide-react';
import { getFoodDetails } from '../lib/foodDetails';

interface DishCardProps {
  item: MenuItem;
  cartItem?: OrderItem;
  isPopular?: boolean;
  isTop8?: boolean;
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (itemId: string) => void;
  onOpenDetails?: (item: MenuItem) => void;
}

export const DishCard = React.memo(function DishCard({
  item,
  cartItem,
  isPopular = false,
  isTop8 = false,
  onAddToCart,
  onRemoveFromCart,
  onOpenDetails,
}: DishCardProps) {
  const quantity = cartItem?.quantity || 0;
  const details = getFoodDetails(item);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`group relative flex items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 bg-white border-b border-slate-100 transition-all hover:bg-slate-50/80 ${
        quantity > 0 ? 'bg-blue-50/25' : ''
      }`}
    >
      {/* Left Details Column */}
      <div className="flex-1 min-w-0 pr-1">
        {/* Badges Row - 100% veg by default (no green dot), colorful accent tags */}
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          {isTop8 && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-2xs border border-amber-300">
              <Star size={10} className="fill-slate-950" /> Bestseller
            </span>
          )}

          {item.is_express && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
              <Zap size={10} className="fill-rose-600" /> Express
            </span>
          )}

          {isPopular && !isTop8 && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
              <Flame size={10} className="fill-amber-600" /> Popular
            </span>
          )}

          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            🔥 {details.nutritionalFacts.calories} kcal
          </span>
        </div>

        {/* Dish Title + Interactive Symbol Box [ ? ] */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenDetails?.(item)}
            className="text-left font-black text-slate-950 text-base sm:text-lg leading-snug tracking-tight hover:text-blue-700 transition-colors cursor-pointer line-clamp-1"
          >
            {item.name}
          </button>

          {/* Symbol Box for opening Food Card (No literal text) */}
          <button
            type="button"
            onClick={() => onOpenDetails?.(item)}
            className="w-5 h-5 rounded-md bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200/80 font-black text-[11px] flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer shrink-0 shadow-2xs"
            aria-label={`View details and nutrition for ${item.name}`}
            title="View nutrition & photo"
          >
            ?
          </button>
        </div>

        {/* Price */}
        <div className="font-black text-slate-900 text-base mt-0.5 tracking-tight flex items-baseline gap-1.5">
          <span>₹{item.price}</span>
        </div>

        {/* Catchy line description (1 line on mobile) */}
        <p 
          onClick={() => onOpenDetails?.(item)}
          className="text-xs text-slate-500 line-clamp-1 mt-1 leading-relaxed cursor-pointer hover:text-slate-800"
        >
          {details.catchyLine}
        </p>
      </div>

      {/* Right Column: Matched Food Thumbnail + Swiggy style Add button */}
      <div className="shrink-0 flex flex-col items-center">
        <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-2xs">
          {!imgError && details.photoUrl ? (
            <img
              src={details.photoUrl}
              alt={item.name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              onClick={() => onOpenDetails?.(item)}
              className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div
              onClick={() => onOpenDetails?.(item)}
              className="w-full h-full flex items-center justify-center text-3xl select-none cursor-pointer bg-blue-50"
            >
              {details.emoji}
            </div>
          )}

          {/* Floating '?' trigger on thumbnail */}
          <button
            type="button"
            onClick={() => onOpenDetails?.(item)}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black text-white text-[10px] font-black flex items-center justify-center backdrop-blur-xs cursor-pointer shadow-xs"
            title="Quick view"
          >
            ?
          </button>
        </div>

        {/* Action Button: ADD / Quantity Stepper */}
        <div className="mt-2 w-20 sm:w-22 flex justify-center">
          {!item.is_available ? (
            <span className="w-full text-center py-1 rounded-xl bg-slate-100 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
              Sold Out
            </span>
          ) : quantity > 0 ? (
            <div className="w-full flex items-center justify-between bg-blue-700 text-white rounded-xl px-1.5 py-1 shadow-xs border border-blue-800">
              <button
                type="button"
                onClick={() => onRemoveFromCart(item.id)}
                className="w-5 h-5 rounded-lg hover:bg-blue-800 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all"
                aria-label="Decrease quantity"
              >
                <Minus size={12} strokeWidth={3} />
              </button>
              <span className="font-black text-xs text-center select-none tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onAddToCart(item)}
                disabled={quantity >= 20}
                className="w-5 h-5 rounded-lg hover:bg-blue-800 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                aria-label="Increase quantity"
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              disabled={item.price <= 0}
              className="w-full py-1 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-black text-xs uppercase tracking-wider border-2 border-blue-700 shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-0.5"
            >
              <Plus size={13} strokeWidth={3} />
              <span>ADD</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default DishCard;

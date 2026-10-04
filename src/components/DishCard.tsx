import React, { useState } from 'react';
import type { MenuItem, OrderItem } from '../types';
import { Plus, Minus, Zap, Flame, Leaf } from 'lucide-react';
import { getFoodDetails, getFoodEmoji, getFoodGradient } from '../lib/foodDetails';

interface DishCardProps {
  item: MenuItem;
  cartItem?: OrderItem;
  isPopular?: boolean;
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (itemId: string) => void;
}

export const DishCard = React.memo(function DishCard({
  item,
  cartItem,
  isPopular = false,
  onAddToCart,
  onRemoveFromCart,
}: DishCardProps) {
  const quantity = cartItem?.quantity || 0;
  const details = getFoodDetails(item);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={`group relative flex flex-col rounded-[24px] bg-white border transition-all duration-300 overflow-hidden ${
        quantity > 0
          ? 'border-blue-500 shadow-md shadow-blue-500/15 ring-2 ring-blue-500/20'
          : 'border-slate-200/80 shadow-xs hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5'
      }`}
    >
      {/* Top Image Area */}
      <div className={`relative h-36 sm:h-40 w-full overflow-hidden bg-gradient-to-br ${getFoodGradient(item.category)}`}>
        {!imageError && details.photoUrl && (
          <img
            src={details.photoUrl}
            alt={item.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Fallback Emoji/Gradient if image is loading or error */}
        {(!imageLoaded || imageError) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl drop-shadow-md select-none transform transition-transform group-hover:scale-110">
              {getFoodEmoji(item.name, item.category)}
            </span>
          </div>
        )}

        {/* Subtle dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <div className="flex flex-wrap gap-1.5">
            {item.is_express && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/95 text-purple-700 shadow-sm backdrop-blur-md">
                <Zap size={11} className="fill-purple-600" /> Express
              </span>
            )}
            {isPopular && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/95 text-amber-700 shadow-sm backdrop-blur-md">
                <Flame size={11} className="fill-amber-600" /> Popular
              </span>
            )}
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/40 text-white/90 backdrop-blur-md">
            {item.category}
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col flex-1 p-3.5 sm:p-4 gap-2.5 justify-between">
        <div>
          <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug tracking-tight group-hover:text-blue-600 transition-colors line-clamp-1">
            {item.name}
          </h4>
          <p className="mt-0.5 text-[11px] sm:text-xs font-medium text-slate-500 line-clamp-1 italic">
            "{details.catchyLine}"
          </p>
        </div>

        {/* Nutritional Value Card */}
        <div className="flex items-start gap-1.5 p-2 rounded-xl bg-emerald-50/60 border border-emerald-100/80 text-[10px] sm:text-[11px] text-emerald-900 leading-snug">
          <Leaf size={13} className="shrink-0 mt-0.5 text-emerald-600" />
          <span className="line-clamp-2">{details.nutritionBenefit}</span>
        </div>

        {/* Bottom row: Price and Stepper */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Price</span>
            <span className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
              ₹{item.price}
            </span>
          </div>

          <div className="shrink-0">
            {!item.is_available ? (
              <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-400 font-bold text-xs">
                Sold Out
              </span>
            ) : quantity > 0 ? (
              <div className="flex items-center gap-1 bg-slate-900 text-white rounded-full p-1 shadow-md shadow-slate-900/10">
                <button
                  type="button"
                  onClick={() => onRemoveFromCart(item.id)}
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white google-touch cursor-pointer transition-colors active:scale-90"
                  aria-label="Decrease quantity"
                >
                  <Minus size={13} />
                </button>
                <span className="font-black text-xs w-5 text-center select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onAddToCart(item)}
                  disabled={quantity >= 20}
                  className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white google-touch cursor-pointer transition-colors disabled:opacity-50 active:scale-90"
                  aria-label="Increase quantity"
                >
                  <Plus size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onAddToCart(item)}
                disabled={item.price <= 0}
                className="px-4 py-1.5 sm:py-2 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-blue-200/80 google-touch transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                <Plus size={14} /> Add
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default DishCard;

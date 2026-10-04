import React from 'react';
import type { MenuItem, OrderItem } from '../types';
import { Plus, Minus, Zap, Flame, Info } from 'lucide-react';
import { getFoodDetails } from '../lib/foodDetails';

interface DishCardProps {
  item: MenuItem;
  cartItem?: OrderItem;
  isPopular?: boolean;
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (itemId: string) => void;
  onOpenDetails?: (item: MenuItem) => void;
}

export const DishCard = React.memo(function DishCard({
  item,
  cartItem,
  isPopular = false,
  onAddToCart,
  onRemoveFromCart,
  onOpenDetails,
}: DishCardProps) {
  const quantity = cartItem?.quantity || 0;
  const details = getFoodDetails(item);

  return (
    <div
      className={`group relative flex items-center justify-between gap-4 p-4 sm:p-5 bg-white border-b border-slate-100 transition-colors hover:bg-slate-50/70 ${
        quantity > 0 ? 'bg-blue-50/20' : ''
      }`}
    >
      {/* Left Details Column */}
      <div className="flex-1 min-w-0 pr-2">
        {/* Badges Row: Veg Icon + Express/Popular */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {/* Authentic Indian Veg Symbol (Green square with green circle) */}
          <div className="w-4 h-4 rounded-xs border-2 border-emerald-600 flex items-center justify-center p-0.5 bg-white shrink-0" title="100% Pure Vegetarian">
            <div className="w-2 h-2 rounded-full bg-emerald-600" />
          </div>

          {item.is_express && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
              <Zap size={10} className="fill-blue-600" /> Express
            </span>
          )}

          {isPopular && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
              <Flame size={10} className="fill-amber-600" /> Popular
            </span>
          )}
        </div>

        {/* Dish Name: Clickable to pop the detail card with photo & nutrition */}
        <button
          type="button"
          onClick={() => onOpenDetails?.(item)}
          className="text-left font-bold text-slate-900 text-base sm:text-lg leading-snug tracking-tight hover:text-blue-600 transition-colors flex items-center gap-1.5 group/btn cursor-pointer"
        >
          <span className="line-clamp-1">{item.name}</span>
          <span className="text-slate-400 group-hover/btn:text-blue-600 text-xs shrink-0 font-normal">
            <Info size={14} className="inline ml-0.5" />
          </span>
        </button>

        {/* Price */}
        <div className="font-black text-slate-900 text-base mt-0.5 tracking-tight">
          ₹{item.price}
        </div>

        {/* Catchy line description (line-clamp-2) */}
        <p 
          onClick={() => onOpenDetails?.(item)}
          className="text-xs text-slate-500 line-clamp-1 sm:line-clamp-2 mt-1 leading-relaxed cursor-pointer hover:text-slate-700"
        >
          {details.catchyLine}
        </p>

        {/* View Nutrition / Card Teaser Link */}
        <button
          type="button"
          onClick={() => onOpenDetails?.(item)}
          className="mt-2 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Tap to see photo & nutritional facts</span>
        </button>
      </div>

      {/* Right Column: Swiggy/Zomato Style Add Button */}
      <div className="shrink-0 flex flex-col items-center">
        {!item.is_available ? (
          <span className="inline-block px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs">
            Sold Out
          </span>
        ) : quantity > 0 ? (
          <div className="flex items-center gap-2 bg-blue-600 text-white rounded-xl px-2 py-1 shadow-sm border border-blue-700">
            <button
              type="button"
              onClick={() => onRemoveFromCart(item.id)}
              className="w-7 h-7 rounded-lg hover:bg-blue-700 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all"
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="font-black text-sm w-4 text-center select-none">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              disabled={quantity >= 20}
              className="w-7 h-7 rounded-lg hover:bg-blue-700 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onAddToCart(item)}
            disabled={item.price <= 0}
            className="min-w-24 px-5 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-600 font-extrabold text-xs uppercase tracking-wider border-2 border-blue-600 shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>ADD</span>
          </button>
        )}
        <span className="text-[10px] text-slate-400 font-medium mt-1">customisable</span>
      </div>
    </div>
  );
});

export default DishCard;

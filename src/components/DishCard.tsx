import React from 'react';
import type { MenuItem, OrderItem } from '../types';
import { Plus, Minus, Zap, Flame, Leaf } from 'lucide-react';
import { getFoodDetails } from '../lib/foodDetails';

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

  return (
    <div
      className={`group relative p-4 rounded-[1.25rem] bg-white border transition-all duration-200 ${
        quantity > 0
          ? 'border-blue-500/80 shadow-md shadow-blue-500/10 bg-gradient-to-r from-blue-50/30 via-white to-white'
          : 'border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300'
      } flex items-center justify-between gap-4`}
    >
      {/* Left Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <h4 className="font-bold text-slate-900 text-sm tracking-tight group-hover:text-blue-600 transition-colors line-clamp-1">
            {item.name}
          </h4>

          {item.is_express && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200/60">
              <Zap size={10} className="fill-purple-600" /> Express
            </span>
          )}

          {isPopular && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200/60">
              <Flame size={10} className="fill-amber-600" /> Popular
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-black text-slate-900 text-base">
            ₹{item.price}
          </span>
        </div>
        <p className="mt-1 truncate text-xs font-medium text-slate-600">{details.catchyLine}</p>
        <div className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
          <Leaf size={13} className="mt-0.5 shrink-0 text-emerald-600" />
          <span className="line-clamp-2">{details.nutritionBenefit}</span>
        </div>
      </div>

      {/* Right Stepper / Add Button */}
      <div className="shrink-0">
        {!item.is_available ? (
          <span className="inline-block px-3 py-1.5 rounded-full bg-slate-100 text-slate-400 font-bold text-xs">
            Sold Out
          </span>
        ) : quantity > 0 ? (
          <div className="flex items-center gap-1.5 bg-slate-900 text-white rounded-full p-1 shadow-md shadow-slate-900/10 border border-slate-700/50">
            <button
              onClick={() => onRemoveFromCart(item.id)}
              className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white google-touch cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus size={13} />
            </button>
            <span className="font-black text-xs w-4 text-center select-none">
              {quantity}
            </span>
            <button
              onClick={() => onAddToCart(item)}
              disabled={quantity >= 20}
              className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white google-touch cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAddToCart(item)}
            disabled={item.price <= 0}
            className="px-4 py-1.5 rounded-full bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-bold text-xs flex items-center gap-1 border border-blue-200/80 google-touch google-ripple transition-all cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={13} /> Add
          </button>
        )}
      </div>
    </div>
  );
});

export default DishCard;

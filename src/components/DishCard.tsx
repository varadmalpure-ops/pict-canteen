import type { MenuItem, OrderItem } from '../types';
import { Plus, Minus, Zap, Flame } from 'lucide-react';

interface DishCardProps {
  item: MenuItem;
  cartItem?: OrderItem;
  isPopular?: boolean;
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (itemId: string) => void;
}

export default function DishCard({
  item,
  cartItem,
  isPopular = false,
  onAddToCart,
  onRemoveFromCart,
}: DishCardProps) {
  const quantity = cartItem?.quantity || 0;

  return (
    <div
      className={`group relative p-4 rounded-2xl bg-white border transition-all duration-200 ${
        quantity > 0
          ? 'border-indigo-400 shadow-md shadow-indigo-500/5 bg-gradient-to-r from-indigo-50/20 via-white to-white'
          : 'border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300'
      } flex items-center justify-between gap-4`}
    >
      {/* Left Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <h4 className="font-bold text-slate-900 text-sm tracking-tight group-hover:text-indigo-600 transition-colors line-clamp-1">
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
          <span className="text-[11px] font-medium text-slate-400">
            {item.category}
          </span>
        </div>
      </div>

      {/* Right Stepper / Add Button */}
      <div className="shrink-0">
        {!item.is_available ? (
          <span className="inline-block px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs">
            Sold Out
          </span>
        ) : quantity > 0 ? (
          <div className="flex items-center gap-2 bg-slate-900 text-white rounded-xl p-1 shadow-md shadow-slate-900/10">
            <button
              onClick={() => onRemoveFromCart(item.id)}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white active:scale-90 transition-transform"
              aria-label="Decrease quantity"
            >
              <Minus size={14} />
            </button>
            <span className="font-black text-xs w-4 text-center select-none">
              {quantity}
            </span>
            <button
              onClick={() => onAddToCart(item)}
              className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white active:scale-90 transition-transform"
              aria-label="Increase quantity"
            >
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAddToCart(item)}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
          >
            <Plus size={14} /> Add
          </button>
        )}
      </div>
    </div>
  );
}

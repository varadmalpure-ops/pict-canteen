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
      className={`group relative p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all duration-200 ${
        quantity > 0
          ? 'border-blue-500/80 dark:border-blue-500 shadow-md shadow-blue-500/10 bg-gradient-to-r from-blue-50/30 via-white to-white dark:from-blue-950/30 dark:via-slate-900 dark:to-slate-900'
          : 'border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700'
      } flex items-center justify-between gap-4`}
    >
      {/* Left Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
            {item.name}
          </h4>

          {item.is_express && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
              <Zap size={10} className="fill-purple-600 dark:fill-purple-400" /> Express
            </span>
          )}

          {isPopular && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
              <Flame size={10} className="fill-amber-600 dark:fill-amber-400" /> Popular
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-black text-slate-900 dark:text-white text-base">
            ₹{item.price}
          </span>
        </div>
      </div>

      {/* Right Stepper / Add Button */}
      <div className="shrink-0">
        {!item.is_available ? (
          <span className="inline-block px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs">
            Sold Out
          </span>
        ) : quantity > 0 ? (
          <div className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-800 text-white rounded-full p-1 shadow-md shadow-slate-900/10 border border-slate-700/50">
            <button
              onClick={() => onRemoveFromCart(item.id)}
              className="w-7 h-7 rounded-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center text-white google-touch cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus size={13} />
            </button>
            <span className="font-black text-xs w-4 text-center select-none">
              {quantity}
            </span>
            <button
              onClick={() => onAddToCart(item)}
              className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white google-touch cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onAddToCart(item)}
            className="px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 text-blue-600 dark:text-blue-300 hover:text-white dark:hover:text-white font-bold text-xs flex items-center gap-1 border border-blue-200/80 dark:border-blue-800/80 google-touch google-ripple transition-all cursor-pointer shadow-2xs"
          >
            <Plus size={13} /> Add
          </button>
        )}
      </div>
    </div>
  );
}

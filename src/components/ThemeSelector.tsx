import { X, Check } from 'lucide-react';
import { useFoodTheme } from '../lib/useFoodTheme';
import { THEME_OPTIONS, type FoodTheme } from '../lib/themeConstants';

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThemeSelector({ isOpen, onClose }: ThemeSelectorProps) {
  const { theme, setTheme } = useFoodTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-dialog-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <div>
              <h3 id="theme-dialog-title" className="text-base font-extrabold text-slate-900 tracking-tight">
                Canteen Mood & Background
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Choose a warm food-inspired theme for your screen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close theme picker"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mt-4">
          {THEME_OPTIONS.map((option) => {
            const isSelected = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setTheme(option.id as FoodTheme);
                }}
                className={`relative flex flex-col p-3 rounded-2xl border-2 text-left transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
                style={{
                  backgroundColor: option.bgHex,
                  color: option.isDark ? '#f8fafc' : '#0f172a',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl select-none">{option.emoji}</span>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>

                <div className="font-extrabold text-xs tracking-tight line-clamp-1">
                  {option.name}
                </div>
                <div
                  className="text-[10px] mt-0.5 line-clamp-1"
                  style={{ color: option.isDark ? '#94a3b8' : '#64748b' }}
                >
                  {option.tagline}
                </div>

                {/* Color swatch pill */}
                <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-black/5 dark:border-white/10">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                    style={{ backgroundColor: option.bgHex }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full shadow-2xs"
                    style={{ backgroundColor: option.accentHex }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: option.borderHex }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

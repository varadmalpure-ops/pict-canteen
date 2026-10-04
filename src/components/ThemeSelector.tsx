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
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-dialog-title"
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎨</span>
            <div>
              <h3 id="theme-dialog-title" className="text-base font-black text-slate-950 tracking-tight">
                Canteen Wallpapers & Styles
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">
                Solid WhatsApp-style wallpapers with pronounced food doodles & emojis
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

        {/* 6 Solid Theme Cards with Pronounced Patterns and Emojis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-h-[62vh] overflow-y-auto pr-0.5">
          {THEME_OPTIONS.map((option) => {
            const isSelected = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setTheme(option.id as FoodTheme);
                }}
                className={`relative flex flex-col p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-xs overflow-hidden ${
                  isSelected
                    ? 'border-blue-500 ring-3 ring-blue-500/30'
                    : 'border-slate-200/90 hover:border-slate-400'
                }`}
                style={{
                  backgroundColor: option.bgHex,
                  backgroundImage: option.patternUrl,
                  backgroundSize: '180px 180px',
                  backgroundRepeat: 'repeat',
                  color: option.isDark ? '#f8fafc' : '#0f172a',
                }}
              >
                {/* Header row: Emojis + Checkmark */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/90 text-slate-900 shadow-2xs backdrop-blur-xs text-sm">
                    {option.emojis.map((em, idx) => (
                      <span key={idx} className="select-none">{em}</span>
                    ))}
                  </div>

                  {isSelected && (
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </div>

                {/* Theme Name & Tagline in high-contrast cardlet */}
                <div className="p-2.5 rounded-xl bg-white/95 text-slate-950 shadow-2xs backdrop-blur-xs border border-black/5 mt-1">
                  <div className="font-black text-xs tracking-tight line-clamp-1 flex items-center gap-1.5">
                    <span>{option.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5 line-clamp-1">
                    {option.tagline}
                  </div>
                </div>

                {/* Visual Swatch Strip */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/10">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-4 h-4 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: option.bgHex }}
                      title="Solid Base Color"
                    />
                    <span
                      className="w-4 h-4 rounded-full shadow-2xs"
                      style={{ backgroundColor: option.accentHex }}
                      title="Accent"
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 text-slate-800">
                    {option.isDark ? 'Dark Doodle' : 'Light Doodle'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-semibold">
            Wallpaper updates instantly and stays saved
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-slate-950 hover:bg-black text-white text-xs font-black transition-all cursor-pointer shadow-sm"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}

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
        className="w-full max-w-lg theme-surface rounded-3xl shadow-2xl border theme-border p-5 sm:p-6 overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-dialog-title"
      >
        <div className="flex items-center justify-between pb-3.5 border-b theme-border">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎨</span>
            <div>
              <h3 id="theme-dialog-title" className="text-base font-black text-slate-950 tracking-tight">
                Canteen Wallpapers & Styles
              </h3>
              <p className="text-[11px] text-slate-500 font-bold">
                Light WhatsApp wallpapers, matching tinted title bar & plain white option
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-black/5 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close theme picker"
          >
            <X size={18} />
          </button>
        </div>

        {/* Theme Cards with Preview Swatches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 max-h-[62vh] overflow-y-auto pr-0.5">
          {THEME_OPTIONS.filter((o, idx, arr) => arr.findIndex(t => t.id === o.id) === idx && o.id !== 'midnight').map((option) => {
            const isSelected = theme === option.id;
            const hasPattern = option.patternUrl !== 'none';
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setTheme(option.id as FoodTheme);
                }}
                className={`relative flex flex-col p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] shadow-xs overflow-hidden ${
                  isSelected
                    ? 'border-blue-600 ring-3 ring-blue-500/30'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                style={{
                  backgroundColor: option.bgHex,
                  backgroundImage: hasPattern ? option.patternUrl : 'none',
                  backgroundSize: '180px 180px',
                  backgroundRepeat: 'repeat',
                  color: '#0f172a',
                }}
              >
                {/* Header row: Emojis + Checkmark */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/90 text-slate-900 shadow-2xs backdrop-blur-xs text-sm border border-black/5">
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

                {/* Theme Name & Tagline previewing the lighter surface tint */}
                <div 
                  className="p-2.5 rounded-xl text-slate-950 shadow-2xs backdrop-blur-xs border mt-1"
                  style={{
                    backgroundColor: option.surfaceHex,
                    borderColor: option.borderHex,
                  }}
                >
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
                      title="Wallpaper Base"
                    />
                    <span
                      className="w-4 h-4 rounded-full border border-black/15 shadow-2xs"
                      style={{ backgroundColor: option.surfaceHex }}
                      title="Lighter Title Bar & Surface"
                    />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/90 text-slate-800 border border-black/5">
                    {hasPattern ? 'WhatsApp Art' : 'No Style / Pure'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3.5 border-t theme-border flex items-center justify-between">
          <p className="text-[11px] text-slate-500 font-semibold">
            Wallpaper and lighter title bar update instantly
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-xs font-black transition-all cursor-pointer shadow-sm"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}

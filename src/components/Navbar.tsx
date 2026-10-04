import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut, type User } from 'firebase/auth';
import { auth } from '../firebase';
import { BellRing, LogOut, Menu, UtensilsCrossed, UserRound, X, Palette } from 'lucide-react';
import type { Order } from '../types';
import ThemeSelector from './ThemeSelector';

interface NavbarProps {
  user: User | null;
  activeOrders?: Order[];
  onOpenOrdersModal?: () => void;
}

export default function Navbar({ user, activeOrders = [], onOpenOrdersModal }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const location = useLocation();
  const readyOrder = activeOrders.find((order) => order.status === 'READY');
  const currentOrder = readyOrder || activeOrders[0];

  const linkClass = (path: string) => `inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-all ${
    location.pathname === path ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
  }`;

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b theme-border theme-surface backdrop-blur-xl transition-colors">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          {/* Logo & Canteen Identity */}
          <Link to="/" onClick={closeMenu} className="flex min-w-0 items-center gap-2.5 rounded-xl text-slate-950 group">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <UtensilsCrossed size={19} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black tracking-tight text-slate-950">PICT Canteen</span>
              <span className="block truncate text-[10px] font-bold text-slate-400">100% Pure Vegetarian Campus Kitchen</span>
            </span>
          </Link>

          {/* Active Token Tracker Button if user has active order */}
          {currentOrder && onOpenOrdersModal && (
            <button
              onClick={onOpenOrdersModal}
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer shadow-xs ${
                readyOrder
                  ? 'bg-emerald-600 text-white shadow-emerald-500/25 animate-pulse'
                  : 'bg-amber-400 text-slate-950 shadow-amber-400/20'
              }`}
            >
              {readyOrder ? <BellRing size={14} /> : <span className="h-2 w-2 rounded-full bg-slate-950 animate-ping" />}
              <span>{readyOrder ? `Token #${readyOrder.token_number} Ready!` : `Token #${currentOrder.token_number} in kitchen`}</span>
            </button>
          )}

          {/* Right Controls: Desktop Nav */}
          <div className="hidden items-center gap-1.5 md:flex">
            <Link to="/" className={linkClass('/')}>
              Menu
            </Link>

            {/* Theme Selector Trigger */}
            <button
              type="button"
              onClick={() => setIsThemeOpen(true)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              title="Change Background Theme"
            >
              <Palette size={15} className="text-amber-500" />
              <span>Theme</span>
            </button>

            {user ? (
              <>
                <Link to="/profile" className={linkClass('/profile')}>
                  <UserRound size={15} />
                  <span>Account</span>
                </Link>
                <button
                  onClick={() => void signOut(auth)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut size={15} />
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="ml-1 inline-flex min-h-9 items-center gap-1.5 rounded-full bg-blue-700 px-4 text-xs font-black text-white hover:bg-blue-800 shadow-xs transition-all"
              >
                <UserRound size={14} />
                <span>Sign in</span>
              </Link>
            )}
          </div>

          {/* Mobile Actions: Theme + Burger */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              type="button"
              onClick={() => setIsThemeOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-full text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Change Background Theme"
            >
              <Palette size={18} className="text-amber-500" />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((val) => !val)}
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              className="grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-slate-100"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {menuOpen && (
          <nav className="border-b theme-border theme-surface p-3 shadow-lg md:hidden animate-in slide-in-from-top-2 duration-150" aria-label="Mobile navigation">
            <Link to="/" onClick={closeMenu} className={`${linkClass('/')} w-full justify-start py-2.5`}>
              Menu
            </Link>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                setIsThemeOpen(true);
              }}
              className="flex min-h-10 w-full items-center gap-2 rounded-full px-4 text-xs font-bold text-slate-700 hover:bg-black/5"
            >
              <Palette size={16} className="text-amber-500" />
              <span>Background Theme</span>
            </button>
            {user ? (
              <>
                <Link to="/profile" onClick={closeMenu} className={`${linkClass('/profile')} w-full justify-start py-2.5`}>
                  <UserRound size={15} /> Account
                </Link>
                <button
                  onClick={() => {
                    void signOut(auth);
                    closeMenu();
                  }}
                  className="flex min-h-10 w-full items-center gap-2 rounded-full px-4 text-xs font-bold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={closeMenu}
                className="mt-2 flex min-h-10 items-center justify-center gap-2 rounded-full bg-blue-700 px-4 text-xs font-black text-white"
              >
                <UserRound size={15} /> Sign in
              </Link>
            )}
          </nav>
        )}
      </header>

      {/* Theme Picker Modal */}
      <ThemeSelector isOpen={isThemeOpen} onClose={() => setIsThemeOpen(false)} />
    </>
  );
}

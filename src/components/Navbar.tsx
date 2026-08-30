import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut, type User } from 'firebase/auth';
import { auth } from '../firebase';
import {
  UtensilsCrossed,
  Tv,
  UserCircle,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  BellRing,
  ChefHat,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import type { Order } from '../types';
import { useTheme } from '../lib/ThemeContext';

function isStaffAccount(email: string | null | undefined, currentPath: string): boolean {
  if (['/admin', '/kitchen', '/live', '/display'].some(p => currentPath.startsWith(p))) {
    return true;
  }
  if (!email) return false;
  const allowed = (import.meta.env.VITE_ALLOWED_ADMIN_EMAILS || 'canteen-staff@gmail.com,varadmalpure@gmail.com')
    .split(',')
    .map((e: string) => e.trim().toLowerCase());
  return allowed.includes(email.toLowerCase());
}

interface NavbarProps {
  user: User | null;
  activeOrders?: Order[];
  onOpenOrdersModal?: () => void;
}

export default function Navbar({ user, activeOrders = [], onOpenOrdersModal }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const isStaff = isStaffAccount(user?.email, location.pathname);

  const readyOrder = activeOrders.find(o => o.status === 'READY');
  const preparingOrder = activeOrders.find(o => o.status === 'PREPARING' || o.status === 'Pending');

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <Laptop size={15} className="text-indigo-500" />;
    if (theme === 'dark') return <Moon size={15} className="text-amber-400" />;
    return <Sun size={15} className="text-amber-500" />;
  };

  const getThemeTitle = () => {
    if (theme === 'system') return 'Theme: System Default';
    if (theme === 'dark') return 'Theme: Dark';
    return 'Theme: Light';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-[#0f141c]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand Logo - Google-like pill & tactile */}
        <Link to="/" className="flex items-center gap-3 group google-touch">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-md shadow-indigo-500/25 group-hover:scale-105 group-active:scale-95 transition-all">
            <UtensilsCrossed size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              PICT CANTEEN
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
              Campus Food Portal
            </span>
          </div>
        </Link>

        {/* Center: Live Token Status Pill */}
        {activeOrders.length > 0 && onOpenOrdersModal && (
          <button
            onClick={onOpenOrdersModal}
            className={`hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm google-touch cursor-pointer ${
              readyOrder
                ? 'bg-emerald-500 text-white shadow-emerald-500/30 animate-bounce'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
            }`}
          >
            {readyOrder ? (
              <>
                <BellRing size={14} />
                <span>Token {readyOrder.token_number} is Ready!</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
                <span>Token {preparingOrder?.token_number || activeOrders[0].token_number} Cooking</span>
              </>
            )}
          </button>
        )}

        {/* Right side icons & Navigation */}
        <div className="flex items-center gap-2">
          {/* Quick Theme Toggle Button */}
          <button
            onClick={cycleTheme}
            title={getThemeTitle()}
            className="p-2.5 rounded-full text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 google-touch google-ripple transition-all cursor-pointer flex items-center justify-center"
            aria-label="Toggle light, dark, and system theme"
          >
            {getThemeIcon()}
          </button>

          {/* Mobile Hamburger Toggle */}
          <button
            className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full google-touch transition-colors cursor-pointer"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row absolute md:relative top-16 md:top-0 left-0 w-full md:w-auto bg-white/95 dark:bg-[#0f141c]/95 md:bg-transparent dark:md:bg-transparent backdrop-blur-xl md:backdrop-blur-none shadow-xl md:shadow-none p-4 md:p-0 gap-2 md:gap-3 md:items-center z-40 border-b md:border-b-0 border-slate-100 dark:border-slate-800/80`}>
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 google-touch google-ripple ${
              location.pathname === '/'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UtensilsCrossed size={14} /> Menu
          </Link>

          {/* Staff-Only Sections: Only visible for staff accounts or when on staff views */}
          {isStaff && (
            <>
              <Link
                to="/live"
                onClick={() => setIsMenuOpen(false)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 google-touch google-ripple ${
                  location.pathname === '/live'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Tv size={14} /> Kitchen TV
              </Link>

              <Link
                to="/kitchen"
                onClick={() => setIsMenuOpen(false)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 google-touch google-ripple ${
                  location.pathname === '/kitchen'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ChefHat size={14} /> Kitchen KDS
              </Link>

              <Link
                to="/admin"
                onClick={() => setIsMenuOpen(false)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 google-touch google-ripple ${
                  location.pathname === '/admin'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldCheck size={14} /> Manager
              </Link>
            </>
          )}

          {user && (
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-2.5 md:border-l md:border-slate-200 dark:md:border-slate-800 md:pl-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
              <Link
                to="/profile"
                onClick={() => setIsMenuOpen(false)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 google-touch google-ripple ${
                  location.pathname === '/profile'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                }`}
              >
                <UserCircle size={15} /> Settings
              </Link>
              <button
                onClick={() => { signOut(auth); setIsMenuOpen(false); }}
                className="px-3.5 py-2 rounded-full text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all flex items-center gap-1.5 text-left google-touch cursor-pointer"
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

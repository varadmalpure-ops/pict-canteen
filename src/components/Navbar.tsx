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
} from 'lucide-react';
import type { Order } from '../types';

interface NavbarProps {
  user: User | null;
  activeOrders?: Order[];
  onOpenOrdersModal?: () => void;
}

export default function Navbar({ user, activeOrders = [], onOpenOrdersModal }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const readyOrder = activeOrders.find(o => o.status === 'READY');
  const preparingOrder = activeOrders.find(o => o.status === 'PREPARING' || o.status === 'Pending');

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 transition-all">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <UtensilsCrossed size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tight text-slate-900 leading-none group-hover:text-indigo-600 transition-colors">
              PICT CANTEEN
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Campus Food Portal
            </span>
          </div>
        </Link>

        {/* Live Token Status Pill (If order is cooking / ready) */}
        {activeOrders.length > 0 && onOpenOrdersModal && (
          <button
            onClick={onOpenOrdersModal}
            className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 ${
              readyOrder
                ? 'bg-emerald-500 text-white shadow-emerald-500/25 animate-bounce'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100'
            }`}
          >
            {readyOrder ? (
              <>
                <BellRing size={14} />
                <span>Token {readyOrder.token_number} is Ready!</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span>Token {preparingOrder?.token_number || activeOrders[0].token_number} Cooking</span>
              </>
            )}
          </button>
        )}

        {/* Mobile Hamburger Toggle */}
        <button
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Navigation Items */}
        <nav className={`${isMenuOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row absolute md:relative top-16 md:top-0 left-0 w-full md:w-auto bg-white/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none shadow-xl md:shadow-none p-4 md:p-0 gap-2 md:gap-4 md:items-center z-40 border-b md:border-b-0 border-slate-100`}>
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              location.pathname === '/'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UtensilsCrossed size={14} /> Menu
          </Link>

          <Link
            to="/live"
            onClick={() => setIsMenuOpen(false)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              location.pathname === '/live'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Tv size={14} /> Kitchen TV
          </Link>

          <Link
            to="/admin"
            onClick={() => setIsMenuOpen(false)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              location.pathname === '/admin'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck size={14} /> Admin
          </Link>

          {user && (
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 md:border-l md:border-slate-200 md:pl-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
              <Link
                to="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
              >
                <UserCircle size={15} /> My Profile
              </Link>
              <button
                onClick={() => { signOut(auth); setIsMenuOpen(false); }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5 text-left"
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

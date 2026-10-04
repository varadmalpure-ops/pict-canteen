import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut, type User } from 'firebase/auth';
import { auth } from '../firebase';
import { BellRing, LogOut, Menu, UtensilsCrossed, UserRound, X } from 'lucide-react';
import type { Order } from '../types';

interface NavbarProps {
  user: User | null;
  activeOrders?: Order[];
  onOpenOrdersModal?: () => void;
}

export default function Navbar({ user, activeOrders = [], onOpenOrdersModal }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const readyOrder = activeOrders.find((order) => order.status === 'READY');
  const currentOrder = readyOrder || activeOrders[0];

  const linkClass = (path: string) => `inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
    location.pathname === path ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" onClick={closeMenu} className="flex min-w-0 items-center gap-3 rounded-xl text-slate-900">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-blue-50 text-blue-700"><UtensilsCrossed size={19} /></span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight">PICT Canteen</span>
            <span className="block truncate text-[11px] text-slate-500">Campus food, ready when you are</span>
          </span>
        </Link>

        {currentOrder && onOpenOrdersModal && (
          <button onClick={onOpenOrdersModal} className={`hidden items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold sm:flex ${readyOrder ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
            {readyOrder ? <BellRing size={15} /> : <span className="h-2 w-2 rounded-full bg-blue-600" />}
            {readyOrder ? `Token ${readyOrder.token_number} is ready` : `Token ${currentOrder.token_number} in progress`}
          </button>
        )}

        <button type="button" onClick={() => setMenuOpen((value) => !value)} aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} className="grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-slate-100 md:hidden">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          <Link to="/" className={linkClass('/')}>Menu</Link>
          <Link to="/kitchen" className={linkClass('/kitchen')}>Kitchen KDS</Link>
          {user ? (
            <>
              <Link to="/profile" className={linkClass('/profile')}><UserRound size={16} /> Account</Link>
              <button onClick={() => void signOut(auth)} className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"><LogOut size={16} /> Sign out</button>
            </>
          ) : (
            <Link to="/login" className="ml-1 inline-flex min-h-10 items-center gap-2 rounded-full bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800"><UserRound size={16} /> Sign in</Link>
          )}
        </nav>
      </div>

      {menuOpen && (
        <nav className="absolute left-0 right-0 top-16 border-b border-slate-200 bg-white p-3 shadow-lg md:hidden" aria-label="Mobile navigation">
          <Link to="/" onClick={closeMenu} className={`${linkClass('/')} w-full justify-start`}>Menu</Link>
          <Link to="/kitchen" onClick={closeMenu} className={`${linkClass('/kitchen')} w-full justify-start`}>Kitchen KDS</Link>
          {user ? (
            <>
              <Link to="/profile" onClick={closeMenu} className={`${linkClass('/profile')} w-full justify-start`}><UserRound size={16} /> Account</Link>
              <button onClick={() => { void signOut(auth); closeMenu(); }} className="flex min-h-10 w-full items-center gap-2 rounded-full px-4 text-sm font-medium text-slate-600 hover:bg-slate-100"><LogOut size={16} /> Sign out</button>
            </>
          ) : (
            <Link to="/login" onClick={closeMenu} className="mt-1 flex min-h-11 items-center justify-center gap-2 rounded-full bg-blue-700 px-4 text-sm font-semibold text-white"><UserRound size={16} /> Sign in</Link>
          )}
        </nav>
      )}
    </header>
  );
}

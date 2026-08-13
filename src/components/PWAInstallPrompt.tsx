import { useState, useEffect } from 'react';
import { X, Share, PlusSquare, ShieldCheck } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const location = useLocation();
  const isAdmin = location.pathname.includes('/admin');

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      return;
    }

    // Check if user previously dismissed
    if (localStorage.getItem('pwaPromptDismissed') === 'true') {
      return;
    }

    // Check if iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIosDevice) {
      setIsIOS(true);
      setShowPrompt(true);
    }

    // Check if Android/Chrome
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    });
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwaPromptDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 pb-6 animate-in slide-in-from-bottom-full fade-in duration-500">
      <div className="max-w-md mx-auto bg-white/90 backdrop-blur-xl border border-gray-100/50 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] rounded-3xl p-4 relative flex items-center gap-4">
        <button 
          onClick={handleDismiss}
          className="absolute -top-3 -right-3 bg-white text-gray-400 hover:text-gray-700 p-1.5 rounded-full shadow-md border border-gray-100 transition-colors"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
        
        {/* App Icon Mockup */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${isAdmin ? 'bg-gradient-to-tr from-gray-900 to-gray-700' : 'bg-gradient-to-tr from-blue-600 to-blue-400'}`}>
          {isAdmin ? <ShieldCheck size={28} className="text-white" /> : <span className="text-white font-black text-2xl tracking-tighter">P</span>}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 text-[15px] truncate leading-tight">
            {isAdmin ? 'Canteen Admin' : 'PICT Canteen'}
          </h4>
          <p className="text-[13px] text-gray-500 truncate">
            {isAdmin ? 'Manage orders instantly' : 'Fast & easy ordering'}
          </p>
          
          {isIOS && (
             <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
               Tap <Share size={10} className="inline" /> then 'Add to Home Screen' <PlusSquare size={10} className="inline" />
             </div>
          )}
        </div>
        
        {!isIOS && (
          <button 
            onClick={handleInstallClick}
            className="bg-blue-600 text-white font-bold text-sm py-2 px-5 rounded-full shrink-0 shadow-md shadow-blue-500/20 active:scale-95 transition-transform"
          >
            Get
          </button>
        )}
      </div>
    </div>
  );
}

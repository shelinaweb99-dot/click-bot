
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, ArrowUpCircle } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Check if already in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a short delay to not annoy the user immediately
      setTimeout(() => setIsVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, we show instructions since they don't support the automated prompt
    if (isIosDevice && !isStandalone) {
        setTimeout(() => setIsVisible(true), 5000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[60] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-[#1e293b] border border-blue-500/30 p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-500"></div>
        
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-4">
          <div className="bg-blue-600/20 p-3 rounded-2xl text-blue-500 border border-blue-500/10">
            <Smartphone size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-black text-[13px] uppercase tracking-tight">Install Android App</h3>
            <p className="text-gray-400 text-[10px] font-medium leading-tight mt-0.5">
              Add to Home Screen for a faster, full-screen earning experience.
            </p>
          </div>
        </div>

        {isIOS ? (
            <div className="mt-4 bg-black/20 p-3 rounded-xl flex items-center gap-3 border border-white/5">
                <ArrowUpCircle size={16} className="text-blue-400" />
                <p className="text-[9px] text-gray-300 font-bold uppercase tracking-wider">
                    Tap <span className="text-white bg-white/10 px-1.5 py-0.5 rounded">Share</span> then <span className="text-white bg-white/10 px-1.5 py-0.5 rounded">Add to Home Screen</span>
                </p>
            </div>
        ) : (
            <button 
                onClick={handleInstall}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-[0.2em] py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
                <Download size={16} /> Install Now
            </button>
        )}
      </div>
    </div>
  );
};

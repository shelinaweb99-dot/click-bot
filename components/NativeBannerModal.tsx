
import React, { useEffect, useRef } from 'react';
import { X, ShieldCheck, Zap } from 'lucide-react';
import { AdSettings } from '../types';

interface NativeBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AdSettings;
}

export const NativeBannerModal: React.FC<NativeBannerModalProps> = ({ isOpen, onClose, settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const banner = settings.nativeBanner;

  useEffect(() => {
    if (!isOpen || !banner?.isEnabled || !banner.scriptHtml || !containerRef.current) return;

    // Clear and inject
    containerRef.current.innerHTML = '';
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(banner.scriptHtml, 'text/html');
    const scripts = doc.querySelectorAll('script');

    scripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
      if (oldScript.innerHTML) newScript.innerHTML = oldScript.innerHTML;
      containerRef.current?.appendChild(newScript);
    });

    const others = doc.body.childNodes;
    others.forEach(node => {
      if (node.nodeName !== 'SCRIPT') {
        containerRef.current?.appendChild(node.cloneNode(true));
      }
    });

  }, [isOpen, banner?.isEnabled, banner?.scriptHtml]);

  if (!isOpen || !banner?.isEnabled) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-[#1e293b] w-full max-w-sm rounded-[2.5rem] sm:rounded-[3rem] border border-white/10 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in duration-300">
        
        {/* Absolute Top Close Button - Highest Z-Index to ensure clickability */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-[130] p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white shadow-xl border border-white/10 transition-all active:scale-90"
          aria-label="Close Ad"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-blue-600/5 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={18} />
            <span className="text-white font-black text-[10px] uppercase tracking-widest">Success Reward</span>
          </div>
        </div>

        {/* Ad Container */}
        <div className="p-6 flex flex-col items-center min-h-[300px] justify-center relative">
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] mb-4 text-center">Sponsored Content</p>
            {/* The ref container where the script injects content */}
            <div ref={containerRef} className="w-full flex justify-center min-h-[250px] pointer-events-auto" />
            <p className="text-gray-600 text-[8px] font-black uppercase tracking-widest mt-6 italic">Support our network to earn more</p>
        </div>

        {/* Footer - Static at bottom of scrollable content */}
        <div className="p-6 bg-black/20 flex flex-col gap-4 border-t border-white/5">
            <div className="flex items-center justify-center gap-2 text-blue-500/50">
                <Zap size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Verification Complete</span>
            </div>
            <button 
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl transition-all active:scale-95 border border-blue-400/20"
            >
                Claim Points
            </button>
        </div>
      </div>
    </div>
  );
};

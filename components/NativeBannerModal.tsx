
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
    <div className="fixed inset-0 z-[9998] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
      
      {/* UNBLOCKABLE GLOBAL CLOSE BUTTON */}
      <button 
        onClick={onClose}
        className="fixed top-8 right-8 z-[10000] flex flex-col items-center gap-1 group"
        aria-label="Exit Ad"
      >
        <div className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-[0_0_30px_rgba(220,38,38,0.5)] border-2 border-white/20 transition-all active:scale-75 flex items-center justify-center">
            <X size={32} strokeWidth={3} />
        </div>
        <span className="text-white text-[9px] font-black uppercase tracking-[0.2em] drop-shadow-md opacity-70 group-hover:opacity-100 transition-opacity">Close Ad</span>
      </button>

      <div className="bg-[#1e293b] w-full max-w-sm rounded-[3rem] border border-white/10 shadow-2xl relative flex flex-col max-h-[80vh] overflow-y-auto no-scrollbar animate-in zoom-in duration-300">
        
        {/* HUD Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-blue-600/5 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={18} />
            <span className="text-white font-black text-[10px] uppercase tracking-widest">Premium Verification</span>
          </div>
        </div>

        {/* Dynamic Ad Content Area */}
        <div className="p-6 flex flex-col items-center min-h-[350px] justify-center relative bg-black/10">
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] mb-6 text-center opacity-40">System Sponsored Asset</p>
            
            <div ref={containerRef} className="w-full flex justify-center min-h-[250px] pointer-events-auto" />
            
            <div className="mt-8 flex items-center gap-2 text-gray-600 bg-black/20 px-4 py-2 rounded-full">
                <Zap size={10} />
                <p className="text-[8px] font-black uppercase tracking-widest italic">Encrypted Connection</p>
            </div>
        </div>

        {/* Modal Footer / Claim Action */}
        <div className="p-8 bg-[#0f172a] flex flex-col gap-5 border-t border-white/5 mt-auto">
            <div className="flex flex-col items-center gap-1">
                <p className="text-blue-500 font-black text-[10px] uppercase tracking-widest">Action Required</p>
                <p className="text-gray-500 text-[8px] font-bold text-center">Complete interaction or click the red exit button to return.</p>
            </div>
            <button 
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-[12px] uppercase tracking-[0.25em] py-5 rounded-2xl shadow-xl transition-all active:scale-95 border border-blue-400/20"
            >
                Confirm Reward
            </button>
        </div>
      </div>
    </div>
  );
};

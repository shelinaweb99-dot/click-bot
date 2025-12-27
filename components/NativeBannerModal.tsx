
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
    <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-[#1e293b] w-full max-w-sm rounded-[3rem] border border-white/10 shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-blue-600/5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-500" size={18} />
            <span className="text-white font-black text-[10px] uppercase tracking-widest">Success Reward</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white/50 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Ad Container */}
        <div className="p-6 flex flex-col items-center min-h-[250px] justify-center">
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.2em] mb-4 text-center">Sponsored Content</p>
            <div ref={containerRef} className="w-full flex justify-center min-h-[200px]" />
            <p className="text-gray-600 text-[8px] font-black uppercase tracking-widest mt-6 italic">Support our network to earn more</p>
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/20 flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2 text-blue-500/50">
                <Zap size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Verification Complete</span>
            </div>
            <button 
                onClick={onClose}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl transition-all active:scale-95 border border-blue-400/20"
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

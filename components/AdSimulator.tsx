
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldAlert, AlertCircle, RefreshCw, ExternalLink, MousePointer2 } from 'lucide-react';
import { AdSettings, AdProvider } from '../types';
import { getRotatedLink } from '../services/mockDb';

interface AdSimulatorProps {
  onComplete: () => void;
  isOpen: boolean;
  settings: AdSettings;
}

export const AdSimulator: React.FC<AdSimulatorProps> = ({ onComplete, isOpen, settings }) => {
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'READY' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeLink, setActiveLink] = useState<string | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const timeoutRef = useRef<any>(null);
  const claimTimerRef = useRef<any>(null);

  const cleanup = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (claimTimerRef.current) clearTimeout(claimTimerRef.current);
  };

  const initAd = async () => {
    setStatus('LOADING');
    setErrorMsg('');
    setCanClaim(false);
    
    try {
        let link = '';
        if (settings.activeProvider === AdProvider.ROTATION) {
            link = await getRotatedLink() || '';
        } else if (settings.activeProvider === AdProvider.MONETAG) {
            link = settings.monetagDirectLink;
        } else {
            link = settings.adsterraLink;
        }

        if (!link || link.trim() === '') {
            // Ultimate fallback to anything available
            link = settings.monetagDirectLink || settings.adsterraLink || await getRotatedLink() || '';
        }

        if (!link) throw new Error("No ad destination configured.");

        setActiveLink(link);
        setStatus('READY');
    } catch (e: any) {
        setStatus('ERROR');
        setErrorMsg(e.message || 'Ad gateway unavailable.');
        // Allow user to continue after error so they aren't stuck
        timeoutRef.current = setTimeout(onComplete, 3000);
    }
  };

  useEffect(() => {
    if (!isOpen) {
        setStatus('IDLE');
        cleanup();
        return;
    }
    initAd();
    return cleanup;
  }, [isOpen]);

  const handleVisit = () => {
    if (!activeLink) return;
    window.open(activeLink, '_blank');
    
    // Start the claim countdown once they've clicked
    if (!canClaim) {
        claimTimerRef.current = setTimeout(() => {
            setCanClaim(true);
        }, 12000); // 12 seconds wait time
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden p-8 text-center relative animate-in zoom-in duration-300">
          
          {status === 'LOADING' && (
              <div className="space-y-6 py-10">
                  <div className="relative w-16 h-16 mx-auto">
                    <Loader2 className="w-full h-full text-blue-500 animate-spin" strokeWidth={1.5} />
                    <div className="absolute inset-0 bg-blue-500/20 blur-2xl animate-pulse"></div>
                  </div>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Requesting Ad Node...</p>
              </div>
          )}

          {status === 'READY' && (
              <div className="space-y-8 py-4">
                  <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-xl">
                      <MousePointer2 className="text-blue-500 animate-bounce" size={40} />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-white font-black text-sm uppercase tracking-[0.15em]">Sponsor Content Ready</h3>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed px-4">
                        Visit the sponsor link below for 12 seconds to unlock your reward assets.
                    </p>
                  </div>
                  
                  <button 
                      onClick={handleVisit}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-2xl shadow-blue-900/30 transition-all active:scale-95 border border-blue-400/20"
                  >
                      Visit Sponsor <ExternalLink size={16} />
                  </button>

                  <div className="pt-2">
                      {canClaim ? (
                          <button 
                            onClick={onComplete}
                            className="w-full bg-green-600/10 text-green-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-green-500/20 animate-in zoom-in"
                          >
                              Claim Reward Now
                          </button>
                      ) : (
                          <p className="text-gray-700 text-[8px] font-black uppercase tracking-[0.4em]">
                             Timer starts after visit
                          </p>
                      )}
                  </div>
              </div>
          )}

          {status === 'ERROR' && (
              <div className="space-y-6 py-6">
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                    <AlertCircle className="text-red-500" size={40} />
                  </div>
                  <p className="text-red-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    {errorMsg}
                  </p>
                  <button onClick={onComplete} className="text-gray-500 text-[10px] font-black uppercase underline tracking-widest">
                      Continue anyway
                  </button>
              </div>
          )}

          <button 
            onClick={onComplete}
            className="mt-12 text-gray-800 hover:text-gray-500 text-[8px] font-black uppercase tracking-[0.5em] transition-colors"
          >
              Cancel
          </button>
      </div>
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldAlert, X, AlertCircle, ExternalLink } from 'lucide-react';
import { AdSettings, MonetagAdType } from '../types';
import { getRotatedLink } from '../services/mockDb';

interface AdSimulatorProps {
  onComplete: () => void;
  isOpen: boolean;
  settings: AdSettings;
  type?: MonetagAdType;
}

export const AdSimulator: React.FC<AdSimulatorProps> = ({ onComplete, isOpen, settings }) => {
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SHOWING' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const timeoutRef = useRef<any>(null);

  const startAdProcess = async () => {
    setStatus('LOADING');
    setErrorMsg('');

    try {
        // Fetch the link (either the Primary Direct Link or the next one in the Rotation)
        const link = await getRotatedLink();
        
        if (link) {
            // Open the ad link in a new tab
            window.open(link, '_blank');
            setStatus('SHOWING');
            
            // Auto-complete after a set time (e.g., 8 seconds) to credit the user
            // Since we can't track external browser closure reliably, we use a timer
            timeoutRef.current = setTimeout(() => {
                onComplete();
            }, 8000); 
        } else {
            throw new Error("No ad destination configured.");
        }
    } catch (e: any) {
        setStatus('ERROR');
        setErrorMsg(e.message || 'Ad delivery failed.');
        // Don't block the user if the ad fails
        setTimeout(onComplete, 2000);
    }
  };

  useEffect(() => {
    if (!isOpen) {
        setStatus('IDLE');
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
    }
    startAdProcess();
    return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
      <div className="bg-gray-900 w-full max-w-sm rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden p-8 text-center relative">
          
          {status === 'LOADING' && (
              <div className="space-y-6">
                  <div className="relative w-16 h-16 mx-auto">
                    <Loader2 className="w-full h-full text-blue-500 animate-spin" />
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl animate-pulse"></div>
                  </div>
                  <div>
                    <h3 className="text-white font-black text-xs uppercase tracking-[0.2em]">Preparing Content</h3>
                    <p className="text-gray-500 text-[9px] mt-2 uppercase font-bold tracking-widest">Validating Reward Session...</p>
                  </div>
              </div>
          )}

          {status === 'SHOWING' && (
              <div className="space-y-6">
                  <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-xl">
                      <ShieldAlert className="text-blue-500" size={32} />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Reward Unlocking</h3>
                    <p className="text-gray-500 text-[10px] mt-2 font-medium px-4">The ad has opened in a new tab. Complete it to claim your points.</p>
                  </div>
                  <p className="text-blue-400 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1">
                      <ExternalLink size={10} /> Link Active
                  </p>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 animate-[shimmer_2s_infinite] w-full"></div>
                  </div>
              </div>
          )}

          {status === 'ERROR' && (
              <div className="space-y-4">
                  <div className="bg-red-500/10 p-4 rounded-full w-fit mx-auto border border-red-500/20">
                    <AlertCircle className="text-red-500" size={32} />
                  </div>
                  <p className="text-red-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    {errorMsg}<br/>
                    <span className="text-gray-600">Auto-crediting to prevent disruption...</span>
                  </p>
              </div>
          )}

          <button 
            onClick={onComplete}
            className="mt-8 text-gray-700 hover:text-gray-400 text-[9px] font-black uppercase tracking-[0.3em] transition-colors"
          >
              Skip & Continue
          </button>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

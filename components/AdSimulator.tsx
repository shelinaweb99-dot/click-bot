
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldAlert, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { AdSettings, MonetagAdType } from '../types';
import { getRotatedLink } from '../services/mockDb';

interface AdSimulatorProps {
  onComplete: () => void;
  isOpen: boolean;
  settings: AdSettings;
  type?: MonetagAdType;
}

export const DEFAULT_MONETAG_SCRIPT = 'https://alwingulla.com/script/suv4.js';

export const AdSimulator: React.FC<AdSimulatorProps> = ({ onComplete, isOpen, settings, type = 'REWARDED_INTERSTITIAL' }) => {
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SHOWING' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [showRescue, setShowRescue] = useState(false);
  const pollingInterval = useRef<any>(null);
  const timeoutRef = useRef<any>(null);
  const rescueTimerRef = useRef<any>(null);

  const cleanup = () => {
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (rescueTimerRef.current) clearTimeout(rescueTimerRef.current);
  };

  const handleDirectLinkFallback = async () => {
    try {
        const link = await getRotatedLink();
        if (link) {
            window.open(link, '_blank');
            setStatus('SHOWING');
            // Credit points after 10s for manual visits
            timeoutRef.current = setTimeout(onComplete, 10000);
        } else {
            throw new Error("No fallback configured.");
        }
    } catch (e) {
        setStatus('ERROR');
        setErrorMsg('Ad engine blocked. Skipping...');
        timeoutRef.current = setTimeout(onComplete, 3000);
    }
  };

  const startAdProcess = async () => {
    setStatus('LOADING');
    setErrorMsg('');
    setShowRescue(false);

    // 1. Determine the relevant Zone ID for this context
    let zoneId = '';
    switch(type) {
        case 'REWARDED_INTERSTITIAL': zoneId = settings.monetagRewardedInterstitialId || ''; break;
        case 'REWARDED_POPUP': zoneId = settings.monetagRewardedPopupId || ''; break;
        case 'INTERSTITIAL': zoneId = settings.monetagInterstitialId || ''; break;
        default: zoneId = settings.monetagZoneId || '';
    }

    // 2. Fallback to global zone if specific is missing
    if (!zoneId || zoneId.trim() === '') {
        zoneId = (settings.monetagZoneId || '').trim();
    }

    // 3. If no Zone ID is provided, go straight to Direct Link
    if (!zoneId) {
        await handleDirectLinkFallback();
        return;
    }

    // 4. Inject SDK Script with data-zone attribute (Crucial for Monetag)
    const scriptId = `monetag-sdk-${zoneId}`;
    if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = settings.monetagAdTag || DEFAULT_MONETAG_SCRIPT;
        script.dataset.zone = zoneId;
        script.async = true;
        script.onerror = () => handleDirectLinkFallback();
        document.head.appendChild(script);
    }

    // 5. Poll for the global show function
    let attempts = 0;
    const maxAttempts = 60; // 6 seconds
    
    pollingInterval.current = setInterval(() => {
        attempts++;
        const funcName = `show_${zoneId}`;
        
        if (typeof (window as any)[funcName] === 'function') {
            clearInterval(pollingInterval.current);
            try {
                (window as any)[funcName]();
                setStatus('SHOWING');
                
                // Show rescue button after 7s in case the ad overlay doesn't block the screen
                rescueTimerRef.current = setTimeout(() => setShowRescue(true), 7000);
                
                // Safety timer to credit points if user is stuck in ad
                timeoutRef.current = setTimeout(onComplete, 25000);
            } catch (e) {
                handleDirectLinkFallback();
            }
        } else if (attempts >= maxAttempts) {
            clearInterval(pollingInterval.current);
            handleDirectLinkFallback();
        }
    }, 100);
  };

  useEffect(() => {
    if (!isOpen) {
        setStatus('IDLE');
        cleanup();
        return;
    }
    startAdProcess();
    return cleanup;
  }, [isOpen, type]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className={`bg-gray-900 w-full max-w-sm rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden p-8 text-center relative transition-all duration-500 ${status === 'SHOWING' && !showRescue ? 'opacity-0 pointer-events-none' : 'opacity-100 scale-100'}`}>
          
          {status === 'LOADING' && (
              <div className="space-y-6">
                  <div className="relative w-16 h-16 mx-auto">
                    <Loader2 className="w-full h-full text-blue-500 animate-spin" />
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl animate-pulse"></div>
                  </div>
                  <div>
                    <h3 className="text-white font-black text-xs uppercase tracking-[0.2em]">Syncing Ads</h3>
                    <p className="text-gray-500 text-[9px] mt-2 uppercase font-bold tracking-widest">Bridging Monetag TMA Node...</p>
                  </div>
              </div>
          )}

          {status === 'SHOWING' && (
              <div className="space-y-6">
                  <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-xl">
                      <ShieldAlert className="text-blue-500" size={32} />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Ad Session Verified</h3>
                    <p className="text-gray-500 text-[10px] mt-2 font-medium px-4 leading-relaxed">Please view the content to receive your reward assets.</p>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 animate-[shimmer_2s_infinite] w-full"></div>
                  </div>
                  {showRescue && (
                      <button 
                        onClick={onComplete}
                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest animate-in slide-in-from-bottom-2 shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2"
                      >
                         <RefreshCw size={14} className="animate-spin-slow" /> Force Claim Reward
                      </button>
                  )}
              </div>
          )}

          {status === 'ERROR' && (
              <div className="space-y-4">
                  <AlertCircle className="text-red-500 mx-auto" size={40} />
                  <p className="text-red-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">{errorMsg}</p>
              </div>
          )}

          <button 
            onClick={onComplete}
            className="mt-10 text-gray-700 hover:text-gray-400 text-[9px] font-black uppercase tracking-[0.4em] transition-colors"
          >
              Skip
          </button>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-spin-slow {
            animation: spin 3s linear infinite;
        }
      `}</style>
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldAlert, AlertCircle, X, ExternalLink } from 'lucide-react';
import { AdSettings } from '../types';
import { getRotatedLink } from '../services/mockDb';

interface AdSimulatorProps {
  onComplete: () => void;
  isOpen: boolean;
  settings: AdSettings;
}

export const AdSimulator: React.FC<AdSimulatorProps> = ({ onComplete, isOpen, settings }) => {
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SHOWING' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const timeoutRef = useRef<any>(null);
  const pollingInterval = useRef<any>(null);

  const cleanup = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (pollingInterval.current) clearInterval(pollingInterval.current);
  };

  const handleFallback = async (reason: string) => {
    console.warn(`Ad Fallback Triggered: ${reason}`);
    try {
      const link = await getRotatedLink();
      if (link) {
        window.open(link, '_blank');
        setStatus('SHOWING');
        // Standard safety timer for rewards when using direct links
        timeoutRef.current = setTimeout(onComplete, 12000); 
      } else {
        throw new Error("No fallback destination found.");
      }
    } catch (e) {
      setStatus('ERROR');
      setErrorMsg('Ad engine failed to initialize.');
      // Auto-complete after error to prevent blocking user progress
      timeoutRef.current = setTimeout(onComplete, 3000);
    }
  };

  const showInterstitialAd = (zoneId: string) => {
    const cleanZoneId = zoneId.trim();
    // 1. Inject SDK Script if not already present
    const scriptId = `monetag-sdk-${cleanZoneId}`;
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://alwingulla.com/script/suv4.js'; 
      script.dataset.zone = cleanZoneId;
      script.async = true;
      script.onerror = () => handleFallback('SDK script blocked or unavailable.');
      document.head.appendChild(script);
    }

    // 2. Poll for the Monetag TMA SDK global trigger function
    let attempts = 0;
    const maxAttempts = 60; // 6 seconds limit for SDK init
    
    pollingInterval.current = setInterval(() => {
      const sdkFunction = (window as any)[`show_${cleanZoneId}`];
      
      if (typeof sdkFunction === 'function') {
        clearInterval(pollingInterval.current);
        try {
          // Fire the native Monetag Interstitial
          sdkFunction(); 
          setStatus('SHOWING');
          
          // Safety net: Auto-complete reward after 15s in case the ad close event isn't trackable
          timeoutRef.current = setTimeout(() => {
            onComplete();
          }, 15000); 
        } catch (e) {
          handleFallback('SDK execution error.');
        }
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(pollingInterval.current);
          handleFallback('SDK timed out. Switching to Direct Link.');
        }
      }
    }, 100);
  };

  const startAdProcess = () => {
    setStatus('LOADING');
    setErrorMsg('');
    
    // Priority: Specific TMA Rewarded ID > General Zone ID
    const zoneId = settings.monetagRewardedInterstitialId || settings.monetagZoneId;
    
    if (zoneId && zoneId.toString().trim() !== '') {
      showInterstitialAd(zoneId.toString().trim());
    } else {
      handleFallback('No Zone ID configured in Admin Panel.');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setStatus('IDLE');
      cleanup();
      return;
    }
    startAdProcess();
    return cleanup;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in transition-all duration-1000 ${status === 'SHOWING' ? 'bg-black/40 backdrop-blur-none' : 'bg-black/90 backdrop-blur-xl'}`}>
      <div className={`bg-gray-900 w-full max-w-sm rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden p-8 text-center relative transition-opacity duration-500 ${status === 'SHOWING' ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
          
          {status === 'LOADING' && (
              <div className="space-y-6">
                  <div className="relative w-16 h-16 mx-auto">
                    <Loader2 className="w-full h-full text-blue-500 animate-spin" />
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-white font-black text-xs uppercase tracking-[0.2em]">Authenticating Ad</h3>
                    <p className="text-gray-500 text-[9px] uppercase font-bold tracking-widest">Bridging Monetag Network...</p>
                  </div>
              </div>
          )}

          {status === 'SHOWING' && (
              <div className="space-y-6">
                  <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-xl">
                      <ShieldAlert className="text-blue-500" size={32} />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Reward Session Active</h3>
                    <p className="text-gray-500 text-[10px] mt-2 font-medium px-4">Watch the ad to claim your points. If the ad opened in a new tab, return here after viewing.</p>
                  </div>
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
                    <span className="text-gray-600 font-bold uppercase text-[9px]">Auto-crediting reward shortly...</span>
                  </p>
              </div>
          )}

          {status !== 'SHOWING' && (
            <button 
              onClick={onComplete}
              className="mt-8 text-gray-700 hover:text-gray-400 text-[9px] font-black uppercase tracking-[0.3em] transition-colors"
            >
                Close / Skip
            </button>
          )}
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

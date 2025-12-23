
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldAlert, AlertCircle, ExternalLink } from 'lucide-react';
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

  const showInterstitialAd = async (zoneId: string) => {
    // 1. Check if script is already injected
    const scriptId = `monetag-sdk-${zoneId}`;
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://alwingulla.com/script/suv4.js'; // Official Monetag TMA SDK
      script.dataset.zone = zoneId;
      script.async = true;
      document.head.appendChild(script);
    }

    // 2. Poll for the global function show_ZONEID()
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds polling
    
    pollingInterval.current = setInterval(() => {
      const sdkFunction = (window as any)[`show_${zoneId}`];
      
      if (typeof sdkFunction === 'function') {
        clearInterval(pollingInterval.current);
        try {
          sdkFunction(); // Execute official Monetag Ad
          setStatus('SHOWING');
          // Start the reward timer
          timeoutRef.current = setTimeout(onComplete, 10000);
        } catch (e) {
          handleFallback('SDK execution failed.');
        }
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          clearInterval(pollingInterval.current);
          handleFallback('SDK load timeout.');
        }
      }
    }, 100);
  };

  const handleFallback = async (reason: string) => {
    console.warn(`Ad Fallback Triggered: ${reason}`);
    try {
      const link = await getRotatedLink();
      if (link) {
        window.open(link, '_blank');
        setStatus('SHOWING');
        timeoutRef.current = setTimeout(onComplete, 8000);
      } else {
        throw new Error("No fallback link.");
      }
    } catch (e) {
      setStatus('ERROR');
      setErrorMsg('Ad delivery unavailable.');
      setTimeout(onComplete, 2000);
    }
  };

  const startAdProcess = async () => {
    setStatus('LOADING');
    setErrorMsg('');

    // Use SDK if Zone ID is provided, otherwise use Direct Link
    const zoneId = settings.monetagZoneId || settings.monetagRewardedInterstitialId;
    
    if (zoneId) {
      showInterstitialAd(zoneId);
    } else {
      handleFallback('No Zone ID configured.');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setStatus('IDLE');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      return;
    }
    startAdProcess();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (pollingInterval.current) clearInterval(pollingInterval.current);
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
                    <h3 className="text-white font-black text-xs uppercase tracking-[0.2em]">Authenticating Ad</h3>
                    <p className="text-gray-500 text-[9px] mt-2 uppercase font-bold tracking-widest">Bridging Monetag Network...</p>
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
                    <p className="text-gray-500 text-[10px] mt-2 font-medium px-4">The interstitial is loading. Please complete or view it to claim your points.</p>
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
                    <span className="text-gray-600 font-bold">Auto-crediting reward to save progress...</span>
                  </p>
              </div>
          )}

          <button 
            onClick={onComplete}
            className="mt-8 text-gray-700 hover:text-gray-400 text-[9px] font-black uppercase tracking-[0.3em] transition-colors"
          >
              Close Overlay
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

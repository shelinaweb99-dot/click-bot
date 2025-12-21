
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldAlert, X, AlertCircle } from 'lucide-react';
import { AdSettings, MonetagAdType } from '../types';

interface AdSimulatorProps {
  onComplete: () => void;
  isOpen: boolean;
  settings: AdSettings;
  type?: MonetagAdType;
}

// Exported to allow access from admin settings
export const DEFAULT_MONETAG_SCRIPT = 'https://alwingulla.com/script/suv4.js';

export const AdSimulator: React.FC<AdSimulatorProps> = ({ onComplete, isOpen, settings, type = 'REWARDED_INTERSTITIAL' }) => {
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SHOWING' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const pollingInterval = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
        setStatus('IDLE');
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
    }

    setStatus('LOADING');
    setErrorMsg('');

    // 1. Determine Zone ID
    let zoneId = '';
    switch(type) {
        case 'REWARDED_INTERSTITIAL': zoneId = settings.monetagRewardedInterstitialId || ''; break;
        case 'REWARDED_POPUP': zoneId = settings.monetagRewardedPopupId || ''; break;
        case 'INTERSTITIAL': zoneId = settings.monetagInterstitialId || ''; break;
        default: zoneId = settings.monetagZoneId || '';
    }

    // 2. Fallback to general zone if specific is missing
    if (!zoneId) zoneId = settings.monetagZoneId || '';

    if (!zoneId) {
        setStatus('ERROR');
        setErrorMsg('Ad Zone ID not configured in Admin Panel.');
        // Auto-complete if no ad is configured so user isn't stuck
        setTimeout(onComplete, 2000);
        return;
    }

    // 3. Inject Script
    const scriptId = `monetag-sdk-${zoneId}`;
    if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = settings.monetagAdTag || DEFAULT_MONETAG_SCRIPT;
        script.async = true;
        script.dataset.zone = zoneId;
        document.head.appendChild(script);
    }

    // 4. Poll for SDK function and Auto-Trigger
    let attempts = 0;
    const maxAttempts = 50; // ~5 seconds
    pollingInterval.current = setInterval(() => {
        attempts++;
        const funcName = `show_${zoneId}`;
        
        if (typeof (window as any)[funcName] === 'function') {
            clearInterval(pollingInterval.current);
            try {
                (window as any)[funcName]();
                setStatus('SHOWING');
                
                // Monetag SDKs in Telegram often take over the UI. 
                // We provide a fallback timer to credit points if we can't detect closure.
                timeoutRef.current = setTimeout(() => {
                    onComplete();
                }, 15000); // 15s standard wait
            } catch (e) {
                setStatus('ERROR');
                setErrorMsg('Failed to trigger Ad SDK.');
                setTimeout(onComplete, 2000);
            }
        } else if (attempts >= maxAttempts) {
            clearInterval(pollingInterval.current);
            setStatus('ERROR');
            setErrorMsg('Ad SDK failed to load. Skipping...');
            setTimeout(onComplete, 2000);
        }
    }, 100);

    return () => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen, settings, type, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
      <div className="bg-gray-900 w-full max-w-sm rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden p-8 text-center">
          
          {status === 'LOADING' && (
              <div className="space-y-6">
                  <div className="relative w-16 h-16 mx-auto">
                    <Loader2 className="w-full h-full text-blue-500 animate-spin" />
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl animate-pulse"></div>
                  </div>
                  <div>
                    <h3 className="text-white font-black text-xs uppercase tracking-[0.2em]">Initializing Ad</h3>
                    <p className="text-gray-500 text-[9px] mt-2 uppercase font-bold tracking-widest">Securing Monetag Connection...</p>
                  </div>
              </div>
          )}

          {status === 'SHOWING' && (
              <div className="space-y-6">
                  <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-xl">
                      <ShieldAlert className="text-blue-500" size={32} />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Ad in Progress</h3>
                    <p className="text-gray-500 text-[10px] mt-2 font-medium">Please wait while the ad completes to receive your reward.</p>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 animate-[shimmer_2s_infinite] w-full"></div>
                  </div>
              </div>
          )}

          {status === 'ERROR' && (
              <div className="space-y-4">
                  <AlertCircle className="text-red-500 mx-auto" size={40} />
                  <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">{errorMsg}</p>
              </div>
          )}

          <button 
            onClick={onComplete}
            className="mt-8 text-gray-700 hover:text-gray-500 text-[9px] font-black uppercase tracking-[0.3em] transition-colors"
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

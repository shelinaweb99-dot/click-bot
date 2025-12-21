
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

export const DEFAULT_MONETAG_SCRIPT = 'https://alwingulla.com/script/suv4.js';

export const AdSimulator: React.FC<AdSimulatorProps> = ({ onComplete, isOpen, settings, type = 'REWARDED_INTERSTITIAL' }) => {
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SHOWING' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const pollingInterval = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  const startAdProcess = async () => {
    setStatus('LOADING');
    setErrorMsg('');

    // --- MODE 1: DYNAMIC / DIRECT LINK ---
    if (type === 'DIRECT' || (!settings.monetagZoneId && !settings.monetagRewardedInterstitialId && type !== 'INTERSTITIAL')) {
        try {
            const link = await getRotatedLink();
            if (link) {
                window.open(link, '_blank');
                setStatus('SHOWING');
                // Auto-complete after 10s for direct links as we can't track them
                timeoutRef.current = setTimeout(onComplete, 10000);
            } else {
                throw new Error("No dynamic link configured.");
            }
        } catch (e: any) {
            setStatus('ERROR');
            setErrorMsg(e.message || 'Direct link failure.');
            setTimeout(onComplete, 2000);
        }
        return;
    }

    // --- MODE 2: TELEGRAM SDK (ZONE ID) ---
    let zoneId = '';
    switch(type) {
        case 'REWARDED_INTERSTITIAL': zoneId = settings.monetagRewardedInterstitialId || ''; break;
        case 'REWARDED_POPUP': zoneId = settings.monetagRewardedPopupId || ''; break;
        case 'INTERSTITIAL': zoneId = settings.monetagInterstitialId || ''; break;
        default: zoneId = settings.monetagZoneId || '';
    }

    if (!zoneId) zoneId = settings.monetagZoneId || '';

    if (!zoneId) {
        setStatus('ERROR');
        setErrorMsg('Ad Zone ID not found.');
        setTimeout(onComplete, 2000);
        return;
    }

    // Inject/Ensure Script
    const scriptId = `monetag-sdk-${zoneId}`;
    if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = settings.monetagAdTag || DEFAULT_MONETAG_SCRIPT;
        script.async = true;
        script.dataset.zone = zoneId;
        // Fix: Ensure the script is actually added to the body/head
        document.body.appendChild(script);
    }

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
                // Safety timer to credit points if SDK doesn't callback
                timeoutRef.current = setTimeout(onComplete, 20000); 
            } catch (e) {
                setStatus('ERROR');
                setErrorMsg('SDK Execution Error.');
                setTimeout(onComplete, 2000);
            }
        } else if (attempts >= maxAttempts) {
            clearInterval(pollingInterval.current);
            setStatus('ERROR');
            setErrorMsg('SDK Timeout. Points will be credited.');
            setTimeout(onComplete, 2500); // Fail gracefully but credit user
        }
    }, 100);
  };

  useEffect(() => {
    if (!isOpen) {
        setStatus('IDLE');
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        return;
    }
    startAdProcess();
    return () => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
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
                    <h3 className="text-white font-black text-xs uppercase tracking-[0.2em]">Initializing Ad</h3>
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
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Ad Active</h3>
                    <p className="text-gray-500 text-[10px] mt-2 font-medium">Please view the content to unlock your reward.</p>
                  </div>
                  {type === 'DIRECT' && (
                      <p className="text-blue-400 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1">
                          <ExternalLink size={10} /> Check New Window
                      </p>
                  )}
              </div>
          )}

          {status === 'ERROR' && (
              <div className="space-y-4">
                  <div className="bg-red-500/10 p-4 rounded-full w-fit mx-auto border border-red-500/20">
                    <AlertCircle className="text-red-500" size={32} />
                  </div>
                  <p className="text-red-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    {errorMsg}<br/>
                    <span className="text-gray-600">Auto-skipping to prevent hang...</span>
                  </p>
              </div>
          )}

          <button 
            onClick={onComplete}
            className="mt-8 text-gray-700 hover:text-gray-400 text-[9px] font-black uppercase tracking-[0.3em] transition-colors"
          >
              Close & Continue
          </button>
      </div>
    </div>
  );
};

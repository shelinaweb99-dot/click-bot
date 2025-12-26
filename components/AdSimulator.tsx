
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldAlert, AlertCircle, ExternalLink, Zap } from 'lucide-react';
import { AdSettings, MonetagAdType } from '../types';
import { getRotatedLink } from '../services/mockDb';

interface AdSimulatorProps {
  onComplete: () => void;
  isOpen: boolean;
  settings: AdSettings;
  type?: MonetagAdType;
}

export const DEFAULT_MONETAG_SCRIPT = 'https://alwingulla.com/script/suv4.js';

export const AdSimulator: React.FC<AdSimulatorProps> = ({ onComplete, isOpen, settings, type = 'DIRECT' }) => {
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SHOWING' | 'ERROR'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const pollingInterval = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  const startProcess = async () => {
    setStatus('LOADING');
    setErrorMsg('');

    // --- MODE 1: DIRECT LINK (AUTO-OPEN) ---
    if (type === 'DIRECT') {
        try {
            const link = await getRotatedLink();
            if (link) {
                window.open(link, '_blank');
                setStatus('SHOWING');
                // Automatically complete after 8 seconds to credit points
                timeoutRef.current = setTimeout(onComplete, 8000);
            } else {
                throw new Error("No direct link configured.");
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

    if (!zoneId) {
        setStatus('ERROR');
        setErrorMsg('Ad Zone ID not configured.');
        setTimeout(onComplete, 2000);
        return;
    }

    // Inject Script
    const scriptId = `monetag-sdk-${zoneId}`;
    if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = settings.monetagAdTag || DEFAULT_MONETAG_SCRIPT;
        script.async = true;
        script.dataset.zone = zoneId;
        document.body.appendChild(script);
    }

    // Poll for SDK function
    let attempts = 0;
    pollingInterval.current = setInterval(() => {
        attempts++;
        const funcName = `show_${zoneId}`;
        
        if (typeof (window as any)[funcName] === 'function') {
            clearInterval(pollingInterval.current);
            try {
                (window as any)[funcName]();
                setStatus('SHOWING');
                timeoutRef.current = setTimeout(onComplete, 15000); // Fallback credit
            } catch (e) {
                setStatus('ERROR');
                setErrorMsg('SDK Execution Failed.');
                setTimeout(onComplete, 2000);
            }
        } else if (attempts >= 50) { // 5 seconds
            clearInterval(pollingInterval.current);
            setStatus('ERROR');
            setErrorMsg('SDK Load Timeout.');
            setTimeout(onComplete, 2000);
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
    startProcess();
    return () => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden p-10 text-center relative animate-in zoom-in duration-300">
          
          {status === 'LOADING' && (
              <div className="space-y-6">
                  <div className="relative w-16 h-16 mx-auto">
                    <Loader2 className="w-full h-full text-blue-500 animate-spin" strokeWidth={1.5} />
                    <div className="absolute inset-0 bg-blue-500/20 blur-2xl animate-pulse"></div>
                  </div>
                  <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] animate-pulse">Initializing Ad</h3>
              </div>
          )}

          {status === 'SHOWING' && (
              <div className="space-y-6">
                  <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-xl">
                      <Zap className="text-blue-500 animate-pulse" size={40} />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">
                        {type === 'DIRECT' ? 'Redirecting to Sponsor...' : 'Ad Active'}
                    </h3>
                    <p className="text-gray-500 text-[10px] mt-2 font-bold uppercase tracking-widest leading-relaxed">
                        Points will be credited automatically in a few seconds.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-blue-400">
                      <ExternalLink size={12} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Secure Link Opened</span>
                  </div>
              </div>
          )}

          {status === 'ERROR' && (
              <div className="space-y-6">
                  <AlertCircle className="text-red-500 mx-auto" size={48} />
                  <p className="text-red-400 text-[10px] font-black uppercase tracking-widest">{errorMsg}</p>
              </div>
          )}

          <button 
            onClick={onComplete}
            className="mt-10 text-gray-700 hover:text-gray-500 text-[8px] font-black uppercase tracking-[0.5em] transition-colors"
          >
              Skip & Continue
          </button>
      </div>
    </div>
  );
};

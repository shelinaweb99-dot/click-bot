
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldAlert, AlertCircle, Zap } from 'lucide-react';
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
                const tg = (window as any).Telegram?.WebApp;
                
                // For Telegram Mini Apps, use openLink to bypass popup blockers
                if (tg && typeof tg.openLink === 'function') {
                    tg.openLink(link);
                } else {
                    window.open(link, '_blank');
                }
                
                setStatus('SHOWING');
                // Automatically complete after a short delay to credit points without manual click
                timeoutRef.current = setTimeout(onComplete, 3000);
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
        setErrorMsg('Ad Zone ID not found.');
        setTimeout(onComplete, 2000);
        return;
    }

    // Inject Script into Head for better loading
    const scriptId = `monetag-sdk-${zoneId}`;
    if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = settings.monetagAdTag || DEFAULT_MONETAG_SCRIPT;
        script.async = true;
        script.dataset.zone = zoneId;
        document.head.appendChild(script);
    }

    // Poll for SDK function and execute automatically
    let attempts = 0;
    pollingInterval.current = setInterval(() => {
        attempts++;
        const funcName = `show_${zoneId}`;
        
        if (typeof (window as any)[funcName] === 'function') {
            clearInterval(pollingInterval.current);
            try {
                (window as any)[funcName]();
                setStatus('SHOWING');
                // Standard rewarded wait then auto-complete
                timeoutRef.current = setTimeout(onComplete, 12000); 
            } catch (e) {
                setStatus('ERROR');
                setErrorMsg('SDK Execution Failed.');
                setTimeout(onComplete, 2000);
            }
        } else if (attempts >= 80) { // 8 seconds timeout
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
          
          <div className="space-y-6">
              <div className="relative w-16 h-16 mx-auto">
                <Loader2 className={`w-full h-full ${status === 'ERROR' ? 'text-red-500' : 'text-blue-500'} animate-spin`} strokeWidth={1.5} />
                <div className={`absolute inset-0 ${status === 'ERROR' ? 'bg-red-500/20' : 'bg-blue-500/20'} blur-2xl animate-pulse`}></div>
              </div>
              
              <div>
                <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-2">
                    {status === 'LOADING' ? 'Bridging Sponsor' : 
                     status === 'SHOWING' ? 'Ad Dispatched' : 'System Error'}
                </h3>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                    {status === 'LOADING' ? 'Synchronizing with monetization node...' : 
                     status === 'SHOWING' ? 'Please wait, reward processing in progress...' : 
                     errorMsg || 'Connection timed out.'}
                </p>
              </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
              <div className="flex items-center justify-center gap-2 text-blue-500 animate-pulse">
                <Zap size={14} />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">No Interaction Required</span>
              </div>
          </div>
      </div>
    </div>
  );
};

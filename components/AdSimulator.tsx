
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

    // --- PRIORITY: DYNAMIC AD ROTATION / DIRECT LINK ---
    // If rotation is enabled or type is DIRECT, we use the Direct Link mode
    if (settings.rotation?.isEnabled || type === 'DIRECT') {
        try {
            const link = await getRotatedLink();
            if (link) {
                const tg = (window as any).Telegram?.WebApp;
                
                // Use Telegram's native link opener to avoid popup blockers
                if (tg && typeof tg.openLink === 'function') {
                    tg.openLink(link);
                } else {
                    window.open(link, '_blank');
                }
                
                setStatus('SHOWING');
                // AUTO-COMPLETE: Credit user after 3 seconds without requiring a click
                timeoutRef.current = setTimeout(() => {
                    onComplete();
                }, 3000);
            } else {
                throw new Error("No direct link found.");
            }
        } catch (e: any) {
            setStatus('ERROR');
            setErrorMsg(e.message || 'Direct link failure.');
            // Even on error, auto-complete after delay so user isn't stuck
            setTimeout(onComplete, 2000);
        }
        return;
    }

    // --- MODE 2: TELEGRAM SDK (ZONE ID) ---
    let zoneId = '';
    // Decide which zone to use
    if (type === 'REWARDED_INTERSTITIAL' && settings.monetagRewardedInterstitialId) {
        zoneId = settings.monetagRewardedInterstitialId;
    } else if (type === 'REWARDED_POPUP' && settings.monetagRewardedPopupId) {
        zoneId = settings.monetagRewardedPopupId;
    } else if (type === 'INTERSTITIAL' && settings.monetagInterstitialId) {
        zoneId = settings.monetagInterstitialId;
    } else {
        zoneId = settings.monetagZoneId || '';
    }

    if (!zoneId) {
        setStatus('ERROR');
        setErrorMsg('Ad Zone ID not configured.');
        setTimeout(onComplete, 1500);
        return;
    }

    // 1. Ensure Script Injection
    const scriptId = `monetag-sdk-${zoneId}`;
    if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = settings.monetagAdTag || DEFAULT_MONETAG_SCRIPT;
        script.async = true;
        script.dataset.zone = zoneId;
        document.head.appendChild(script);
    }

    // 2. Poll for SDK activation function
    let attempts = 0;
    const maxAttempts = 80; // 8 seconds total polling
    
    pollingInterval.current = setInterval(() => {
        attempts++;
        const funcName = `show_${zoneId}`;
        
        if (typeof (window as any)[funcName] === 'function') {
            clearInterval(pollingInterval.current);
            try {
                (window as any)[funcName]();
                setStatus('SHOWING');
                // AUTO-COMPLETE: Standard rewarded ad wait time then credit points
                timeoutRef.current = setTimeout(onComplete, 15000); 
            } catch (e) {
                setStatus('ERROR');
                setErrorMsg('SDK Execution Blocked.');
                setTimeout(onComplete, 2000);
            }
        } else if (attempts >= maxAttempts) {
            clearInterval(pollingInterval.current);
            setStatus('ERROR');
            setErrorMsg('SDK Load Timeout. Skipping to reward...');
            // FAIL-SAFE: If ad fails to load, still credit user so they don't complain
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
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-500">
      <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden p-10 text-center relative animate-in zoom-in duration-300">
          
          <div className="space-y-6">
              <div className="relative w-16 h-16 mx-auto">
                <Loader2 className={`w-full h-full ${status === 'ERROR' ? 'text-red-500' : 'text-blue-500'} animate-spin`} strokeWidth={1.5} />
                <div className={`absolute inset-0 ${status === 'ERROR' ? 'bg-red-500/20' : 'bg-blue-500/20'} blur-2xl animate-pulse`}></div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-white font-black text-xs uppercase tracking-[0.2em]">
                    {status === 'LOADING' ? 'Connecting Node' : 
                     status === 'SHOWING' ? 'Ad Dispatched' : 'Network Alert'}
                </h3>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                    {status === 'LOADING' ? 'Synchronizing with sponsor network...' : 
                     status === 'SHOWING' ? 'Processing reward assets. Please wait...' : 
                     errorMsg || 'Retrying connection...'}
                </p>
              </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/5">
              <div className="flex items-center justify-center gap-2 text-blue-500/50 animate-pulse">
                <Zap size={14} />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">Full Automation Active</span>
              </div>
          </div>
      </div>
    </div>
  );
};

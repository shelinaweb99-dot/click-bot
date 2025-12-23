
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldAlert, AlertCircle, RefreshCw, ExternalLink, MousePointer2 } from 'lucide-react';
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
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SHOWING' | 'ERROR' | 'REDIRECTING'>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [showRescue, setShowRescue] = useState(false);
  const [activeLink, setActiveLink] = useState<string | null>(null);
  const pollingInterval = useRef<any>(null);
  const timeoutRef = useRef<any>(null);
  const rescueTimerRef = useRef<any>(null);

  const cleanup = () => {
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (rescueTimerRef.current) clearTimeout(rescueTimerRef.current);
  };

  const handleDirectLinkFallback = async () => {
    setStatus('REDIRECTING');
    try {
        const link = await getRotatedLink();
        if (link) {
            setActiveLink(link);
            // We try to open automatically, but if it fails, the UI will show a button
            window.open(link, '_blank');
            // Credit points after 15s for manual visits
            timeoutRef.current = setTimeout(onComplete, 15000);
        } else {
            throw new Error("No fallback links configured.");
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
    setActiveLink(null);

    // 1. Determine the relevant Zone ID for this context
    let zoneId = '';
    switch(type) {
        case 'REWARDED_INTERSTITIAL': zoneId = settings.monetagRewardedInterstitialId || ''; break;
        case 'REWARDED_POPUP': zoneId = settings.monetagRewardedPopupId || ''; break;
        case 'INTERSTITIAL': zoneId = settings.monetagInterstitialId || ''; break;
        default: zoneId = settings.monetagZoneId || '';
    }

    if (!zoneId || zoneId.trim() === '') {
        zoneId = (settings.monetagZoneId || '').trim();
    }

    // 2. If no Zone ID is provided OR type is DIRECT, use Link Rotation
    if (!zoneId || type === 'DIRECT') {
        await handleDirectLinkFallback();
        return;
    }

    // 3. Inject SDK Script
    const scriptId = `monetag-sdk-${zoneId}`;
    if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = settings.monetagAdTag || DEFAULT_MONETAG_SCRIPT;
        script.dataset.zone = zoneId;
        script.async = true;
        script.onerror = () => handleDirectLinkFallback();
        document.body.appendChild(script);
    }

    // 4. Poll for SDK
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds
    
    pollingInterval.current = setInterval(() => {
        attempts++;
        const funcName = `show_${zoneId}`;
        
        if (typeof (window as any)[funcName] === 'function') {
            clearInterval(pollingInterval.current);
            try {
                (window as any)[funcName]();
                setStatus('SHOWING');
                rescueTimerRef.current = setTimeout(() => setShowRescue(true), 8000);
                timeoutRef.current = setTimeout(onComplete, 30000);
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
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden p-8 text-center relative animate-in zoom-in duration-300">
          
          {(status === 'LOADING' || status === 'SHOWING') && (
              <div className="space-y-6">
                  <div className="relative w-20 h-20 mx-auto">
                    <Loader2 className="w-full h-full text-blue-500 animate-spin" strokeWidth={1.5} />
                    <div className="absolute inset-0 bg-blue-500/20 blur-2xl animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-white font-black text-sm uppercase tracking-[0.2em]">Ad In Progress</h3>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest px-6 leading-relaxed">
                        Please wait for the ad to complete. Your reward will be added automatically.
                    </p>
                  </div>
                  
                  {showRescue && (
                      <div className="pt-4 space-y-4">
                          <p className="text-amber-500 text-[9px] font-black uppercase tracking-widest animate-pulse">Having Trouble?</p>
                          <button 
                            onClick={onComplete}
                            className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/10 flex items-center justify-center gap-2"
                          >
                             <RefreshCw size={14} /> Bypass & Claim Reward
                          </button>
                      </div>
                  )}
              </div>
          )}

          {status === 'REDIRECTING' && (
              <div className="space-y-8 py-4">
                  <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20 shadow-xl">
                      <MousePointer2 className="text-blue-500 animate-bounce" size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-white font-black text-sm uppercase tracking-[0.15em]">Redirecting to Sponsor</h3>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed px-4">
                        Click the button below to visit the sponsor link and unlock your reward.
                    </p>
                  </div>
                  
                  {activeLink && (
                    <a 
                        href={activeLink} 
                        target="_blank" 
                        rel="noreferrer"
                        onClick={() => {
                            // Start a shorter timer for completion once they click
                            if(timeoutRef.current) clearTimeout(timeoutRef.current);
                            timeoutRef.current = setTimeout(onComplete, 12000);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-2xl shadow-blue-900/30 transition-all active:scale-95 border border-blue-400/20"
                    >
                        Visit Link <ExternalLink size={16} />
                    </a>
                  )}

                  <p className="text-gray-700 text-[9px] font-black uppercase tracking-[0.3em] pt-2">
                    Reward credits in 15 seconds
                  </p>
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
                      Continue to Reward
                  </button>
              </div>
          )}

          <button 
            onClick={onComplete}
            className="mt-12 text-gray-800 hover:text-gray-500 text-[8px] font-black uppercase tracking-[0.5em] transition-colors"
          >
              Close Overlay
          </button>
      </div>
    </div>
  );
};

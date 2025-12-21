
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, PlayCircle, AlertCircle, X, ExternalLink, MousePointerClick, ShieldAlert } from 'lucide-react';
import { AdProvider, AdSettings, MonetagAdType } from '../types';
import { getRotatedLink, initiateAdWatch } from '../services/mockDb';

interface AdSimulatorProps {
  onComplete: () => void;
  isOpen: boolean;
  settings: AdSettings;
  type?: MonetagAdType;
}

const DEFAULT_MONETAG_SCRIPT = 'https://alwingulla.com/script/suv4.js';

export const AdSimulator: React.FC<AdSimulatorProps> = ({ onComplete, isOpen, settings, type = 'REWARDED_INTERSTITIAL' }) => {
  const [viewState, setViewState] = useState<'LOADING' | 'READY' | 'WATCHING' | 'COMPLETED' | 'ERROR'>('LOADING');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(15);
  const activeScripts = useRef<HTMLScriptElement[]>([]);
  const [currentFallbackLink, setCurrentFallbackLink] = useState('');

  // --- 1. SETUP & SCRIPT INJECTION ---
  useEffect(() => {
    if (!isOpen) {
        // Cleanup injected scripts when closed
        activeScripts.current.forEach(s => s.remove());
        activeScripts.current = [];
        setViewState('LOADING');
        return;
    }

    setViewState('LOADING');
    setErrorMsg('');
    setCountdown(15);

    // Dynamic Rotation Fallback
    getRotatedLink().then(link => {
        if (link) setCurrentFallbackLink(link);
        else setCurrentFallbackLink(settings.monetagDirectLink || settings.adsterraLink || settings.telegramChannelLink);
    });

    // Inject Monetag scripts for all configured Telegram Ad types
    const zonesToInject = [
      settings.monetagRewardedInterstitialId,
      settings.monetagRewardedPopupId,
      settings.monetagInterstitialId,
      settings.monetagZoneId
    ].filter(id => id && id.length > 3);

    let scriptLoadedCount = 0;
    
    if (zonesToInject.length === 0) {
        setViewState('READY');
        return;
    }

    zonesToInject.forEach(zoneId => {
        const script = document.createElement('script');
        script.src = settings.monetagAdTag || DEFAULT_MONETAG_SCRIPT;
        script.async = true;
        script.dataset.zone = zoneId;
        
        script.onload = () => {
            scriptLoadedCount++;
            if (scriptLoadedCount === zonesToInject.length) {
                setTimeout(() => setViewState('READY'), 500);
            }
        };

        script.onerror = () => {
            scriptLoadedCount++;
            if (scriptLoadedCount === zonesToInject.length) setViewState('READY');
        };

        document.body.appendChild(script);
        activeScripts.current.push(script);
    });

    // Timeout to prevent infinite loading if scripts are blocked
    const loadTimeout = setTimeout(() => {
        if (viewState === 'LOADING') setViewState('READY');
    }, 5000);

    return () => clearTimeout(loadTimeout);

  }, [isOpen, settings]);

  // --- 2. AD TRIGGER LOGIC ---
  const handleShowAd = async () => {
      try {
          await initiateAdWatch();
      } catch (e) {}

      let targetZoneId = '';
      
      // Determine which zone to trigger based on requested type
      switch(type) {
        case 'REWARDED_INTERSTITIAL': 
            targetZoneId = settings.monetagRewardedInterstitialId || settings.monetagZoneId || ''; 
            break;
        case 'REWARDED_POPUP': 
            targetZoneId = settings.monetagRewardedPopupId || settings.monetagZoneId || ''; 
            break;
        case 'INTERSTITIAL': 
            targetZoneId = settings.monetagInterstitialId || settings.monetagZoneId || ''; 
            break;
        default: 
            targetZoneId = settings.monetagZoneId || '';
      }

      const funcName = `show_${targetZoneId}`;

      // OPTION 1: Automatic Function Call via Monetag SDK
      if (targetZoneId && typeof (window as any)[funcName] === 'function') {
          try {
            (window as any)[funcName]();
            setViewState('WATCHING');
            startCountdown();
          } catch (e) {
            console.error("Monetag invocation error", e);
            tryFallback();
          }
      } 
      // OPTION 2: Fallback to Direct Links
      else {
          tryFallback();
      }
  };

  const tryFallback = () => {
      if (currentFallbackLink) {
          window.open(currentFallbackLink, '_blank');
          setViewState('WATCHING');
          startCountdown();
      } else {
          setViewState('WATCHING');
          startCountdown();
      }
  };

  const startCountdown = () => {
      const timer = setInterval(() => {
          setCountdown((prev) => {
              if (prev <= 1) {
                  clearInterval(timer);
                  setViewState('COMPLETED');
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
  };

  const handleManualOpen = () => {
      if (currentFallbackLink) window.open(currentFallbackLink, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gray-800 w-full max-w-sm rounded-3xl border border-white/5 shadow-2xl overflow-hidden flex flex-col relative">
          
          <div className="bg-gray-900 p-5 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="text-blue-500" size={18} />
                  Monetized Segment
              </h3>
              <button onClick={onComplete} className="text-gray-500 hover:text-white">
                  <X size={20} />
              </button>
          </div>

          <div className="p-10 flex flex-col items-center justify-center min-h-[350px] text-center">
              
              {viewState === 'LOADING' && (
                  <div className="space-y-4">
                      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Initializing Ad Stream</p>
                  </div>
              )}

              {viewState === 'READY' && (
                  <div className="space-y-8 animate-in zoom-in duration-300 w-full">
                      <div className="w-24 h-24 bg-blue-600/10 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl border border-blue-500/20">
                          <MousePointerClick className="w-10 h-10 text-blue-500" />
                      </div>
                      <div>
                          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">WATCH TO EARN</h2>
                          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-2 leading-relaxed">Engagement is required to verify your contribution to the node network.</p>
                      </div>
                      <button 
                        onClick={handleShowAd}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-5 rounded-2xl shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2 tracking-[0.2em] border border-blue-400/20"
                      >
                          {type.replace('_', ' ')}
                      </button>
                  </div>
              )}

              {viewState === 'WATCHING' && (
                  <div className="space-y-6">
                      <div className="relative w-24 h-24 mx-auto">
                           <svg className="w-full h-full transform -rotate-90">
                               <circle cx="48" cy="48" r="42" stroke="#1f2937" strokeWidth="8" fill="none" />
                               <circle cx="48" cy="48" r="42" stroke="#3b82f6" strokeWidth="8" fill="none" strokeDasharray="264" strokeDashoffset={264 - (264 * (15 - countdown) / 15)} className="transition-all duration-1000 ease-linear" />
                           </svg>
                           <span className="absolute inset-0 flex items-center justify-center font-black text-2xl text-white">
                               {countdown}
                           </span>
                      </div>
                      <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">Processing Interaction</h3>
                          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Do not close this window</p>
                      </div>
                      
                      {currentFallbackLink && (
                          <button 
                            onClick={handleManualOpen}
                            className="text-[9px] text-blue-400 font-black uppercase tracking-widest underline underline-offset-4 flex items-center justify-center gap-1 mt-4 opacity-70 hover:opacity-100"
                          >
                              Manual Trigger <ExternalLink size={12} />
                          </button>
                      )}
                  </div>
              )}

              {viewState === 'COMPLETED' && (
                  <div className="space-y-8 animate-in zoom-in w-full">
                      <div className="w-24 h-24 bg-green-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl border border-green-500/20">
                          <CheckCircle2 className="w-12 h-12 text-green-500" />
                      </div>
                      <div>
                          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">VERIFIED</h2>
                          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Assets Ready for Claiming</p>
                      </div>
                      <button 
                        onClick={onComplete}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-xs py-5 rounded-2xl shadow-xl transition tracking-[0.2em] border border-green-400/20"
                      >
                          COLLECT REWARD
                      </button>
                  </div>
              )}

              {viewState === 'ERROR' && (
                  <div className="space-y-6">
                      <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                      <p className="text-red-400 text-xs font-black uppercase tracking-widest">{errorMsg}</p>
                      <button 
                        onClick={() => setViewState('READY')}
                        className="text-gray-500 underline text-[10px] font-black uppercase tracking-widest"
                      >
                          Retry Protocol
                      </button>
                  </div>
              )}

          </div>
      </div>
    </div>
  );
};

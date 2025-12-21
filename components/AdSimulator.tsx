
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, PlayCircle, AlertCircle, X, ExternalLink, MousePointerClick, ShieldAlert, RefreshCw } from 'lucide-react';
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
  const [currentFallbackLink, setCurrentFallbackLink] = useState('');
  const [activeZoneId, setActiveZoneId] = useState<string>('');
  
  const pollingInterval = useRef<any>(null);
  const watchTimer = useRef<any>(null);

  // --- 1. SETUP & SCRIPT INJECTION ---
  useEffect(() => {
    if (!isOpen) {
        setViewState('LOADING');
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        if (watchTimer.current) clearInterval(watchTimer.current);
        return;
    }

    setViewState('LOADING');
    setErrorMsg('');
    setCountdown(15);

    // Get the target Zone ID based on requested type
    let zoneId = '';
    switch(type) {
        case 'REWARDED_INTERSTITIAL': zoneId = settings.monetagRewardedInterstitialId || ''; break;
        case 'REWARDED_POPUP': zoneId = settings.monetagRewardedPopupId || ''; break;
        case 'INTERSTITIAL': zoneId = settings.monetagInterstitialId || ''; break;
        default: zoneId = settings.monetagZoneId || '';
    }
    
    // Fallback to general zone if specific is missing
    if (!zoneId) zoneId = settings.monetagZoneId || '';
    setActiveZoneId(zoneId);

    // Load dynamic fallback link
    getRotatedLink().then(link => {
        if (link) setCurrentFallbackLink(link);
        else setCurrentFallbackLink(settings.monetagDirectLink || settings.adsterraLink || '');
    });

    if (!zoneId) {
        setViewState('READY');
        return;
    }

    // Inject Script for this specific zone
    const scriptId = `monetag-sdk-${zoneId}`;
    if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = settings.monetagAdTag || DEFAULT_MONETAG_SCRIPT;
        script.async = true;
        script.dataset.zone = zoneId;
        document.head.appendChild(script);
    }

    // Poll for the function show_XXXXX()
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds
    
    pollingInterval.current = setInterval(() => {
        attempts++;
        const funcName = `show_${zoneId}`;
        if (typeof (window as any)[funcName] === 'function') {
            clearInterval(pollingInterval.current);
            setViewState('READY');
        } else if (attempts >= maxAttempts) {
            clearInterval(pollingInterval.current);
            console.warn(`Monetag SDK function ${funcName} not found after 5s. Using fallback.`);
            setViewState('READY');
        }
    }, 100);

    return () => {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
    };

  }, [isOpen, settings, type]);

  // --- 2. AD TRIGGER LOGIC ---
  const handleShowAd = async () => {
      try {
          await initiateAdWatch();
      } catch (e) {}

      const funcName = `show_${activeZoneId}`;

      // OPTION 1: Execute Monetag SDK function if it exists
      if (activeZoneId && typeof (window as any)[funcName] === 'function') {
          try {
            console.log(`Executing ${funcName}...`);
            (window as any)[funcName]();
            setViewState('WATCHING');
            startCountdown();
          } catch (e) {
            console.error("Monetag execution failed", e);
            tryFallback();
          }
      } 
      // OPTION 2: Fallback to Direct Link / Manual Watch
      else {
          tryFallback();
      }
  };

  const tryFallback = () => {
      if (currentFallbackLink) {
          window.open(currentFallbackLink, '_blank');
      }
      setViewState('WATCHING');
      startCountdown();
  };

  const startCountdown = () => {
      if (watchTimer.current) clearInterval(watchTimer.current);
      setCountdown(15);
      
      watchTimer.current = setInterval(() => {
          setCountdown((prev) => {
              if (prev <= 1) {
                  clearInterval(watchTimer.current);
                  setViewState('COMPLETED');
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
  };

  const handleManualOpen = () => {
      if (currentFallbackLink) window.open(currentFallbackLink, '_blank');
      else if (activeZoneId) {
          // Attempt to call again if it was just a delay
          const funcName = `show_${activeZoneId}`;
          if (typeof (window as any)[funcName] === 'function') (window as any)[funcName]();
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gray-800 w-full max-w-sm rounded-3xl border border-white/5 shadow-2xl overflow-hidden flex flex-col relative">
          
          <div className="bg-gray-900 p-5 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="text-blue-500" size={18} />
                  Security Verification
              </h3>
              <button onClick={() => { setViewState('LOADING'); onComplete(); }} className="text-gray-500 hover:text-white">
                  <X size={20} />
              </button>
          </div>

          <div className="p-10 flex flex-col items-center justify-center min-h-[380px] text-center">
              
              {viewState === 'LOADING' && (
                  <div className="space-y-4">
                      <div className="relative">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                        <div className="absolute inset-0 bg-blue-500/10 blur-xl animate-pulse"></div>
                      </div>
                      <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Connecting to Monetag Node...</p>
                  </div>
              )}

              {viewState === 'READY' && (
                  <div className="space-y-8 animate-in zoom-in duration-300 w-full">
                      <div className="w-24 h-24 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl border border-blue-500/20">
                          <PlayCircle className="w-12 h-12 text-blue-500" />
                      </div>
                      <div>
                          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">AD READY</h2>
                          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-2 leading-relaxed">
                            Complete the {type.replace('_', ' ')} <br/> to verify your session.
                          </p>
                      </div>
                      <button 
                        onClick={handleShowAd}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-5 rounded-2xl shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2 tracking-[0.2em] border border-blue-400/20"
                      >
                          Watch Now
                      </button>
                      
                      <p className="text-[9px] text-gray-700 font-black uppercase tracking-widest">Zone ID: {activeZoneId || 'Fallback'}</p>
                  </div>
              )}

              {viewState === 'WATCHING' && (
                  <div className="space-y-8">
                      <div className="relative w-28 h-28 mx-auto">
                           <svg className="w-full h-full transform -rotate-90">
                               <circle cx="56" cy="56" r="50" stroke="#1f2937" strokeWidth="8" fill="none" />
                               <circle cx="56" cy="56" r="50" stroke="#3b82f6" strokeWidth="8" fill="none" strokeDasharray="314" strokeDashoffset={314 - (314 * (15 - countdown) / 15)} className="transition-all duration-1000 ease-linear" />
                           </svg>
                           <span className="absolute inset-0 flex items-center justify-center font-black text-3xl text-white">
                               {countdown}
                           </span>
                      </div>
                      <div>
                          <h3 className="text-xl font-black text-white uppercase tracking-tight">Watching Ad...</h3>
                          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Points will be credited shortly</p>
                      </div>
                      
                      <button 
                        onClick={handleManualOpen}
                        className="bg-white/5 text-gray-500 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 mx-auto hover:text-white transition-colors"
                      >
                          <RefreshCw size={12} /> Force Reload Ad
                      </button>
                  </div>
              )}

              {viewState === 'COMPLETED' && (
                  <div className="space-y-8 animate-in zoom-in w-full">
                      <div className="w-24 h-24 bg-green-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl border border-green-500/20">
                          <CheckCircle2 className="w-12 h-12 text-green-500" />
                      </div>
                      <div>
                          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">VERIFIED</h2>
                          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Reward Protocol Initiated</p>
                      </div>
                      <button 
                        onClick={() => { setViewState('LOADING'); onComplete(); }}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-xs py-5 rounded-2xl shadow-xl transition tracking-[0.2em] border border-green-400/20"
                      >
                          CLAIM REWARD
                      </button>
                  </div>
              )}

              {viewState === 'ERROR' && (
                  <div className="space-y-6">
                      <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                      <p className="text-red-400 text-xs font-black uppercase tracking-widest">{errorMsg || "Network Error"}</p>
                      <button 
                        onClick={() => setViewState('READY')}
                        className="bg-gray-900 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5"
                      >
                          Retry Connection
                      </button>
                  </div>
              )}

          </div>
      </div>
    </div>
  );
};

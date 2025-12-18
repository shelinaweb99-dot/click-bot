
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, PlayCircle, AlertCircle, X, ExternalLink, MousePointerClick } from 'lucide-react';
import { AdProvider, AdSettings } from '../types';
import { getRotatedLink, initiateAdWatch } from '../services/mockDb';

interface AdSimulatorProps {
  onComplete: () => void;
  isOpen: boolean;
  settings: AdSettings;
}

// The standard universal tag for Monetag/PropellerAds
const DEFAULT_MONETAG_SCRIPT = 'https://alwingulla.com/script/suv4.js';

export const AdSimulator: React.FC<AdSimulatorProps> = ({ onComplete, isOpen, settings }) => {
  const [viewState, setViewState] = useState<'LOADING' | 'READY' | 'WATCHING' | 'COMPLETED' | 'ERROR'>('LOADING');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(15);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [currentFallbackLink, setCurrentFallbackLink] = useState('');

  // --- 1. SETUP & PRELOAD ---
  useEffect(() => {
    if (!isOpen) {
        if (scriptRef.current) {
            scriptRef.current.remove();
            scriptRef.current = null;
        }
        setViewState('LOADING');
        return;
    }

    setViewState('LOADING');
    setErrorMsg('');
    setCountdown(15);

    // Initialize with manual links immediately to ensure we have *something* if rotation fetch fails/lags
    let activeLink = settings.monetagDirectLink || settings.adsterraLink || settings.telegramChannelLink;
    setCurrentFallbackLink(activeLink);

    // Fetch the Dynamic Rotation Link from "Server" asynchronously
    getRotatedLink().then((rotatedLink) => {
        if (rotatedLink) {
            setCurrentFallbackLink(rotatedLink);
        }
    });

    const provider = settings.activeProvider;
    
    // CASE A: Monetag JS API (Zone ID provided)
    if (provider === AdProvider.MONETAG && settings.monetagZoneId) {
        let src = settings.monetagAdTag || DEFAULT_MONETAG_SCRIPT;
        
        if (src.includes('src="')) {
            const match = src.match(/src=["'](.*?)["']/);
            if (match) src = match[1];
        }
        if (src.startsWith('//')) src = 'https:' + src;

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.zone = settings.monetagZoneId;
        
        script.onload = () => {
            console.log("Ad Script Loaded");
            setTimeout(() => setViewState('READY'), 500);
        };

        script.onerror = () => {
            console.warn("Ad Script Failed (AdBlock?), switching to fallback mode");
            setViewState('READY'); 
        };

        document.body.appendChild(script);
        scriptRef.current = script;
    } 
    // CASE B: Direct Links
    else {
        setViewState('READY');
    }

  }, [isOpen, settings]);

  // --- 2. USER TRIGGER ---
  const handleShowAd = async () => {
      // SECURITY: Tell server we are starting the ad
      // This sets a timestamp in the DB. The server will reject the claim if we try to claim too fast.
      try {
          await initiateAdWatch();
      } catch (e) {
          console.warn("Server init failed, but continuing for UX");
      }

      const zoneId = settings.monetagZoneId;
      const funcName = `show_${zoneId}`;

      // OPTION 1: Monetag JS API
      if (settings.activeProvider === AdProvider.MONETAG && zoneId && typeof (window as any)[funcName] === 'function') {
          // Attempt to call the script function
          try {
            (window as any)[funcName]();
            console.log("Invoked Monetag Script");
          } catch (e) {
            console.error("Script invoke error", e);
            tryFallback();
            return;
          }
          
          setViewState('WATCHING');
          startCountdown();
      } 
      // OPTION 2: Fallback to Direct Link (Dynamic Rotation)
      else {
          tryFallback();
      }
  };

  const tryFallback = () => {
      // Use the dynamically fetched link from useEffect
      if (currentFallbackLink) {
          window.open(currentFallbackLink, '_blank');
          setViewState('WATCHING');
          startCountdown();
      } else {
          if (settings.activeProvider === AdProvider.MONETAG && settings.monetagZoneId) {
               console.warn("Script missing and no fallback link.");
               setViewState('WATCHING');
               startCountdown();
          } else {
               setErrorMsg("No Ad Link Configured (Rotation or Manual).");
               setViewState('ERROR');
          }
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
      <div className="bg-gray-800 w-full max-w-sm rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col relative">
          
          <div className="bg-gray-900 p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-white font-bold flex items-center gap-2">
                  <PlayCircle className="text-blue-500" size={20} />
                  Sponsored Task
              </h3>
              <button onClick={onComplete} className="text-gray-500 hover:text-white">
                  <X size={20} />
              </button>
          </div>

          <div className="p-8 flex flex-col items-center justify-center min-h-[300px] text-center">
              
              {viewState === 'LOADING' && (
                  <div className="space-y-4">
                      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                      <p className="text-gray-400 animate-pulse">Loading Ad...</p>
                  </div>
              )}

              {viewState === 'READY' && (
                  <div className="space-y-6 animate-in zoom-in duration-300">
                      <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30 ring-4 ring-blue-600/20">
                          <MousePointerClick className="w-10 h-10 text-white" />
                      </div>
                      <div>
                          <h2 className="text-2xl font-bold text-white mb-2">Watch Ad</h2>
                          <p className="text-gray-400 text-sm">Click below to open the ad and start the timer.</p>
                      </div>
                      <button 
                        onClick={handleShowAd}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2"
                      >
                          OPEN AD
                      </button>
                  </div>
              )}

              {viewState === 'WATCHING' && (
                  <div className="space-y-4">
                      <div className="relative w-20 h-20 mx-auto">
                           <svg className="w-full h-full transform -rotate-90">
                               <circle cx="40" cy="40" r="36" stroke="#374151" strokeWidth="8" fill="none" />
                               <circle cx="40" cy="40" r="36" stroke="#3b82f6" strokeWidth="8" fill="none" strokeDasharray="226" strokeDashoffset={226 - (226 * (15 - countdown) / 15)} className="transition-all duration-1000 ease-linear" />
                           </svg>
                           <span className="absolute inset-0 flex items-center justify-center font-bold text-xl text-white">
                               {countdown}
                           </span>
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-white">Ad in Progress...</h3>
                          <p className="text-gray-400 text-sm">Please wait for the timer.</p>
                      </div>
                      
                      {/* Retry Link */}
                      {currentFallbackLink && (
                          <button 
                            onClick={handleManualOpen}
                            className="text-xs text-blue-400 underline flex items-center justify-center gap-1 mt-2 opacity-80 hover:opacity-100"
                          >
                              Ad didn't open? Click here <ExternalLink size={10} />
                          </button>
                      )}
                  </div>
              )}

              {viewState === 'COMPLETED' && (
                  <div className="space-y-6 animate-in zoom-in">
                      <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
                          <CheckCircle2 className="w-10 h-10 text-white" />
                      </div>
                      <div>
                          <h2 className="text-2xl font-bold text-white">Success!</h2>
                          <p className="text-gray-400 text-sm">Reward Unlocked</p>
                      </div>
                      <button 
                        onClick={onComplete}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg transition"
                      >
                          CLAIM REWARD
                      </button>
                  </div>
              )}

              {viewState === 'ERROR' && (
                  <div className="space-y-4">
                      <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                      <p className="text-red-400 font-medium">{errorMsg}</p>
                      <button 
                        onClick={() => setViewState('READY')}
                        className="text-gray-400 underline text-sm"
                      >
                          Try Again
                      </button>
                  </div>
              )}

          </div>
      </div>
    </div>
  );
};

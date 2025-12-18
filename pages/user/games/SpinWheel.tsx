
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings, AdProvider } from '../../../types';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SpinWheel: React.FC = () => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [result, setResult] = useState<{success: boolean, reward: number, message: string, left: number} | null>(null);
  const [playsLeft, setPlaysLeft] = useState<number | null>(null);
  const [adBlocked, setAdBlocked] = useState(false);
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  useEffect(() => {
    const init = async () => {
        const ads = await getAdSettings();
        setAdSettings(ads);
    };
    init();
  }, [userId]);

  const handleSpin = async () => {
    if (spinning || !userId) return;
    setSpinning(true);
    setResult(null);
    setAdBlocked(false);

    // Visual Spin
    const newRotation = rotation + 1080 + Math.floor(Math.random() * 360);
    setRotation(newRotation);

    setTimeout(() => {
        completeSpin();
    }, 3000);
  };

  const completeSpin = async () => {
    if (!userId) return;

    // 1. Trigger Ad Logic Automatically
    if (adSettings) {
        try {
            // Script Injection (Monetag)
            if (adSettings.activeProvider === AdProvider.MONETAG && adSettings.monetagAdTag) {
                const scriptContainer = document.createElement('div');
                scriptContainer.id = 'ad-injection-' + Date.now();
                document.body.appendChild(scriptContainer);
                
                const range = document.createRange();
                range.selectNode(scriptContainer);
                const fragment = range.createContextualFragment(adSettings.monetagAdTag);
                scriptContainer.appendChild(fragment);
                
                setTimeout(() => {
                    if (document.body.contains(scriptContainer)) {
                        document.body.removeChild(scriptContainer);
                    }
                }, 5000);
            } 
            // Direct Link Opening
            else {
                 const url = adSettings.monetagInterstitialUrl || adSettings.monetagDirectLink || adSettings.adsterraLink;
                 if (url) {
                     const w = window.open(url, '_blank');
                     if (!w || w.closed || typeof w.closed === 'undefined') {
                         setAdBlocked(true);
                     }
                 }
            }
        } catch (e) {
            console.error("Auto-ad trigger failed", e);
        }
    }
    
    // 2. Process Reward
    const res = await playMiniGame(userId, 'spin');
    setResult(res);
    setSpinning(false);
    setPlaysLeft(res.left);
  };

  const openAdManually = () => {
      if (!adSettings) return;
      const url = adSettings.monetagInterstitialUrl || adSettings.monetagDirectLink || adSettings.adsterraLink;
      if (url) window.open(url, '_blank');
      setAdBlocked(false);
  };

  if (!adSettings) return <div className="text-white text-center mt-10">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
        <button onClick={() => navigate('/games')} className="absolute top-4 left-4 text-gray-400 hover:text-white flex items-center gap-2">
            <ArrowLeft /> Back
        </button>

        <h1 className="text-3xl font-bold text-white bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Spin & Win
        </h1>

        <div className="relative">
            {/* Pointer */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[30px] border-t-yellow-400"></div>
            
            {/* Wheel */}
            <div 
                className="w-64 h-64 rounded-full border-8 border-gray-800 shadow-2xl overflow-hidden relative transition-transform duration-[3000ms] ease-out"
                style={{ transform: `rotate(${rotation}deg)`, background: 'conic-gradient(#f43f5e 0deg 60deg, #3b82f6 60deg 120deg, #10b981 120deg 180deg, #eab308 180deg 240deg, #a855f7 240deg 300deg, #f97316 300deg 360deg)' }}
            >
                {/* Center Cap */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full z-10 shadow-lg"></div>
            </div>
        </div>

        <div className="text-center space-y-4">
             {result && (
                 <div className={`text-lg font-bold animate-in fade-in slide-in-from-bottom-2 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                     {result.message}
                 </div>
             )}
             
             {adBlocked && (
                 <div className="bg-orange-500/10 text-orange-400 p-2 rounded text-xs flex items-center justify-center gap-2">
                     <span>Ad Popup was blocked.</span>
                     <button onClick={openAdManually} className="underline font-bold flex items-center gap-1">
                         Open Ad <ExternalLink size={10} />
                     </button>
                 </div>
             )}

             {playsLeft !== null && <p className="text-gray-400 text-sm">Spins left today: {playsLeft}</p>}
             
             <button 
                onClick={handleSpin}
                disabled={spinning}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-12 rounded-full shadow-lg transform transition active:scale-95 text-xl"
             >
                {spinning ? 'Spinning...' : 'SPIN NOW'}
             </button>
        </div>
    </div>
  );
};

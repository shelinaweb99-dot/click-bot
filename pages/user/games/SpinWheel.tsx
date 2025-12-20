
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings, AdProvider } from '../../../types';
import { ArrowLeft, Trophy, Star, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SpinWheel: React.FC = () => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [result, setResult] = useState<{success: boolean, reward: number, message: string, left: number} | null>(null);
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

    const extraRounds = 5 + Math.floor(Math.random() * 5);
    const stopAt = Math.floor(Math.random() * 360);
    const newRotation = rotation + (extraRounds * 360) + stopAt;
    setRotation(newRotation);

    setTimeout(() => {
        completeSpin();
    }, 3500);
  };

  const completeSpin = async () => {
    if (!userId) return;
    if (adSettings) {
        try {
            if (adSettings.activeProvider === AdProvider.MONETAG && adSettings.monetagAdTag) {
                // Background ad injection
            } else {
                 const url = adSettings.monetagInterstitialUrl || adSettings.monetagDirectLink || adSettings.adsterraLink;
                 if (url) window.open(url, '_blank');
            }
        } catch (e) { console.warn(e); }
    }
    
    const res = await playMiniGame(userId, 'spin');
    setResult(res);
    setSpinning(false);
  };

  if (!adSettings) return (
    <div className="h-[calc(100dvh-132px)] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  return (
    <div className="h-[calc(100dvh-132px)] flex flex-col items-center justify-center space-y-6 sm:space-y-8 px-4 relative overflow-hidden">
        <button onClick={() => navigate('/games')} className="absolute top-2 left-0 text-gray-500 hover:text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest p-2 z-50">
            <ArrowLeft size={16} /> Back
        </button>

        <div className="text-center space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">SPIN & WIN</h1>
            <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em]">Fortune favors the bold</p>
        </div>

        <div className="relative scale-90 sm:scale-100">
            {/* The Pin */}
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-30 filter drop-shadow-xl">
                <div className="w-8 h-12 bg-white rounded-t-full rounded-b-lg border-x-4 border-b-8 border-blue-600"></div>
            </div>
            
            {/* The Wheel */}
            <div className="relative p-2 bg-[#1e293b] rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.5)] border-4 border-white/5">
                <div 
                    className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border-8 border-[#0b1120] overflow-hidden relative transition-transform duration-[3500ms] cubic-bezier(0.15, 0, 0.15, 1)"
                    style={{ transform: `rotate(${rotation}deg)`, background: 'conic-gradient(#ef4444 0deg 45deg, #3b82f6 45deg 90deg, #10b981 90deg 135deg, #f59e0b 135deg 180deg, #8b5cf6 180deg 225deg, #ec4899 225deg 270deg, #06b6d4 270deg 315deg, #6366f1 315deg 360deg)' }}
                >
                    <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,black_100%)]"></div>
                </div>
                {/* Center Hub */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#0b1120] rounded-full z-20 shadow-2xl flex items-center justify-center border-4 border-blue-600/50">
                    <Star className="text-white fill-white" size={18} />
                </div>
            </div>
        </div>

        <button 
            onClick={handleSpin}
            disabled={spinning}
            className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-[0.3em] py-4 sm:py-6 rounded-[2rem] shadow-2xl shadow-blue-900/40 active:scale-95 transition-all border border-blue-400/10"
        >
            {spinning ? 'GOOD LUCK...' : 'SPIN FOR POINTS'}
        </button>

        {/* REWARD MODAL */}
        {result && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-[#1e293b] w-full max-w-sm rounded-[2.5rem] border border-white/5 p-8 sm:p-10 text-center space-y-6 sm:space-y-8 animate-in zoom-in duration-500 shadow-2xl">
                    <div className="relative mx-auto w-24 h-24 sm:w-32 sm:h-32">
                        <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                        <div className="bg-blue-600/10 w-full h-full rounded-full flex items-center justify-center border border-blue-500/20 shadow-inner">
                            <Trophy size={48} className="text-blue-500 drop-shadow-lg" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">JACKPOT!</h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Rewards Transferred</p>
                    </div>
                    <div className="bg-white/5 py-4 rounded-2xl border border-white/5">
                        <span className="text-4xl sm:text-5xl font-black text-blue-500 tracking-tighter">+{result.reward}</span>
                        <span className="text-xs font-black text-blue-400/60 uppercase ml-2 italic">Pts</span>
                    </div>
                    <button onClick={() => setResult(null)} className="w-full bg-blue-600 py-4 sm:py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-blue-900/30 active:scale-95 transition-all">
                        Collect Reward
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

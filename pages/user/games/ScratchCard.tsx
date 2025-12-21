
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings } from '../../../types';
import { AdSimulator } from '../../../components/AdSimulator';
import { ArrowLeft, Gift, Sparkles, Trophy, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ScratchCard: React.FC = () => {
  const [scratched, setScratched] = useState(false);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false);
  const [result, setResult] = useState<{success: boolean, reward: number, message: string, left: number} | null>(null);
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  useEffect(() => {
    const init = async () => {
        const ads = await getAdSettings();
        setAdSettings(ads);
    };
    init();
  }, []);

  const handleScratch = async () => {
      if (scratched || loadingGame || !userId) return;
      setLoadingGame(true);
      try {
          const res = await playMiniGame(userId, 'scratch');
          setResult(res);
          setScratched(true);
      } catch (e) {
          alert("Error connecting to server.");
      } finally {
          setLoadingGame(false);
      }
  };

  if (!adSettings) return (
    <div className="h-[calc(100vh-160px)] flex items-center justify-center bg-[#030712]">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-160px)] w-full flex flex-col items-center py-6 px-4 bg-[#030712] animate-in fade-in duration-500">
        <div className="w-full max-w-md flex flex-col items-center space-y-8">
            <button onClick={() => navigate('/games')} className="self-start text-gray-500 hover:text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-colors">
                <ArrowLeft size={16} /> Exit Game
            </button>

            <div className="text-center">
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase">LUCKY REVEAL</h1>
                <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Tap to reveal prize</p>
            </div>

            <div 
                onClick={handleScratch}
                className={`w-full aspect-square max-w-[300px] rounded-[3rem] flex flex-col items-center justify-center relative transition-all duration-500 cursor-pointer border
                ${scratched 
                    ? 'bg-gray-900 border-white/5 shadow-inner' 
                    : 'bg-emerald-600 border-emerald-400/40 shadow-2xl active:scale-[0.98]'}`}
            >
                {scratched ? (
                    <div className="text-center space-y-4 animate-in zoom-in duration-500">
                        <div className="bg-emerald-600/10 p-8 rounded-full border border-emerald-500/20 mx-auto w-fit">
                            <Trophy className="text-emerald-500 w-16 h-16" />
                        </div>
                        <h3 className="text-4xl font-black text-white tracking-tighter">+{result?.reward || 0} Pts</h3>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        {loadingGame ? (
                            <Loader2 className="animate-spin text-white w-12 h-12 mx-auto" />
                        ) : (
                            <>
                                <div className="bg-white/10 p-10 rounded-[2.5rem] backdrop-blur-md border border-white/20">
                                    <Gift className="text-white w-12 h-12" />
                                </div>
                                <p className="text-white font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">REVEAL NOW</p>
                            </>
                        )}
                    </div>
                )}
            </div>

            <p className="text-gray-700 text-[9px] font-black uppercase text-center tracking-widest">
                Safe & Synchronized &bull; 2025 Bot Engine
            </p>
        </div>

        {result && scratched && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] border border-white/5 p-10 text-center space-y-8 shadow-2xl">
                    <div className="w-24 h-24 bg-emerald-600/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                        <Sparkles size={48} className="text-emerald-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">CONGRATS!</h2>
                    <div className="bg-black/60 py-6 rounded-[2rem] border border-white/5">
                        <span className="text-5xl font-black text-emerald-500 tracking-tighter">+{result.reward}</span>
                        <span className="text-xs text-gray-700 uppercase italic ml-2">Pts</span>
                    </div>
                    <button onClick={() => { setResult(null); setShowAd(true); }} className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-2xl active:scale-95 border border-emerald-400/20">
                        COLLECT REWARD
                    </button>
                </div>
            </div>
        )}

        <AdSimulator isOpen={showAd} onComplete={() => setShowAd(false)} settings={adSettings} />
    </div>
  );
};

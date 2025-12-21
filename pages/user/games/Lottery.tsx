
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings } from '../../../types';
import { AdSimulator } from '../../../components/AdSimulator';
import { ArrowLeft, Box, Gem, Trophy, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Lottery: React.FC = () => {
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false);
  const [result, setResult] = useState<{success: boolean, reward: number, message: string, left: number} | null>(null);
  const [activeBox, setActiveBox] = useState<number | null>(null);
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  useEffect(() => {
    const init = async () => {
        const ads = await getAdSettings();
        setAdSettings(ads);
    };
    init();
  }, []);

  const handlePick = async (boxId: number) => {
      if (loadingGame || !userId) return;
      setActiveBox(boxId);
      setLoadingGame(true);
      try {
          const res = await playMiniGame(userId, 'lottery');
          setResult(res);
      } catch (e) {
          alert("Connection lost.");
      } finally {
          setLoadingGame(false);
          setActiveBox(null);
      }
  };

  if (!adSettings) return (
    <div className="h-[calc(100vh-160px)] flex items-center justify-center bg-[#030712]">
        <Loader2 className="animate-spin text-cyan-500" size={32} />
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-160px)] w-full flex flex-col items-center py-6 px-4 bg-[#030712] animate-in fade-in duration-500">
        <div className="w-full max-w-md flex flex-col items-center space-y-8">
            <button onClick={() => navigate('/games')} className="self-start text-gray-500 hover:text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-colors">
                <ArrowLeft size={16} /> Back
            </button>

            <div className="text-center">
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase">TREASURE BOX</h1>
                <p className="text-cyan-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Choose your chest</p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-[320px]">
                {[1, 2, 3, 4].map((box) => (
                    <button 
                        key={box}
                        onClick={() => handlePick(box)}
                        disabled={loadingGame}
                        className={`aspect-square bg-gray-900 border rounded-[2.5rem] flex flex-col items-center justify-center transition-all group active:scale-95 shadow-2xl
                        ${activeBox === box ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 hover:border-white/20'}`}
                    >
                        <div className={`p-5 rounded-2xl mb-2 transition-all ${activeBox === box ? 'scale-110' : 'group-hover:scale-105'}`}>
                            {activeBox === box ? (
                                <Loader2 className="animate-spin text-cyan-500" size={32} />
                            ) : (
                                <Box size={32} className="text-cyan-500" />
                            )}
                        </div>
                        <span className="text-gray-600 font-black text-[10px] uppercase tracking-widest">Chest {box}</span>
                    </button>
                ))}
            </div>

            <div className="bg-gray-900/40 p-5 rounded-[2rem] border border-white/5 text-center w-full">
                <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest leading-relaxed">
                    Pick a chest to reveal your hidden USDT-Pts reward.
                </p>
            </div>
        </div>

        {result && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] border border-white/5 p-10 text-center space-y-8 shadow-2xl">
                    <div className="w-24 h-24 bg-cyan-600/10 rounded-full flex items-center justify-center mx-auto border border-cyan-500/20">
                        <Gem size={44} className="text-cyan-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">JACKPOT!</h2>
                    <div className="bg-black/60 py-6 rounded-[2rem] border border-white/5">
                        <p className="text-5xl font-black text-cyan-500 tabular-nums tracking-tighter">+{result.reward}</p>
                        <p className="text-[10px] text-gray-700 font-black uppercase mt-1">Points Recovered</p>
                    </div>
                    <button 
                        onClick={() => { setResult(null); setShowAd(true); }} 
                        className="w-full bg-cyan-600 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-2xl active:scale-95 transition-all border border-cyan-400/20"
                    >
                        COLLECT ASSETS
                    </button>
                </div>
            </div>
        )}

        <AdSimulator isOpen={showAd} onComplete={() => setShowAd(false)} settings={adSettings} />
    </div>
  );
};

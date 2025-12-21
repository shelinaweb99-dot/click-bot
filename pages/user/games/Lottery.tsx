
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings } from '../../../types';
import { AdSimulator } from '../../../components/AdSimulator';
import { ArrowLeft, Box, Gem, Sparkles, Trophy, Loader2, Key } from 'lucide-react';
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
      if (loadingGame) return;
      setActiveBox(boxId);
      setLoadingGame(true);
      
      // Build tension
      await new Promise(r => setTimeout(r, 800));

      if (!userId) return;
      try {
          const res = await playMiniGame(userId, 'lottery');
          setResult(res);
      } catch (e) {
          alert("Server disconnected.");
      } finally {
          setLoadingGame(false);
          setActiveBox(null);
      }
  };

  const handleCollect = () => {
      setResult(null);
      setShowAd(true);
  };

  const onAdComplete = () => {
      setShowAd(false);
  };

  if (!adSettings) return (
    <div className="h-[calc(100dvh-160px)] flex items-center justify-center bg-[#030712]">
        <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  return (
    <div className="h-[calc(100dvh-160px)] w-full flex flex-col items-center justify-between py-4 px-4 relative overflow-hidden bg-[#030712]">
        <button onClick={() => navigate('/games')} className="absolute top-0 left-0 text-gray-500 hover:text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest p-6 z-50 transition-colors">
            <ArrowLeft size={16} /> Quit Game
        </button>

        <div className="text-center space-y-1 mt-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/20 mb-2">
                <Key size={12} className="text-cyan-500" />
                <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">Treasure Hunt</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">TREASURE BOX</h1>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">Pick your payout chest</p>
        </div>

        <div className="flex-1 flex items-center justify-center w-full min-h-0 py-2">
            <div className="grid grid-cols-2 gap-5 w-full max-w-[300px] scale-[0.9] sm:scale-100 origin-center relative">
                {/* Background Accent */}
                <div className="absolute inset-0 bg-blue-500/5 blur-[100px] rounded-full -z-10"></div>
                
                {[1, 2, 3, 4].map((box) => (
                    <button 
                        key={box}
                        onClick={() => handlePick(box)}
                        disabled={loadingGame}
                        className={`aspect-square bg-[#111827] border rounded-[2rem] flex flex-col items-center justify-center transition-all group active:scale-95 shadow-2xl relative overflow-hidden
                        ${activeBox === box ? 'border-cyan-500 ring-2 ring-cyan-500/20 animate-pulse' : 'border-white/5 hover:border-cyan-500/40'}`}
                    >
                        <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className={`bg-[#030712] p-5 rounded-2xl mb-3 border border-white/5 transition-all
                            ${activeBox === box ? 'scale-110 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'group-hover:scale-110 group-hover:-rotate-6'}`}>
                            {activeBox === box ? (
                                <Loader2 className="animate-spin text-cyan-500" size={32} />
                            ) : (
                                <Box size={32} className="text-cyan-500 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
                            )}
                        </div>
                        <span className="text-gray-600 group-hover:text-cyan-400 font-black text-[9px] uppercase tracking-[0.2em] transition-colors">CHEST {box}</span>
                        
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none bg-gradient-to-tr from-transparent via-white to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-[#111827] p-5 rounded-[1.8rem] border border-white/5 text-center max-w-[280px] mb-6 shadow-xl">
            <p className="text-gray-600 text-[8px] font-black uppercase tracking-[0.3em] leading-relaxed">
                One chest contains the Jackpot. <br/>Trust your intuition &bull; 2025 Edition
            </p>
        </div>

        {/* REWARD MODAL - LUXURY FEEL */}
        {result && (
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-[#111827] w-full max-w-sm rounded-[3rem] border border-cyan-500/20 p-10 text-center space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
                    
                    <div className="relative">
                        <Sparkles className="text-cyan-500 absolute -top-8 -left-8 animate-pulse" size={32} />
                        <div className="bg-cyan-600/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto border border-cyan-500/20 shadow-inner relative z-10">
                            <Gem size={44} className="text-cyan-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                        </div>
                        <Sparkles className="text-cyan-400 absolute -bottom-8 -right-8 animate-pulse delay-150" size={32} />
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">TREASURE FOUND!</h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 opacity-60 italic">Encrypted Assets Recovered</p>
                    </div>

                    <div className="bg-[#030712] py-6 rounded-[2rem] border border-white/5">
                        <p className="text-5xl font-black text-cyan-500 tabular-nums tracking-tighter drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                            +{result.reward} <span className="text-xs text-gray-700 uppercase italic ml-1">Pts</span>
                        </p>
                    </div>

                    <button 
                        onClick={handleCollect} 
                        className="w-full bg-cyan-600 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-2xl shadow-cyan-900/40 active:scale-95 transition-all border border-cyan-400/20"
                    >
                        COLLECT ASSETS
                    </button>
                </div>
            </div>
        )}

        <AdSimulator isOpen={showAd} onComplete={onAdComplete} settings={adSettings} />
    </div>
  );
};

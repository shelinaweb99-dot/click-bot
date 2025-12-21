
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings } from '../../../types';
import { AdSimulator } from '../../../components/AdSimulator';
import { ArrowLeft, Gift, Sparkles, Trophy, Loader2, Wand2 } from 'lucide-react';
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
      if (scratched || loadingGame) return;
      setLoadingGame(true);
      if (!userId) return;
      
      // Build anticipation
      await new Promise(r => setTimeout(r, 600));

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

  const handleCollect = () => {
      setResult(null);
      setShowAd(true);
  };

  const onAdComplete = () => {
      setShowAd(false);
      setScratched(false);
  };

  if (!adSettings) return (
    <div className="h-[calc(100dvh-160px)] flex items-center justify-center bg-[#030712]">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
    </div>
  );

  return (
    <div className="h-[calc(100dvh-160px)] w-full flex flex-col items-center justify-between py-4 px-4 relative overflow-hidden bg-[#030712]">
        <button onClick={() => navigate('/games')} className="absolute top-0 left-0 text-gray-500 hover:text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest p-6 z-50 transition-colors">
            <ArrowLeft size={16} /> Dashboard
        </button>

        <div className="text-center space-y-1 mt-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-2">
                <Wand2 size={12} className="text-emerald-500" />
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Magic Scratch</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">LUCKY REVEAL</h1>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">Reveal your fortune</p>
        </div>

        <div className="flex-1 flex items-center justify-center w-full min-h-0 py-4">
            <div className="relative group w-full max-w-[300px] scale-[0.9] sm:scale-100 origin-center">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-emerald-500/10 blur-[80px] rounded-full opacity-50"></div>

                {/* The Card - Refined Aesthetic */}
                <div 
                    onClick={handleScratch}
                    className={`aspect-square w-full rounded-[3rem] p-6 flex flex-col items-center justify-center relative transition-all duration-700 cursor-pointer overflow-hidden border
                    ${scratched 
                        ? 'bg-[#111827] border-emerald-500/20 shadow-[0_30px_100px_rgba(0,0,0,0.6)]' 
                        : 'bg-emerald-600 border-emerald-400/40 shadow-2xl group-active:scale-[0.97]'}`}
                >
                    {scratched ? (
                        <div className="text-center space-y-6 animate-in zoom-in duration-500">
                            <div className="relative">
                                <Sparkles className="text-emerald-500 absolute -top-8 -left-8 animate-bounce" size={28} />
                                <div className="bg-emerald-600/10 p-8 rounded-full border border-emerald-500/20">
                                    <Trophy className="text-emerald-500 w-20 h-20 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
                                </div>
                                <Sparkles className="text-emerald-500 absolute -bottom-8 -right-8 animate-bounce delay-150" size={28} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.3em] mb-1">Prize Unlocked</p>
                                <h3 className="text-5xl font-black text-emerald-500 tracking-tighter">+{result?.reward || 0} <span className="text-[10px] uppercase text-gray-700 italic ml-1">Pts</span></h3>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-6">
                            {loadingGame ? (
                                <div className="space-y-4">
                                    <Loader2 className="animate-spin text-white w-16 h-16 mx-auto opacity-50" />
                                    <p className="text-white/40 font-black text-[9px] uppercase tracking-widest animate-pulse">Scanning Grid...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white/10 p-10 rounded-[2.5rem] backdrop-blur-md border border-white/20 shadow-xl group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                                        <Gift className="text-white w-16 h-16 drop-shadow-lg" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-white font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">Tap To Scratch</p>
                                        <p className="text-emerald-200/40 text-[8px] font-bold uppercase tracking-widest italic">Win up to 500 Pts</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    
                    {/* Artistic Overlay Texture */}
                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(circle_at_center,white_1px,transparent_0)] bg-[size:16px_16px]"></div>
                    <div className="absolute inset-0 opacity-10 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none"></div>
                </div>
            </div>
        </div>

        <div className="w-full max-w-[280px] pb-6">
            <p className="text-gray-700 text-[8px] font-black uppercase text-center tracking-[0.3em] italic">
                System-synced &bull; Anti-fraud protected
            </p>
        </div>

        {/* REWARD MODAL - POLISHED */}
        {result && scratched && (
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-[#111827] w-full max-w-sm rounded-[3rem] border border-emerald-500/20 p-10 text-center space-y-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/30"></div>
                    <div className="w-24 h-24 bg-emerald-600/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner">
                        <Trophy size={48} className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">REWARD REVEALED!</h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 opacity-60 italic">Ready for transfer to node</p>
                    </div>
                    <div className="bg-[#030712] py-6 rounded-[2rem] border border-white/5">
                        <span className="text-5xl font-black text-emerald-500 tabular-nums tracking-tighter">+{result.reward}</span>
                        <span className="text-xs text-gray-700 uppercase italic ml-2">Pts</span>
                    </div>
                    <button onClick={handleCollect} className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-2xl active:scale-95 transition-all border border-emerald-400/20">
                        COLLECT POINTS
                    </button>
                </div>
            </div>
        )}

        <AdSimulator isOpen={showAd} onComplete={onAdComplete} settings={adSettings} />
    </div>
  );
};

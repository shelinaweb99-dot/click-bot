
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
      if (scratched || loadingGame) return;
      setLoadingGame(true);
      if (!userId) return;
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
    <div className="h-[calc(100dvh-160px)] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
    </div>
  );

  return (
    <div className="h-[calc(100dvh-160px)] w-full flex flex-col items-center justify-between py-4 px-4 relative overflow-hidden">
        <button onClick={() => navigate('/games')} className="absolute top-0 left-0 text-gray-500 hover:text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest p-4 z-50">
            <ArrowLeft size={16} /> Back
        </button>

        <div className="text-center space-y-1 mt-6">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">LUCKY REVEAL</h1>
            <p className="text-emerald-500 text-[9px] font-black uppercase tracking-[0.3em]">Instant reward scratcher</p>
        </div>

        <div className="flex-1 flex items-center justify-center w-full min-h-0 py-4">
            <div className="relative group w-full max-w-[280px] scale-[0.9] sm:scale-100 origin-center">
                {/* The Card */}
                <div 
                onClick={handleScratch}
                className={`aspect-square w-full rounded-[2.5rem] p-4 flex flex-col items-center justify-center relative transition-all duration-700 cursor-pointer overflow-hidden ${
                    scratched 
                    ? 'bg-white shadow-[0_0_50px_rgba(16,185,129,0.2)]' 
                    : 'bg-emerald-600 shadow-2xl group-active:scale-95'
                }`}
                >
                    {scratched ? (
                        <div className="text-center space-y-4 animate-in zoom-in duration-500">
                            <div className="relative">
                                <Sparkles className="text-emerald-500 absolute -top-4 -left-4 animate-bounce" size={24} />
                                <Trophy className="text-emerald-500 w-20 h-20 mx-auto" />
                                <Sparkles className="text-emerald-500 absolute -bottom-4 -right-4 animate-bounce delay-100" size={24} />
                            </div>
                            <div>
                                <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest mb-1">Claim Your Prize</p>
                                <h3 className="text-4xl font-black text-emerald-600 tracking-tighter">+{result?.reward || 0}</h3>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-4">
                            {loadingGame ? (
                                <Loader2 className="animate-spin text-white w-16 h-16 mx-auto" />
                            ) : (
                                <>
                                    <div className="bg-white/20 p-8 rounded-full backdrop-blur-md border border-white/20">
                                        <Gift className="text-white w-16 h-16" />
                                    </div>
                                    <p className="text-white font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Tap To Scratch</p>
                                </>
                            )}
                        </div>
                    )}
                    
                    {/* Overlay Texture */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] bg-[size:24px_24px]"></div>
                </div>
            </div>
        </div>

        <div className="w-full max-w-[280px] pb-4">
            <p className="text-gray-600 text-[8px] font-black uppercase text-center tracking-widest">
                Daily limits apply. Rewards sync instantly to your wallet.
            </p>
        </div>

        {/* REWARD MODAL */}
        {result && scratched && (
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-[#1e293b] w-full max-w-sm rounded-[3rem] border border-emerald-500/20 p-10 text-center space-y-8 shadow-2xl">
                    <div className="w-24 h-24 bg-emerald-600/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                        <Trophy size={48} className="text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">REWARD REVEALED!</h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Ready for transfer</p>
                    </div>
                    <div className="text-5xl font-black text-emerald-500 tabular-nums tracking-tighter">
                        +{result.reward} <span className="text-sm text-gray-700 uppercase">Pts</span>
                    </div>
                    <button onClick={handleCollect} className="w-full bg-emerald-600 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl active:scale-95 transition-all">
                        Collect Points
                    </button>
                </div>
            </div>
        )}

        <AdSimulator isOpen={showAd} onComplete={onAdComplete} settings={adSettings} />
    </div>
  );
};

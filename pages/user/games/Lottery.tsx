
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings } from '../../../types';
import { AdSimulator } from '../../../components/AdSimulator';
import { ArrowLeft, Box, Gem, Sparkles, Trophy, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Lottery: React.FC = () => {
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

  const handlePick = async () => {
      if (loadingGame) return;
      setLoadingGame(true);
      if (!userId) return;
      try {
          const res = await playMiniGame(userId, 'lottery');
          setResult(res);
      } catch (e) {
          alert("Server disconnected.");
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
  };

  if (!adSettings) return (
    <div className="h-[calc(100dvh-160px)] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  return (
    <div className="h-[calc(100dvh-160px)] w-full flex flex-col items-center justify-between py-4 px-4 relative overflow-hidden">
        <button onClick={() => navigate('/games')} className="absolute top-0 left-0 text-gray-500 hover:text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest p-4 z-50">
            <ArrowLeft size={16} /> Back
        </button>

        <div className="text-center space-y-1 mt-6">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">TREASURE BOX</h1>
            <p className="text-blue-500 text-[9px] font-black uppercase tracking-[0.3em]">Hunt for hidden assets</p>
        </div>

        <div className="flex-1 flex items-center justify-center w-full min-h-0 py-2">
            <div className="grid grid-cols-2 gap-4 w-full max-w-[280px] scale-[0.9] sm:scale-100 origin-center">
                {[1, 2, 3, 4].map((box) => (
                    <button 
                        key={box}
                        onClick={handlePick}
                        disabled={loadingGame}
                        className="aspect-square bg-[#1e293b] hover:bg-blue-600/10 border border-white/5 hover:border-blue-500/50 rounded-[1.8rem] flex flex-col items-center justify-center transition-all group active:scale-90 shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="bg-[#0b1120] p-4 rounded-2xl mb-2 border border-white/5 group-hover:scale-110 group-hover:-rotate-6 transition-all">
                            {loadingGame ? <Loader2 className="animate-spin text-blue-500" size={24} /> : <Box size={28} className="text-blue-500" />}
                        </div>
                        <span className="text-gray-500 group-hover:text-blue-400 font-black text-[8px] uppercase tracking-widest">Chest {box}</span>
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-white/5 p-4 rounded-[1.5rem] border border-white/5 text-center max-w-[280px] mb-4">
            <p className="text-gray-600 text-[8px] font-black uppercase tracking-widest leading-relaxed">
                Choose wisely. Only one box contains the grand prize, but all boxes yield points.
            </p>
        </div>

        {/* REWARD MODAL */}
        {result && (
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-[#1e293b] w-full max-w-sm rounded-[3rem] border border-blue-500/20 p-10 text-center space-y-8 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                    <div className="relative">
                        <Sparkles className="text-blue-500 absolute -top-4 -left-4 animate-pulse" size={24} />
                        <div className="bg-blue-600/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto border border-blue-500/20 shadow-inner">
                            <Gem size={40} className="text-blue-500" />
                        </div>
                        <Sparkles className="text-blue-400 absolute -bottom-4 -right-4 animate-pulse delay-75" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">TREASURE FOUND!</h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Safe & Encrypted Reward</p>
                    </div>
                    <div className="text-5xl font-black text-blue-500 tabular-nums tracking-tighter">
                        +{result.reward} <span className="text-sm text-gray-700 uppercase">Pts</span>
                    </div>
                    <button onClick={handleCollect} className="w-full bg-blue-600 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-blue-900/30 active:scale-95 transition-all">
                        Collect Assets
                    </button>
                </div>
            </div>
        )}

        <AdSimulator isOpen={showAd} onComplete={onAdComplete} settings={adSettings} />
    </div>
  );
};

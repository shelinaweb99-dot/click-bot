
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings } from '../../../types';
import { AdSimulator } from '../../../components/AdSimulator';
import { ArrowLeft, Gift, Sparkles, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ScratchCard: React.FC = () => {
  const [scratched, setScratched] = useState(false);
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [showAd, setShowAd] = useState(false);
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

  const handleScratch = () => {
      if (scratched) return;
      setShowAd(true);
  };

  const onAdComplete = async () => {
    setShowAd(false);
    if (!userId) return;
    const res = await playMiniGame(userId, 'scratch');
    setResult(res);
    setScratched(true);
  };

  if (!adSettings) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] space-y-10 px-4 relative">
        <button onClick={() => navigate('/games')} className="absolute top-0 left-0 text-gray-500 hover:text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest p-2">
            <ArrowLeft size={16} /> Back
        </button>

        <div className="text-center space-y-1">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">LUCKY REVEAL</h1>
            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">Reveal your secret bonus</p>
        </div>

        <div className="relative group w-full max-w-[300px]">
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
                    <div className="text-center space-y-6 animate-in zoom-in duration-500">
                        <div className="relative">
                            <Sparkles className="text-emerald-500 absolute -top-4 -left-4 animate-bounce" size={24} />
                            <Trophy className="text-emerald-500 w-24 h-24 mx-auto" />
                            <Sparkles className="text-emerald-500 absolute -bottom-4 -right-4 animate-bounce delay-100" size={24} />
                        </div>
                        <div>
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">You Found</p>
                            <h3 className="text-5xl font-black text-emerald-600 tracking-tighter">+{result?.reward || 0}</h3>
                            <p className="text-emerald-500/50 font-black italic text-sm mt-1 uppercase">USDT-PTS</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="bg-white/20 p-8 rounded-full backdrop-blur-md border border-white/20">
                            <Gift className="text-white w-20 h-20" />
                        </div>
                        <p className="text-white font-black text-xs uppercase tracking-[0.2em] animate-pulse">Tap To Reveal</p>
                    </div>
                )}
                
                {/* Overlay Texture */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] bg-[size:24px_24px]"></div>
            </div>
        </div>

        {scratched && (
            <button 
                onClick={() => { setScratched(false); setResult(null); }}
                className="w-full max-w-[300px] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-[0.3em] py-5 rounded-[2rem] shadow-xl shadow-emerald-900/20 active:scale-95 transition-all"
            >
                Try Another Card
            </button>
        )}

        <AdSimulator isOpen={showAd} onComplete={onAdComplete} settings={adSettings} />
    </div>
  );
};

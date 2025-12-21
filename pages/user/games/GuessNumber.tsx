
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings } from '../../../types';
import { AdSimulator } from '../../../components/AdSimulator';
import { ArrowLeft, Lock, Unlock, Trophy, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const GuessNumber: React.FC = () => {
  const [guess, setGuess] = useState('');
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

  const handleKeyPress = (num: string) => {
      if (loadingGame) return;
      setGuess(num);
  };

  const handleUnlock = async () => {
      if (!guess || loadingGame || !userId) return;
      setLoadingGame(true);
      try {
          const res = await playMiniGame(userId, 'guess');
          setResult(res);
      } catch (e) {
          alert("Connection error. Please try again.");
      } finally {
          setLoadingGame(false);
      }
  };

  const handleCollect = () => {
      setResult(null);
      setGuess('');
      setShowAd(true);
  };

  if (!adSettings) return (
    <div className="h-[calc(100vh-160px)] flex items-center justify-center bg-[#030712]">
        <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-160px)] w-full flex flex-col items-center py-6 px-4 bg-[#030712] animate-in fade-in duration-500">
        <div className="w-full max-w-md flex flex-col items-center space-y-8">
            <button onClick={() => navigate('/games')} className="self-start text-gray-500 hover:text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-colors mb-4">
                <ArrowLeft size={16} /> Back to Games
            </button>

            <div className="text-center space-y-2">
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase">VAULT BREAKER</h1>
                <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em]">Select a Key to Breach</p>
            </div>

            <div className="w-full bg-gray-900/40 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
                
                {/* Display Area */}
                <div className="bg-black/60 p-8 rounded-[2rem] border border-white/5 text-center shadow-inner relative group">
                    <div className="absolute top-3 left-1/2 -translate-x-1/2">
                        {guess ? <Unlock className="text-blue-500" size={16} /> : <Lock className="text-gray-700" size={16} />}
                    </div>
                    <div className="text-6xl font-black text-white font-mono tracking-tighter">
                        {guess || '0'}
                    </div>
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-2">Authenticated Input</p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button 
                            key={num}
                            onClick={() => handleKeyPress(num.toString())}
                            className={`aspect-square rounded-2xl flex items-center justify-center text-2xl font-black transition-all active:scale-90 border
                            ${guess === num.toString() 
                                ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-600/20' 
                                : 'bg-black/40 border-white/5 text-gray-500 hover:text-white'}`}
                        >
                            {num}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={handleUnlock}
                    disabled={!guess || loadingGame}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-[0.3em] py-5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-blue-400/20"
                >
                    {loadingGame ? <Loader2 className="animate-spin" size={18} /> : 'BREACH VAULT'}
                </button>
            </div>

            <div className="flex items-center gap-2 text-gray-700 text-[9px] font-black uppercase tracking-widest">
                <ShieldCheck size={12} /> Secure Connection Verified
            </div>
        </div>

        {/* Result Modal */}
        {result && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] border border-white/5 p-10 text-center space-y-8 shadow-2xl">
                    <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                        <Trophy size={48} className="text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">SUCCESS!</h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2">Vault Assets Recovered</p>
                    </div>
                    <div className="bg-black/60 py-6 rounded-[2rem] border border-white/5">
                        <p className="text-5xl font-black text-blue-500 tracking-tighter">+{result.reward}</p>
                        <p className="text-[10px] text-gray-700 font-black uppercase mt-1">Points Earned</p>
                    </div>
                    <button 
                        onClick={handleCollect} 
                        className="w-full bg-blue-600 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-2xl active:scale-95 transition-all border border-blue-400/20"
                    >
                        COLLECT REWARD
                    </button>
                </div>
            </div>
        )}

        <AdSimulator isOpen={showAd} onComplete={() => setShowAd(false)} settings={adSettings} />
    </div>
  );
};

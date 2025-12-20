
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings } from '../../../types';
import { AdSimulator } from '../../../components/AdSimulator';
import { ArrowLeft, Lock, Unlock, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const GuessNumber: React.FC = () => {
  const [guess, setGuess] = useState('');
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

  const handleKeyPress = (num: string) => {
      if (guess.length < 1) setGuess(num);
  };

  const handleUnlock = () => {
      if (!guess) return;
      setShowAd(true);
  };

  const onAdComplete = async () => {
    setShowAd(false);
    if (!userId) return;
    const res = await playMiniGame(userId, 'guess');
    setResult(res);
  };

  if (!adSettings) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] space-y-8 px-4 relative">
        <button onClick={() => navigate('/games')} className="absolute top-0 left-0 text-gray-500 hover:text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest p-2">
            <ArrowLeft size={16} /> Back
        </button>

        <div className="text-center space-y-1">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">VAULT BREAKER</h1>
            <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em]">Pick 1 Number to crack it</p>
        </div>

        <div className="w-full max-w-[320px] bg-[#1e293b] p-8 rounded-[3rem] border border-white/5 shadow-2xl space-y-8">
            {/* Display */}
            <div className="bg-[#0b1120] p-6 rounded-[2rem] border border-white/5 text-center shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-orange-500/30"></div>
                <div className="flex items-center justify-center gap-4 mb-2">
                    {guess ? <Unlock className="text-orange-500 animate-pulse" size={24} /> : <Lock className="text-gray-700" size={24} />}
                </div>
                <div className="text-4xl font-black text-white font-mono tracking-widest">
                    {guess || '0'}
                </div>
                <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mt-3">Target: 1 - 9</p>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button 
                      key={num}
                      onClick={() => handleKeyPress(num.toString())}
                      className={`aspect-square rounded-2xl flex items-center justify-center text-xl font-black transition-all active:scale-90 border border-white/5 ${guess === num.toString() ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/30' : 'bg-[#0b1120] text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        {num}
                    </button>
                ))}
            </div>

            <button 
              onClick={handleUnlock}
              disabled={!guess}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl transition-all active:scale-95"
            >
                BREACH VAULT
            </button>
        </div>

        {/* WIN MODAL */}
        {result && (
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-[#1e293b] w-full max-w-sm rounded-[3rem] border border-orange-500/20 p-10 text-center space-y-6 shadow-2xl">
                    <div className="w-24 h-24 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto border border-orange-500/20">
                        <Trophy size={48} className="text-orange-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">VAULT CRACKED</h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">Reward Claimed</p>
                    </div>
                    <div className="text-5xl font-black text-orange-500 tabular-nums tracking-tighter">
                        +{result.reward} <span className="text-sm text-gray-700">Pts</span>
                    </div>
                    <button onClick={() => {setResult(null); setGuess('');}} className="w-full bg-orange-600 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl active:scale-95 transition-all">
                        Reset System
                    </button>
                </div>
            </div>
        )}

        <AdSimulator isOpen={showAd} onComplete={onAdComplete} settings={adSettings} />
    </div>
  );
};

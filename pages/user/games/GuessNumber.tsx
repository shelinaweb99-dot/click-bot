
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings } from '../../../types';
import { AdSimulator } from '../../../components/AdSimulator';
import { ArrowLeft, Lock, Unlock, Trophy, Loader2, ShieldAlert, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const GuessNumber: React.FC = () => {
  const [guess, setGuess] = useState('');
  const [adSettings, setAdSettings] = useState<AdSettings | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [loadingGame, setLoadingGame] = useState(false);
  const [result, setResult] = useState<{success: boolean, reward: number, message: string, left: number} | null>(null);
  const [hackingSequence, setHackingSequence] = useState(false);
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
      if (hackingSequence || loadingGame) return;
      // Add a slight delay for "haptic" feel
      setGuess(num);
  };

  const handleUnlock = async () => {
      if (!guess || loadingGame) return;
      setHackingSequence(true);
      
      // Artificial hacking sequence for "Professional" feel
      await new Promise(r => setTimeout(r, 1200));

      if (!userId) return;
      setLoadingGame(true);
      try {
          const res = await playMiniGame(userId, 'guess');
          setResult(res);
      } catch (e) {
          alert("Security sync failed.");
      } finally {
          setLoadingGame(false);
          setHackingSequence(false);
      }
  };

  const handleCollect = () => {
      setResult(null);
      setGuess('');
      setShowAd(true);
  };

  const onAdComplete = () => {
      setShowAd(false);
  };

  if (!adSettings) return (
    <div className="h-[calc(100dvh-160px)] flex items-center justify-center bg-[#030712]">
        <Loader2 className="animate-spin text-orange-500" size={32} />
    </div>
  );

  return (
    <div className="h-[calc(100dvh-160px)] w-full flex flex-col items-center justify-between py-4 px-4 relative overflow-hidden bg-[#030712]">
        <button onClick={() => navigate('/games')} className="absolute top-0 left-0 text-gray-500 hover:text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest p-6 z-50 transition-colors">
            <ArrowLeft size={16} /> Exit Terminal
        </button>

        <div className="text-center space-y-1 mt-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20 mb-2">
                <Cpu size={12} className="text-orange-500 animate-pulse" />
                <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Encrypted Vault</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">VAULT BREAKER</h1>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">Breach the security layer</p>
        </div>

        <div className="flex-1 flex items-center justify-center w-full min-h-0 py-2">
            <div className="w-full max-w-[300px] bg-[#111827] p-6 rounded-[2.5rem] border border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)] space-y-6 scale-[0.9] sm:scale-100 origin-center relative">
                
                {/* Visual Glow */}
                <div className="absolute -inset-1 bg-gradient-to-b from-orange-500/10 to-transparent blur-2xl -z-10 opacity-50"></div>

                {/* Main Display Area */}
                <div className="bg-[#030712] p-6 rounded-[2rem] border border-white/5 text-center shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
                    
                    <div className="flex items-center justify-center gap-4 mb-2">
                        {hackingSequence ? (
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                        ) : guess ? (
                            <Unlock className="text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]" size={18} />
                        ) : (
                            <Lock className="text-gray-800" size={18} />
                        )}
                    </div>

                    <div className="text-5xl font-black text-white font-mono tracking-[0.2em] relative inline-block">
                        {hackingSequence ? (
                            <span className="animate-pulse opacity-50">???</span>
                        ) : (
                            <span className={guess ? "text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]" : ""}>
                                {guess || '0'}
                            </span>
                        )}
                    </div>
                    
                    <div className="mt-3 text-[8px] font-black text-gray-700 uppercase tracking-widest">
                        {hackingSequence ? "Bypassing Protocol..." : "Enter Authentication Key"}
                    </div>
                </div>

                {/* Haptic-feel Keypad */}
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button 
                            key={num}
                            disabled={hackingSequence || loadingGame}
                            onClick={() => handleKeyPress(num.toString())}
                            className={`aspect-square rounded-2xl flex items-center justify-center text-xl font-black transition-all active:scale-90 border relative overflow-hidden group
                            ${guess === num.toString() 
                                ? 'bg-orange-600 border-orange-400 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)]' 
                                : 'bg-[#030712] border-white/5 text-gray-500 hover:text-white hover:border-white/20'}`}
                        >
                            <span className="relative z-10">{num}</span>
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-active:opacity-100 transition-opacity"></div>
                        </button>
                    ))}
                </div>

                <button 
                    onClick={handleUnlock}
                    disabled={!guess || loadingGame || hackingSequence}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black text-[10px] uppercase tracking-[0.3em] py-5 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-orange-400/20"
                >
                    {hackingSequence ? 'INFILTRATING...' : loadingGame ? <Loader2 className="animate-spin" size={18} /> : 'INITIATE BREACH'}
                </button>
            </div>
        </div>

        <div className="w-full max-w-[280px] pb-6">
             <div className="flex items-center justify-center gap-2 text-gray-700 text-[8px] font-black uppercase tracking-[0.3em]">
                 <ShieldAlert size={10} /> Data-Verified Encryption
             </div>
        </div>

        {/* REWARD MODAL - POLISHED */}
        {result && (
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-[#111827] w-full max-w-sm rounded-[3rem] border border-orange-500/20 p-10 text-center space-y-8 shadow-[0_0_100px_rgba(249,115,22,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
                    
                    <div className="w-24 h-24 bg-orange-600/10 rounded-full flex items-center justify-center mx-auto border border-orange-500/20 shadow-inner relative">
                        <Trophy size={48} className="text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]" />
                        <div className="absolute -inset-2 bg-orange-500/20 blur-xl rounded-full -z-10 animate-pulse"></div>
                    </div>
                    
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">VAULT CRACKED</h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-2 opacity-60 italic">Security Layer Bypassed</p>
                    </div>

                    <div className="bg-[#030712] py-6 rounded-[2rem] border border-white/5">
                        <p className="text-5xl font-black text-orange-500 tabular-nums tracking-tighter flex items-center justify-center gap-2">
                            +{result.reward} <span className="text-xs text-gray-700 uppercase italic">PTS</span>
                        </p>
                    </div>

                    <button 
                        onClick={handleCollect} 
                        className="w-full bg-orange-600 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white shadow-2xl shadow-orange-900/40 active:scale-95 transition-all border border-orange-400/20"
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

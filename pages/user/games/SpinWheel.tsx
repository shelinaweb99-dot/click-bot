
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings } from '../../../types';
import { AdSimulator } from '../../../components/AdSimulator';
import { ArrowLeft, Trophy, Star, Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SpinWheel: React.FC = () => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
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

  const handleSpin = async () => {
    if (spinning || !userId) return;
    setSpinning(true);
    setResult(null);

    // Realistic physics: more rounds = more speed
    const extraRounds = 10 + Math.floor(Math.random() * 5);
    const stopAt = Math.floor(Math.random() * 360);
    const newRotation = rotation + (extraRounds * 360) + stopAt;
    setRotation(newRotation);

    setTimeout(() => {
        completeSpin();
    }, 3800); // Wait for the transition
  };

  const completeSpin = async () => {
    if (!userId) return;
    try {
        const res = await playMiniGame(userId, 'spin');
        setResult(res);
        setSpinning(false);
    } catch (e) {
        alert("Connection lost. Try again.");
        setSpinning(false);
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
        <button onClick={() => navigate('/games')} className="absolute top-0 left-0 text-gray-500 hover:text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest p-6 z-50">
            <ArrowLeft size={16} /> Exit Game
        </button>

        <div className="text-center space-y-1 mt-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 mb-2">
                <Star size={12} className="text-blue-500 animate-spin" />
                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Fortune Wheel</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">SPIN & WIN</h1>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">High Stakes Earning</p>
        </div>

        <div className="relative flex-1 flex items-center justify-center w-full min-h-0">
            <div className="relative scale-[0.85] sm:scale-100 origin-center transition-transform duration-500">
                {/* Visual Background Glow */}
                <div className="absolute inset-0 bg-blue-500/10 blur-[80px] rounded-full"></div>

                {/* The Pin - Refined */}
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-30 filter drop-shadow-xl">
                    <div className="w-8 h-12 bg-white rounded-t-full rounded-b-lg border-x-4 border-b-8 border-blue-600 shadow-xl"></div>
                </div>
                
                {/* The Wheel Container */}
                <div className="relative p-4 bg-[#111827] rounded-full shadow-[0_30px_100px_rgba(0,0,0,0.8)] border-4 border-white/5">
                    <div 
                        className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border-8 border-[#030712] overflow-hidden relative transition-transform duration-[3800ms] cubic-bezier(0.15, 0, 0.15, 1) shadow-inner"
                        style={{ 
                            transform: `rotate(${rotation}deg)`, 
                            background: 'conic-gradient(#ef4444 0deg 45deg, #3b82f6 45deg 90deg, #10b981 90deg 135deg, #f59e0b 135deg 180deg, #8b5cf6 180deg 225deg, #ec4899 225deg 270deg, #06b6d4 270deg 315deg, #6366f1 315deg 360deg)' 
                        }}
                    >
                        {/* Shimmer overlay for realistic lighting */}
                        <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_30%_30%,white_0%,transparent_70%)]"></div>
                        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,black_100%)]"></div>
                    </div>
                    
                    {/* Center Hub - Professional styling */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-[#111827] rounded-full z-20 shadow-2xl flex items-center justify-center border-4 border-blue-600/50 ring-8 ring-[#030712]">
                        <div className="w-full h-full bg-blue-600/10 rounded-full flex items-center justify-center">
                            <Star className="text-white fill-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" size={20} />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="w-full max-w-xs pb-6 space-y-4">
            <button 
                onClick={handleSpin}
                disabled={spinning}
                className="group relative w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-black text-xs uppercase tracking-[0.3em] py-5 rounded-[2rem] shadow-[0_20px_50px_rgba(37,99,235,0.3)] active:scale-95 transition-all border border-blue-400/20 overflow-hidden"
            >
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12"></div>
                {spinning ? 'GOOD LUCK...' : 'SPIN THE WHEEL'}
            </button>
            <p className="text-gray-700 text-[8px] font-black uppercase tracking-widest text-center italic">Rewards are certified by node verification</p>
        </div>

        {/* REWARD MODAL - CASINO STYLE */}
        {result && (
            <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                <div className="bg-[#111827] w-full max-w-sm rounded-[3rem] border border-white/5 p-10 text-center space-y-8 animate-in zoom-in duration-500 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
                    
                    <div className="relative mx-auto w-24 h-24">
                        <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-30 animate-pulse"></div>
                        <div className="bg-blue-600/10 w-full h-full rounded-full flex items-center justify-center border border-blue-500/20 shadow-inner relative">
                            <Trophy size={48} className="text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.4)]" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-center gap-1 mb-2">
                            <Sparkles className="text-yellow-500" size={14} />
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">WINNER!</h2>
                            <Sparkles className="text-yellow-500" size={14} />
                        </div>
                        <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.3em]">Fortune Favors the Bold</p>
                    </div>

                    <div className="bg-[#030712] py-6 rounded-[2rem] border border-white/5 shadow-inner">
                        <span className="text-5xl font-black text-blue-500 tracking-tighter drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">+{result.reward}</span>
                        <span className="text-xs font-black text-blue-400/40 uppercase ml-2 italic tracking-widest">PTS</span>
                    </div>

                    <button 
                        onClick={handleCollect} 
                        className="w-full bg-blue-600 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white shadow-2xl shadow-blue-900/40 active:scale-95 transition-all border border-blue-400/20"
                    >
                        Collect Assets
                    </button>
                </div>
            </div>
        )}

        <AdSimulator isOpen={showAd} onComplete={onAdComplete} settings={adSettings} />
    </div>
  );
};

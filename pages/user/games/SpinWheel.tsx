
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings } from '../../../types';
import { AdSimulator } from '../../../components/AdSimulator';
import { ArrowLeft, Trophy, Star, Loader2 } from 'lucide-react';
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

    const extraRounds = 8 + Math.floor(Math.random() * 5);
    const stopAt = Math.floor(Math.random() * 360);
    const newRotation = rotation + (extraRounds * 360) + stopAt;
    setRotation(newRotation);

    setTimeout(() => {
        completeSpin();
    }, 4000);
  };

  const completeSpin = async () => {
    if (!userId) return;
    try {
        const res = await playMiniGame(userId, 'spin');
        setResult(res);
        setSpinning(false);
    } catch (e) {
        setSpinning(false);
    }
  };

  if (!adSettings) return (
    <div className="h-[calc(100vh-160px)] flex items-center justify-center bg-[#030712]">
        <Loader2 className="animate-spin text-purple-500" size={32} />
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-160px)] w-full flex flex-col items-center py-6 px-4 bg-[#030712] animate-in fade-in duration-500">
        <div className="w-full max-w-md flex flex-col items-center space-y-8">
            <button onClick={() => navigate('/games')} className="self-start text-gray-500 hover:text-white flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-colors">
                <ArrowLeft size={16} /> Dashboard
            </button>

            <div className="text-center">
                <h1 className="text-4xl font-black text-white tracking-tighter">SPIN & WIN</h1>
                <p className="text-purple-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Fortune favors the bold</p>
            </div>

            <div className="relative w-full aspect-square max-w-[320px] flex items-center justify-center">
                {/* Pointer */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <div className="w-8 h-10 bg-white rounded-full border-4 border-purple-600 shadow-xl clip-path-polygon-[50%_100%,0_0,100%_0]"></div>
                </div>

                {/* Wheel */}
                <div className="w-full h-full bg-gray-900 rounded-full border-8 border-white/5 shadow-2xl relative overflow-hidden flex items-center justify-center">
                    <div 
                        className="w-[95%] h-[95%] rounded-full transition-transform duration-[4000ms] cubic-bezier(0.15, 0, 0.15, 1)"
                        style={{ 
                            transform: `rotate(${rotation}deg)`, 
                            background: 'conic-gradient(#ef4444 0deg 45deg, #3b82f6 45deg 90deg, #10b981 90deg 135deg, #f59e0b 135deg 180deg, #8b5cf6 180deg 225deg, #ec4899 225deg 270deg, #06b6d4 270deg 315deg, #6366f1 315deg 360deg)' 
                        }}
                    ></div>
                    {/* Hub */}
                    <div className="absolute w-16 h-16 bg-gray-900 rounded-full border-4 border-purple-600 flex items-center justify-center shadow-2xl z-10">
                        <Star className="text-white fill-white" size={24} />
                    </div>
                </div>
            </div>

            <div className="w-full space-y-4">
                <button 
                    onClick={handleSpin}
                    disabled={spinning}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-[0.3em] py-5 rounded-[2rem] shadow-xl transition-all active:scale-95"
                >
                    {spinning ? 'SPINNING...' : 'START SPIN'}
                </button>
                <p className="text-gray-700 text-[9px] font-black uppercase tracking-widest text-center italic">Rewards are synced to your node profile</p>
            </div>
        </div>

        {result && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                <div className="bg-gray-900 w-full max-w-sm rounded-[3rem] border border-white/5 p-10 text-center space-y-8 shadow-2xl">
                    <div className="w-24 h-24 bg-purple-600/10 rounded-full flex items-center justify-center mx-auto border border-purple-500/20">
                        <Trophy size={48} className="text-purple-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">YOU WON!</h2>
                    <div className="bg-black/60 py-6 rounded-[2rem] border border-white/5">
                        <span className="text-5xl font-black text-purple-500 tracking-tighter">+{result.reward}</span>
                        <span className="text-xs font-black text-purple-400/40 uppercase ml-2 italic">Pts</span>
                    </div>
                    <button onClick={() => { setResult(null); setShowAd(true); }} className="w-full bg-purple-600 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-white shadow-2xl active:scale-95 border border-purple-400/20">
                        COLLECT ASSETS
                    </button>
                </div>
            </div>
        )}

        <AdSimulator isOpen={showAd} onComplete={() => setShowAd(false)} settings={adSettings} />
    </div>
  );
};

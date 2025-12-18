
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings } from '../../../types';
import { AdSimulator } from '../../../components/AdSimulator';
import { ArrowLeft, Box } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Lottery: React.FC = () => {
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

  const handlePick = () => {
      if (result && !result.success) return; // Stop if limit reached
      setShowAd(true);
  };

  const onAdComplete = async () => {
    setShowAd(false);
    if (!userId) return;
    
    const res = await playMiniGame(userId, 'lottery');
    setResult(res);
  };

  if (!adSettings) return <div className="text-white text-center mt-10">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
        <button onClick={() => navigate('/games')} className="absolute top-4 left-4 text-gray-400 hover:text-white flex items-center gap-2">
            <ArrowLeft /> Back
        </button>

        <h1 className="text-3xl font-bold text-white">Lucky Box</h1>
        <p className="text-gray-400">Pick a box to reveal your prize!</p>

        <div className="grid grid-cols-2 gap-4 mt-8">
            {[1, 2, 3, 4].map((box) => (
                <button 
                    key={box}
                    onClick={handlePick}
                    className="bg-gray-800 hover:bg-blue-600/20 border-2 border-gray-700 hover:border-blue-500 rounded-xl p-6 flex flex-col items-center justify-center transition group"
                >
                    <Box size={40} className="text-blue-400 group-hover:text-white mb-2" />
                    <span className="text-gray-400 group-hover:text-white font-bold">Box {box}</span>
                </button>
            ))}
        </div>

        {result && (
            <div className={`mt-6 p-6 rounded-xl border text-center animate-bounce ${result.success ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}>
                <h3 className="text-xl font-bold">{result.message}</h3>
                {result.success && <p className="text-sm mt-1">Remaining Plays: {result.left}</p>}
                <button onClick={() => setResult(null)} className="mt-2 text-sm underline">Pick Another</button>
            </div>
        )}

        <AdSimulator isOpen={showAd} onComplete={onAdComplete} settings={adSettings} />
    </div>
  );
};

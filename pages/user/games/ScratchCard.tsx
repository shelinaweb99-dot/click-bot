
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings } from '../../../types';
import { AdSimulator } from '../../../components/AdSimulator';
import { ArrowLeft, Gift } from 'lucide-react';
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

  const resetCard = () => {
      setScratched(false);
      setResult(null);
  };

  if (!adSettings) return <div className="text-white text-center mt-10">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
        <button onClick={() => navigate('/games')} className="absolute top-4 left-4 text-gray-400 hover:text-white flex items-center gap-2">
            <ArrowLeft /> Back
        </button>

        <h1 className="text-3xl font-bold text-white">Scratch & Win</h1>

        <div className="relative w-64 h-64 cursor-pointer" onClick={handleScratch}>
            {/* Result Layer (Bottom) */}
            <div className="absolute inset-0 bg-white rounded-xl flex flex-col items-center justify-center p-4">
                 {result ? (
                     <>
                        <Gift className={`w-16 h-16 ${result.success ? 'text-green-500' : 'text-gray-400'}`} />
                        <p className={`mt-2 font-bold text-xl ${result.success ? 'text-green-600' : 'text-red-500'}`}>
                            {result.success ? `+${result.reward} PTS` : 'Limit Reached'}
                        </p>
                     </>
                 ) : (
                    <div className="animate-pulse text-gray-400">???</div>
                 )}
            </div>

            {/* Scratch Layer (Top) */}
            {!scratched && (
                <div className="absolute inset-0 bg-gray-400 rounded-xl flex items-center justify-center hover:bg-gray-400/90 transition">
                    <div className="text-center">
                        <Gift className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-700 font-bold text-lg">Click to Scratch</p>
                    </div>
                </div>
            )}
        </div>

        {scratched && (
            <div className="text-center">
                <p className="text-gray-400 mb-4">{result?.message}</p>
                <button 
                    onClick={resetCard}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg"
                >
                    Play Again
                </button>
            </div>
        )}

        <AdSimulator isOpen={showAd} onComplete={onAdComplete} settings={adSettings} />
    </div>
  );
};

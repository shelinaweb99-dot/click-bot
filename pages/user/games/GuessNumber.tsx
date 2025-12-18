
import React, { useState, useEffect } from 'react';
import { getCurrentUserId, getAdSettings, playMiniGame } from '../../../services/mockDb';
import { AdSettings } from '../../../types';
import { AdSimulator } from '../../../components/AdSimulator';
import { ArrowLeft, HelpCircle } from 'lucide-react';
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

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!guess) return;
      setShowAd(true);
  };

  const onAdComplete = async () => {
    setShowAd(false);
    if (!userId) return;
    
    // Logic: In this simplified "Click to earn" version, the guess is just for fun/engagement
    // The reward is determined by admin settings random range regardless of guess correctness in this mock version
    // To make it real, we'd check if guess == random_number. 
    // For earning apps, usually "winning" is guaranteed after ad view.
    
    const res = await playMiniGame(userId, 'guess');
    setResult(res);
    setGuess('');
  };

  if (!adSettings) return <div className="text-white text-center mt-10">Loading...</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6">
        <button onClick={() => navigate('/games')} className="absolute top-4 left-4 text-gray-400 hover:text-white flex items-center gap-2">
            <ArrowLeft /> Back
        </button>

        <h1 className="text-3xl font-bold text-white">Guess The Number</h1>
        <p className="text-gray-400 text-center max-w-xs">I'm thinking of a number between 1 and 10. Guess it to win points!</p>

        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-sm text-center">
            <HelpCircle className="w-16 h-16 text-orange-500 mx-auto mb-6" />
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <input 
                    type="number" 
                    min="1" 
                    max="10"
                    placeholder="Enter 1-10"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-center text-white text-xl font-bold outline-none focus:border-orange-500"
                />
                
                <button 
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg"
                >
                    Submit Guess
                </button>
            </form>
        </div>

        {result && (
            <div className={`p-4 rounded-xl border ${result.success ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}>
                <p className="font-bold text-center">{result.message}</p>
                {result.success && <p className="text-xs text-center mt-1">Plays left: {result.left}</p>}
            </div>
        )}

        <AdSimulator isOpen={showAd} onComplete={onAdComplete} settings={adSettings} />
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { User, Transaction } from '../../types';
import { getCurrentUserId, getUserById, processReferral, subscribeToChanges } from '../../services/mockDb';
import { Users, Copy, CheckCircle, Gift } from 'lucide-react';

export const UserReferrals: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [refInput, setRefInput] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useRef(true);

  const fetchData = async () => {
    try {
        const id = getCurrentUserId();
        if (id) {
            const u = await getUserById(id);
            if (isMounted.current) setUser(u);
        }
    } catch (e) {
        console.error("Referral fetch error", e);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    const unsubscribe = subscribeToChanges(() => {
        if(isMounted.current) fetchData();
    });
    return () => {
        isMounted.current = false;
        unsubscribe();
    };
  }, []);

  const handleCopy = () => {
      if (!user) return;
      // In a real bot, this would be t.me/BotName?start=ID
      const link = `Ref ID: ${user.id}`;
      navigator.clipboard.writeText(user.id);
      alert("Referral ID Copied!");
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setIsLoading(true);
      setMessage('');

      try {
          const res = await processReferral(user.id, refInput.trim());
          if (isMounted.current) {
              setMessage(res.message);
              if (res.success) {
                  setRefInput('');
                  await fetchData();
              }
          }
      } catch (err) {
          if (isMounted.current) setMessage("Failed to process referral.");
      } finally {
          if (isMounted.current) setIsLoading(false);
      }
  };

  if (!user) return <div className="text-center mt-10 text-white">Loading...</div>;

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Invite Friends</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 text-center">
                <p className="text-gray-400 text-xs">Friends Invited</p>
                <p className="text-3xl font-bold text-white mt-1">{user.referralCount || 0}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 text-center">
                <p className="text-gray-400 text-xs">Total Earnings</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{user.referralEarnings || 0}</p>
            </div>
        </div>

        {/* My Link */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl shadow-lg text-white">
            <h3 className="font-bold text-lg mb-2">Your Referral ID</h3>
            <p className="text-blue-100 text-sm mb-4">Share this ID with friends. When they enter it, you get <span className="font-bold text-yellow-300">25 Points</span> and they get <span className="font-bold text-yellow-300">10 Points</span>!</p>
            
            <div className="bg-black/30 p-3 rounded-lg flex justify-between items-center border border-white/10">
                <code className="font-mono text-lg tracking-wide">{user.id}</code>
                <button onClick={handleCopy} className="bg-white/20 hover:bg-white/30 p-2 rounded transition">
                    <Copy size={20} />
                </button>
            </div>
        </div>

        {/* Enter Code */}
        {!user.referredBy && (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Gift className="text-pink-500" /> Have a Code?
                </h3>
                <form onSubmit={handleSubmitReferral} className="space-y-4">
                    <div>
                        <input 
                            type="text" 
                            placeholder="Enter friend's ID"
                            value={refInput}
                            onChange={(e) => setRefInput(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-pink-500 outline-none"
                        />
                    </div>
                    {message && (
                        <p className={`text-sm ${message.includes('Success') ? 'text-green-400' : 'text-red-400'}`}>
                            {message}
                        </p>
                    )}
                    <button 
                        type="submit" 
                        disabled={isLoading || !refInput}
                        className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-gray-700 text-white font-bold py-3 rounded-lg transition"
                    >
                        {isLoading ? 'Checking...' : 'Claim Bonus'}
                    </button>
                </form>
            </div>
        )}

        {user.referredBy && (
            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl flex items-center gap-3 text-green-400">
                <CheckCircle size={24} />
                <div>
                    <p className="font-bold">Referral Bonus Claimed</p>
                    <p className="text-xs text-green-300">You were invited by ID: {user.referredBy}</p>
                </div>
            </div>
        )}
    </div>
  );
};

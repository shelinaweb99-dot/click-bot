
import React, { useState, useEffect, useRef } from 'react';
import { User, SystemSettings } from '../../types';
import { getCurrentUserId, getUserById, processReferral, subscribeToChanges, getSystemSettings } from '../../services/mockDb';
import { Users, Copy, CheckCircle, Gift, Loader2, Sparkles, ShieldAlert, Share2 } from 'lucide-react';
import { haptics } from '../../services/haptics';

export const UserReferrals: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [refInput, setRefInput] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchData = async () => {
    try {
        const id = getCurrentUserId();
        if (id) {
            const [u, s] = await Promise.all([
                getUserById(id),
                getSystemSettings()
            ]);
            if (isMounted.current) {
                setUser(u);
                setSystemSettings(s);
                setIsDataLoading(false);
            }
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
      haptics.light();
      navigator.clipboard.writeText(user.id);
      alert("Referral ID Copied!");
  };

  const handleShare = async () => {
      if (!user) return;
      haptics.medium();
      const shareData = {
          title: 'Join ClickEarn USDT',
          text: `Join ClickEarn USDT and get a joining bonus! Use my invite ID: ${user.id}`,
          url: window.location.origin
      };

      try {
          if (navigator.share) {
              await navigator.share(shareData);
          } else {
              handleCopy();
          }
      } catch (err) {
          console.error('Share failed', err);
      }
  };

  const handleSubmitReferral = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setIsLoading(true);
      setMessage('');
      haptics.medium();

      try {
          const res = await processReferral(user.id, refInput.trim());
          if (isMounted.current) {
              setMessage(res.message);
              if (res.success) {
                  haptics.success();
                  setRefInput('');
                  await fetchData();
              } else {
                  haptics.error();
              }
          }
      } catch (err: any) {
          haptics.error();
          if (isMounted.current) setMessage(err.message || "Failed to process referral.");
      } finally {
          if (isMounted.current) setIsLoading(false);
      }
  };

  if (isDataLoading) return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-pink-500" size={40} />
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Opening Secure Hub...</p>
      </div>
  );

  if (!user || !systemSettings) return null;

  const referrerBonus = systemSettings.referralBonusReferrer || 25;
  const refereeBonus = systemSettings.referralBonusReferee || 10;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
        <div className="flex items-center gap-3 mb-2">
            <div className="bg-pink-600/20 p-2.5 rounded-xl border border-pink-500/20">
                <Users className="text-pink-500" size={24} />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Referral Node</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1e293b] p-6 rounded-[2rem] border border-white/5 text-center shadow-xl">
                <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Nodes Connected</p>
                <p className="text-3xl font-black text-white tracking-tighter">{user.referralCount || 0}</p>
            </div>
            <div className="bg-[#1e293b] p-6 rounded-[2rem] border border-white/5 text-center shadow-xl">
                <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Total Yield</p>
                <p className="text-3xl font-black text-green-400 tracking-tighter">{user.referralEarnings || 0}</p>
            </div>
        </div>

        {/* My Link - Pro Card */}
        <div className="bg-gradient-to-br from-pink-600 to-rose-700 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles size={120} />
            </div>
            
            <h3 className="font-black text-xl mb-2 uppercase tracking-tight">Your Invite Protocol</h3>
            <p className="text-pink-100 text-[11px] font-medium mb-8 leading-relaxed max-w-[220px]">
                Earn <span className="font-black text-white underline decoration-pink-300 underline-offset-4">{referrerBonus} Pts</span> for every friend who joins. They get <span className="font-black text-white">{refereeBonus} Pts</span> too!
            </p>
            
            <div className="flex flex-col gap-3">
                <div className="bg-black/30 p-4 rounded-2xl flex justify-between items-center border border-white/10 backdrop-blur-md">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-pink-300 uppercase tracking-widest mb-1">Referral ID</span>
                        <code className="font-mono text-xl tracking-tight text-white">{user.id}</code>
                    </div>
                    <button onClick={handleCopy} className="bg-white/10 hover:bg-white/20 p-3.5 rounded-xl transition-all active:scale-90 border border-white/10">
                        <Copy size={20} />
                    </button>
                </div>
                <button 
                  onClick={handleShare}
                  className="w-full bg-white text-pink-600 font-black text-[10px] uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                    <Share2 size={16} /> Native Android Share
                </button>
            </div>
        </div>

        {/* Security Warning */}
        <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl flex gap-3 items-center">
            <ShieldAlert className="text-amber-500 shrink-0" size={18} />
            <p className="text-gray-500 text-[9px] font-bold uppercase leading-relaxed">
                Anti-Fraud Alert: Bonuses are restricted to one per device and unique network environment.
            </p>
        </div>

        {/* Enter Code */}
        {!user.referredBy ? (
            <div className="bg-[#1e293b] p-8 rounded-[2.5rem] border border-white/5 shadow-xl">
                <h3 className="font-black text-white mb-6 flex items-center gap-3 uppercase tracking-widest text-xs">
                    <Gift className="text-pink-500" /> Activate Bonus
                </h3>
                <form onSubmit={handleSubmitReferral} className="space-y-4">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Enter friend's invite ID..."
                            value={refInput}
                            onChange={(e) => setRefInput(e.target.value)}
                            className="w-full bg-[#0b1120] border border-white/5 rounded-2xl p-5 text-white focus:border-pink-500 outline-none transition-all placeholder:text-gray-700 font-bold"
                        />
                    </div>
                    {message && (
                        <div className={`p-4 rounded-xl text-[10px] font-black uppercase text-center border ${message.toLowerCase().includes('success') ? 'bg-green-500/5 text-green-500 border-green-500/10' : 'bg-red-500/5 text-red-500 border-red-500/10'} animate-in slide-in-from-top-2`}>
                            {message}
                        </div>
                    )}
                    <button 
                        type="submit" 
                        disabled={isLoading || !refInput}
                        className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-gray-800 text-white font-black text-xs uppercase tracking-[0.25em] py-5 rounded-[1.5rem] transition-all active:scale-95 shadow-xl shadow-pink-900/30"
                    >
                        {isLoading ? 'VERIFYING...' : 'CLAIM JOINING BONUS'}
                    </button>
                </form>
            </div>
        ) : (
            <div className="bg-green-500/5 border border-green-500/10 p-6 rounded-[2.5rem] flex items-center gap-4 text-green-500 animate-in zoom-in">
                <div className="bg-green-500/10 p-3 rounded-full">
                    <CheckCircle size={28} />
                </div>
                <div>
                    <p className="font-black text-sm uppercase tracking-tight">Bonus Authenticated</p>
                    <p className="text-[9px] text-green-400/70 font-black uppercase tracking-widest mt-1">Invited by Node ID: {user.referredBy}</p>
                </div>
            </div>
        )}
    </div>
  );
};

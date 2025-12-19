
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types';
import { getLeaderboard, subscribeToChanges } from '../../services/mockDb';
import { Trophy, Medal, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserLeaderboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
        const data = await getLeaderboard();
        if (isMounted.current) {
            setUsers(data);
            setLoading(false);
        }
    } catch (e) {
        console.error("Leaderboard fetch error", e);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchData();
    const unsubscribe = subscribeToChanges(() => {
        if (isMounted.current) fetchData();
    });
    return () => {
        isMounted.current = false;
        unsubscribe();
    };
  }, []);

  const getRankIcon = (index: number) => {
      if (index === 0) return <div className="bg-yellow-500/20 p-2 rounded-xl border border-yellow-500/30"><Trophy className="text-yellow-500 w-5 h-5" /></div>;
      if (index === 1) return <div className="bg-slate-400/20 p-2 rounded-xl border border-slate-400/30"><Medal className="text-slate-300 w-5 h-5" /></div>;
      if (index === 2) return <div className="bg-amber-700/20 p-2 rounded-xl border border-amber-700/30"><Medal className="text-amber-600 w-5 h-5" /></div>;
      return <div className="w-9 h-9 flex items-center justify-center font-black text-gray-600 text-sm">{index + 1}</div>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-12">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">
            <ChevronLeft size={16} /> Dashboard
        </button>

        <div className="text-center mb-10 pt-4">
            <div className="relative inline-block">
                <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]" strokeWidth={2.5} />
                <div className="absolute inset-0 bg-yellow-500/10 blur-3xl rounded-full scale-150 -z-10 animate-pulse"></div>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">Hall of Fame</h1>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.2em] mt-2">The Global USDT Elite</p>
        </div>

        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Calculating Rankings</p>
            </div>
        ) : (
            <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                {users.length === 0 ? (
                     <div className="p-10 text-center text-gray-600 font-bold italic">No data yet</div>
                ) : (
                    users.map((u, index) => (
                        <div key={u.id} className={`flex items-center justify-between p-5 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors ${index < 3 ? 'bg-white/[0.01]' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                    {getRankIcon(index)}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">{u.name || 'Anonymous'}</p>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-0.5">{u.country || 'Global'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-sm text-blue-400">{u.balance.toFixed(2)}</p>
                                <p className="text-[8px] text-gray-600 font-black tracking-[0.2em] uppercase">USDT</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}

        <div className="bg-blue-600/5 p-6 rounded-[2rem] border border-blue-500/10 text-center">
             <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                 Rankings are updated in real-time based on mission completion and referral yield.
             </p>
        </div>
    </div>
  );
};
